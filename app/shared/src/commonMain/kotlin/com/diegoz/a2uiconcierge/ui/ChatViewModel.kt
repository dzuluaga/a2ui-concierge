package com.diegoz.a2uiconcierge.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diegoz.a2uiconcierge.chat.AgentEvent
import com.diegoz.a2uiconcierge.chat.ChatRepository
import com.diegoz.a2uiconcierge.chat.CredentialRequestData
import com.diegoz.a2uiconcierge.chat.Message
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
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
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

@OptIn(ExperimentalUuidApi::class)
class ChatViewModel(private val repo: ChatRepository) : ViewModel() {

    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages.asStateFlow()

    private val _isThinking = MutableStateFlow(false)
    val isThinking: StateFlow<Boolean> = _isThinking.asStateFlow()

    private val _credentialRequest = MutableSharedFlow<CredentialRequestData>(extraBufferCapacity = 1)
    val credentialRequest: SharedFlow<CredentialRequestData> = _credentialRequest.asSharedFlow()

    // Only one agent turn at a time — cancel any in-flight request before starting a new one.
    private var activeJob: Job? = null
    private val _productDetail = MutableStateFlow<JsonObject?>(null)
    val productDetail: StateFlow<JsonObject?> = _productDetail.asStateFlow()

    private val _paymentChallenge = MutableStateFlow<JsonObject?>(null)
    val paymentChallenge: StateFlow<JsonObject?> = _paymentChallenge.asStateFlow()

    private val _txDetail = MutableStateFlow<JsonObject?>(null)
    val txDetail: StateFlow<JsonObject?> = _txDetail.asStateFlow()

    fun onA2uiAction(json: String) {
        if (isTxDetailOpen(json)) {
            _txDetail.value = parseToObject(json)?.let { buildTxDetailFragment(it) }
            return
        }
        when (componentOf(json)) {
            "product-detail-close" -> { _productDetail.value = null; return }
            "payment-challenge-close" -> { _paymentChallenge.value = null; return }
            "tx-detail-close" -> { _txDetail.value = null; return }
        }
        if (isPaymentCompleted(json)) _paymentChallenge.value = null
        val display = humanizeAction(json)
        _messages.update { it + Message.User(Uuid.random().toString(), display) }
        if (isProductDetailDismiss(json)) _productDetail.value = null
        sendInternal("[ui-action] $json")
    }

    fun dismissProductDetail() { _productDetail.value = null }

    fun dismissPaymentChallenge() { _paymentChallenge.value = null }

    fun dismissTxDetail() { _txDetail.value = null }

    fun send(text: String) {
        if (text.isBlank()) return
        _messages.update { it + Message.User(Uuid.random().toString(), text) }
        sendInternal(text)
    }

    fun submitCredential(credentialToken: String?, dcqlQueryJson: String?) {
        viewModelScope.launch {
            try {
                repo.submitCredential(credentialToken, dcqlQueryJson)
            } catch (e: Exception) {
                val msg = "⚠️ Credential submission failed: ${e.message}"
                _messages.update { it + Message.AgentText(Uuid.random().toString(), msg) }
            }
        }
    }

    private fun sendInternal(text: String) {
        // Cancel any in-flight turn so there is never more than one active job
        // managing isThinking at the same time.
        activeJob?.cancel()
        activeJob = viewModelScope.launch {
            _isThinking.value = true
            try {
                var textBubbleId: String? = null
                repo.send(text).collect { ev ->
                    // Hide thinking indicator as soon as the first event arrives so
                    // the dots are never visible alongside an actual response.
                    _isThinking.value = false
                    when (ev) {
                        is AgentEvent.Text -> {
                            if (textBubbleId == null) {
                                val id = Uuid.random().toString()
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
                            textBubbleId = null
                            val component = ev.payload["component"]?.jsonPrimitive?.content
                            when (component) {
                                "product-detail" -> _productDetail.value = ev.payload
                                "payment-challenge" -> _paymentChallenge.value = ev.payload
                                else -> _messages.update {
                                    it + Message.AgentA2ui(
                                        Uuid.random().toString(),
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
            } catch (e: CancellationException) {
                // Job was cancelled because a newer action started — silently discard.
                throw e
            } catch (e: Exception) {
                _messages.update {
                    it + Message.AgentText(Uuid.random().toString(), friendlyError(e))
                }
            } finally {
                _isThinking.value = false
            }
        }
    }

    private fun friendlyError(e: Exception): String {
        val raw = e.message ?: ""
        return when {
            raw.contains("connection was lost", ignoreCase = true) ||
            raw.contains("connection reset", ignoreCase = true) ||
            raw.contains("network", ignoreCase = true) ||
            raw.contains("timed out", ignoreCase = true) ||
            raw.contains("timeout", ignoreCase = true) ->
                "⚠️ Connection lost — please check your network and try again."
            raw.contains("404") || raw.contains("not found", ignoreCase = true) ->
                "⚠️ The server couldn't process that request. Please try again."
            raw.contains("5") && (raw.contains("500") || raw.contains("502") || raw.contains("503")) ->
                "⚠️ The server ran into a problem. Please try again in a moment."
            else ->
                "⚠️ Something went wrong. Please try again."
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

    private fun buildTxDetailFragment(action: JsonObject): JsonObject {
        val out = mutableMapOf<String, kotlinx.serialization.json.JsonElement>()
        out["component"] = JsonPrimitive("tx-detail")
        for ((k, v) in action) {
            if (k == "component") continue
            out[k] = v
        }
        return JsonObject(out)
    }
}
