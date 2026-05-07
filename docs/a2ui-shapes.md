# A2UI JSON Shapes — Five Demo Surfaces

This document records the canonical JSON shape for each of the five A2UI surfaces
used in the Gift Concierge demo. It distinguishes what comes directly from the
upstream A2UI v0.8 standard-catalog spec from what is our own application-level
extension/invention.

**Source consulted:** `https://raw.githubusercontent.com/google/A2UI/main/specification/v0_8/json/standard_catalog_definition.json`
(fetched 2026-05-07). The v0.8 specification is closed / stable (v0.8.2).

---

## Background: A2UI v0.8 Protocol vs. Our Application Envelope

The A2UI v0.8 wire format wraps components inside a `surfaceUpdate` message:

```json
{
  "surfaceUpdate": {
    "surfaceId": "string",
    "components": [
      { "id": "comp-1", "component": { "MultipleChoice": { ... } } }
    ]
  }
}
```

The fixtures in `backend/tests/fixtures/` are **not** raw wire messages.
They represent the **application-level payload** that our Python serializers
(`backend/src/concierge/a2ui.py`) produce and that the Lit web components
(`host-bundle/src/components/`) consume. This is a deliberate simplification:
the Android WebView shim owns the `surfaceUpdate` wrapper; the serializers only
need to produce the inner payload dict.

**Anything tagged [SPEC]** below is directly grounded in the v0.8 standard
catalog. **Anything tagged [EXTENSION]** is an invention (no direct v0.8
equivalent) — documented here so Task A4 and Task B2 authors know the
design rationale.

---

## Surface 1: Chip Group (single-select)

**Purpose:** Ask the user a single-choice preference question rendered as tappable chips.

**Closest v0.8 component:** `MultipleChoice` [SPEC] with `variant: "chips"` and
`maxAllowedSelections: 1`. The v0.8 shape is:

```json
{
  "MultipleChoice": {
    "selections": { "literalArray": [] },
    "options": [
      { "label": { "literalString": "Jewelry" }, "value": "jewelry" }
    ],
    "maxAllowedSelections": 1,
    "variant": "chips"
  }
}
```

**Our application envelope** [EXTENSION]: We flatten the nested v0.8 structure
into a simpler dict. The `question` field has no v0.8 equivalent (v0.8 relies on
a sibling `Text` component for labels). The `select: "single"` field mirrors
`maxAllowedSelections: 1` but in our own vocabulary.

**Fixture:** `backend/tests/fixtures/a2ui_chips.json`

```json
{
  "component": "chip-group",
  "question": "What does she lean toward?",
  "select": "single",
  "options": [
    { "value": "jewelry",    "label": "Jewelry" },
    { "value": "home",       "label": "Home" },
    { "value": "stationery", "label": "Stationery" },
    { "value": "skincare",   "label": "Skincare" }
  ]
}
```

**Field reference:**

| Field       | Type             | Origin      | Notes                                      |
|-------------|------------------|-------------|--------------------------------------------|
| `component` | string literal   | [EXTENSION] | Discriminator; value `"chip-group"`        |
| `question`  | string           | [EXTENSION] | Prompt text rendered above the chips       |
| `select`    | `"single"`       | [EXTENSION] | Maps to v0.8 `maxAllowedSelections: 1`     |
| `options[]` | array of objects | [SPEC]      | Each item has `value` (string) + `label` (string); mirrors v0.8 `MultipleChoice.options` |

**Unknowns/gaps:** v0.8 does not define a combined question+chips component.
An "address autocomplete" chip variant is also absent from v0.8; not needed here.

---

## Surface 2: Card Grid (product picks)

**Purpose:** Display a scrollable grid of product cards, each with an image,
name, price, and a short "why" rationale.

**Closest v0.8 component:** No direct v0.8 equivalent [EXTENSION]. The closest
v0.8 primitives would be a `List` of `Card` components, each wrapping a
`Column` of `Image` + `Text` children. However, that requires multiple component
IDs and a data-model binding — too verbose for our single-payload model.

**Our application envelope** [EXTENSION]: A flat `card-grid` payload with an
`items` array. Each item carries `id`, `name`, `price`, `image_url`, and `why`.
The Lit component (`host-bundle/src/components/card-grid.js`) handles layout.

**Fixture:** `backend/tests/fixtures/a2ui_products.json`

