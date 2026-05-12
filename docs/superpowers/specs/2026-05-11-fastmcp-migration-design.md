# FastMCP Migration Design

**Date:** 2026-05-11
**Status:** Approved

## Overview

Migrate the commerce/credential MCP server from `agentic_ai_commerce` (TypeScript + Express + SSE) to a standalone Python FastMCP service living inside `a2ui_concierge`. Wire the existing `GiftAgent` to consume it via the Anthropic API's native MCP beta. `agentic_ai_commerce` is reference-only — no changes made there.

## Goals

- Replace Express + `@modelcontextprotocol/sdk` SSE transport with FastMCP streamable-HTTP
- All new code lives in `a2ui_concierge/mcp/`
- `GiftAgent` keeps existing local tools (gift catalog, A2UI rendering) unchanged
- Commerce/credential tools added to the agent via `mcp_servers`
- Showcase age verification and loyalty membership credential flows within the gift concierge theme

## Architecture

```
a2ui_concierge/
├── backend/                            existing FastAPI agent
│   └── src/concierge/
│       ├── catalog.json                updated — adds credential fields + age-gated products
│       └── agent.py                    updated — add mcp_servers + beta flag
│
└── mcp/                                NEW standalone FastMCP service
    ├── pyproject.toml
    ├── server.py                       FastMCP app + all @mcp.tool decorators
    ├── data.py                         credential definitions + reads catalog.json
    ├── sessions.py                     in-memory checkout session store
    └── dcql.py                         DCQL query builder
```

**Runtime topology:**

```
[backend :8000]  GiftAgent
    ├── tools=TOOL_SCHEMAS     local: search_catalog, present_*, place_order, etc.
    └── mcp_servers=[url]  ──► [mcp/ :3001]  FastMCP "a2ui_concierge"
                                   prepare_checkout
                                   prepare_cart_checkout
                                   request_checkout_verification
                                   submit_credential
```

`list_products` is dropped from the MCP — `search_catalog` already handles product discovery.

## Catalog Changes (`backend/src/concierge/catalog.json`)

### New fields on every product

```json
{
  "required_credentials": ["payment_credential"],
  "optional_credentials": ["loyalty_membership"]
}
```

All existing products (jewelry, home, stationery, skincare) get `payment_credential` as required and `loyalty_membership` as optional (10% discount).

### New age-gated gift products (2–3 items)

Added to the catalog to showcase the age verification flow:

- **Champagne Gift Set** — category: `home`, requires `["age_verification", "payment_credential"]`
- **Whiskey Collection** — category: `home`, requires `["age_verification", "payment_credential"]`
- **Craft Beer Sampler** — category: `home`, requires `["age_verification", "payment_credential"]`

All three also carry `optional_credentials: ["loyalty_membership"]`.

## MCP Service (`mcp/`)

### `pyproject.toml`

Dependencies: `fastmcp`, `uvicorn`.

### `data.py`

- Loads `catalog.json` (relative path from `mcp/`) to get product credential requirements
- Defines three credential definitions:

| Key | Label | DCQL doctype | Discount |
|---|---|---|---|
| `age_verification` | Age verification (required for restricted products) | mso_mdoc — mDL, EU PID | — |
| `payment_credential` | Digital payment credential (required to pay) | mso_mdoc — multipaz payment | — |
| `loyalty_membership` | Loyalty membership (optional — 10% discount) | mso_mdoc — multipaz loyalty | 10% |

DCQL definitions ported from `agentic_ai_commerce/backend/src/stores/utopia-market.ts` and `dcql.ts`.

### `sessions.py`

In-memory `dict[str, Session]` for checkout drafts. Port of `sessions.ts`. No persistence needed.

### `dcql.py`

DCQL query builder. Port of `dcql.ts`. Builds the bundled credential request used by `request_checkout_verification`.

### `server.py`

FastMCP app named `"a2ui_concierge"`. Four tools:

```python
from fastmcp import FastMCP
mcp = FastMCP("a2ui_concierge")

@mcp.tool()
def prepare_checkout(order_id: str, product_id: str, quantity: int = 1) -> dict: ...

@mcp.tool()
def prepare_cart_checkout(order_id: str, items: list[dict]) -> dict: ...

@mcp.tool()
def request_checkout_verification(
    order_id: str, amount: float, include_optional_credentials: bool = True
) -> dict: ...

@mcp.tool()
def submit_credential(
    session_id: str, credential_type: str, credentials: dict[str, bool]
) -> dict: ...

if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=3001)
```

## Agent Changes (`backend/src/concierge/agent.py`)

Switch to `client.beta.messages.create` and add:

```python
mcp_servers=[{
    "type": "url",
    "url": "http://localhost:3001/mcp",
    "name": "a2ui_concierge",
}],
betas=["mcp-client-2025-04-04"],
```

Existing `tools=TOOL_SCHEMAS` and `run_tool()` / `_a2ui` handling remain untouched.

## Full Tool Inventory

| Tool | Source | Handler |
|---|---|---|
| `search_catalog` | local | `tools.py` |
| `get_product` | local | `tools.py` |
| `place_order` | local | `tools.py` |
| `present_chips` | local | `tools.py` |
| `present_products` | local | `tools.py` |
| `present_product_detail` | local | `tools.py` |
| `present_form` | local | `tools.py` |
| `present_confirmation` | local | `tools.py` |
| `prepare_checkout` | MCP | `mcp/server.py` |
| `prepare_cart_checkout` | MCP | `mcp/server.py` |
| `request_checkout_verification` | MCP | `mcp/server.py` |
| `submit_credential` | MCP | `mcp/server.py` |

## Error Handling

- MCP tools return `{"success": false, "error": "..."}` for expected failures (unknown product, missing session)
- If the MCP server is unreachable the Anthropic API surfaces an error to the caller — no special handling needed in `agent.py`

## Out of Scope

- Persistence for checkout sessions (in-memory only)
- Auth/TLS on the MCP endpoint (local dev)
- Migrating or modifying `agentic_ai_commerce`
