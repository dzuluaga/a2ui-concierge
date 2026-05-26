// A2UI v0.8 interpreter for the Lumen Concierge custom catalog.
//
// Exposes window.a2ui with:
//   • ingest(messageJson)  — accept a single v0.8 message (surfaceUpdate,
//                            dataModelUpdate, beginRendering, deleteSurface).
//                            String or object both accepted; arrays trigger
//                            sequential ingestion.
//   • applyTheme(tokens)   — set CSS custom properties from a {name: value}
//                            map. Unchanged from the pre-spec shim.
//   • reset()              — drop all surface buffers; used between bubbles.
//
// On a beginRendering message the interpreter walks the named root,
// resolves every BoundValue against the surface's data model, instantiates
// the corresponding custom-element, and mounts it under #a2ui-root.
// User actions inside the component bubble up as `a2ui-action` CustomEvents
// carrying {name, context}; the shim wraps each into a v0.8 userAction
// envelope and ships it through window.AndroidBridge.onAction.
//
// Two catalogs are supported:
//   • CATALOG_ID            — Lumen-specific composite components
//                             (CardGrid, ProductDetail, PaymentChallenge)
//                             still backed by Lit custom elements.
//   • STANDARD_CATALOG_ID   — v0.8 standard primitives (Text, Image, Row,
//                             Column, Card, Button, CheckBox, TextField,
//                             MultipleChoice, Divider) rendered as plain
//                             HTML with theme-token styling.
// Surfaces carrying any other catalogId are logged and ignored.

import "./theme.css";
// Only composite components still backed by the custom catalog are imported.
// Chip groups, forms, confirmations, and tx-detail are now built from the
// standard catalog and rendered by instantiateStandard.
import "./components/card-grid.js";
import "./components/product-detail.js";
import "./components/payment-challenge.js";

export const CATALOG_ID = "lumen.com:concierge/v1";
export const STANDARD_CATALOG_ID =
  "https://a2ui.org/specification/v0_8/standard_catalog_definition.json";

// Custom-catalog component-type → custom-element tag-name.
const COMPONENT_TAG = {
  CardGrid: "a2ui-card-grid",
  ProductDetail: "a2ui-product-detail",
  PaymentChallenge: "a2ui-payment-challenge",
};

// Per-surface buffer: { components: Map<id, def>, dataModel: object,
//                       root?: string, catalogId?: string }
const surfaces = new Map();

function root() {
  return document.getElementById("a2ui-root");
}

function dlog(msg) {
  if (window.AndroidBridge?.log) window.AndroidBridge.log(msg);
}

// ── message dispatch ────────────────────────────────────────────────────

function ingest(msg) {
  if (msg == null) return;
  if (typeof msg === "string") {
    try { msg = JSON.parse(msg); } catch (e) { dlog(`ingest parse error: ${e}`); return; }
  }
  if (Array.isArray(msg)) {
    for (const m of msg) ingest(m);
    return;
  }
  if (msg.surfaceUpdate) handleSurfaceUpdate(msg.surfaceUpdate);
  else if (msg.dataModelUpdate) handleDataModelUpdate(msg.dataModelUpdate);
  else if (msg.beginRendering) handleBeginRendering(msg.beginRendering);
  else if (msg.deleteSurface) handleDeleteSurface(msg.deleteSurface);
  else dlog(`ingest: unknown message keys ${Object.keys(msg).join(",")}`);
}

function ensureSurface(surfaceId) {
  let s = surfaces.get(surfaceId);
  if (!s) {
    s = { surfaceId, components: new Map(), dataModel: {} };
    surfaces.set(surfaceId, s);
  }
  return s;
}

function handleSurfaceUpdate({ surfaceId, components }) {
  const s = ensureSurface(surfaceId);
  for (const c of components || []) {
    if (c && c.id) s.components.set(c.id, c);
  }
  dlog(`surfaceUpdate: ${surfaceId} components=${(components || []).length}`);
}

