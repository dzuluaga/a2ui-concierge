package com.diegoz.a2uiconcierge.chat

import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.request.header
import io.ktor.client.statement.bodyAsChannel
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.utils.io.readUTF8Line
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

data class SseEvent(val name: String, val data: String)

internal fun parseSseStream(lines: Sequence<String>): List<SseEvent> {
    val out = mutableListOf<SseEvent>()
    var name = "message"
    var data = StringBuilder()

    fun flush() {
        if (data.isNotEmpty()) {
            out.add(SseEvent(name, data.toString().trimEnd('\n')))
            name = "message"
            data = StringBuilder()
        }
    }

    for (line in lines) {
        when {
            line.isEmpty() -> flush()
            line.startsWith("event: ") -> name = line.substring(7)
            line.startsWith("data: ") -> data.append(line.substring(6)).append('\n')
        }
    }
    flush()
    return out
}

@OptIn(ExperimentalUuidApi::class)
class HttpChatRepository(private val baseUrl: String) : ChatRepository {

    // SSE keeps a single HTTP connection open for the full agent turn (often
    // 30-60s with multiple tool calls). Disable request timeout so Ktor
    // doesn't close the connection between streamed events.
    private val client = HttpClient {
        install(HttpTimeout) {
            requestTimeoutMillis = Long.MAX_VALUE
            connectTimeoutMillis = 15_000
            socketTimeoutMillis = Long.MAX_VALUE
        }
    }
    private val json = Json { ignoreUnknownKeys = true }
    private val sessionId = Uuid.random().toString()

    override fun send(text: String): Flow<AgentEvent> = flow {
        val payload = buildString {
            append("{\"sessionId\":\"")
            append(sessionId)
            append("\",\"userMessage\":")
            append(Json.encodeToString(String.serializer(), text))
            append("}")
        }

        val response = client.post("$baseUrl/chat") {
            header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            setBody(payload)
        }

        val channel = response.bodyAsChannel()
        val buffer = StringBuilder()

        while (!channel.isClosedForRead) {
            val line = channel.readUTF8Line() ?: break
            if (line.isEmpty()) {
                val events = parseSseStream(buffer.toString().lineSequence())
                buffer.clear()
                for (ev in events) {
                    when (ev.name) {
                        "text" -> {
                            val obj = json.parseToJsonElement(ev.data).jsonObject
                            emit(AgentEvent.Text(obj["text"]!!.jsonPrimitive.content))
                        }
                        "a2ui" -> emit(AgentEvent.A2ui(json.parseToJsonElement(ev.data).jsonObject))
                        "end" -> { emit(AgentEvent.End); return@flow }
                        // The agent called request_checkout_verification and is waiting for
                        // the client to POST credentials.  Credential verification is handled
                        // entirely inside the A2UI WebView bridge (verifyAge / verifyDpc /
                        // applyLoyalty callbacks), so we immediately unblock the agent with
                        // empty credentials rather than hanging for the full 120-second timeout.
                        "credential_request" -> {
                            try {
                                client.post("$baseUrl/credential") {
                                    header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
                                    setBody("""{"sessionId":"$sessionId","credentials":{}}""")
                                }
                            } catch (_: Exception) {
                                // Best-effort — if the POST fails the agent will time out on
                                // its own; we don't want to crash the SSE collection loop.
                            }
                        }
                    }
                }
            } else {
                buffer.append(line).append('\n')
            }
        }
    }

    override suspend fun submitCredential(
        credentialToken: String?,
        dcqlQueryJson: String?
    ) {
        val credentials = if (credentialToken != null) {
            "\"credentialToken\":${Json.encodeToString(String.serializer(), credentialToken)}" +
                (if (dcqlQueryJson != null) ",\"dcqlQueryJson\":${Json.encodeToString(String.serializer(), dcqlQueryJson)}" else "")
        } else ""
        client.post("$baseUrl/credential") {
            header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            setBody("""{"sessionId":"$sessionId","credentials":{$credentials}}""")
        }
    }
}
