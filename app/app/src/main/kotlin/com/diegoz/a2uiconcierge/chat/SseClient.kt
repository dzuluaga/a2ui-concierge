package com.diegoz.a2uiconcierge.chat

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.UUID
import java.util.concurrent.TimeUnit

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

class HttpChatRepository(private val baseUrl: String) : ChatRepository {

    // SSE keeps a single HTTP connection open for the full agent turn (often
    // 30-60s with multiple tool calls on DeepSeek/Gemini). The OkHttp default
    // 10s read timeout fires between streamed events on slow turns; disable
    // it for reads while keeping connect/write bounded.
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .callTimeout(0, TimeUnit.MILLISECONDS)
        .build()
    private val json = Json { ignoreUnknownKeys = true }
    private val sessionId = UUID.randomUUID().toString()

    override fun send(text: String): Flow<AgentEvent> = flow {
        val payload = buildString {
            append("{\"sessionId\":\"")
            append(sessionId)
            append("\",\"userMessage\":")
            append(Json.encodeToString(String.serializer(), text))
            append("}")
        }
        val body = payload.toRequestBody("application/json".toMediaType())
        val req = Request.Builder().url("$baseUrl/chat").post(body).build()

        client.newCall(req).execute().use { resp ->
            val source = resp.body!!.source()
            val buffer = StringBuilder()
            while (!source.exhausted()) {
                val line = source.readUtf8Line() ?: break
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
                        }
                    }
                } else {
                    buffer.append(line).append('\n')
                }
            }
        }
    }.flowOn(Dispatchers.IO)
}