```json
{
  "component": "card-grid",
  "reasoning": "Three minimalist jewelry pieces that pair elegance with everyday wear.",
  "items": [
    {
      "id": "thread-necklace",
      "name": "Thread Necklace",
      "price": 89,
      "image_url": "https://images.example.com/jewelry/thread-necklace.jpg",
      "why": "Delicate 14k gold-fill thread — effortless layering for any neckline."
    },
    {
      "id": "bar-pendant",
      "name": "Bar Pendant",
      "price": 124,
      "image_url": "https://images.example.com/jewelry/bar-pendant.jpg",
      "why": "Clean horizontal bar in her choice of finish — a modern everyday staple."
    },
    {
      "id": "open-cuff",
      "name": "Open Cuff",
      "price": 142,
      "image_url": "https://images.example.com/jewelry/open-cuff.jpg",
      "why": "Sculptural open cuff that fits most wrists — minimal yet eye-catching."
    }
  ]
}
```

**Field reference:**

| Field           | Type             | Origin      | Notes                                           |
|-----------------|------------------|-------------|-------------------------------------------------|
| `component`     | string literal   | [EXTENSION] | Discriminator; value `"card-grid"`              |
| `reasoning`     | string           | [EXTENSION] | Agent's narrative; displayed above the grid     |
| `items[]`       | array of objects | [EXTENSION] | One entry per product pick                      |
| `items[].id`    | string           | [EXTENSION] | Stable product identifier                       |
| `items[].name`  | string           | [EXTENSION] | Display name                                    |
| `items[].price` | number (integer) | [EXTENSION] | Price in USD cents-free integer                 |
| `items[].image_url` | string (URL) | [EXTENSION] | Product image; maps to v0.8 `Image.url.literalString` |
| `items[].why`   | string           | [EXTENSION] | One-sentence rationale from the agent           |

---

## Surface 3: Product Detail (with variant pickers)

**Purpose:** Show a single product with image, name, price, and one or more
radio-style variant groups (e.g., finish and length).

**Closest v0.8 component:** No direct v0.8 equivalent [EXTENSION]. v0.8 offers
`MultipleChoice` for each variant group, but combining product display with
multiple pickers requires compositing several named components — again too
verbose for our envelope model.

**Our application envelope** [EXTENSION]: A `product-detail` payload that embeds
the product as a sub-object and lists `variant_groups` as an array. Each group
has a `name`, a flat `options` string array, and `select: "single"`.

**Fixture:** `backend/tests/fixtures/a2ui_product_detail.json`

```json
{
  "component": "product-detail",
  "product": {
    "id": "bar-pendant",
    "name": "Bar Pendant",
    "price": 124,
    "image_url": "https://images.example.com/jewelry/bar-pendant.jpg"
  },
  "variant_groups": [
    {
      "name": "finish",
      "options": ["gold", "silver", "rose gold"],
      "select": "single"
    },
    {
      "name": "length",
      "options": ["16\"", "18\""],
      "select": "single"
    }
  ]
}
```

**Field reference:**

| Field                          | Type             | Origin      | Notes                                                   |
|--------------------------------|------------------|-------------|---------------------------------------------------------|
| `component`                    | string literal   | [EXTENSION] | Discriminator; value `"product-detail"`                 |
| `product.id`                   | string           | [EXTENSION] | Stable product identifier                               |
| `product.name`                 | string           | [EXTENSION] | Display name                                            |
| `product.price`                | number (integer) | [EXTENSION] | Price in USD integer                                    |
| `product.image_url`            | string (URL)     | [EXTENSION] | Product image                                           |
| `variant_groups[]`             | array of objects | [EXTENSION] | One entry per variant dimension                         |
| `variant_groups[].name`        | string           | [EXTENSION] | Dimension identifier and label (e.g., `"finish"`)       |
| `variant_groups[].options`     | array of strings | [EXTENSION] | Available choices; maps to v0.8 `MultipleChoice.options[].value` |
| `variant_groups[].select`      | `"single"`       | [EXTENSION] | Exactly one selection required                          |

---

## Surface 4: Form (gift options)

**Purpose:** Collect gift-wrap preference (toggle), an optional gift note (text),
and a shipping address (address field) in a single scrollable form bubble.

**Closest v0.8 components:**
- Toggle/switch → `CheckBox` [SPEC]: v0.8 has `CheckBox` with boolean `value`.
  We map our `type: "toggle"` to this semantics.
- Text input → `TextField` [SPEC]: v0.8 `TextField` with `textFieldType: "shortText"`
  or `"longText"`. We add `max_length` as an extension attribute.
- Address field → No v0.8 equivalent [EXTENSION]. v0.8 has `TextField` but no
  address-aware type. We use `type: "address"` as an extension; the Lit component
  falls back to a plain multi-line text input if no native address picker is
  available.

**Our application envelope** [EXTENSION]: A `form` payload with a flat `fields`
array. Each field has `type`, `name`, and `label`. The `toggle` and `text` types
are grounded in v0.8 primitives; `address` is a pure extension.

