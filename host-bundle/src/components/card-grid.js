import { LitElement, html, css } from "lit";

export class CardGrid extends LitElement {
  static properties = {
    section: {},
    reasoning: {},
    items: { type: Array },
  };
  static styles = css`
    :host { display: block; font-family: var(--a2ui-font-sans); }
    .section {
      font-family: var(--a2ui-font-serif);
      font-weight: 600;
      font-size: 19px;
      color: #1B1B1F;
      padding: 0 12px 6px;
      letter-spacing: -0.01em;
    }
    .reason { padding: 0 12px 10px; color: #44424a; font-size: 13px; line-height: 1.4; }
    .rail {
      display: flex; gap: 10px;
      overflow-x: auto; overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      /* proximity (not mandatory) — a half-flick lands on the nearest snap
         instead of rubber-banding hard back; preserves momentum. */
      scroll-snap-type: x proximity;
      scroll-snap-stop: always;
      scroll-padding-inline: 12px;
      padding: 4px 12px 8px;
      margin: 0;
      scrollbar-width: none;
      /* Tell the browser this region is for horizontal panning so the parent
         LazyColumn's vertical-scroll handler doesn't fight the carousel
         swipes (and vertical drags still bubble up to it). */
      touch-action: pan-x;
      /* Don't let overscroll bubble to the parent and yank the whole list. */
      overscroll-behavior-x: contain;
    }
    .rail::-webkit-scrollbar { display: none; }
    .card {
      flex: 0 0 132px; scroll-snap-align: start;
      background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md);
      overflow: hidden; cursor: pointer;
      transition: transform .12s, box-shadow .15s;
      box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08);
    }
    .card:active { transform: scale(0.985); }
    .card img {
      width: 100%; height: 132px; object-fit: cover; display: block;
      background: #f4efe6;
      /* Stop image drag-and-drop from cancelling the pan gesture mid-flick. */
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
    }
    .body { padding: 10px; }
    .name {
      font-family: var(--a2ui-font-serif);
      font-weight: 600;
      font-size: 14px;
      line-height: 1.25;
      color: #1B1B1F;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .price-row {
      display: flex; align-items: baseline; gap: 6px;
      margin-top: 4px;
      font-family: var(--a2ui-font-serif);
    }
    .price { font-weight: 600; color: #1B1B1F; font-size: 13px; }
    .price.sale { color: #b6473a; }
    .price-orig { color: #9a9099; font-size: 11px; text-decoration: line-through; font-weight: 500; }
    .vendor {
      color: #6b6973;
      font-size: 11px;
      margin-top: 3px;
      letter-spacing: 0.01em;
    }
    .why { color: #6b6973; font-size: 12px; margin-top: 6px; line-height: 1.3; }
  `;
  render() {
    return html`
      ${this.section ? html`<div class="section">${this.section}</div>` : null}
      ${this.reasoning ? html`<div class="reason">${this.reasoning}</div>` : null}
      <div class="rail">
        ${this.items.map(p => {
          const onSale = p.sale_price != null && p.sale_price < p.price;
          return html`
            <div class="card" @click=${() => this._tap(p)}>
              <img src=${p.image_url} alt=${p.name}>
              <div class="body">
                <div class="name">${p.name}</div>
                <div class="price-row">
                  <span class="price ${onSale ? "sale" : ""}">$${onSale ? p.sale_price : p.price}</span>
                  ${onSale ? html`<span class="price-orig">$${p.price}</span>` : null}
                </div>
                ${p.vendor ? html`<div class="vendor">${p.vendor}</div>` : null}
                ${p.why ? html`<div class="why">${p.why}</div>` : null}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }
  _tap(p) {
    window.AndroidBridge?.onAction(JSON.stringify({ component: "card-grid", product_id: p.id, name: p.name }));
  }
}
customElements.define("a2ui-card-grid", CardGrid);