function handleDataModelUpdate({ surfaceId, path, contents }) {
  const s = ensureSurface(surfaceId);
  const entries = (contents || []).reduce((acc, e) => {
    if (!e || typeof e.key !== "string") return acc;
    if ("valueString" in e) acc[e.key] = e.valueString;
    else if ("valueNumber" in e) acc[e.key] = e.valueNumber;
    else if ("valueBoolean" in e) acc[e.key] = e.valueBoolean;
    else if ("valueMap" in e) acc[e.key] = mapFromEntries(e.valueMap);
    return acc;
  }, {});
  if (!path || path === "/") {
    s.dataModel = entries;
  } else {
    setByPath(s.dataModel, path, entries);
  }
  if (s.root) renderSurface(surfaceId);
}

function mapFromEntries(arr) {
  const out = {};
  for (const e of arr || []) {
    if (!e || typeof e.key !== "string") continue;
    if ("valueString" in e) out[e.key] = e.valueString;
    else if ("valueNumber" in e) out[e.key] = e.valueNumber;
    else if ("valueBoolean" in e) out[e.key] = e.valueBoolean;
  }
  return out;
}

function handleBeginRendering({ surfaceId, root: rootId, catalogId, styles }) {
  const s = ensureSurface(surfaceId);
  s.root = rootId;
  s.catalogId = catalogId || CATALOG_ID;
  if (styles) applyStyles(styles);
  if (s.catalogId !== CATALOG_ID && s.catalogId !== STANDARD_CATALOG_ID) {
    // Other catalog ids are logged and ignored — proceeding to renderSurface
    // would emit "unknown component" placeholders for foreign types. Also
    // clear any DOM previously mounted into this surface so a stale render
    // doesn't linger.
    dlog(`beginRendering: unsupported catalogId=${s.catalogId} — ignoring`);
    const r = root();
    if (r && r.dataset.surfaceId === surfaceId) {
      r.innerHTML = "";
      delete r.dataset.surfaceId;
    }
    return;
  }
  renderSurface(surfaceId);
}

function handleDeleteSurface({ surfaceId }) {
  surfaces.delete(surfaceId);
  const r = root();
  if (r && r.dataset.surfaceId === surfaceId) r.innerHTML = "";
}

// ── rendering ───────────────────────────────────────────────────────────

function renderSurface(surfaceId) {
  const r = root();
  if (!r) return;
  const s = surfaces.get(surfaceId);
  if (!s || !s.root) return;
  const def = s.components.get(s.root);
  if (!def) { dlog(`renderSurface: root ${s.root} not in buffer`); return; }
  lastReported = -1;
  r.innerHTML = "";
  r.dataset.surfaceId = surfaceId;
  const el = instantiate(def, s);
  if (!el) {
    r.textContent = `unknown component type: ${describeComponent(def)}`;
    reportSize();
    return;
  }
  // Tag the mounted root so the standard-catalog stylesheet can give it
  // outer chrome (border, padding, shadow) when it's a Column/Row/etc.
  // Card already has its own card styling; a top-level Card doesn't need
  // the extra frame.
  if (s.catalogId === STANDARD_CATALOG_ID) el.classList.add("a2ui-std-root");
  r.appendChild(el);
  awaitRenderAndMeasure(el);
}

function describeComponent(def) {
  if (!def || !def.component) return "<no component>";
  return Object.keys(def.component)[0] || "<empty>";
}

function instantiate(def, surface) {
  const entry = Object.entries(def.component || {})[0];
  if (!entry) return null;
  const [type, rawProps] = entry;
  if (surface.catalogId === STANDARD_CATALOG_ID) {
    return instantiateStandard(type, rawProps, def.id, surface);
  }
  const tag = COMPONENT_TAG[type];
  if (!tag) return null;
  const el = document.createElement(tag);
  el._a2uiType = type;
  el._a2uiSurfaceId = surface.surfaceId;
  el._a2uiSourceComponentId = def.id;
  const resolved = resolveValue(rawProps, surface);
  if (resolved && typeof resolved === "object") {
    for (const [k, v] of Object.entries(resolved)) el[k] = v;
  }
  return el;
}

