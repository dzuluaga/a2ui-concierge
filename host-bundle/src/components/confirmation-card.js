import { LitElement, html, css } from "lit";

export class ConfirmationCard extends LitElement {
  static properties = { order_id: {}, items: { type: Array }, total: { type: Number }, ship_date: {} };
  static styles = css`
    :host { display: block; font-family: var(--a2ui-font-sans); background: #fff; border: 1px solid #e5e7eb; border-radius: var(--a2ui-radius-md); padding: 12px; }
    .badge { background: #dcfce7; color: #166534; font-weight: 600; padding: 4px 10px; border-radius: 999px; display: inline-block; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total { border-top: 1px solid #e5e7eb; margin-top: 4px; padding-top: 6px; font-weight: 600; }
    .meta { color: #666; font-size: 12px; margin-top: 4px; }
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
