package com.diegoz.a2uiconcierge.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diegoz.a2uiconcierge.chat.AgentEvent
import com.diegoz.a2uiconcierge.chat.ChatRepository
import com.diegoz.a2uiconcierge.chat.CredentialRequestData
import com.diegoz.a2uiconcierge.chat.Message
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.util.UUID

class ChatViewModel(private val repo: ChatRepository) : ViewModel() {

    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages.asStateFlow()

    private val _isThinking = MutableStateFlow(false)
    val isThinking: StateFlow<Boolean> = _isThinking.asStateFlow()

    private val _credentialRequest = MutableSharedFlow<CredentialRequestData>(extraBufferCapacity = 1)
    val credentialRequest: SharedFlow<CredentialRequestData> = _credentialRequest.asSharedFlow()

    /** When non-null, the chat screen presents a modal bottom sheet hosting this fragment. */
    private val _productDetail = MutableStateFlow<JsonObject?>(null)
    val productDetail: StateFlow<JsonObject?> = _productDetail.asStateFlow()

    /** x402 payment-challenge bubble lifted into its own modal sheet so the
     * payment moment gets focus (and the sheet auto-dismisses on success). */
    private val _paymentChallenge = MutableStateFlow<JsonObject?>(null)
    val paymentChallenge: StateFlow<JsonObject?> = _paymentChallenge.asStateFlow()

    /** Inline tx-detail sheet, opened from a tap on the confirmation card's
     * on-chain payment row. Pure client-side — no agent round-trip. */
    private val _txDetail = MutableStateFlow<JsonObject?>(null)
    val txDetail: StateFlow<JsonObject?> = _txDetail.asStateFlow()

    fun onA2uiAction(json: String) {
        // Tx-detail tap is a pure UI navigation — open the sheet, don't
        // forward to the agent and don't render a "Selection" user bubble.
        if (isTxDetailOpen(json)) {
            _txDetail.value = parseToObject(json)?.let { buildTxDetailFragment(it) }
            return
        }
        // Close X on any of the modal sheets is a pure UI dismiss — don't
        // forward to the agent and don't render a "Selection" user bubble.
        when (componentOf(json)) {
            "product-detail-close" -> { _productDetail.value = null; return }
            "payment-challenge-close" -> { _paymentChallenge.value = null; return }
            "tx-detail-close" -> { _txDetail.value = null; return }
        }
        // `payment-completed` arrives after a successful settle. Dismiss the
        // payment sheet immediately; the agent will render the confirmation.
        if (isPaymentCompleted(json)) _paymentChallenge.value = null
        val display = humanizeAction(json)
        _messages.update { it + Message.User(UUID.randomUUID().toString(), display) }
        // Follow-up / Visit dismiss the sheet; "Add to Order" also dismisses
        // (the next agent step is a form, which renders inline).
        if (isProductDetailDismiss(json)) _productDetail.value = null
        sendInternal("[ui-action] $json")
    }

    fun dismissProductDetail() {
        _productDetail.value = null
    }

    fun dismissPaymentChallenge() {
        // User abandoned the payment. We don't notify the agent — the order
        // record stays valid until its deadline (5 min); they can ask again.
        _paymentChallenge.value = null
    }

    fun dismissTxDetail() { _txDetail.value = null }

    fun send(text: String) {
        if (text.isBlank()) return
        _messages.update { it + Message.User(UUID.randomUUID().toString(), text) }
        sendInternal(text)
    }

    fun submitCredential(credentialToken: String?, dcqlQueryJson: String?) {
        viewModelScope.launch {
            try {
                repo.submitCredential(credentialToken, dcqlQueryJson)
            } catch (e: Exception) {
                val msg = "⚠️ Credential submission failed: ${e.message}"
                _messages.update { it + Message.AgentText(UUID.randomUUID().toString(), msg) }
            }
        }
    }

