from __future__ import annotations
from typing import Any, AsyncIterator
import copy
import asyncio
import json
import os
from litellm import acompletion
from fastmcp import Client as McpClient
from concierge.prompts import SYSTEM_PROMPT
from concierge.tools import TOOL_SCHEMAS, run_tool

# Provider-prefixed LiteLLM model id. Override via MODEL env var.
# Examples:
#   anthropic/claude-haiku-4-5    (cheap, native caching, current default)
#   anthropic/claude-sonnet-4-6   (smarter, ~3x more expensive)
#   gemini/gemini-2.5-flash       (cheapest credible option)
#   openai/gpt-4o-mini            (cheap OpenAI option)
MODEL = os.getenv("MODEL", "anthropic/claude-sonnet-4-6")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))
HISTORY_TURN_LIMIT = 12
MCP_URL = os.environ.get("MCP_URL", "http://localhost:3001/mcp")
_CREDENTIAL_TIMEOUT = 120.0

_IS_ANTHROPIC = MODEL.startswith("anthropic/") or MODEL.startswith("claude-")

_INTERNAL_MCP_TOOLS = {"submit_credential"}  # handled by the agent, not exposed to Claude


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
if _IS_ANTHROPIC and _OPENAI_TOOLS:
    _OPENAI_TOOLS = copy.deepcopy(_OPENAI_TOOLS)
    _OPENAI_TOOLS[-1]["cache_control"] = {"type": "ephemeral"}


class AgentEvent:
    def __init__(self, kind: str, payload: Any):
        self.kind = kind  # "text" | "a2ui" | "credential_request" | "end"
        self.payload = payload


async def _fetch_mcp_schemas() -> tuple[list[dict[str, Any]], set[str]]:
    async with McpClient(MCP_URL) as mcp:
        tools = await mcp.list_tools()
    visible = [t for t in tools if t.name not in _INTERNAL_MCP_TOOLS]
    schemas = [
        {
            "name": t.name,
            "description": t.description or "",
            "input_schema": t.inputSchema,
        }
        for t in visible
    ]
    return schemas, {t.name for t in visible}


async def _call_mcp_tool(name: str, arguments: dict[str, Any]) -> str:
    from fastmcp.exceptions import ToolError
    try:
        async with McpClient(MCP_URL) as mcp:
            result = await mcp.call_tool(name, arguments)
        items = result.content if hasattr(result, "content") else result
        parts = [item.text if hasattr(item, "text") else str(item) for item in items]
        return "\n".join(parts) if parts else "{}"
    except ToolError as exc:
        return json.dumps({"success": False, "error": str(exc)})


class GiftAgent:
    def __init__(self) -> None:
        self.history: list[dict[str, Any]] = []
        self._pending_credential: asyncio.Queue[dict[str, bool]] | None = None

    async def submit_credential_response(self, credentials: dict[str, bool]) -> None:
        """Called by the /credential endpoint to unblock the waiting agent turn."""
        if self._pending_credential is not None:
            await self._pending_credential.put(credentials)

    def _trim_history(self) -> None:
        max_entries = HISTORY_TURN_LIMIT * 2
        if len(self.history) <= max_entries:
            return
        drop = len(self.history) - max_entries
        while drop < len(self.history) and self.history[drop].get("role") != "user":
            drop += 1
        self.history = self.history[drop:]

    def _system(self) -> list[dict[str, Any]]:
        if _IS_ANTHROPIC:
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
        """Drop assistant tool_calls turns whose IDs have no matching tool results."""
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
                i = j
            else:
                cleaned.append(entry)
                i += 1
        self.history = cleaned

    def _messages_for_call(self) -> list[dict[str, Any]]:
        self._sanitize_history()
        msgs = self._system() + self.history
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

        mcp_schemas, mcp_tool_names = await _fetch_mcp_schemas()
        all_tools = _OPENAI_TOOLS + _to_openai_tools(mcp_schemas)

        while True:
            response = await acompletion(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                tools=all_tools,
                messages=self._messages_for_call(),
            )

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

            for tc in tool_calls:
                tool_content: str
                try:
                    raw_args = tc.function.arguments
                    args = json.loads(raw_args) if isinstance(raw_args, str) else (raw_args or {})
                    name = tc.function.name

                    if name == "request_checkout_verification":
                        # ── Credential handshake ──────────────────────────────
                        raw = await _call_mcp_tool(name, args)
                        data = json.loads(raw)

                        if not data.get("success"):
                            tool_content = raw
                        else:
                            # Queue before yielding so Android can never race.
                            self._pending_credential = asyncio.Queue()
                            yield AgentEvent("credential_request", {
                                "mcp_session_id": data["session_id"],
                                "dcql_query_json": json.dumps(data["dcql_query"]),
                            })
                            try:
                                credentials = await asyncio.wait_for(
                                    self._pending_credential.get(),
                                    timeout=_CREDENTIAL_TIMEOUT,
                                )
                            except asyncio.TimeoutError:
                                credentials = {}
                            finally:
                                self._pending_credential = None

                            tool_content = await _call_mcp_tool("submit_credential", {
                                "session_id": data["session_id"],
                                "credentials": credentials,
                            })

                    elif name in mcp_tool_names:
                        tool_content = await _call_mcp_tool(name, args)

                    else:
                        output = await run_tool(name, args)
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
