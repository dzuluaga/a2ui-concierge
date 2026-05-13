import { LitElement, html, css } from "lit";

export class ProductDetail extends LitElement {
  static properties = {
    product: {},
    variant_groups: { type: Array },
    requires_age_verification: { type: Boolean },
    selection: { state: true },
    activeImage: { state: true },
  };
  static styles = css`
    :host {
      display: block;
      font-family: var(--a2ui-font-sans);
      background: #fff;
      border-radius: var(--a2ui-radius-md);
      overflow: hidden;
      padding: 0 0 76px;
      position: relative;
    }
    .gallery {
      position: relative;
      background: #f4efe6;
      /* Hint to the browser that this region is for horizontal panning so
         vertical-scroll containers don't fight the carousel swipes. */
      touch-action: pan-x;
    }
    .close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 36px; height: 36px;
      border-radius: 999px;
      border: 0;
      background: rgba(20,18,14,0.55);
      color: #fff;
      font: inherit;
      font-size: 18px;
      line-height: 1;
      display: grid;
      place-items: center;
      cursor: pointer;
      z-index: 2;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      box-shadow: 0 4px 12px -4px rgba(20,18,14,0.5);
      transition: transform .08s, background .15s;
    }
    .close:active { transform: scale(0.94); background: rgba(20,18,14,0.75); }
    .gallery-track {
      display: flex;
      overflow-x: auto;
      overflow-y: hidden;
      /* proximity snap is more forgiving than mandatory on small devices —
         a half-flick lands on the nearest snap rather than rubber-banding. */
      scroll-snap-type: x proximity;
      scroll-snap-stop: always;
      scrollbar-width: none;
      overscroll-behavior-x: contain;
      touch-action: pan-x;
    }
    .gallery-track::-webkit-scrollbar { display: none; }
    .slide {
      flex: 0 0 100%;
      scroll-snap-align: center;
      width: 100%;
      pointer-events: auto;
    }
    .slide img {
      width: 100%;
      height: 240px;
      object-fit: cover;
      display: block;
      background: #f4efe6;
      /* Stop image drag-and-drop from cancelling the pan gesture. */
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
    }
    .dots {
      position: absolute;
      bottom: 10px;
      left: 0; right: 0;
      display: flex;
      justify-content: center;
      gap: 6px;
      pointer-events: none;
    }
    .dot {
      width: 6px; height: 6px;
      border-radius: 999px;
      background: rgba(255,255,255,0.55);
      box-shadow: 0 0 0 1px rgba(20,18,14,0.12);
    }
    .dot.active { background: #fff; box-shadow: 0 0 0 1px rgba(20,18,14,0.2); }
    .body { padding: 16px 16px 0; }
    .name {
      font-family: var(--a2ui-font-serif);
      font-weight: 600;
      font-size: 22px;
      line-height: 1.18;
      letter-spacing: -0.01em;
      color: #1B1B1F;
    }
    .vendor-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 14px;
      padding: 12px 12px;
      background: #faf7f1;
      border-radius: 12px;
    }
    .vendor {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .vendor-mark {
      width: 24px; height: 24px;
      border-radius: 999px;
      background: var(--a2ui-color-accent);
      color: #fff;
      display: grid; place-items: center;
      font-family: var(--a2ui-font-serif);
      font-weight: 700;
      font-size: 13px;
      flex: 0 0 auto;
    }
    .vendor-text { display: flex; flex-direction: column; min-width: 0; }
    .vendor-name {
      font-size: 13px; font-weight: 600; color: #1B1B1F;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .vendor-sub { font-size: 11px; color: #6b6973; }
    .price-block {
      display: flex; flex-direction: column; align-items: flex-end; flex: 0 0 auto;
      font-family: var(--a2ui-font-serif);
    }
    .price { font-weight: 600; font-size: 18px; color: #1B1B1F; }
    .price.sale { color: #b6473a; }
    .price-orig { font-size: 12px; color: #9a9099; text-decoration: line-through; font-weight: 500; }
    .description {
      margin: 14px 16px 0;
      color: #44424a;
      font-size: 13px;
      line-height: 1.5;
    }
    .group { margin: 14px 16px 0; }
    .label {
      font-size: 11px; color: #8a8790; text-transform: uppercase;
      letter-spacing: .8px; margin-bottom: 8px; font-weight: 600;
    }
    button.opt {
      font: inherit; font-size: 13px;
      padding: 6px 13px; margin: 3px 6px 3px 0;
      border-radius: 999px; border: 1px solid #e5e1d8;
      background: #faf7f1; color: #2a2a30;
      cursor: pointer;
      transition: background .15s, border-color .15s, transform .08s;
    }
    button.opt:active { transform: scale(0.97); }
    button.opt[aria-pressed="true"] {
      background: var(--a2ui-color-accent);
      color: #fff;
      border-color: var(--a2ui-color-accent);
    }
    .actions {
      display: flex; gap: 10px;
      margin: 18px 16px 0;
    }
    .visit {
      flex: 1;
      padding: 12px 16px;
      border-radius: 999px;
      background: #fff;
      border: 1px solid #d8d2c5;
      color: #1B1B1F;
      font: inherit;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: transform .08s, background .15s;
    }
    .visit:active { transform: scale(0.98); }
    .cta {
      flex: 1.3;
      padding: 12px 18px;
      border-radius: 999px;
      border: 0;
      background: var(--a2ui-color-accent);
      color: #fff;
      font: inherit;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: .2px;
      cursor: pointer;
      box-shadow: 0 4px 12px -4px rgba(91, 108, 255, 0.5);
      transition: transform .08s;
    }
    .cta:active { transform: scale(0.98); }
    .followup {
      position: absolute;
      bottom: 14px;
      right: 14px;
      padding: 9px 16px;
      border-radius: 999px;
      background: #1B1B1F;
      color: #fff;
      border: 0;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 18px -6px rgba(20,18,14,0.45);
      transition: transform .08s;
    }
    .followup:active { transform: scale(0.97); }
    .age-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 14px 16px 0;
      padding: 10px 12px;
      background: #fff8ec;
      border: 1px solid #f5d78e;
      border-radius: 10px;
    }
    .age-notice-icon { font-size: 16px; flex-shrink: 0; }
    .age-notice-text { font-size: 12px; color: #7a5c00; line-height: 1.4; }
    .age-notice-text strong { font-weight: 600; }
  `;
  constructor() {
    super();
    this.selection = {};
    this.activeImage = 0;
  }
  firstUpdated() {
    const track = this.renderRoot.querySelector(".gallery-track");
    if (track) {
      track.addEventListener("scroll", () => {
        const w = track.clientWidth || 1;
        const idx = Math.round(track.scrollLeft / w);
        if (idx !== this.activeImage) this.activeImage = idx;
      }, { passive: true });
    }
  }
  render() {
    const p = this.product || {};
    const images = (p.images && p.images.length) ? p.images : [p.image_url].filter(Boolean);
    const vendor = p.vendor || "Lumen Goods";
    const initial = (vendor[0] || "L").toUpperCase();
    const onSale = p.sale_price != null && p.sale_price < p.price;
    return html`
      <div class="gallery">
        <button class="close" aria-label="Close" @click=${this._close}>✕</button>
        <div class="gallery-track">
          ${images.map(src => html`
            <div class="slide"><img src=${src} alt=${p.name || ""}></div>
          `)}
        </div>
        ${images.length > 1 ? html`
          <div class="dots">
            ${images.map((_, i) => html`
              <div class="dot ${i === this.activeImage ? "active" : ""}"></div>
            `)}
          </div>
        ` : null}
      </div>

      <div class="body">
        <div class="name">${p.name}</div>
      </div>

      <div class="vendor-row">
        <div class="vendor">
          <div class="vendor-mark">${initial}</div>
          <div class="vendor-text">
            <div class="vendor-name">${vendor}</div>
            <div class="vendor-sub">${p.in_stock === false ? "Out of stock" : "In stock"}</div>
          </div>
        </div>
        <div class="price-block">
          <span class="price ${onSale ? "sale" : ""}">$${onSale ? p.sale_price : p.price}</span>
          ${onSale ? html`<span class="price-orig">$${p.price}</span>` : null}
        </div>
      </div>

      ${p.description ? html`<div class="description">${p.description}</div>` : null}

      ${this.requires_age_verification ? html`
        <div class="age-notice">
          <span class="age-notice-icon">🪪</span>
          <span class="age-notice-text">
            <strong>Age verification required.</strong>
            You'll need to present a valid digital ID at checkout.
          </span>
        </div>
      ` : null}

      ${(this.variant_groups || []).map(g => html`
        <div class="group">
          <div class="label">${g.name}</div>
          ${g.options.map(o => html`
            <button class="opt"
              aria-pressed=${this.selection[g.name] === o}
              @click=${() => this._pick(g.name, o)}>${o}</button>
          `)}
        </div>
      `)}

      <div class="actions">
        <button class="visit" @click=${this._visit}>Visit ${vendor}</button>
        <button class="cta" @click=${this._confirm}>Add to Order</button>
      </div>

      <button class="followup" @click=${this._followup}>Follow up</button>
    `;
  }
  _pick(group, value) { this.selection = { ...this.selection, [group]: value }; }
  _confirm() {
    window.AndroidBridge?.onAction(JSON.stringify({
      component: "product-detail",
      product_id: this.product.id,
      name: this.product.name,
      variants: this.selection,
    }));
  }
  _visit() {
    window.AndroidBridge?.onAction(JSON.stringify({
      component: "product-detail-visit",
      product_id: this.product.id,
      name: this.product.name,
      vendor: this.product.vendor,
    }));
  }
  _followup() {
    window.AndroidBridge?.onAction(JSON.stringify({
      component: "product-detail-followup",
      product_id: this.product.id,
      name: this.product.name,
    }));
  }
  _close() {
    window.AndroidBridge?.onAction(JSON.stringify({
      component: "product-detail-close",
    }));
  }
}
customElements.define("a2ui-product-detail", ProductDetail);
