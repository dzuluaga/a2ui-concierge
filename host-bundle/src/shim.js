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

function render(json) {
  const r = root();
  if (!r) return;
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
  reportSize();
}

function applyTheme(tokens) {
  for (const [k, v] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(`--a2ui-${k}`, v);
  }
}

let lastReported = -1;
function reportSize() {
  const h = Math.round(document.body.getBoundingClientRect().height);
  if (h === lastReported) return;
  lastReported = h;
  if (window.AndroidBridge?.onResize) window.AndroidBridge.onResize(h);
  window.parent?.postMessage({ type: "a2ui:resize", height: h }, "*");
}
new ResizeObserver(reportSize).observe(document.body);

window.a2ui = { render, applyTheme };
