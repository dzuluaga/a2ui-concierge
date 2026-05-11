from __future__ import annotations
from typing import Any, AsyncIterator
import copy
import json
import os
from litellm import acompletion
from concierge.prompts import SYSTEM_PROMPT
from concierge.tools import TOOL_SCHEMAS, run_tool

# Provider-prefixed LiteLLM model id. Override via MODEL env var.
# Examples:
#   anthropic/claude-haiku-4-5    (cheap, native caching, current default)
#   anthropic/claude-sonnet-4-6   (smarter, ~3x more expensive)
#   gemini/gemini-2.5-flash       (cheapest credible option)
#   gemini/gemini-2.5-flash-lite  (cheapest)
#   openai/gpt-4o-mini            (cheap OpenAI option)
MODEL = os.getenv("MODEL", "anthropic/claude-haiku-4-5")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "1500"))
HISTORY_TURN_LIMIT = 12

_IS_ANTHROPIC = MODEL.startswith("anthropic/") or MODEL.startswith("claude-")


def _to_openai_tools(schemas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Anthropic-style tool schemas → OpenAI/LiteLLM 'function' tools."""
    return [
        {
            "type": "function",
            "function": {
                "name": s["name"],
                "description": s.get("description", ""),
                "parameters": s["input_schema"],
            },
        }
        for s in schemas
    ]


_OPENAI_TOOLS: list[dict[str, Any]] = _to_openai_tools(TOOL_SCHEMAS)
# Anthropic-only: tag the last tool with ephemeral cache_control so the tool
# schema array is read at ~10% cost on every call after the first in a turn.
# LiteLLM passes the field through; non-Anthropic providers ignore it.
if _IS_ANTHROPIC and _OPENAI_TOOLS:
    _OPENAI_TOOLS = copy.deepcopy(_OPENAI_TOOLS)
    _OPENAI_TOOLS[-1]["cache_control"] = {"type": "ephemeral"}


class AgentEvent:
    def __init__(self, kind: str, payload: Any):
        self.kind = kind  # "text" | "a2ui" | "end"
        self.payload = payload


class GiftAgent:
    def __init__(self) -> None:
        # OpenAI-style history: assistant {content, tool_calls}, user content,
        # role:"tool" entries for tool results. LiteLLM translates per provider.
        self.history: list[dict[str, Any]] = []

    def _trim_history(self) -> None:
        max_entries = HISTORY_TURN_LIMIT * 2
        if len(self.history) <= max_entries:
            return
        drop = len(self.history) - max_entries
        # Snap to next user-role boundary so we never start mid-tool-loop.
        while drop < len(self.history) and self.history[drop].get("role") != "user":
            drop += 1
        self.history = self.history[drop:]

    def _system(self) -> list[dict[str, Any]]:
        if _IS_ANTHROPIC:
            # Cache the (large) system prompt across all calls.
            return [{
                "role": "system",
                "content": [{
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }],
            }]
        return [{"role": "system", "content": SYSTEM_PROMPT}]

    def _sanitize_history(self) -> None:
        # Drop any assistant(tool_calls) whose tool_call_ids aren't fully
        # answered by following role:"tool" messages. DeepSeek (and other
        # OpenAI-compatible providers) reject the request otherwise.
        cleaned: list[dict[str, Any]] = []
        i = 0
        while i < len(self.history):
            entry = self.history[i]
            if entry.get("role") == "assistant" and entry.get("tool_calls"):
                needed = {tc["id"] for tc in entry["tool_calls"]}
                j = i + 1
                seen: set[str] = set()
                while j < len(self.history) and self.history[j].get("role") == "tool":
                    seen.add(self.history[j].get("tool_call_id"))
                    j += 1
                if needed.issubset(seen):
                    cleaned.append(entry)
                    cleaned.extend(self.history[i + 1:j])
                else:
                    # Orphan: drop the assistant turn + any partial tool msgs.
                    pass
                i = j
            else:
                cleaned.append(entry)
                i += 1
        self.history = cleaned

    def _messages_for_call(self) -> list[dict[str, Any]]:
        self._sanitize_history()
        msgs: list[dict[str, Any]] = self._system() + self.history
        # Cache the running conversation prefix on Anthropic by tagging the
        # last user-role string content as a list-of-blocks with cache_control.
        # We only do this for plain user messages — tool-result rounds in a
        # multi-step turn skip the breakpoint to keep things simple.
        if _IS_ANTHROPIC and msgs and msgs[-1].get("role") == "user":
            last = copy.deepcopy(msgs[-1])
            content = last.get("content")
            if isinstance(content, str):
                last["content"] = [{
                    "type": "text", "text": content,
                    "cache_control": {"type": "ephemeral"},
                }]
                msgs = msgs[:-1] + [last]
        return msgs

    async def turn(self, user_message: str) -> AsyncIterator[AgentEvent]:
        self.history.append({"role": "user", "content": user_message})
        self._trim_history()

        while True:
            response = await acompletion(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                tools=_OPENAI_TOOLS,
                messages=self._messages_for_call(),
            )
            # Gemini occasionally returns an empty `choices` list (safety
            # filter trip, blocked completion) — guard so the agent surfaces
            # something instead of dying on a bare IndexError.
            choices = list(response.choices or [])
            if not choices:
                yield AgentEvent("text", "I had trouble generating a reply. Mind rephrasing?")
                yield AgentEvent("end", None)
                return
            choice = choices[0]
            msg = choice.message
            text: str | None = msg.content
            tool_calls = list(msg.tool_calls or [])

            if text and text.strip():
                yield AgentEvent("text", text)

            # Persist the assistant turn (text + any tool_calls) to history.
            assistant_entry: dict[str, Any] = {"role": "assistant", "content": text or ""}
            if tool_calls:
                assistant_entry["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in tool_calls
                ]
            self.history.append(assistant_entry)

            if choice.finish_reason != "tool_calls" or not tool_calls:
                # Truncation: emit a chip so the user can resume instead of
                # being left staring at a half-finished thought.
                if choice.finish_reason == "length":
                    yield AgentEvent("a2ui", {
                        "component": "chip-group",
                        "question": "There's more — want me to keep going?",
                        "select": "single",
                        "options": [
                            {"value": "continue", "label": "Show me more"},
                            {"value": "narrow", "label": "Narrow it down"},
                        ],
                    })
                yield AgentEvent("end", None)
                return

            # Execute tools and append role:"tool" results. EVERY tool_call_id
            # must get a response — partial responses are rejected by DeepSeek
            # and friends. Catch tool errors and surface them as tool content.
            for tc in tool_calls:
                try:
                    raw_args = tc.function.arguments
                    args = json.loads(raw_args) if isinstance(raw_args, str) else (raw_args or {})
                    output = run_tool(tc.function.name, args)
                    if "_a2ui" in output:
                        yield AgentEvent("a2ui", output["_a2ui"])
                        tool_content = json.dumps({"rendered": True})
                    else:
                        tool_content = json.dumps(output)
                except Exception as e:
                    tool_content = json.dumps({"error": f"{type(e).__name__}: {e}"})
                self.history.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": tool_content,
                })
