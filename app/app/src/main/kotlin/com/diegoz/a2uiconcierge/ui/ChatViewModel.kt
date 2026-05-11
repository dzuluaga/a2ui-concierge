package com.diegoz.a2uiconcierge.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diegoz.a2uiconcierge.chat.AgentEvent
import com.diegoz.a2uiconcierge.chat.ChatRepository
import com.diegoz.a2uiconcierge.chat.Message
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
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

    /** When non-null, the chat screen presents a modal bottom sheet hosting this fragment. */
    private val _productDetail = MutableStateFlow<JsonObject?>(null)
    val productDetail: StateFlow<JsonObject?> = _productDetail.asStateFlow()

    fun onA2uiAction(json: String) {
        // Close X on the product-detail gallery is a pure UI dismiss — don't
        // forward to the agent and don't render a "Selection" user bubble.
        if (isProductDetailCloseOnly(json)) {
            _productDetail.value = null
            return
        }
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

    fun send(text: String) {
        if (text.isBlank()) return
        _messages.update { it + Message.User(UUID.randomUUID().toString(), text) }
        sendInternal(text)
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
                            if (component == "product-detail") {
                                _productDetail.value = ev.payload
                            } else {
                                _messages.update {
                                    it + Message.AgentA2ui(
                                        UUID.randomUUID().toString(),
                                        listOf(ev.payload),
                                    )
                                }
                            }
                        }
                        AgentEvent.End -> Unit
                    }
                }
            } catch (e: Exception) {
                // Surface the failure as a bubble so the demo never silently dies.
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
            else -> "Selection"
        }
    } catch (_: Exception) { "Selection" }

    private fun isProductDetailCloseOnly(json: String): Boolean = try {
        val obj = Json.parseToJsonElement(json) as? JsonObject
        obj?.get("component")?.jsonPrimitive?.content == "product-detail-close"
    } catch (_: Exception) { false }

    private fun isProductDetailDismiss(json: String): Boolean = try {
        val obj = Json.parseToJsonElement(json) as? JsonObject
        when (obj?.get("component")?.jsonPrimitive?.content) {
            "product-detail",
            "product-detail-followup",
            "product-detail-visit" -> true
            else -> false
        }
    } catch (_: Exception) { false }
}
