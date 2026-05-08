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

    fun onA2uiAction(json: String) {
        val display = humanizeAction(json)
        _messages.update { it + Message.User(UUID.randomUUID().toString(), display) }
        sendInternal("[ui-action] $json")
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
                var textBubbleId: String? = null
                var a2uiBubbleId: String? = null

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
                            if (a2uiBubbleId == null) {
                                val id = UUID.randomUUID().toString()
                                a2uiBubbleId = id
                                _messages.update { it + Message.AgentA2ui(id, listOf(ev.payload)) }
                            } else {
                                _messages.update { list ->
                                    list.map { m ->
                                        if (m is Message.AgentA2ui && m.id == a2uiBubbleId) {
                                            m.copy(fragments = m.fragments + ev.payload)
                                        } else m
                                    }
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
            "form" -> "Place order"
            "confirmation-card" -> "Confirmed"
            else -> "Selection"
        }
    } catch (_: Exception) { "Selection" }
}
