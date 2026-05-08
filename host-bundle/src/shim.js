import "./theme.css";

const root = () => document.getElementById("a2ui-root");

function render(json) {
  const r = root();
  if (!r) return;
  r.innerHTML = "";
  const node = document.createElement("pre");
  node.textContent = JSON.stringify(json, null, 2);
  r.appendChild(node);
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
