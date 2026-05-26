# A2UI v0.8 Wire Shapes — Lumen Concierge

This project speaks the **A2UI v0.8** protocol. Every agent bubble is a
self-contained A2UI **surface**, transmitted as a `surfaceUpdate` followed
by a `beginRendering` and (when the user closes a transient sheet) a
`deleteSurface`.

The demo uses **two catalogs**:

* **Standard v0.8 catalog**
  (`https://a2ui.org/specification/v0_8/standard_catalog_definition.json`)
  — used by `chips`, `form`, `confirmation`, `tx_detail`. These bubbles
  are graphs of standard primitives (`Text`, `Image`, `Row`, `Column`,
  `Card`, `Button`, `CheckBox`, `TextField`, `MultipleChoice`).
* **Custom catalog `lumen.com:concierge/v1`** — used by `products`
  (`CardGrid`), `product_detail` (`ProductDetail`), and `payment_challenge`
  (`PaymentChallenge`). These bundle interaction logic the standard
  primitives can't express (image carousel, embedded x402 signing flow).

**Source consulted:**
- `https://a2ui.org/specification/v0.8-a2ui` — spec overview
- `https://a2ui.org/specification/v0_8/standard_catalog_definition.json`
- `https://raw.githubusercontent.com/google/A2UI/main/specification/v0_8/json/server_to_client.json`
- `https://raw.githubusercontent.com/google/A2UI/main/specification/v0_8/json/client_to_server.json`
- `https://raw.githubusercontent.com/google/A2UI/main/specification/v0_8/json/catalog_description_schema.json`

---

## 1. Envelope (server → client)

Every A2UI message follows the v0.8 server-to-client schema and contains
exactly one of `surfaceUpdate`, `dataModelUpdate`, `beginRendering`, or
`deleteSurface`. Each `/chat` SSE `event: a2ui` frame carries one such
message — one A2UI message per line, matching the spec's JSONL guidance.

A typical agent bubble emits **two messages** back-to-back: a
`surfaceUpdate` carrying the component graph, then a `beginRendering`
pointing at the root id.

```jsonl
{"surfaceUpdate":{"surfaceId":"s-1d2c3b","components":[
  {"id":"c-col","component":{"Column":{"children":{"explicitList":["c-q","c-row"]}}}},
  {"id":"c-q","component":{"Text":{"text":{"literalString":"What does she lean toward?"},"usageHint":"h4"}}},
  {"id":"c-row","component":{"Row":{"children":{"explicitList":["c-b1"]}}}},
  {"id":"c-b1","component":{"Button":{"child":"c-b1l","action":{"name":"chip-group","context":[{"key":"value","value":{"literalString":"jewelry"}}]}}}},
  {"id":"c-b1l","component":{"Text":{"text":{"literalString":"Jewelry"}}}}
]}}
{"beginRendering":{"surfaceId":"s-1d2c3b","root":"c-col",
                    "catalogId":"https://a2ui.org/specification/v0_8/standard_catalog_definition.json"}}
```

Component-property values follow the spec's **BoundValue** wrapping:
`{"literalString": "..."}`, `{"literalNumber": 1}`, `{"literalBoolean":
true}`, `{"literalArray": []}`, or `{"path": "/cart/total"}` for live
data-model references.

`children` on container components (`Row`, `Column`, `List`) is either
`{"explicitList": [id, ...]}` (used everywhere here) or
`{"template": {componentId, dataBinding}}` (not yet emitted by any
builder).

Producer: `backend/src/concierge/a2ui.py`. Each builder returns
`list[dict]` — a (surfaceUpdate, beginRendering) pair.

Consumers:
- `host-bundle/src/shim.js` (Android WebView) — `window.a2ui.ingest(msg)`
  buffers `surfaceUpdate` frames per `surfaceId`, dispatches based on
  `beginRendering.catalogId`, resolves BoundValues against the surface
  data model, and mounts either a standard primitive (plain HTML) or a
  custom Lit element under `#a2ui-root`.
- `host-bundle/index.html` (web app) — identical interpreter, mounted
  per-bubble.

## 2. Standard catalog surfaces

