import { LitElement, html, css } from "lit";

/**
 * Renders an x402 payment sheet inline in the chat. On mobile / Android the
 * StrongBox-backed path produces a real signed EIP-3009 envelope. The web
 * demo doesn't have hardware key custody, so the "Pay" button posts a stub
 * envelope to /x402/settle (which mock-settles by default) and emits the
 * resulting `[ui-action] payment-completed` back into the chat — same shape
 * the Android app will use, so the agent sees one protocol regardless of
 * surface.
 */
export class PaymentChallenge extends LitElement {
  static properties = {
    order_id: {},
    label: {},
    amount_display: {},
    items: { type: Array },
    challenge: { type: Object },
    status: { state: true },
    error: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      position: relative;
      font-family: var(--a2ui-font-sans);
      background: #fff;
      border: 1px solid #ece8e0;
      border-radius: var(--a2ui-radius-md);
      padding: 16px;
      box-shadow: 0 1px 2px rgba(20,18,14,0.04), 0 6px 16px -10px rgba(20,18,14,0.08);
    }
    .close {
      position: absolute;
      top: 10px; right: 10px;
      width: 32px; height: 32px;
      border-radius: 999px; border: 0;
      background: #f4efe6; color: #1B1B1F;
      font: inherit; font-size: 15px; line-height: 1;
      display: grid; place-items: center;
      cursor: pointer; z-index: 2;
      transition: transform .08s, background .15s;
    }
    .close:active { transform: scale(0.94); background: #ece8e0; }
    .badge {
      display: inline-block;
      background: #f0eef9; color: #4a3aa0;
      font-size: 10px; font-weight: 600;
      letter-spacing: .4px; text-transform: uppercase;
      padding: 4px 10px; border-radius: 999px;
      margin-bottom: 10px;
    }
    .label { font-family: var(--a2ui-font-serif); font-weight: 600; font-size: 16px; color: #1B1B1F; line-height: 1.25; }
    .meta { font-size: 12px; color: #8a8790; margin-top: 4px; letter-spacing: .2px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13.5px; color: #1B1B1F; }
    .row span:last-child { font-family: var(--a2ui-font-serif); font-weight: 600; }
    .summary { margin-top: 12px; padding-top: 10px; border-top: 1px solid #ece8e0; }
    .total { border-top: 1px solid #ece8e0; margin-top: 6px; padding-top: 10px; font-weight: 600; }
    .total .amt { font-size: 15px; }
    .pay {
      margin-top: 14px; width: 100%;
      padding: 13px 18px; border-radius: 14px; border: 0;
      background: #1B1B1F; color: #fff;
      font: inherit; font-weight: 600; font-size: 14.5px;
      cursor: pointer;
      box-shadow: 0 6px 18px -8px rgba(20,18,14,0.5);
      transition: transform .08s, opacity .15s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .pay:active:not(:disabled) { transform: scale(0.985); }
    .pay:disabled { opacity: .55; cursor: default; }
    .hint { margin-top: 8px; font-size: 11.5px; color: #8a8790; text-align: center; line-height: 1.5; }
    .err { margin-top: 10px; font-size: 12px; color: #b22; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: #5B6CFF; box-shadow: 0 0 0 4px rgba(91,108,255,0.18); }
  `;

  constructor() {
    super();
    this.status = "idle"; // idle | paying | done | error
    this.error = "";
  }

  render() {
    return html`
      <button class="close" aria-label="Close" @click=${this._close}>✕</button>
      <div class="badge">x402 · USDC payment</div>
      <div class="label">${this.label || "Confirm payment"}</div>
      <div class="meta">${this.challenge?.network || ""} · ${this.amount_display}</div>

      <div class="summary">
        ${(this.items || []).map(li => html`
          <div class="row"><span>${li.label}</span><span>$${li.amount.toFixed(2)}</span></div>
        `)}
        <div class="row total"><span>Total</span><span class="amt">${this.amount_display}</span></div>
      </div>

      <button
        class="pay"
        ?disabled=${this.status !== "idle"}
        @click=${this._pay}
      >
        <span class="dot"></span>
        ${this.status === "idle" ? `Pay ${this.amount_display}` :
          this.status === "paying" ? "Settling on-chain…" :
          this.status === "done" ? "Paid ✓" : "Try again"}
      </button>
      ${this.error ? html`<div class="err">${this.error}</div>` : null}
      <div class="hint">
        On Android, this taps the StrongBox-backed wallet for a hardware-signed
        EIP-3009 authorization. On the web, settlement is mocked for the demo.
      </div>
    `;
  }

  _close() {
    window.AndroidBridge?.onAction(JSON.stringify({
      component: "payment-challenge-close",
    }));
  }

  async _pay() {
    if (this.status !== "idle" && this.status !== "error") return;
    this.status = "paying";
    this.error = "";
    try {
      // Web doesn't have hardware key custody; the backend's mock settler
      // doesn't validate the envelope, so a placeholder is fine here.
      // Phase 2: Android replaces this with a real signed EIP-3009 envelope.
      const envelope = {
        scheme: "exact",
        kind: "stub-web",
        order_id: this.order_id,
        nonce: this.challenge?.nonce,
      };
      const data = await this._settle(envelope);
      this.status = "done";
      window.AndroidBridge?.onAction(JSON.stringify({
        component: "payment-completed",
        order_id: this.order_id,
        tx_hash: data.tx_hash,
        explorer_url: data.explorer_url,
      }));
    } catch (e) {
      this.status = "error";
      this.error = e.message || String(e);
    }
  }

  // Two settlement paths:
  //   - Android WebView: page lives at file:///android_asset/, can't fetch
  //     cleartext HTTP cross-origin. Bridge through Kotlin (AndroidBridge.settle)
  //     so Kotlin's OkHttp owns the call. Phase 2 hooks here to sign with
  //     StrongBox before forwarding.
  //   - Browser: hit /x402/settle relative (Vite proxies in dev, host
  //     same-origin in prod).
  async _settle(envelope) {
    if (window.AndroidBridge?.settle) {
      return new Promise((resolve, reject) => {
        const cb = `__settle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        window[cb] = (result) => {
          delete window[cb];
          if (!result) return reject(new Error("empty bridge response"));
          if (result.error) return reject(new Error(result.error));
          resolve(result);
        };
        try {
          window.AndroidBridge.settle(this.order_id, JSON.stringify(envelope), cb);
        } catch (e) {
          delete window[cb];
          reject(e);
        }
      });
    }
    const res = await fetch("/x402/settle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: this.order_id, envelope }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${detail}`);
    }
    return await res.json();
  }
}
customElements.define("a2ui-payment-challenge", PaymentChallenge);
