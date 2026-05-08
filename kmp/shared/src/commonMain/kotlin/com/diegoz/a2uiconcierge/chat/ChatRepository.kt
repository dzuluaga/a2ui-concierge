package com.diegoz.a2uiconcierge.chat

import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.json.JsonObject

sealed interface AgentEvent {
    data class Text(val text: String) : AgentEvent
    data class A2ui(val payload: JsonObject) : AgentEvent
    data object End : AgentEvent
}

interface ChatRepository {
    fun send(text: String): Flow<AgentEvent>
}
