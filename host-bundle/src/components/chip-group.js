import { LitElement, html, css } from "lit";

export class ChipGroup extends LitElement {
  static properties = { question: {}, options: { type: Array }, selected: {} };
  static styles = css`
    :host { display: block; padding: 14px 16px; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md); background: #fff; font-family: var(--a2ui-font-sans); box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); }
    .q { font-weight: 600; margin-bottom: 10px; font-size: 14px; color: #1B1B1F; }
    button { font: inherit; font-size: 13px; padding: 7px 14px; margin: 3px 6px 3px 0; border-radius: 999px; border: 1px solid #e5e1d8; background: #faf7f1; color: #2a2a30; cursor: pointer; transition: background .15s, border-color .15s, transform .08s; }
    button:active { transform: scale(0.97); }
    button[aria-pressed="true"] { background: var(--a2ui-color-accent); color: #fff; border-color: var(--a2ui-color-accent); }
  `;
  constructor() { super(); this.options = []; this.selected = null; }
  render() {
    return html`
      <div class="q">${this.question}</div>
      ${this.options.map(o => html`
        <button aria-pressed=${this.selected === o.value} @click=${() => this._pick(o.value)}>${o.label}</button>
      `)}
    `;
  }
  _pick(value) {
    this.selected = value;
    window.AndroidBridge?.onAction(JSON.stringify({ component: "chip-group", value }));
  }
}
customElements.define("a2ui-chip-group", ChipGroup);
