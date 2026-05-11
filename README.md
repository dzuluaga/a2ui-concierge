# A2UI Concierge

A demo of the **A2UI** protocol running side-by-side on **Android** (Kotlin / Jetpack Compose
chrome + WebView-hosted Lit components) and **the web** (the same Lit components, no
hybrid). A streaming Python backend (Anthropic Claude Sonnet 4.6 + tool use) drives both
clients with the exact same A2UI fragments — so every UI you see was authored once and
rendered identically on both platforms.

The use case is a "Lumen Concierge" gift-shopping flow: the agent picks products, asks
clarifying questions, places an order, and confirms — all via streamed A2UI components, not
text.

> High-fidelity prototype, not a production app.

## Video demo

▶ **[Watch it on YouTube](https://www.youtube.com/watch?v=eTi_LHUJs5Y)** — ~1-minute walkthrough showing the same A2UI components rendering on Android (Compose + WebView) and the web.

## What this shows

- **One agent, two surfaces.** Same `/chat` SSE stream feeds an Android app and a web app.
- **Five A2UI components**, all written once in Lit, used by both clients:
  `chip-group`, `card-grid` (horizontal swipe rail), `product-detail`, `form` (toggles +
  saved-address pills), `confirmation-card`.
- **Hybrid Compose chrome on Android.** The chat shell, top bar, input row, thinking dots,
  and bubble entry/exit motion are pure Compose; only the A2UI bubble itself is a WebView.
  Bubbles spring into view, the `product-detail` arrival is emphasized, and the previous
  card-grid fades back to demote it.
- **Bridge parity.** The same `window.AndroidBridge` interface (`onAction`, `log`,
  `reportSize`) that Android exposes is synthesized on the web build, so component code
  doesn't branch.

## Architecture

```
[ Android device — Kotlin / Jetpack Compose ]            [ Web browser ]
  ChatScreen (Compose)                                     index.html (~250 LOC)
    ├── TopAppBar / theme / Scaffold                         ├── chat shell + SSE parser
    ├── LazyColumn of bubbles                                └── synthesizes window.AndroidBridge
    │     ├── UserBubble        (Compose)
    │     ├── AgentTextBubble   (Compose, MarkdownText)
    │     ├── ThinkingDots      (Compose, infinite anim)
    │     └── AgentA2uiBubble   ← AndroidView { WebView } host.html → Lit components
    └── InputRow (Compose)
                       │
                       └── HTTPS POST /chat (text/event-stream)
                                   ▼
[ Backend — Python / FastAPI / sse-starlette ]
  /chat       — accepts user message, streams text + a2ui events
  GiftAgent   — Anthropic SDK, Claude Sonnet 4.6, tool-use loop
  Tools       — search_catalog, get_product, place_order,
                present_chips, present_products, present_product_detail,
                present_form, present_confirmation
  catalog.json — curated mock product catalog
```

The Lit components live in `host-bundle/src/components/`. The Vite build bundles them into
a single IIFE (`a2ui-host.iife.js`). Two delivery modes:

- **Android** — `npm run build:android` copies the bundle and `index-android.html` into
  `app/app/src/main/assets/`, where `WebView.loadUrl("file:///android_asset/host.html")`
  picks them up.
- **Web** — `npm run dev` serves `index.html` (the full chat shell) at `localhost:5173`,
  proxying `/chat` and `/health` to the Python backend at `:8000`.

## Repository layout

```
a2ui-concierge/
├── backend/        Python / FastAPI agent (uv-managed)
├── host-bundle/    Vite project — Lit components + dual entry points (Android, web)
├── app/            Android Studio project (Kotlin / Jetpack Compose)
└── docs/           Spec, plan, runbook, smoke checklist, A2UI shapes reference
```

## Prerequisites

- An Anthropic API key (the agent uses Claude Sonnet 4.6).
- **Backend:** Python 3.11+, [`uv`](https://docs.astral.sh/uv/).
- **Host bundle:** Node 18+ and `npm`.
- **Android:** Android Studio Hedgehog or newer, JDK 17, `adb` on PATH, an emulator or a
  physical device with USB debugging.
- **Web:** any modern browser.

## Running it

### 1. Backend (required for both clients)

```shell
cd backend
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env       # gitignored
uv sync --all-extras
uv run uvicorn concierge.app:app --port 8000
```

`/health` should now return `{"status":"ok"}`.

### 2a. Web app

```shell
cd host-bundle
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/chat` to the backend
automatically — no extra configuration needed. Try: *"a necklace under 200 for my sister"*.

### 2b. Android app

Build the host bundle into Android assets, then install:

```shell
cd host-bundle && npm install && npm run build:android
cd ../app && ./gradlew :app:installDebug
adb shell am start -n com.diegoz.a2uiconcierge/.MainActivity
```

The emulator reaches the host backend at `10.0.2.2:8000` automatically. For a **physical
phone**, forward the port first:

```shell
adb reverse tcp:8000 tcp:8000
```

After any change to a Lit component, re-run `npm run build:android` and reinstall the APK
to refresh the WebView assets. The Compose-side code reloads via Android Studio in the
normal way.

## Demo script

A 90-second walkthrough lives in `docs/runbook.md`. Short version:

1. *"Find me a necklace under $200 for my sister"* → card-grid arrives.
2. Tap a card → product-detail bubble pops in (with an emphasized spring entrance; the
   previous card-grid bubble dims to demote it).
3. *"Add it to my order"* → form arrives (gift-wrap toggle + saved-address pills).
4. Tap *Place order* → confirmation-card pops in with a haptic tap.

## Pointers

- Spec: `docs/superpowers/specs/2026-05-07-a2ui-android-shopping-demo-design.md`
- Plan: `docs/superpowers/plans/2026-05-07-a2ui-android-shopping-demo.md`
- A2UI fragment shapes: `docs/a2ui-shapes.md`
- Runbook: `docs/runbook.md`
- Smoke checklist: `docs/smoke-checklist.md`

## Known limitations

- Catalog is a mock JSON file; ordering writes to memory only.
- Single conversation per session id; no persistence.
- Android only (no iOS yet — see [`feat/kmp`](#) for the in-progress KMP migration).
- WebView clipping math depends on `devicePixelRatio`; tested on Pixel 9 Pro XL.

## License

Demo / prototype. No license attached; treat as source-available reference, not OSS.
