import { LitElement, html, css } from "lit";

export class CardGrid extends LitElement {
  static properties = { reasoning: {}, items: { type: Array } };
  static styles = css`
    :host { display: block; font-family: var(--a2ui-font-sans); }
    .reason { padding: 0 4px 10px; color: #44424a; font-size: 13px; line-height: 1.4; }
    .rail {
      display: flex; gap: 10px;
      overflow-x: auto; overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
      scroll-padding-left: 4px;
      padding: 4px 4px 8px;
      margin: 0 -4px;
      scrollbar-width: none;
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
    .card img { width: 100%; height: 132px; object-fit: cover; display: block; background: #f4efe6; }
    .body { padding: 10px; }
    .name { font-family: var(--a2ui-font-serif); font-weight: 600; font-size: 14px; line-height: 1.25; color: #1B1B1F; }
    .price { font-family: var(--a2ui-font-serif); font-weight: 600; color: #1B1B1F; font-size: 13px; margin-top: 4px; }
    .why { color: #6b6973; font-size: 12px; margin-top: 6px; line-height: 1.3; }
  `;
  render() {
    return html`
      <div class="reason">${this.reasoning}</div>
      <div class="rail">
        ${this.items.map(p => html`
          <div class="card" @click=${() => this._tap(p)}>
            <img src=${p.image_url} alt=${p.name}>
            <div class="body">
              <div class="name">${p.name}</div>
              <div class="price">$${p.price}</div>
              ${p.why ? html`<div class="why">${p.why}</div>` : null}
            </div>
          </div>
        `)}
      </div>
    `;
  }
  _tap(p) {
    window.AndroidBridge?.onAction(JSON.stringify({ component: "card-grid", product_id: p.id, name: p.name }));
  }
}
customElements.define("a2ui-card-grid", CardGrid);
