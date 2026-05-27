import { LitElement, html, css } from "lit";

/**
 * v0.8 custom-catalog component "PaymentChallenge". Renders an x402 / DPC
 * payment sheet. Props are camelCased per spec convention (orderId,
 * amountDisplay, dpcDcqlQueryJson, requiresAgeVerification, ...). Actions
 * are surfaced as `a2ui-action` events; the shim wraps each in a v0.8
 * userAction envelope.
 *
 * The user selects a payment method before the Pay button activates:
 *   • Card Wallet  — presents a DPC via Android Credential Manager, then
 *                    POSTs to /dpc/settle (mock settlement for demo).
 *   • USDC on Base — StrongBox-backed EIP-3009 on Android, mock-settle on web.
 *
 * When `requiresAgeVerification` is true, an age verification step is shown
 * first. Both age and payment use Android Credential Manager on device.
 */
export class PaymentChallenge extends LitElement {
  static properties = {
    orderId: {},
    label: {},
    amountDisplay: {},
    items: { type: Array },
    challenge: { type: Object },
    requiresAgeVerification: { type: Boolean },
    ageDcqlQueryJson: {},
    dpcDcqlQueryJson: {},
    loyaltyDiscountPct: { type: Number },
    loyaltyDcqlQueryJson: {},
    action: { type: Object },
    // internal
    payment_method: { state: true },
    status: { state: true },
    age_status: { state: true },
    loyalty_status: { state: true },
    discount_amount: { state: true },
    effective_total: { state: true },
    effective_challenge: { state: true },
    effective_order_id: { state: true },
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

    .age-section {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid #ece8e0;
      background: #faf9f7;
    }
    .age-section.verified {
      border-color: #c3e6cb;
      background: #f4fdf6;
    }
    .age-section.failed {
      border-color: #f5c6cb;
      background: #fff5f5;
    }
    .age-row { display: flex; align-items: center; gap: 10px; }
    .age-icon { font-size: 20px; line-height: 1; flex-shrink: 0; }
    .age-text { flex: 1; }
    .age-title { font-size: 13px; font-weight: 600; color: #1B1B1F; }
    .age-subtitle { font-size: 11.5px; color: #8a8790; margin-top: 2px; }
    .age-subtitle.fail { color: #b22; }
    .verify-btn {
      margin-top: 10px;
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: 0;
      background: #1B1B1F;
      color: #fff;
      font: inherit;
      font-weight: 600;
      font-size: 13.5px;
      cursor: pointer;
      transition: transform .08s, opacity .15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .verify-btn:active:not(:disabled) { transform: scale(0.985); }
    .verify-btn:disabled { opacity: .55; cursor: default; }

    .loyalty-section {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1.5px dashed #d4b96a;
      background: #fffbf0;
    }
    .loyalty-section.verified {
      border: 1.5px solid #c3a73a;
      background: #fffbf0;
    }
    .loyalty-row { display: flex; align-items: center; gap: 10px; }
    .loyalty-icon { font-size: 20px; flex-shrink: 0; line-height: 1; }
    .loyalty-text { flex: 1; }
    .loyalty-title { font-size: 13px; font-weight: 600; color: #1B1B1F; }
    .loyalty-subtitle { font-size: 11.5px; color: #8a8790; margin-top: 2px; }
    .loyalty-pill {
      font-size: 10px; font-weight: 700; letter-spacing: .3px;
      text-transform: uppercase; padding: 3px 8px;
      border-radius: 999px; background: #f5d87a; color: #6b4e00;
      flex-shrink: 0;
    }
    .loyalty-btn {
      margin-top: 10px; width: 100%;
      padding: 10px 14px; border-radius: 10px; border: 0;
      background: #1B1B1F; color: #fff;
      font: inherit; font-weight: 600; font-size: 13.5px;
      cursor: pointer; transition: transform .08s, opacity .15s;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .loyalty-btn:active:not(:disabled) { transform: scale(0.985); }
    .loyalty-btn:disabled { opacity: .55; cursor: default; }
    .loyalty-discount-row {
      display: flex; justify-content: space-between;
      padding: 6px 0; font-size: 13.5px; color: #2d7a2d; font-weight: 600;
    }

    .method-section { margin-top: 16px; }
    .section-label {
      font-size: 10.5px;
      color: #8a8790;
      text-transform: uppercase;
      letter-spacing: .8px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .method-cards { display: flex; flex-direction: column; gap: 8px; }
    .method-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1.5px solid #ece8e0;
      background: #faf9f7;
      cursor: pointer;
      transition: border-color .15s, background .15s, transform .08s;
      text-align: left;
      width: 100%;
      font: inherit;
    }
    .method-card.selected {
      border-color: var(--a2ui-color-accent, #5B6CFF);
      background: #f0f1ff;
    }
    .method-card:active { transform: scale(0.99); }
    .method-card:disabled { opacity: .55; cursor: default; }
    .method-icon {
      font-size: 22px;
      flex-shrink: 0;
      width: 32px;
      text-align: center;
      line-height: 1;
    }
    .method-info { flex: 1; min-width: 0; }
    .method-name { font-size: 13.5px; font-weight: 600; color: #1B1B1F; }
    .method-desc { font-size: 11.5px; color: #8a8790; margin-top: 2px; }
    .method-check {
      width: 20px; height: 20px;
      border-radius: 999px;
      border: 1.5px solid #ccc;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      font-size: 11px;
      transition: background .15s, border-color .15s, color .15s;
    }
    .method-card.selected .method-check {
      background: var(--a2ui-color-accent, #5B6CFF);
      border-color: var(--a2ui-color-accent, #5B6CFF);
      color: #fff;
    }

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
    .pay:disabled { opacity: .45; cursor: default; box-shadow: none; }
    .hint { margin-top: 8px; font-size: 11.5px; color: #8a8790; text-align: center; line-height: 1.5; }
    .err { margin-top: 10px; font-size: 12px; color: #b22; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: #5B6CFF; box-shadow: 0 0 0 4px rgba(91,108,255,0.18); }
  `;

  constructor() {
    super();
    this.items = [];
    this.action = { name: "payment-challenge" };
    this.payment_method = null;
    this.status = "idle";
    this.age_status = "idle";
    this.loyalty_status = "idle";
    this.discount_amount = 0;
    this.effective_total = null;
    this.effective_challenge = null;
    this.effective_order_id = null;
    this.error = "";
  }

  get _orderId() { return this.effective_order_id ?? this.orderId; }
  get _challenge() { return this.effective_challenge ?? this.challenge; }

  get _payEnabled() {
    if (!this.payment_method) return false;
    if (this.requiresAgeVerification && this.age_status !== "verified") return false;
    return this.status === "idle" || this.status === "error";
  }

  get _payLabel() {
    if (this.status === "dpc_pending") return "Authorizing card…";
    if (this.status === "paying") {
      return this.payment_method === "usdc" ? "Settling on-chain…" : "Processing payment…";
    }
    if (this.status === "done") return "Paid ✓";
    if (!this.payment_method) return "Select a payment method";
    if (this.payment_method === "card") return "Pay with Card";
    return `Pay ${this.amountDisplay} · USDC`;
  }

  get _hint() {
    if (!this.payment_method) return "Choose a payment method above to continue.";
    if (this.payment_method === "card") {
      return "Your digital payment card is presented securely via Android Credential Manager.";
    }
    return "On Android, payment is signed with your StrongBox-backed wallet key (EIP-3009).";
  }

  render() {
    const displayTotal = this.effective_total != null
      ? `$${this.effective_total.toFixed(2)}`
      : this.amountDisplay;
    return html`
      <button class="close" aria-label="Close" @click=${this._close}>✕</button>
      <div class="badge">Payment</div>
      <div class="label">${this.label || "Confirm payment"}</div>
      <div class="meta">${this._challenge?.network || ""} · ${displayTotal}</div>

      <div class="summary">
        ${(this.items || []).map(li => html`
          <div class="row"><span>${li.label}</span><span>$${li.amount.toFixed(2)}</span></div>
        `)}
        ${this.discount_amount > 0 ? html`
          <div class="loyalty-discount-row">
            <span>Loyalty discount (10%)</span><span>−$${this.discount_amount.toFixed(2)}</span>
          </div>
        ` : null}
        <div class="row total"><span>Total</span><span class="amt">${displayTotal}</span></div>
      </div>

      ${this.requiresAgeVerification ? this._renderAgeSection() : null}
      ${this.loyaltyDiscountPct ? this._renderLoyaltySection() : null}
      ${this._renderMethodSection()}

      <button
        class="pay"
        ?disabled=${!this._payEnabled}
        @click=${this._pay}
      >
        ${this.status === "idle" || this.status === "error" ? html`<span class="dot"></span>` : null}
        ${this._payLabel}
      </button>
      ${this.error ? html`<div class="err">${this.error}</div>` : null}
      <div class="hint">${this._hint}</div>
    `;
  }

  _renderAgeSection() {
    const s = this.age_status;
    if (s === "verified") {
      return html`
        <div class="age-section verified">
          <div class="age-row">
            <div class="age-icon">✅</div>
            <div class="age-text">
              <div class="age-title">Age verified</div>
              <div class="age-subtitle">Your digital ID was confirmed</div>
            </div>
          </div>
        </div>`;
    }
    return html`
      <div class="age-section ${s === "failed" ? "failed" : ""}">
        <div class="age-row">
          <div class="age-icon">${s === "failed" ? "❌" : "🪪"}</div>
          <div class="age-text">
            <div class="age-title">Age verification required</div>
            <div class="age-subtitle ${s === "failed" ? "fail" : ""}">
              ${s === "failed"
                ? "Verification failed. Please try again."
                : "This product requires proof of age to purchase."}
            </div>
          </div>
        </div>
        <button
          class="verify-btn"
          ?disabled=${s === "verifying"}
          @click=${this._verifyAge}
        >
          ${s === "verifying" ? "Verifying…" : s === "failed" ? "Try again" : "Verify Age with Wallet"}
        </button>
      </div>`;
  }

  _renderMethodSection() {
    const disabled = this.status === "paying" || this.status === "dpc_pending" || this.status === "done";
    return html`
      <div class="method-section">
        <div class="section-label">Payment method</div>
        <div class="method-cards">
          ${this._renderMethodCard("card", "💳", "Card Wallet", "Pay with your digital payment credential", disabled)}
          ${this._renderMethodCard("usdc", "⟠", "USDC on Base", "On-chain transfer · no card needed", disabled)}
        </div>
      </div>`;
  }

  _renderMethodCard(value, icon, name, desc, disabled) {
    const selected = this.payment_method === value;
    return html`
      <button
        class="method-card ${selected ? "selected" : ""}"
        ?disabled=${disabled}
        @click=${() => this._selectMethod(value)}
      >
        <div class="method-icon">${icon}</div>
        <div class="method-info">
          <div class="method-name">${name}</div>
          <div class="method-desc">${desc}</div>
        </div>
        <div class="method-check">${selected ? "✓" : ""}</div>
      </button>`;
  }

  _selectMethod(value) {
    if (this.status === "paying" || this.status === "dpc_pending" || this.status === "done") return;
    this.payment_method = value;
    this.status = "idle";
    this.error = "";
  }

  _renderLoyaltySection() {
    const s = this.loyalty_status;
    if (s === "verified") {
      return html`
        <div class="loyalty-section verified">
          <div class="loyalty-row">
            <div class="loyalty-icon">🎫</div>
            <div class="loyalty-text">
              <div class="loyalty-title">Loyalty discount applied</div>
              <div class="loyalty-subtitle">10% off your order total</div>
            </div>
            <div class="loyalty-pill">−10%</div>
          </div>
        </div>`;
    }
    return html`
      <div class="loyalty-section ${s === "failed" ? "border-red" : ""}">
        <div class="loyalty-row">
          <div class="loyalty-icon">🎫</div>
          <div class="loyalty-text">
            <div class="loyalty-title">Lumen Member? Save 10%</div>
            <div class="loyalty-subtitle">
              ${s === "failed"
                ? "Could not verify membership. Try again or skip."
                : "Present your digital membership card for an instant discount."}
            </div>
          </div>
          <div class="loyalty-pill">${this.loyaltyDiscountPct}% off</div>
        </div>
        <button
          class="loyalty-btn"
          ?disabled=${s === "verifying"}
          @click=${this._applyLoyalty}
        >
          ${s === "verifying" ? "Verifying…" : s === "failed" ? "Try again" : "Apply Member Discount"}
        </button>
      </div>`;
  }

  _dispatch(name, context) {
    this.dispatchEvent(new CustomEvent("a2ui-action", {
      bubbles: true, composed: true, detail: { name, context },
    }));
  }

  _close() { this._dispatch("payment-challenge-close", {}); }

  async _applyLoyalty() {
    this.loyalty_status = "verifying";
    this.error = "";
    if (window.AndroidBridge?.applyLoyalty) {
      const cb = `__loyalty_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      window[cb] = (result) => {
        delete window[cb];
        if (!result || result.cancelled || result.error) {
          this.loyalty_status = "failed";
          return;
        }
        this._onLoyaltyApplied(result);
      };
      try {
        window.AndroidBridge.applyLoyalty(this._orderId, this.loyaltyDcqlQueryJson || "", cb);
      } catch (e) {
        delete window[cb];
        this.loyalty_status = "failed";
      }
    } else {
      try {
        const res = await fetch("/loyalty/apply", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order_id: this._orderId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this._onLoyaltyApplied(data);
      } catch {
        this.loyalty_status = "failed";
      }
    }
  }

  _onLoyaltyApplied(data) {
    this.loyalty_status = "verified";
    this.discount_amount = data.discount_amount ?? 0;
    this.effective_total = data.new_total ?? null;
    if (data.new_order_id) this.effective_order_id = data.new_order_id;
    if (data.new_challenge) this.effective_challenge = data.new_challenge;
  }

  async _verifyAge() {
    this.age_status = "verifying";
    this.error = "";
    if (window.AndroidBridge?.verifyAge) {
      const cb = `__verifyAge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      window[cb] = (success) => {
        delete window[cb];
        this.age_status = success ? "verified" : "failed";
      };
      try {
        window.AndroidBridge.verifyAge(this.ageDcqlQueryJson || "", cb);
      } catch (e) {
        delete window[cb];
        this.age_status = "failed";
      }
    } else {
      await new Promise(r => setTimeout(r, 800));
      this.age_status = "verified";
    }
  }

  async _pay() {
    if (!this._payEnabled) return;
    this.error = "";
    if (this.payment_method === "card") {
      await this._payWithCard();
    } else {
      await this._payWithUsdc();
    }
  }

  async _payWithCard() {
    this.status = "dpc_pending";
    const authorized = await this._requestDpc();
    if (!authorized) {
      this.status = "error";
      this.error = "Payment authorization was cancelled or declined.";
      return;
    }
    this.status = "paying";
    try {
      const data = await this._settleDpc();
      this.status = "done";
      this._dispatch("payment-completed", {
        order_id: this._orderId,
        tx_hash: data.tx_hash,
        explorer_url: data.explorer_url ?? null,
      });
    } catch (e) {
      this.status = "error";
      this.error = e.message || String(e);
    }
  }

  _settleDpc() {
    if (window.AndroidBridge?.settleDpc) {
      return new Promise((resolve, reject) => {
        const cb = `__dpcSettle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        window[cb] = (result) => {
          delete window[cb];
          if (!result) return reject(new Error("empty bridge response"));
          if (result.error) return reject(new Error(result.error));
          resolve(result);
        };
        try {
          window.AndroidBridge.settleDpc(this._orderId, cb);
        } catch (e) {
          delete window[cb];
          reject(e);
        }
      });
    }
    return fetch("/dpc/settle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: this._orderId }),
    }).then(res => {
      if (!res.ok) return res.text().then(t => { throw new Error(`HTTP ${res.status}: ${t}`); });
      return res.json();
    });
  }

  async _payWithUsdc() {
    this.status = "paying";
    try {
      const data = await this._settle();
      this.status = "done";
      this._dispatch("payment-completed", {
        order_id: this._orderId,
        tx_hash: data.tx_hash,
        explorer_url: data.explorer_url ?? null,
      });
    } catch (e) {
      this.status = "error";
      this.error = e.message || String(e);
    }
  }

  _requestDpc() {
    return new Promise((resolve) => {
      if (window.AndroidBridge?.verifyDpc) {
        const cb = `__dpc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        window[cb] = (success) => { delete window[cb]; resolve(!!success); };
        try {
          window.AndroidBridge.verifyDpc(this.dpcDcqlQueryJson || "", cb);
        } catch (e) {
          delete window[cb];
          resolve(false);
        }
      } else {
        setTimeout(() => resolve(true), 600);
      }
    });
  }

  async _settle() {
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
          window.AndroidBridge.settle(this._orderId, JSON.stringify(this._challenge || {}), cb);
        } catch (e) {
          delete window[cb];
          reject(e);
        }
      });
    }
    const stubEnvelope = {
      scheme: "exact",
      kind: "stub-web",
      order_id: this._orderId,
      nonce: this._challenge?.nonce,
    };
    const res = await fetch("/x402/settle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: this._orderId, envelope: stubEnvelope }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${detail}`);
    }
    return await res.json();
  }
}
customElements.define("a2ui-payment-challenge", PaymentChallenge);
