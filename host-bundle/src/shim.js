import "./theme.css";
import "./components/chip-group.js";
import "./components/card-grid.js";
import "./components/product-detail.js";
import "./components/concierge-form.js";
import "./components/confirmation-card.js";

const COMPONENT_TAG = {
  "chip-group": "a2ui-chip-group",
  "card-grid": "a2ui-card-grid",
  "product-detail": "a2ui-product-detail",
  "form": "a2ui-form",
  "confirmation-card": "a2ui-confirmation-card",
};

function root() {
  return document.getElementById("a2ui-root");
}

function dlog(msg) {
  if (window.AndroidBridge?.log) window.AndroidBridge.log(msg);
}

async function render(json) {
  const r = root();
  if (!r) return;
  dlog(`render: component=${json.component}`);
  // Reset dedupe so the new component is always reported even if its initial
  // measurement happens to match the previous component's final size.
  lastReported = -1;
  r.innerHTML = "";
  const tag = COMPONENT_TAG[json.component];
  if (!tag) {
    r.textContent = `unknown component: ${json.component}`;
    reportSize();
    return;
  }
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(json)) {
    if (k === "component") continue;
    el[k] = v;
  }
  r.appendChild(el);

  // Wait for Lit's first render to finish before measuring.
  if (el.updateComplete) await el.updateComplete;
  reportSize();

  // Images / fonts are async — re-measure as each resolves.
  el.addEventListener("load", reportSize, true);
  el.addEventListener("error", reportSize, true);

  // Cheap, bounded poll so very fast image loads can't slip between observer ticks.
  let n = 0;
  const id = setInterval(() => { reportSize(); if (++n > 10) clearInterval(id); }, 80);
}

function applyTheme(tokens) {
  for (const [k, v] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(`--a2ui-${k}`, v);
  }
}

// Inside an Android WebView the <body> fills the viewport rather than growing
// with content, so getBoundingClientRect() returns a stale viewport height.
// Use scrollHeight on #a2ui-root (plus a small floor and 12px breathing room)
// and observe the root, not the body.
let lastReported = -1;
function reportSize() {
  const r = root();
  if (!r) return;
  // The viewport-driven body height is unreliable inside an Android WebView.
  // Take the max of every plausible content-height signal — whichever is largest
  // best reflects the actual rendered content.
  const sH = r.scrollHeight;
  const oH = r.offsetHeight;
  const bsH = document.body.scrollHeight;
  const dsH = document.documentElement.scrollHeight;
  const cssH = Math.max(sH, oH, bsH, dsH) + 12;
  const cssClamped = Math.max(60, cssH);
  // Convert CSS pixels to device pixels so the Android side's toDp() yields
  // the correct dp value (Compose density divides by devicePixelRatio).
  const dpr = window.devicePixelRatio || 1;
  const devicePx = Math.ceil(cssClamped * dpr);
  dlog(`reportSize: cssH=${cssClamped} dpr=${dpr} -> ${devicePx}px`);
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

window.a2ui = { render, applyTheme };