// ── standard catalog rendering ─────────────────────────────────────────
// Renders v0.8 primitives as plain DOM. Input components two-way bind to
// the surface's data model via {path} BoundValues; Button.action.context
// items are resolved at click time so the userAction envelope carries the
// up-to-date data-model snapshot.

function instantiateChildById(id, surface) {
  if (!id) return null;
  const def = surface.components.get(id);
  if (!def) return null;
  return instantiate(def, surface);
}

function appendChildren(parent, childrenSpec, surface) {
  if (!childrenSpec) return;
  if (Array.isArray(childrenSpec.explicitList)) {
    for (const id of childrenSpec.explicitList) {
      const el = instantiateChildById(id, surface);
      if (el) parent.appendChild(el);
    }
  }
  // (template/dataBinding deferred — not used by the current builders)
}

function mapDistribution(d) {
  return ({
    start: "flex-start", center: "center", end: "flex-end",
    spaceAround: "space-around", spaceBetween: "space-between",
    spaceEvenly: "space-evenly",
  })[d] || "flex-start";
}

function mapAlignment(a, fallback) {
  return ({
    start: "flex-start", center: "center", end: "flex-end", stretch: "stretch",
  })[a] || fallback || "flex-start";
}

const TEXT_TAG = {
  h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5",
  caption: "small", body: "span",
};

function bvIsPath(bv) {
  return bv && typeof bv === "object" && typeof bv.path === "string";
}

function initIfAbsent(surface, bv, value) {
  if (!bvIsPath(bv)) return;
  if (getByPath(surface.dataModel, bv.path) === undefined) {
    setByPath(surface.dataModel, bv.path, value);
  }
}