    private fun sendInternal(text: String) {
        viewModelScope.launch {
            _isThinking.value = true
            try {
                // Each `text` event closes the previous text bubble. Each `a2ui`
                // event creates a NEW bubble so multi-section responses (prose +
                // rail + prose + rail) render as separate items in the list.
                var textBubbleId: String? = null

                repo.send(text).collect { ev ->
                    when (ev) {
                        is AgentEvent.Text -> {
                            if (textBubbleId == null) {
                                val id = UUID.randomUUID().toString()
                                textBubbleId = id
                                _messages.update { it + Message.AgentText(id, ev.text) }
                            } else {
                                _messages.update { list ->
                                    list.map { m ->
                                        if (m is Message.AgentText && m.id == textBubbleId) {
                                            m.copy(markdown = m.markdown + ev.text)
                                        } else m
                                    }
                                }
                            }
                        }
                        is AgentEvent.A2ui -> {
                            // Start a fresh text bubble next time.
                            textBubbleId = null
                            val component = ev.payload["component"]?.jsonPrimitive?.content
                            when (component) {
                                "product-detail" -> _productDetail.value = ev.payload
                                "payment-challenge" -> _paymentChallenge.value = ev.payload
                                else -> _messages.update {
                                    it + Message.AgentA2ui(
                                        UUID.randomUUID().toString(),
                                        listOf(ev.payload),
                                    )
                                }
                            }
                        }
                        is AgentEvent.CredentialRequest -> {
                            _credentialRequest.emit(ev.data)
                        }
                        AgentEvent.End -> Unit
                    }
                }
            } catch (e: Exception) {
                val msg = "⚠️ ${e::class.java.simpleName}: ${e.message ?: "request failed"}"
                _messages.update { it + Message.AgentText(UUID.randomUUID().toString(), msg) }
            } finally {
                _isThinking.value = false
            }
        }
    }

    private fun humanizeAction(json: String): String = try {
        val obj = Json.parseToJsonElement(json) as? JsonObject ?: return "Selection"
        val component = obj["component"]?.jsonPrimitive?.content
        when (component) {
            "chip-group" -> obj["value"]?.jsonPrimitive?.content
                ?.replaceFirstChar { it.titlecase() } ?: "Selection"
            "card-grid" -> obj["name"]?.jsonPrimitive?.content ?: "View item"
            "product-detail" -> {
                val name = obj["name"]?.jsonPrimitive?.content ?: "item"
                "Add $name to order"
            }
            "product-detail-followup" -> {
                val name = obj["name"]?.jsonPrimitive?.content ?: "item"
                "Tell me more about $name"
            }
            "product-detail-visit" -> {
                val vendor = obj["vendor"]?.jsonPrimitive?.content ?: "vendor"
                "Visit $vendor"
            }
            "form" -> "Place order"
            "confirmation-card" -> "Confirmed"
            "payment-completed" -> "Paid"
            else -> "Selection"
        }
    } catch (_: Exception) { "Selection" }

    private fun isPaymentCompleted(json: String): Boolean = try {
        val obj = Json.parseToJsonElement(json) as? JsonObject
        obj?.get("component")?.jsonPrimitive?.content == "payment-completed"
    } catch (_: Exception) { false }

    private fun componentOf(json: String): String? = try {
        (Json.parseToJsonElement(json) as? JsonObject)
            ?.get("component")?.jsonPrimitive?.content
    } catch (_: Exception) { null }

    private fun isProductDetailDismiss(json: String): Boolean = try {
        val obj = Json.parseToJsonElement(json) as? JsonObject
        when (obj?.get("component")?.jsonPrimitive?.content) {
            "product-detail",
            "product-detail-followup",
            "product-detail-visit" -> true
            else -> false
        }
    } catch (_: Exception) { false }

    private fun isTxDetailOpen(json: String): Boolean = try {
        val obj = Json.parseToJsonElement(json) as? JsonObject
        obj?.get("component")?.jsonPrimitive?.content == "tx-detail-open"
    } catch (_: Exception) { false }

    private fun parseToObject(json: String): JsonObject? = try {
        Json.parseToJsonElement(json) as? JsonObject
    } catch (_: Exception) { null }

    /** Build the `tx-detail` A2UI fragment from a `tx-detail-open` action so
     * the existing A2uiSheetContent / WebView pipeline can render it without
     * a server round-trip. Same field names the Lit component expects. */
    private fun buildTxDetailFragment(action: JsonObject): JsonObject {
        val out = mutableMapOf<String, kotlinx.serialization.json.JsonElement>()
        out["component"] = kotlinx.serialization.json.JsonPrimitive("tx-detail")
        for ((k, v) in action) {
            if (k == "component") continue
            out[k] = v
        }
        return JsonObject(out)
    }
}
