import { LitElement, html, css } from "lit";

export class ProductDetail extends LitElement {
  static properties = { product: {}, variant_groups: { type: Array }, selection: { state: true } };
  static styles = css`
    :host { display: block; font-family: var(--a2ui-font-sans); background: #fff; border: 1px solid #e5e7eb; border-radius: var(--a2ui-radius-md); padding: 12px; }
    img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; }
    .name { font-family: var(--a2ui-font-serif); font-weight: 600; font-size: 16px; margin-top: 8px; }
    .price { color: #555; }
    .group { margin-top: 8px; }
    .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    button { font: inherit; padding: 4px 10px; margin: 2px 4px 2px 0; border-radius: 999px; border: 1px solid #e5e7eb; background: #f3f4f8; cursor: pointer; }
    button[aria-pressed="true"] { background: var(--a2ui-color-accent); color: #fff; border-color: var(--a2ui-color-accent); }
    .cta { margin-top: 12px; padding: 10px 14px; border-radius: 999px; border: 0; background: var(--a2ui-color-accent); color: #fff; font: inherit; cursor: pointer; }
  `;
  constructor() { super(); this.selection = {}; }
  render() {
    return html`
      <img src=${this.product.image_url}>
      <div class="name">${this.product.name}</div>
      <div class="price">$${this.product.price}</div>
      ${this.variant_groups.map(g => html`
        <div class="group">
          <div class="label">${g.name}</div>
          ${g.options.map(o => html`
            <button aria-pressed=${this.selection[g.name] === o} @click=${() => this._pick(g.name, o)}>${o}</button>
          `)}
        </div>
      `)}
      <button class="cta" @click=${this._confirm}>Continue</button>
    `;
  }
  _pick(group, value) { this.selection = { ...this.selection, [group]: value }; }
  _confirm() {
    window.AndroidBridge?.onAction(JSON.stringify({
      component: "product-detail", product_id: this.product.id, variants: this.selection,
    }));
  }
}
customElements.define("a2ui-product-detail", ProductDetail);
