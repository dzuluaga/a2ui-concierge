import { LitElement, html, css } from "lit";

export class CardGrid extends LitElement {
  static properties = { reasoning: {}, items: { type: Array } };
  static styles = css`
    :host { display: block; font-family: var(--a2ui-font-sans); }
    .reason { padding: 0 4px 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: var(--a2ui-radius-md); overflow: hidden; cursor: pointer; }
    .card img { width: 100%; height: 96px; object-fit: cover; display: block; }
    .body { padding: 8px; }
    .name { font-family: var(--a2ui-font-serif); font-weight: 600; font-size: 14px; }
    .price { color: #555; font-size: 13px; margin-top: 2px; }
    .why { color: #777; font-size: 12px; margin-top: 4px; }
  `;
  render() {
    return html`
      <div class="reason">${this.reasoning}</div>
      <div class="grid">
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
    window.AndroidBridge?.onAction(JSON.stringify({ component: "card-grid", product_id: p.id }));
  }
}
customElements.define("a2ui-card-grid", CardGrid);
