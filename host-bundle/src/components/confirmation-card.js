import { LitElement, html, css } from "lit";

export class ConfirmationCard extends LitElement {
  static properties = {
    order_id: {}, items: { type: Array }, total: { type: Number },
    ship_date: {}, tx_hash: {}, explorer_url: {},
  };
  static styles = css`
    :host { display: block; margin: 0 12px; font-family: var(--a2ui-font-sans); background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md); padding: 16px; box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); }
    .badge { background: #e7f6e7; color: #2d6a2d; font-weight: 600; font-size: 13px; padding: 5px 12px; border-radius: 999px; display: inline-block; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; color: #1B1B1F; }
    .row span:last-child { font-family: var(--a2ui-font-serif); font-weight: 600; }
    .total { border-top: 1px solid #ece8e0; margin-top: 6px; padding-top: 10px; font-weight: 600; font-size: 15px; }
    .total span:last-child { font-size: 16px; }
    .meta { color: #8a8790; font-size: 12px; margin-top: 8px; letter-spacing: .2px; }
    .tx { margin-top: 10px; padding: 9px 12px; background: #faf7f1; border-radius: 10px; font-size: 12px; cursor: pointer; transition: background .12s, transform .08s; border: 0; width: 100%; text-align: left; font: inherit; }
    .tx:hover { background: #f4efe6; }
    .tx:active { transform: scale(0.99); background: #efe9dc; }
    .tx .hash { color: #4a3aa0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; word-break: break-all; }
    .tx .lbl { display: flex; justify-content: space-between; color: #6b6973; font-weight: 600; letter-spacing: .3px; text-transform: uppercase; font-size: 10px; margin-bottom: 3px; }
    .tx .chev { color: #8a8790; font-weight: 600; }
    .dpc-badge { margin-top: 10px; padding: 9px 12px; background: #f0f1ff; border-radius: 10px; display: flex; align-items: center; gap: 8px; }
    .dpc-badge .icon { font-size: 18px; flex-shrink: 0; }
    .dpc-badge .info { display: flex; flex-direction: column; }
    .dpc-badge .lbl { color: #4a3aa0; font-weight: 600; letter-spacing: .3px; text-transform: uppercase; font-size: 10px; }
    .dpc-badge .sub { color: #6b6973; font-size: 11.5px; margin-top: 2px; }
  `;
  render() {
    const isDpc = this.tx_hash?.startsWith("dpc-");
    const txShort = this.tx_hash ? `${this.tx_hash.slice(0, 10)}…${this.tx_hash.slice(-8)}` : null;
    return html`
      <div class="badge">✓ Order placed</div>
      ${this.items.map(li => html`<div class="row"><span>${li.label}</span><span>$${li.amount}</span></div>`)}
      <div class="row total"><span>Total</span><span>$${this.total}</span></div>
      <div class="meta">Arrives ${this.ship_date} · #${this.order_id}</div>
      ${isDpc ? html`
        <div class="dpc-badge">
          <div class="icon">💳</div>
          <div class="info">
            <div class="lbl">Card payment</div>
            <div class="sub">Paid with digital payment credential</div>
          </div>
        </div>
      ` : this.tx_hash ? html`
        <button class="tx" type="button" @click=${this._openTxDetail}>
          <div class="lbl"><span>On-chain payment</span><span class="chev">View ›</span></div>
          <div class="hash">${txShort}</div>
        </button>
      ` : null}
    `;
  }

  // Tap routes through AndroidBridge.onAction so the host can intercept:
  //  - Android: ChatViewModel opens an in-app tx-detail modal sheet
  //  - Web:     the index.html shim opens the explorer URL in a new tab
  _openTxDetail() {
    const payload = {
      component: "tx-detail-open",
      order_id: this.order_id,
      tx_hash: this.tx_hash,
      explorer_url: this.explorer_url,
      items: this.items,
      total: this.total,
      ship_date: this.ship_date,
    };
    if (window.AndroidBridge?.onAction) {
      window.AndroidBridge.onAction(JSON.stringify(payload));
    } else if (this.explorer_url) {
      window.open(this.explorer_url, "_blank", "noreferrer");
    }
  }
}
customElements.define("a2ui-confirmation-card", ConfirmationCard);
