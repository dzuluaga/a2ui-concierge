package com.diegoz.a2uiconcierge.chat

import kotlinx.serialization.json.JsonObject

sealed interface Message {
    val id: String
    data class User(override val id: String, val text: String) : Message
    data class AgentText(override val id: String, val markdown: String) : Message
    data class AgentA2ui(override val id: String, val fragments: List<JsonObject>) : Message
}