function instantiateStandard(type, rawProps, componentId, surface) {
  ensureStdStyles();
  rawProps = rawProps || {};
  let el = null;
  switch (type) {
    case "Text": {
      const text = resolveValue(rawProps.text, surface);
      const hint = rawProps.usageHint || "body";
      el = document.createElement(TEXT_TAG[hint] || "span");
      el.className = `a2ui-std-text a2ui-std-text-${hint}`;
      el.textContent = text == null ? "" : String(text);
      break;
    }
    case "Image": {
      el = document.createElement("img");
      el.className = "a2ui-std-image";
      el.src = resolveValue(rawProps.url, surface) || "";
      const alt = resolveValue(rawProps.altText, surface);
      if (alt) el.alt = alt;
      if (rawProps.fit) el.style.objectFit = rawProps.fit;
      if (rawProps.usageHint) el.classList.add(`a2ui-std-image-${rawProps.usageHint}`);
      break;
    }
    case "Icon": {
      el = document.createElement("span");
      el.className = "a2ui-std-icon";
      const name = resolveValue(rawProps.name, surface) || "";
      el.dataset.icon = name;
      el.setAttribute("aria-label", name);
      el.textContent = ICON_GLYPH[name] || "•";
      break;
    }
    case "Row":
    case "Column":
    case "List": {
      el = document.createElement("div");
      el.className = type === "Row" ? "a2ui-std-row"
        : type === "Column" ? "a2ui-std-col"
        : (rawProps.direction === "horizontal" ? "a2ui-std-row" : "a2ui-std-col");
      el.style.justifyContent = mapDistribution(rawProps.distribution);
      el.style.alignItems = mapAlignment(rawProps.alignment, type === "Row" ? "center" : "stretch");
      appendChildren(el, rawProps.children, surface);
      break;
    }
    case "Card": {
      el = document.createElement("div");
      el.className = "a2ui-std-card";
      const childEl = instantiateChildById(rawProps.child, surface);
      if (childEl) el.appendChild(childEl);
      break;
    }
    case "Divider": {
      el = document.createElement("hr");
      el.className = `a2ui-std-divider ${rawProps.axis === "vertical" ? "vertical" : "horizontal"}`;
      break;
    }
    case "Button": {
      el = document.createElement("button");
      el.type = "button";
      el.className = "a2ui-std-btn" + (rawProps.primary ? " primary" : "");
      const childEl = instantiateChildById(rawProps.child, surface);
      if (childEl) el.appendChild(childEl);
      const action = rawProps.action;
      // Guard against rapid double-dispatch: once the user has triggered
      // an action, lock the button until the surface is replaced. WebView
      // touch handling occasionally fires both a synthesized click and a
      // touch-derived click in quick succession on Android; this keeps the
      // agent from receiving two identical [ui-action] turns back-to-back.
      let fired = false;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (fired || !action || !action.name) return;
        fired = true;
        el.disabled = true;
        const ctx = {};
        for (const c of action.context || []) {
          if (!c || typeof c.key !== "string") continue;
          ctx[c.key] = resolveValue(c.value, surface);
        }
        el.dispatchEvent(new CustomEvent("a2ui-action", {
          bubbles: true, composed: true,
          detail: { name: action.name, context: ctx },
        }));
      });
      break;
    }
    case "CheckBox": {
      el = document.createElement("label");
      el.className = "a2ui-std-checkbox";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      const initial = !!resolveValue(rawProps.value, surface);
      cb.checked = initial;
      initIfAbsent(surface, rawProps.value, initial);
      const span = document.createElement("span");
      span.className = "a2ui-std-checkbox-label";
      span.textContent = resolveValue(rawProps.label, surface) || "";
      el.appendChild(cb);
      el.appendChild(span);
      cb.addEventListener("change", () => {
        if (bvIsPath(rawProps.value)) setByPath(surface.dataModel, rawProps.value.path, cb.checked);
      });
      break;
    }
    case "TextField": {
      el = document.createElement("div");
      el.className = "a2ui-std-textfield";
      const labelText = resolveValue(rawProps.label, surface);
      if (labelText) {
        const lbl = document.createElement("div");
        lbl.className = "a2ui-std-textfield-label";
        lbl.textContent = labelText;
        el.appendChild(lbl);
      }
      const tfType = rawProps.textFieldType || "shortText";
      const input = tfType === "longText"
        ? document.createElement("textarea")
        : document.createElement("input");
      if (input.tagName === "INPUT") {
        input.type = ({ date: "date", number: "number", obscured: "password" })[tfType] || "text";
      } else {
        input.rows = 2;
      }
      input.className = "a2ui-std-textfield-input";
      const initial = resolveValue(rawProps.text, surface);
      input.value = initial == null ? "" : String(initial);
      initIfAbsent(surface, rawProps.text, input.value);
      if (rawProps.validationRegexp && input.tagName === "INPUT") {
        input.pattern = rawProps.validationRegexp;
      }
      input.placeholder = labelText || "";
      input.addEventListener("input", () => {
        if (bvIsPath(rawProps.text)) setByPath(surface.dataModel, rawProps.text.path, input.value);
      });
      el.appendChild(input);
      break;
    }
    case "MultipleChoice": {
      el = document.createElement("div");
      const variant = rawProps.variant || "checkbox";
      el.className = `a2ui-std-mc a2ui-std-mc-${variant}`;
      const maxN = rawProps.maxAllowedSelections;
      const initial = resolveValue(rawProps.selections, surface);
      let selections = Array.isArray(initial) ? [...initial] : [];
      initIfAbsent(surface, rawProps.selections, selections);
      const options = rawProps.options || [];
      const repaint = () => {
        for (const child of el.children) {
          const v = child.dataset.value;
          child.setAttribute("aria-pressed", selections.includes(v) ? "true" : "false");
        }
      };
      for (const opt of options) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "a2ui-std-mc-option";
        btn.dataset.value = opt.value;
        btn.textContent = resolveValue(opt.label, surface) || opt.value;
        btn.setAttribute("aria-pressed", selections.includes(opt.value) ? "true" : "false");
        btn.addEventListener("click", () => {
          const v = opt.value;
          if (selections.includes(v)) {
            selections = selections.filter(x => x !== v);
          } else if (maxN === 1) {
            selections = [v];
          } else if (typeof maxN === "number" && selections.length >= maxN) {
            return;
          } else {
            selections.push(v);
          }
          if (bvIsPath(rawProps.selections)) {
            setByPath(surface.dataModel, rawProps.selections.path, selections);
          }
          repaint();
        });
        el.appendChild(btn);
      }
      break;
    }
    default:
      dlog(`instantiateStandard: unknown type ${type}`);
      return null;
  }
  el._a2uiType = type;
  el._a2uiSurfaceId = surface.surfaceId;
  el._a2uiSourceComponentId = componentId;
  return el;
}

