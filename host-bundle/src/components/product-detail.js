import { LitElement, html, css } from "lit";

export class ProductDetail extends LitElement {
  static properties = { product: {}, variant_groups: { type: Array }, selection: { state: true } };
  static styles = css`
    :host { display: block; font-family: var(--a2ui-font-sans); background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md); padding: 14px; box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); }
    img { width: 100%; height: 180px; object-fit: cover; border-radius: 10px; background: #f4efe6; }
    .name { font-family: var(--a2ui-font-serif); font-weight: 600; font-size: 19px; margin-top: 12px; color: #1B1B1F; line-height: 1.2; }
    .price { font-family: var(--a2ui-font-serif); font-weight: 600; color: #1B1B1F; font-size: 16px; margin-top: 4px; }
    .group { margin-top: 12px; }
    .label { font-size: 11px; color: #8a8790; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; font-weight: 600; }
    button { font: inherit; font-size: 13px; padding: 6px 13px; margin: 3px 6px 3px 0; border-radius: 999px; border: 1px solid #e5e1d8; background: #faf7f1; color: #2a2a30; cursor: pointer; transition: background .15s, border-color .15s, transform .08s; }
    button:active { transform: scale(0.97); }
    button[aria-pressed="true"] { background: var(--a2ui-color-accent); color: #fff; border-color: var(--a2ui-color-accent); }
    .cta { margin-top: 14px; padding: 11px 18px; border-radius: 999px; border: 0; background: var(--a2ui-color-accent); color: #fff; font: inherit; font-weight: 600; font-size: 14px; letter-spacing: .2px; cursor: pointer; box-shadow: 0 4px 12px -4px rgba(91, 108, 255, 0.5); transition: transform .08s; }
    .cta:active { transform: scale(0.98); }
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
      <button class="cta" @click=${this._confirm}>Add to Order</button>
    `;
  }
  _pick(group, value) { this.selection = { ...this.selection, [group]: value }; }
  _confirm() {
    window.AndroidBridge?.onAction(JSON.stringify({
      component: "product-detail", product_id: this.product.id, name: this.product.name, variants: this.selection,
    }));
  }
}
customElements.define("a2ui-product-detail", ProductDetail);
