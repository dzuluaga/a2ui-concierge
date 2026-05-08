import { LitElement, html, css } from "lit";

export class ConciergeForm extends LitElement {
  static properties = { fields: { type: Array }, values: { state: true } };
  static styles = css`
    :host { display: block; font-family: var(--a2ui-font-sans); background: #fff; border: 1px solid #e5e7eb; border-radius: var(--a2ui-radius-md); padding: 12px; }
    .row { margin-bottom: 10px; }
    .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    input, textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px; font: inherit; }
    .toggle { display: flex; justify-content: space-between; align-items: center; }
    .switch { width: 36px; height: 20px; background: #ddd; border-radius: 12px; position: relative; cursor: pointer; }
    .switch.on { background: var(--a2ui-color-accent); }
    .knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform .15s; }
    .switch.on .knob { transform: translateX(16px); }
    .cta { padding: 10px 14px; border-radius: 999px; border: 0; background: var(--a2ui-color-accent); color: #fff; font: inherit; cursor: pointer; }
  `;
  constructor() { super(); this.values = {}; }
  render() {
    return html`
      ${this.fields.map(f => this._renderField(f))}
      <button class="cta" @click=${this._submit}>Place order</button>
    `;
  }
  _renderField(f) {
    if (f.type === "toggle") {
      const on = !!this.values[f.name];
      return html`<div class="row toggle"><span>${f.label}</span>
        <div class="switch ${on ? "on" : ""}" @click=${() => this._set(f.name, !on)}><div class="knob"></div></div>
      </div>`;
    }
    if (f.type === "text") {
      return html`<div class="row"><div class="label">${f.label}</div>
        <textarea rows="2" maxlength=${f.max_length || 200} @input=${e => this._set(f.name, e.target.value)}></textarea>
      </div>`;
    }
    if (f.type === "address") {
      return html`<div class="row"><div class="label">${f.label}</div>
        <input list="addrs" placeholder="Start typing…" @input=${e => this._set(f.name, e.target.value)}>
        <datalist id="addrs">
          <option value="235 Pine St, Brooklyn NY 11201">
          <option value="14 Clement St, San Francisco CA 94118">
          <option value="402 Mission St, Austin TX 78701">
        </datalist></div>`;
    }
    return html``;
  }
  _set(name, value) { this.values = { ...this.values, [name]: value }; }
  _submit() {
    window.AndroidBridge?.onAction(JSON.stringify({ component: "form", values: this.values }));
  }
}
customElements.define("a2ui-form", ConciergeForm);