// Minimal mapping of v0.8 standard icon names → display glyph. Production
// renderers would swap in an icon font; the demo doesn't ship one.
const ICON_GLYPH = {
  check: "✓", close: "✕", arrowBack: "←", arrowForward: "→",
  home: "⌂", search: "⌕", info: "ⓘ", warning: "⚠", error: "⚠",
  shoppingCart: "🛒", payment: "💳", lock: "🔒", lockOpen: "🔓",
  star: "★", starOff: "☆", favorite: "♥", favoriteOff: "♡",
};

let _stdStylesInjected = false;
function ensureStdStyles() {
  if (_stdStylesInjected) return;
  _stdStylesInjected = true;
  const css = `
    /* Top-level non-Card root gets the same outer chrome as the old custom
       components so chips/forms/etc. don't render as bare flex boxes. */
    .a2ui-std-root:not(.a2ui-std-card) { margin: 0 12px; padding: 14px 16px; background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md, 14px); box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); font-family: var(--a2ui-font-sans, system-ui, sans-serif); }
    .a2ui-std-root.a2ui-std-col { gap: 12px; }
    .a2ui-std-text { font-family: var(--a2ui-font-sans, system-ui, sans-serif); color: #1B1B1F; line-height: 1.45; }
    .a2ui-std-text-h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
    .a2ui-std-text-h2 { font-size: 18px; font-weight: 700; margin: 0 0 6px; }
    .a2ui-std-text-h3 { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
    .a2ui-std-text-h4 { font-size: 14px; font-weight: 600; margin: 0 0 6px; }
    .a2ui-std-text-h5 { font-size: 13px; font-weight: 600; margin: 0 0 4px; letter-spacing: .2px; }
    .a2ui-std-text-caption { font-size: 12px; color: #6b6973; }
    .a2ui-std-text-body { font-size: 14px; }
    .a2ui-std-row { display: flex; flex-direction: row; gap: 8px; flex-wrap: wrap; }
    .a2ui-std-col { display: flex; flex-direction: column; gap: 8px; }
    .a2ui-std-card { margin: 0 12px; padding: 14px 16px; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md, 14px); background: #fff; box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); font-family: var(--a2ui-font-sans, system-ui, sans-serif); }
    .a2ui-std-divider.horizontal { border: 0; border-top: 1px solid #ece8e0; margin: 6px 0; }
    .a2ui-std-divider.vertical { border: 0; border-left: 1px solid #ece8e0; align-self: stretch; }
    .a2ui-std-image { max-width: 100%; border-radius: 10px; }
    .a2ui-std-image-icon { width: 16px; height: 16px; border-radius: 0; }
    .a2ui-std-image-avatar { width: 36px; height: 36px; border-radius: 50%; }
    .a2ui-std-image-smallFeature { max-height: 96px; }
    .a2ui-std-image-mediumFeature { max-height: 200px; }
    .a2ui-std-image-largeFeature { max-height: 320px; }
    .a2ui-std-image-header { width: 100%; max-height: 220px; object-fit: cover; }
    .a2ui-std-icon { display: inline-block; min-width: 1em; text-align: center; }
    .a2ui-std-btn { font: inherit; font-size: 14px; font-weight: 600; padding: 9px 16px; border-radius: 999px; border: 1px solid #e5e1d8; background: #faf7f1; color: #1B1B1F; cursor: pointer; transition: background .15s, border-color .15s, transform .08s; }
    .a2ui-std-btn:active { transform: scale(0.97); }
    .a2ui-std-btn[aria-pressed="true"] { background: var(--a2ui-color-accent, #5b6cff); color: #fff; border-color: var(--a2ui-color-accent, #5b6cff); }
    .a2ui-std-btn.primary { background: var(--a2ui-color-accent, #5b6cff); color: #fff; border-color: var(--a2ui-color-accent, #5b6cff); box-shadow: 0 4px 12px -4px rgba(91, 108, 255, 0.45); }
    .a2ui-std-checkbox { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-family: var(--a2ui-font-sans, system-ui, sans-serif); font-size: 14px; color: #1B1B1F; }
    .a2ui-std-checkbox input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--a2ui-color-accent, #5b6cff); }
    .a2ui-std-textfield { display: flex; flex-direction: column; gap: 6px; font-family: var(--a2ui-font-sans, system-ui, sans-serif); }
    .a2ui-std-textfield-label { font-size: 11px; color: #8a8790; text-transform: uppercase; letter-spacing: .8px; font-weight: 600; }
    .a2ui-std-textfield-input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #e5e1d8; border-radius: 10px; font: inherit; font-size: 14px; color: #1B1B1F; background: #faf7f1; }
    .a2ui-std-textfield-input:focus { outline: none; border-color: var(--a2ui-color-accent, #5b6cff); background: #fff; }
    .a2ui-std-mc { display: flex; flex-wrap: wrap; gap: 6px; }
    .a2ui-std-mc-chips .a2ui-std-mc-option { font: inherit; font-size: 13px; padding: 7px 14px; border-radius: 999px; border: 1px solid #e5e1d8; background: #faf7f1; color: #2a2a30; cursor: pointer; transition: background .15s, border-color .15s, transform .08s; }
    .a2ui-std-mc-chips .a2ui-std-mc-option:active { transform: scale(0.97); }
    .a2ui-std-mc-chips .a2ui-std-mc-option[aria-pressed="true"] { background: var(--a2ui-color-accent, #5b6cff); color: #fff; border-color: var(--a2ui-color-accent, #5b6cff); }
    .a2ui-std-mc-checkbox { flex-direction: column; align-items: stretch; }
    .a2ui-std-mc-checkbox .a2ui-std-mc-option { font: inherit; font-size: 14px; padding: 10px 12px; border-radius: 10px; border: 1px solid #e5e1d8; background: #faf7f1; color: #1B1B1F; cursor: pointer; text-align: left; }
    .a2ui-std-mc-checkbox .a2ui-std-mc-option[aria-pressed="true"] { background: #fff; border-color: var(--a2ui-color-accent, #5b6cff); box-shadow: 0 0 0 1px var(--a2ui-color-accent, #5b6cff) inset; }
  `;
  const tag = document.createElement("style");
  tag.id = "a2ui-std-styles";
  tag.textContent = css;
  document.head.appendChild(tag);
}