Built with `Text`, `Image`, `Row`, `Column`, `Card`, `Button`,
`CheckBox`, `TextField`, `MultipleChoice` from the v0.8 standard catalog.
The Python builders compose them into adjacency-list graphs.

### 2.1 Chips (`a2ui.chips`)

`Column { Text(question), Row { Button(option1), Button(option2), ... } }`.
Each chip is a `Button`; tapping it fires the `chip-group` action with
the chip's value as a literal `BoundValue` in `action.context`. Result:
one-tap selection, fully spec-conformant.

### 2.2 Form (`a2ui.form`)

`Column { ...field components..., Button("Place order") }`. Field types
map to standard primitives:

| Demo field | Standard component                          |
|------------|---------------------------------------------|
| `toggle`   | `CheckBox` with `value: {path: "/<name>"}`  |
| `text`     | `TextField` (longText) with `text: {path}`  |
| `address`  | `TextField` (shortText) with `text: {path}` |

Each input two-way binds to a path in the surface data model. The submit
button's action has `context: [{key: "values", value: {path: "/"}}]` so
the agent receives the whole data-model object as `values`.

### 2.3 Confirmation (`a2ui.confirmation`)

`Card { Column { Text(title), Row(label, amount) × N, Text(total),
Text(shipDate), Button("View transaction") } }`. The Button's action is
`tx-detail-open` with the order id, tx hash, ship date, total, and
explorer url encoded as literal context entries. The host treats that
action as the marker that a confirmation surface has arrived (used for
haptic + entrance animation).

### 2.4 Transaction detail (`a2ui.tx_detail`)

`Card { Column { Text("Transaction details"), Row(label, value) × N,
Button("Close"), Button("Open in explorer") } }`. The Android host also
synthesises the same shape client-side (`ChatViewModel.buildTxDetailSurface`)
when the user taps "View transaction" — no server round-trip needed.

## 3. Custom catalog `lumen.com:concierge/v1`

Three composite components remain custom because the standard primitives
don't capture their interaction model.

### 3.1 CardGrid

```json
{"CardGrid": {
  "section":   {"literalString": "Quietly Romantic"},
  "reasoning": {"literalString": "Three minimalist picks…"},
  "items": [
    {"id": "bar-pendant", "name": "Bar Pendant", "price": 124,
     "salePrice": null, "vendor": "Lumen Goods",
     "imageUrl": "https://…", "why": "Clean horizontal bar…"}
  ],
  "action": {"name": "card-grid"}
}}
```

Horizontal product rail with vendor styling and per-card "why" reason.
A standard-catalog equivalent would be `List(direction: horizontal)` of
`Card { Column { Image, Text, Text, Text } }`, but loses the rail's
flush-edge scroll layout and per-item "why" formatting.

### 3.2 ProductDetail

```json
{"ProductDetail": {
  "product": { "id": "...", "name": "...", "price": 124, "salePrice": null,
               "vendor": "...", "inStock": true,
               "imageUrl": "...", "images": ["..."], "description": "..." },
  "variantGroups": [
    {"name": "finish", "options": ["gold", "silver"], "select": "single"}
  ],
  "requiresAgeVerification": {"literalBoolean": false},
  "action": {"name": "product-detail"}
}}
```

Modal sheet with image carousel, paired variant pickers (disabled-state
logic for out-of-stock combinations), and a primary CTA. Variant
grouping with cross-disabling isn't expressible via standard
`MultipleChoice` alone.

### 3.3 PaymentChallenge

```json
{"PaymentChallenge": {
  "orderId": "A2UI-7741",
  "label":   {"literalString": "Lumen Goods — Bar Pendant"},
  "amountDisplay": {"literalString": "$132.00"},
  "items":   [ /* line items */ ],
  "challenge": { /* unsigned EIP-3009 challenge */ },
  "requiresAgeVerification": {"literalBoolean": true},
  "ageDcqlQueryJson":     {"literalString": "{...}"},
  "dpcDcqlQueryJson":     {"literalString": "{...}"},
  "loyaltyDiscountPct":   10,
  "loyaltyDcqlQueryJson": {"literalString": "{...}"},
  "action": {"name": "payment-challenge"}
}}
```

