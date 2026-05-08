# A2UI Android — Gift Concierge Demo

**Status:** Design  
**Date:** 2026-05-07  
**Author:** Diego Zuluaga (with Claude)

## 1. Goal

Build a native Android app that renders agent-driven UIs using the **A2UI** protocol ([a2ui.org](https://a2ui.org), Google A2A UI extension), and use it to deliver a **90-second "Gift Concierge" shopping demo**.

The artifact's job is to **influence stakeholders and showcase the art of possible** for mobile-native A2UI. It is a high-fidelity prototype, not a production app. Aesthetic standard: **beautiful but pragmatic** — ship in days/weeks, look elegant on a real phone, be defensible in a live demo.

There is no established Android-native A2UI renderer today; the upstream ecosystem covers Angular, Flutter, Lit (web components), Markdown, and React. This project closes that gap pragmatically by **leveraging the upstream Lit components inside an embedded WebView, wrapped by a native Jetpack Compose chat shell** — a hybrid that ships fast, feels native where it matters, and provides a credible migration path to a fully-native Compose renderer later.

## 2. Audience and success criteria

**Audience:** internal and external stakeholders evaluating mobile-native agent UI. Used in live demos on a physical phone, in slide decks via screenshots, and in short video clips.

**Success is:**

- The full Gift Concierge flow runs end-to-end on a physical Android phone in **≤ 90 seconds**.
- Each of the six storyboard beats lands a **distinct A2UI surface** (chips, product cards, variant pickers, form, confirmation).
- The native chrome (status bar, app bar, message list, input row, theme, fonts) is recognizably **Material 3** and feels indistinguishable from a hand-built native app.
- The agent is **LLM-backed** and responds reasonably to off-script user phrasing — the demo survives audience improvisation.
- Cold-start to first usable screen on a mid-range phone: **≤ 3 s**. Agent first-byte after user message: **≤ 2 s**.
- A 30-second highlight clip and three pixel-quality screenshots can be cut directly from the demo without retouching.

## 3. Non-goals (out of scope)

To preserve "highest elegance per week," the following are explicitly excluded from v1:

- Real payments, real inventory, real fulfillment.
- User accounts, authentication, sessions across devices.
- Push notifications, background sync, offline mode.
- Voice input, image input, multimodal capture.
- Localization beyond en-US.
- Production hardening: rate limiting, abuse handling, observability, error reporting.
- Multi-agent orchestration or agent handoffs.
- Deep links to product pages or sharing flows.
- A fully-native Jetpack Compose A2UI renderer (deferred — see §5.2 for the migration path).

## 4. Hero flow (90-second storyboard)

| Beat | Time | Surface | What the user sees |
|------|------|---------|--------------------|
| 1. Open & ask | 0:00 – 0:10 | Native chat input | User types a real-sounding ask: *"Need a gift for my sister — minimalist, under $150"*. Native keyboard, native scroll, Material 3 surfaces. |
| 2. Clarifying chips | 0:10 – 0:25 | A2UI single-select chips + streaming text | Agent responds with one focused question and 4 quick-tap chips. Chips submit on tap — no keyboard. |
| 3. Product cards | 0:25 – 0:45 | A2UI card grid (image, name, price, "why") | Agent presents 3 curated picks. The agent's reasoning streams in above the cards. Tap a card to focus. |
| 4. Variant picker | 0:45 – 1:05 | A2UI radio groups, image, data-bound price | Selected card expands inline. Variant pickers (finish, length) update the preview image and price live. |
| 5. Note + ship-to | 1:05 – 1:25 | A2UI form: toggle, text input, address field | Gift wrap toggle, optional gift note (free text), recipient address (mocked autocomplete). Inline validation. |
| 6. Confirmation | 1:25 – 1:35 | A2UI confirmation card + summary list | Single confirmation: itemized total, ship date, mock order number. Subtle haptic and checkmark. |

Beats 2–6 are A2UI-rendered bubbles; beat 1 (and the user-side bubble for any subsequent typed message) is native Compose. The hero flow is deliberately tight — the renderer will support more components than this demo exercises, but the demo never wanders off this path.

## 5. Architecture

### 5.1 Shape

Two deployables: the **Android app** and the **agent backend**. They communicate over HTTPS with a server-sent events (SSE) stream for streaming A2UI fragments.

```
[Android device — Kotlin / Jetpack Compose]
  ChatScreen (Compose)
    ├── TopAppBar, theme, scaffolding             ← Compose
    ├── MessageList (LazyColumn)                  ← Compose
    │     ├── UserBubble                          ← Compose
    │     ├── AgentTextBubble                     ← Compose (Markdown)
    │     └── AgentA2uiBubble                     ← AndroidView { WebView } hosting Lit components
    └── InputRow (text field + send)              ← Compose
            │
            ▼ HTTPS POST /chat (SSE response)
[Agent backend — Python / FastAPI]
  /chat        — accepts user message, streams A2UI fragments back
  GiftAgent    — Claude Sonnet 4.6 (Anthropic SDK) with shopping tools
    Tools: search_catalog, get_product, place_order, present_*  
  catalog.json — curated mock product catalog (~30 items)
```

### 5.2 Why hybrid

Considered alternatives:

- **Pure WebView host** — fastest to ship, but scroll/keyboard/gestures feel webby and theming drifts from Material. Fails the "native chrome feel" success criterion.
- **Pure native Compose renderer** — most elegant long-term, but several weeks of work to cover the catalog before any demo is possible. Misses the "ship in days" bar and risks an unfinished renderer at demo time.
- **Hybrid (chosen)** — Compose owns everything the user feels (scroll, input, animation, theming, keyboard); WebView owns the A2UI rendering. Ships in days, feels native, and the architecture itself becomes part of the story when influencing others ("we leveraged the upstream Lit components, but you'd never know"). Migration path: A2UI bubbles can be replaced one component-type at a time with native composables without rewriting the shell.

### 5.3 The A2UI bubble

Each agent message that contains A2UI content is rendered as an `AgentA2uiBubble` composable that wraps a `WebView`:

- A static `host.html` is bundled in the app's `assets/`. It loads a single bundled JS file containing the upstream A2UI Lit components plus a thin "host shim."
- The shim exposes `window.a2ui.render(json)` and `window.a2ui.applyFragment(jsonFragment)` for streaming updates.
- Native → JS: Compose calls `webView.evaluateJavascript("window.a2ui.render(...)")` (or `applyFragment` for streaming).
- JS → Native: the shim calls `window.AndroidBridge.onAction(JSON.stringify({...}))` via `addJavascriptInterface`. The bridge converts these into Kotlin events on a `Channel<A2uiEvent>`.
- **Height measurement:** the shim uses a `ResizeObserver` on the rendered root and posts `{type:"resize", height: px}` to the bridge. The bubble's Compose layout reads this and animates to the measured height. WebView is set to `LayoutParams(MATCH_PARENT, WRAP_CONTENT)` with a minimum height to avoid flicker before first measure.
- **Theming bridge:** at startup, the host shim receives a JSON theme payload (color tokens, font stack, radii) from the app and sets matching CSS custom properties on the document root. The Lit components consume those tokens.
- **WebView pooling:** for the demo's expected 5–8 A2UI bubbles per session, no pooling is needed; each bubble owns its WebView. If memory becomes an issue later, switch to a pool of 2–3 WebViews keyed by visibility.

### 5.4 Transport

- **POST `/chat`** with body `{ sessionId, userMessage }`.
- Response is `text/event-stream`. Each SSE event is one of:
  - `event: text` — incremental agent prose (Markdown).
  - `event: a2ui` — an A2UI JSON fragment for the current message bubble.
  - `event: end` — terminal event, with a final `messageId`.
- The Android client maintains one ongoing message per turn; text fragments append to `AgentTextBubble`, A2UI fragments are forwarded into the active `AgentA2uiBubble`.
- A2A protocol conformance is **out of scope for v1**. The transport is intentionally simple and demo-shaped. If A2UI v0.8's A2A extension stabilizes during the build, we can switch the transport to A2A without changing the rendering layer.

## 6. Agent backend

**Language / framework:** Python 3.12 + FastAPI. SSE via `sse-starlette`.

**LLM:** **Claude Sonnet 4.6** (`claude-sonnet-4-6`) via the Anthropic SDK. Streaming on. Prompt caching enabled on the system prompt and catalog excerpt to keep first-byte latency low.

**System prompt** establishes a "Lumen Goods gift concierge" persona, the rendering contract (always emit A2UI via the `present_*` tools, never raw JSON in text), and conversational guardrails (one clarifying question max before showing options, three picks max in any product grid).

**Tools (function calling):**

| Tool | Purpose | Notes |
|------|---------|-------|
| `search_catalog(category?, price_max?, vibe_tags?)` | Returns up to 6 product summaries. | Reads `catalog.json`, filters in memory. |
| `get_product(product_id)` | Returns full product detail incl. variants. | |
| `place_order(product_id, variant_options, gift_wrap, note?, address)` | Returns order confirmation: order_id, total, ship_date. | Pure mock — no persistence beyond the session. |
| `present_chips(question, options[])` | Emits an A2UI chips fragment. | Backend serializes to A2UI JSON and pushes onto the stream. |
| `present_products(reasoning, products[])` | Emits an A2UI card-grid fragment. | |
| `present_product_detail(product_id, variants)` | Emits an A2UI variant picker bubble. | |
| `present_form(fields[])` | Emits an A2UI form. | |
| `present_confirmation(summary)` | Emits an A2UI confirmation card. | |

The `present_*` tools are **structured-output convenience wrappers**: the LLM picks the surface and fills typed parameters; the backend translates the tool call into spec-compliant A2UI JSON. This is more reliable for a demo than asking the LLM to emit raw A2UI JSON in its message body. (Pattern can be revisited if A2UI's flat streaming JSON proves stable enough for direct emission.)

**Session state:** in-memory `dict[sessionId -> ConversationState]`. Each state holds Anthropic message history and a tiny "shopping context" (last shown products, current selection). No database; the process restarting resets everything — acceptable for a demo.

## 7. Mock data

A single `catalog.json` file in the backend, ~25–35 products curated to look great in the gift scenario.

- **Categories:** jewelry (~15), home (5), stationery (5), skincare (5).
- **Per product:** `id`, `name`, `category`, `vibe_tags[]` (e.g. `minimalist`, `warm`, `playful`), `price`, `image_url` (Unsplash), `description`, `variants` (e.g. finishes, lengths, sizes).
- Curation rule: every product looks photographable on a clean background. No stock-photo cheese.

Recipient address autocomplete is mocked as a static list of 6 plausible addresses. The form simply matches a prefix.

## 8. Android app structure

- Single `MainActivity`, single Compose `ChatScreen`. No navigation graph in v1.
- Modules: `app` (Compose UI + chat repo + WebView host), `:design` (theme tokens, typography), `:protocol` (data models for the SSE wire format and the A2UI bridge events).
- Chat state held in a `ChatViewModel` with a `StateFlow<List<Message>>`. Each `Message` is a sealed class: `User(text)`, `AgentText(streamingMarkdown)`, `AgentA2ui(fragments: List<JsonElement>)`.
- WebView host page (`assets/host.html`) and bundled JS (`assets/a2ui-host.js`) are produced by a small build step under `tools/host-bundle/` (Vite or esbuild) that pulls the upstream A2UI Lit package, applies the theme shim, and outputs a single self-contained JS file.
- Min SDK 26 (Android 8) for modern WebView and reliable Material 3. Target SDK 34.

## 9. Theming and aesthetics

The native chrome and the WebView-rendered components share one design language driven by tokens defined in `:design`.

- **Palette:** warm ivory background (`#F8F4ED`), deep ink text (`#1B1B1F`), single accent (`#5B6CFF` indigo) and a soft success green for confirmation. No dynamic color in v1 (consistency across phones for screenshots).
- **Typography:** Inter for UI; a single serif accent (Fraunces) for product names and headlines.
- **Surface treatment:** rounded 14–18 px corners, hairline borders, subtle elevation (1–2 dp), generous whitespace, no skeuomorphism.
- **Motion:** spring-based message-bubble entrance, 80–120 ms; bubble height changes use `animateContentSize`. WebView fades in once first measure resolves to mask any layout settling.
- **Tokens delivered to WebView:** at host init, the app posts a JSON theme payload to the shim, which sets CSS custom properties (`--a2ui-color-bg`, `--a2ui-color-fg`, `--a2ui-color-accent`, `--a2ui-radius-md`, `--a2ui-font-sans`, `--a2ui-font-serif`). Lit components are configured to consume these tokens.

## 10. Build, run, demo

- `app/` — Android Studio project; `./gradlew :app:installDebug` or run from Studio.
- `backend/` — Python project managed with `uv`; `uv run uvicorn app:app --reload`.
- `tools/host-bundle/` — `npm run build` produces `app/src/main/assets/a2ui-host.js`.
- For the live demo, the phone connects to a tunneled (Cloudflare Tunnel or ngrok) backend URL to avoid LAN setup on stage. The base URL is set via a `BuildConfig` field for debug builds.

## 11. Risks and open questions

| Risk | Likelihood | Mitigation |
|------|-----------:|------------|
| Lit components not themable enough to match the native palette | Medium | Allocate a budget to fork the CSS / inject overrides; worst case, ship 1–2 minimal custom components for the demo's specific surfaces. |
| WebView height-measure flicker on first render | Medium | Pre-set a minimum height per fragment type; defer the fade-in until first stable measure; use `ResizeObserver` rather than polling. |
| A2UI v0.8 catalog gaps for the specific demo surfaces | Medium | Surface gaps during the implementation plan; if a needed component is missing, build a minimal one inside the host shim rather than blocking. |
| LLM emits an unsupported component or invalid tool args | Low | Tool schemas are strict; pre-validate before serializing to A2UI; on failure, fall back to a plain text response so the demo never visibly breaks. |
| Cold-start latency over a hotel/conference Wi-Fi | Medium | Tunnel the backend close to the demo region; warm prompt cache on app launch with a tiny prefetch ping. |
| Audience asks for fully-native rendering | Expected | This is the intended segue — the architecture explicitly supports replacing WebView bubbles with native composables one type at a time. Keep this as the closing slide. |

**Open decisions (defer to implementation plan):**

- Final pick for Markdown rendering library on Android (e.g., `compose-markdown`).
- Whether to use the Anthropic SDK directly or via a thin retry wrapper.
- Whether the host JS bundle is built per-app-build (deterministic) or pulled at build time from the upstream package (always fresh).

## 12. Definition of done

- Android app installs on a Pixel running Android 14, opens to the chat screen, and responds within 2 s of the first user message.
- All six storyboard beats render correctly with the expected A2UI surfaces.
- Theme is consistent across native and WebView surfaces — a screenshot of an A2UI bubble cannot be visually distinguished as web-rendered without close inspection.
- A 30-second screen-recording from the device produces a clip suitable for stakeholder presentations without post-production.
- The repo includes a one-page `README.md` describing the architecture and how to run the demo, suitable for a peer to reproduce.