async function awaitRenderAndMeasure(el) {
  if (el && el.updateComplete) {
    try { await el.updateComplete; } catch { /* no-op */ }
  }
  reportSize();
  el?.addEventListener("load", reportSize, true);
  el?.addEventListener("error", reportSize, true);
  let n = 0;
  const id = setInterval(() => { reportSize(); if (++n > 10) clearInterval(id); }, 80);
}

// Resolve BoundValue objects against a surface's data model. The function
// walks plain objects and arrays so nested fields (e.g. an options list of
// `{value, label: {literalString}}`) are normalised in one pass.
function resolveValue(v, surface) {
  if (v == null) return v;
  if (Array.isArray(v)) return v.map(x => resolveValue(x, surface));
  if (typeof v !== "object") return v;
  if (isBoundValue(v)) return resolveBound(v, surface);
  const out = {};
  for (const [k, sub] of Object.entries(v)) out[k] = resolveValue(sub, surface);
  return out;
}

const BOUND_KEYS = new Set([
  "literalString", "literalNumber", "literalBoolean", "literalArray", "path",
]);

function isBoundValue(o) {
  const keys = Object.keys(o);
  if (keys.length === 0 || keys.length > 1) return false;
  return BOUND_KEYS.has(keys[0]);
}

function resolveBound(v, surface) {
  if ("literalString" in v) return v.literalString;
  if ("literalNumber" in v) return v.literalNumber;
  if ("literalBoolean" in v) return v.literalBoolean;
  if ("literalArray" in v) return v.literalArray;
  if ("path" in v) return getByPath(surface.dataModel, v.path);
  return undefined;
}

