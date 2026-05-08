package com.diegoz.a2uiconcierge.chat

import io.ktor.client.HttpClient
import io.ktor.client.plugins.sse.SSE
import io.ktor.client.plugins.sse.sse
import io.ktor.client.request.setBody
import io.ktor.client.request.url
import io.ktor.http.ContentType
import io.ktor.http.HttpMethod
import io.ktor.http.contentType
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

@OptIn(ExperimentalUuidApi::class)
class HttpChatRepository(private val baseUrl: String) : ChatRepository {

    private val sessionId = Uuid.random().toString()
    private val json = Json { ignoreUnknownKeys = true }
    private val client = HttpClient {
        install(SSE)
    }

    override fun send(text: String): Flow<AgentEvent> = flow {
        val body = buildString {
            append("{\"sessionId\":\"")
            append(sessionId)
            append("\",\"userMessage\":")
            append(Json.encodeToString(String.serializer(), text))
            append("}")
        }
        client.sse({
            method = HttpMethod.Post
            url("$baseUrl/chat")
            contentType(ContentType.Application.Json)
            setBody(body)
        }) {
            incoming.collect { event ->
                val data = event.data ?: return@collect
                when (event.event) {
                    "text" -> {
                        val obj = json.parseToJsonElement(data).jsonObject
                        emit(AgentEvent.Text(obj["text"]!!.jsonPrimitive.content))
                    }
                    "a2ui" -> emit(AgentEvent.A2ui(json.parseToJsonElement(data).jsonObject))
                    "end" -> {
                        emit(AgentEvent.End)
                        return@collect
                    }
                }
            }
        }
    }
}