The x402 payment sheet. `challenge` is an opaque EIP-3009 transfer-with-authorization
struct that the Android wallet signs in StrongBox; DCQL query JSON is
shipped as a literal string so the Credential Manager call doesn't
double-encode it. None of this fits standard primitives.

## 4. Client → server: `userAction` envelope

User interactions bubble up as `a2ui-action` `CustomEvent`s; the shim
wraps each into the v0.8 client-to-server `userAction` envelope:

```json
{"userAction": {
  "name": "chip-group",
  "surfaceId": "s-1d2c3b",
  "sourceComponentId": "c-b1",
  "timestamp": "2026-05-20T18:42:11.043Z",
  "context": {"value": "jewelry"}
}}
```

For standard-catalog `Button`s the `context` keys come from
`action.context[].key` and the values are resolved from BoundValues
(literals or data-model `path`s) **at click time**, so the user's latest
input is captured.

Both the Android `ChatViewModel.extractUserAction()` and the web
`handleUserAction()` translate this envelope into the legacy
`[ui-action] {component: "<name>", ...context}` string the agent's
prompts (`backend/src/concierge/prompts.py`) still consume. The
translation is a thin compatibility shim — the wire format is fully
v0.8.

Pure UI dismissals (`*-close`) are intercepted at the bridge and never
sent to the agent.

## 5. Data binding and the BoundValue resolver

The shim's `resolveValue` walks each component's props and substitutes:

| Shape                                | Resolves to                |
|--------------------------------------|----------------------------|
| `{"literalString": "x"}`             | the string `"x"`           |
| `{"literalNumber": 1}`               | the number `1`             |
| `{"literalBoolean": true}`           | `true`                     |
| `{"literalArray": ["a", "b"]}`       | the array                  |
| `{"path": "/cart/total"}`            | `surface.dataModel.cart.total` |

Nested objects and arrays are walked recursively. Standard-catalog input
components (`TextField`, `CheckBox`, `MultipleChoice`) treat their bound
prop specially: the renderer reads the path's current value to seed the
control and registers an input handler that writes back to the same
path. `Button.action.context` items are resolved **at click time** so
the userAction envelope carries the user's latest edits.

`dataModelUpdate` messages patch the surface's data model and re-render
any bound props; the demo currently emits a fresh surface per turn, so
this path is exercised only when a future flow needs incremental updates
(e.g. live price ticks).

## 6. Lifecycle summary

```
agent.turn() yields AgentEvent("a2ui", msg)
    │  one v0.8 message per yield
    ▼
app.py    → SSE event: a2ui  data: <single v0.8 message>
    │
    ├─→ Android: SseClient → ChatViewModel.handleA2uiMessage
    │     • buffer surfaceUpdate frames by surfaceId
    │     • commit a chat bubble (or open a modal sheet) on beginRendering
    │     • AgentA2uiBubble replays the frame list through
    │       window.a2ui.ingest()
    │
    └─→ Web: SSE parser in index.html
          • ingest() → mountSurfaceBubble() on beginRendering
          • a2ui-action listener wraps interactions into userAction
            envelopes, translates to legacy [ui-action] payloads, then
            POSTs the next /chat turn
```

## 7. Adding a new bubble

**Prefer the standard catalog.** If a layout can be composed from `Text`,
`Image`, `Row`, `Column`, `Card`, `Button`, `CheckBox`, `TextField`, and
`MultipleChoice`:

1. Write a builder in `backend/src/concierge/a2ui.py` that returns a
   `(surfaceUpdate, beginRendering)` pair tagged with
   `STANDARD_CATALOG_ID`. Use the `_std_*` helpers and `_std_surface()`.
2. The shim's `instantiateStandard` already renders the primitives;
   nothing else to wire.
3. Add an entry under §2 of this doc.

**Fall back to the custom catalog** only when interactions can't be
expressed in the standard catalog (e.g. embedded wallet signing,
custom-disabled variant pickers):

1. Write a builder that emits a single root component in the custom
   catalog (still wrapped via `_wrap_surface`).
2. Register the type in `COMPONENT_TAG` in both `host-bundle/src/shim.js`
   and `host-bundle/index.html`.
3. Author a Lit element under `host-bundle/src/components/` that fires
   `a2ui-action` events for any user interactions.
4. Add an entry under §3 of this doc.