function getByPath(model, path) {
  if (!path || path === "/") return model;
  const parts = path.replace(/^\/+/, "").split("/");
  let cur = model;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setByPath(model, path, value) {
  const parts = path.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts.length === 0) return;
  let cur = model;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== "object") {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// ── styles ──────────────────────────────────────────────────────────────

function applyStyles(styles) {
  for (const [k, v] of Object.entries(styles || {})) {
    if (k === "primaryColor") {
      document.documentElement.style.setProperty("--a2ui-color-accent", v);
    } else if (k === "font") {
      document.documentElement.style.setProperty("--a2ui-font-sans", v);
    } else {
      document.documentElement.style.setProperty(`--a2ui-${k}`, v);
    }
  }
}

function applyTheme(tokens) {
  for (const [k, v] of Object.entries(tokens || {})) {
    document.documentElement.style.setProperty(`--a2ui-${k}`, v);
  }
}

// ── action emission (client → server, v0.8 userAction envelope) ────────

function emitUserAction(detail, sourceEl) {
  const name = detail?.name;
  if (!name) return;
  const envelope = {
    userAction: {
      name,
      surfaceId: sourceEl?._a2uiSurfaceId ?? null,
      sourceComponentId: sourceEl?._a2uiSourceComponentId ?? null,
      timestamp: new Date().toISOString(),
      context: detail.context || {},
    },
  };
  const payload = JSON.stringify(envelope);
  if (window.AndroidBridge?.onAction) window.AndroidBridge.onAction(payload);
  window.parent?.postMessage({ type: "a2ui:userAction", message: envelope }, "*");
}

document.addEventListener("a2ui-action", (e) => {
  emitUserAction(e.detail || {}, e.target);
});

// ── size reporting (unchanged from pre-spec shim) ──────────────────────

let lastReported = -1;
function reportSize() {
  const r = root();
  if (!r) return;
  const sH = r.scrollHeight;
  const oH = r.offsetHeight;
  const cssH = Math.max(sH, oH) + 12;
  const cssClamped = Math.max(60, cssH);
  const dpr = window.devicePixelRatio || 1;
  const devicePx = Math.ceil(cssClamped * dpr);
  if (devicePx === lastReported) return;
  lastReported = devicePx;
  if (window.AndroidBridge?.onResize) window.AndroidBridge.onResize(devicePx);
  window.parent?.postMessage({ type: "a2ui:resize", height: devicePx }, "*");
}

const startObserving = () => {
  const r = root();
  if (!r) return;
  new ResizeObserver(reportSize).observe(r);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startObserving, { once: true });
} else {
  startObserving();
}

function reset() {
  surfaces.clear();
  const r = root();
  if (r) { r.innerHTML = ""; delete r.dataset.surfaceId; }
}

window.a2ui = { ingest, applyTheme, reset, CATALOG_ID, STANDARD_CATALOG_ID };
