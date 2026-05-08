import { LitElement, html, css } from "lit";

export class ConfirmationCard extends LitElement {
  static properties = { order_id: {}, items: { type: Array }, total: { type: Number }, ship_date: {} };
  static styles = css`
    :host { display: block; font-family: var(--a2ui-font-sans); background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md); padding: 16px; box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); }
    .badge { background: #e7f6e7; color: #2d6a2d; font-weight: 600; font-size: 13px; padding: 5px 12px; border-radius: 999px; display: inline-block; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; color: #1B1B1F; }
    .row span:last-child { font-family: var(--a2ui-font-serif); font-weight: 600; }
    .total { border-top: 1px solid #ece8e0; margin-top: 6px; padding-top: 10px; font-weight: 600; font-size: 15px; }
    .total span:last-child { font-size: 16px; }
    .meta { color: #8a8790; font-size: 12px; margin-top: 8px; letter-spacing: .2px; }
  `;
  render() {
    return html`
      <div class="badge">✓ Order placed</div>
      ${this.items.map(li => html`<div class="row"><span>${li.label}</span><span>$${li.amount}</span></div>`)}
      <div class="row total"><span>Total</span><span>$${this.total}</span></div>
      <div class="meta">Arrives ${this.ship_date} · #${this.order_id}</div>
    `;
  }
}
customElements.define("a2ui-confirmation-card", ConfirmationCard);
