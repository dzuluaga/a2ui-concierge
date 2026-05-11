import { LitElement, html, css } from "lit";

export class ConciergeForm extends LitElement {
  static properties = { fields: { type: Array }, values: { state: true } };
  static styles = css`
    :host { display: block; margin: 0 12px; font-family: var(--a2ui-font-sans); background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md); padding: 14px; box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); }
    .row { margin-bottom: 12px; }
    .label { font-size: 11px; color: #8a8790; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; font-weight: 600; }
    input, textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #e5e1d8; border-radius: 10px; font: inherit; font-size: 14px; color: #1B1B1F; background: #faf7f1; transition: border-color .15s, background .15s; }
    input:focus, textarea:focus { outline: none; border-color: var(--a2ui-color-accent); background: #fff; }
    .toggle { display: flex; justify-content: space-between; align-items: center; padding: 4px 0 6px; }
    .toggle span { font-size: 14px; color: #1B1B1F; }
    .switch { width: 38px; height: 22px; background: #d8d4ca; border-radius: 12px; position: relative; cursor: pointer; transition: background .18s; }
    .switch.on { background: var(--a2ui-color-accent); }
    .knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: transform .18s; box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
    .switch.on .knob { transform: translateX(16px); }
    .cta { margin-top: 6px; padding: 11px 18px; border-radius: 999px; border: 0; background: var(--a2ui-color-accent); color: #fff; font: inherit; font-weight: 600; font-size: 14px; letter-spacing: .2px; cursor: pointer; box-shadow: 0 4px 12px -4px rgba(91, 108, 255, 0.5); transition: transform .08s; }
    .cta:active { transform: scale(0.98); }
    .suggestions { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
    .pill { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e5e1d8; border-radius: 12px; background: #faf7f1; color: #1B1B1F; font: inherit; font-size: 13px; line-height: 1.3; text-align: left; cursor: pointer; transition: background .15s, border-color .15s, transform .08s; }
    .pill:active { transform: scale(0.98); }
    .pill[aria-pressed="true"] { background: #fff; border-color: var(--a2ui-color-accent); box-shadow: 0 0 0 1px var(--a2ui-color-accent) inset; }
    .pill .icon { font-size: 14px; }
    .pill .label-line { font-weight: 600; font-size: 13px; }
    .pill .addr-line { color: #6b6973; font-size: 12px; margin-top: 2px; }
    .pill .text { display: flex; flex-direction: column; }
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
      const saved = [
        { icon: "🏠", label: "Home", addr: "235 Pine St, Brooklyn NY 11201" },
        { icon: "🏢", label: "Work", addr: "14 Clement St, San Francisco CA 94118" },
        { icon: "✈️", label: "Mom's place", addr: "402 Mission St, Austin TX 78701" },
      ];
      const current = this.values[f.name] || "";
      return html`<div class="row"><div class="label">${f.label}</div>
        <div class="suggestions">
          ${saved.map(s => html`
            <button type="button" class="pill" aria-pressed=${current === s.addr}
                    @click=${() => this._set(f.name, s.addr)}>
              <span class="icon">${s.icon}</span>
              <span class="text">
                <span class="label-line">${s.label}</span>
                <span class="addr-line">${s.addr}</span>
              </span>
            </button>
          `)}
        </div>
      </div>`;
    }
    return html``;
  }
  _set(name, value) { this.values = { ...this.values, [name]: value }; }
  _submit() {
    window.AndroidBridge?.onAction(JSON.stringify({ component: "form", values: this.values }));
  }
}
customElements.define("a2ui-form", ConciergeForm);