**Fixture:** `backend/tests/fixtures/a2ui_form.json`

```json
{
  "component": "form",
  "fields": [
    {
      "type": "toggle",
      "name": "gift_wrap",
      "label": "Gift wrap (+$8)"
    },
    {
      "type": "text",
      "name": "note",
      "label": "Gift note",
      "max_length": 120
    },
    {
      "type": "address",
      "name": "ship_to",
      "label": "Ship to"
    }
  ]
}
```

**Field reference:**

| Field                   | Type           | Origin      | Notes                                                              |
|-------------------------|----------------|-------------|--------------------------------------------------------------------|
| `component`             | string literal | [EXTENSION] | Discriminator; value `"form"`                                      |
| `fields[]`              | array          | [EXTENSION] | Ordered list of form controls                                      |
| `fields[].type`         | string enum    | [EXTENSION] | `"toggle"` (→ v0.8 CheckBox), `"text"` (→ v0.8 TextField), `"address"` (pure extension) |
| `fields[].name`         | string         | [EXTENSION] | Machine name; used as key in submitted values dict                 |
| `fields[].label`        | string         | [SPEC-ish]  | Display label; mirrors v0.8 `CheckBox.label` / `TextField.label`  |
| `fields[].max_length`   | integer (opt.) | [EXTENSION] | Only for `type: "text"`; no v0.8 equivalent                       |

**Gap — address field:** v0.8 does not define an address-aware input.
Our `type: "address"` is a forward-compatible extension. If a future A2UI
version adds a native address component, the `type` value can be updated without
changing the rest of the shape.

---

## Surface 5: Confirmation Card

**Purpose:** Show a read-only order summary after checkout: order ID, line items
with amounts, total, and estimated ship date.

**Closest v0.8 component:** No direct v0.8 equivalent [EXTENSION]. The closest
v0.8 approach would be a `Card` wrapping a `Column` of `Text` + `Divider` +
`Row` components with data-model bindings — overly verbose for a static summary.

**Our application envelope** [EXTENSION]: A `confirmation-card` payload that
carries all order details as flat fields. The `items` array replaces v0.8's
`List`+`Row` pattern with a simple label/amount pair.

**Fixture:** `backend/tests/fixtures/a2ui_confirmation.json`

```json
{
  "component": "confirmation-card",
  "order_id": "A2UI-7741",
  "items": [
    { "label": "Bar Pendant · Silver · 16\"", "amount": 124 },
    { "label": "Gift wrap",                   "amount": 8 }
  ],
  "total": 132,
  "ship_date": "Mon, May 11"
}
```

**Field reference:**

| Field           | Type             | Origin      | Notes                                             |
|-----------------|------------------|-------------|---------------------------------------------------|
| `component`     | string literal   | [EXTENSION] | Discriminator; value `"confirmation-card"`        |
| `order_id`      | string           | [EXTENSION] | Human-readable order reference (e.g., `A2UI-7741`) |
| `items[]`       | array of objects | [EXTENSION] | Line items in the order summary                   |
| `items[].label` | string           | [EXTENSION] | Human-readable line-item description              |
| `items[].amount`| number (integer) | [EXTENSION] | Line-item price in USD integer                    |
| `total`         | number (integer) | [EXTENSION] | Sum of all `items[].amount` values                |
| `ship_date`     | string           | [EXTENSION] | Formatted estimated delivery date (e.g., `"Mon, May 11"`) |

---

## Summary: What Comes from the Spec vs. What We Invented

| Surface            | v0.8 Grounding                             | Extensions                                           |
|--------------------|---------------------------------------------|------------------------------------------------------|
| Chip group         | `MultipleChoice` (variant: chips, max: 1)  | `component`, `question`, `select` field name         |
| Card grid          | None (would need List+Card+Column+Image+Text) | Entire shape is an extension                       |
| Product detail     | `MultipleChoice` per variant group          | Entire envelope; `product` sub-object; `variant_groups` array |
| Form               | `CheckBox` (toggle), `TextField` (text)    | `component`, `name` field; `type: "address"` field  |
| Confirmation card  | None (would need Card+Column+Text+Divider)  | Entire shape is an extension                        |

The v0.8 standard catalog defines 16 primitive components (Text, Image, Icon,
Video, AudioPlayer, Row, Column, List, Card, Tabs, Divider, Modal, Button,
CheckBox, TextField, DateTimeInput, MultipleChoice, Slider). It does not define
higher-level commerce components (chip-group, card-grid, product-detail, form,
confirmation-card). All five of our surface types are **custom components** in
the A2UI terminology — they are an application-level extension layer on top of
the v0.8 primitives.
