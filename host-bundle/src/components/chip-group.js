import { LitElement, html, css } from "lit";

export class ChipGroup extends LitElement {
  static properties = { question: {}, options: { type: Array }, selected: {} };
  static styles = css`
    :host { display: block; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: var(--a2ui-radius-md); background: #fff; font-family: var(--a2ui-font-sans); }
    .q { font-weight: 600; margin-bottom: 8px; }
    button { font: inherit; padding: 6px 12px; margin: 2px 4px 2px 0; border-radius: 999px; border: 1px solid #e5e7eb; background: #f3f4f8; cursor: pointer; }
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
