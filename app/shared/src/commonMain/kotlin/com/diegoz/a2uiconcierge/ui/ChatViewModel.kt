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
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

/**
 * Bridges the SSE event stream to the UI:
 *
 *  • Buffers v0.8 A2UI messages per ``surfaceId`` until ``beginRendering``
 *    arrives, then commits the full (surfaceUpdate, beginRendering, ...)
 *    bundle to a chat bubble — or routes it to a modal sheet for the
 *    product-detail / payment-challenge surfaces.
 *  • Translates the v0.8 ``userAction`` envelope coming back from the
 *    WebView bridge into the legacy ``[ui-action] {component, ...context}``
 *    string the agent's prompts continue to use.
 */
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

    private val _productDetail = MutableStateFlow<List<JsonObject>?>(null)
    val productDetail: StateFlow<List<JsonObject>?> = _productDetail.asStateFlow()

    private val _paymentChallenge = MutableStateFlow<List<JsonObject>?>(null)
    val paymentChallenge: StateFlow<List<JsonObject>?> = _paymentChallenge.asStateFlow()

    private val _txDetail = MutableStateFlow<List<JsonObject>?>(null)
    val txDetail: StateFlow<List<JsonObject>?> = _txDetail.asStateFlow()

    fun onA2uiAction(json: String) {
        val action = extractUserAction(json) ?: return
        val name = action.name
        val context = action.context

        // Pure UI dismiss — don't forward, don't echo.
        when (name) {
            "product-detail-close" -> { _productDetail.value = null; return }
            "payment-challenge-close" -> { _paymentChallenge.value = null; return }
            "tx-detail-close" -> { _txDetail.value = null; return }
        }

        // Confirmation card's "view tx" tap is a pure client-side navigation:
        // build a TxDetail surface from the action context and pop the sheet.
        if (name == "tx-detail-open") {
            _txDetail.value = buildTxDetailSurface(context)
            return
        }

        // Successful payment dismisses the modal payment sheet; the agent
        // will follow up with the confirmation card.
        if (name == "payment-completed") _paymentChallenge.value = null

        val legacy = legacyPayload(name, context)
        val display = humanizeAction(name, context)
        _messages.update { it + Message.User(Uuid.random().toString(), display) }
        if (name == "product-detail" || name == "product-detail-followup"
            || name == "product-detail-visit") {
            _productDetail.value = null
        }
        sendInternal("[ui-action] $legacy")
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
                // Per-turn buffer of surface frames keyed by surfaceId.
                // Each surface is committed once its beginRendering frame
                // arrives, then dropped from the buffer.
                val pendingSurfaces = mutableMapOf<String, MutableList<JsonObject>>()

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
                            handleA2uiMessage(ev.payload, pendingSurfaces)
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

    private fun handleA2uiMessage(
        frame: JsonObject,
        pending: MutableMap<String, MutableList<JsonObject>>,
    ) {
        val surfaceId = surfaceIdOf(frame) ?: return
        val frames = pending.getOrPut(surfaceId) { mutableListOf() }
        frames.add(frame)
        if (frame.containsKey("beginRendering")) {
            val componentType = rootComponentType(frames)
            val finalFrames = frames.toList()
            pending.remove(surfaceId)
            when (componentType) {
                "ProductDetail" -> _productDetail.value = finalFrames
                "PaymentChallenge" -> _paymentChallenge.value = finalFrames
                else -> _messages.update {
                    it + Message.AgentA2ui(Uuid.random().toString(), finalFrames)
                }
            }
        } else if (frame.containsKey("deleteSurface")) {
            pending.remove(surfaceId)
            // Bubbles that have already been committed stay; v0.8
            // deleteSurface is mostly meaningful for live multi-surface
            // streams which the demo never produces.
        }
    }

    private fun surfaceIdOf(frame: JsonObject): String? {
        val inner = (frame["surfaceUpdate"] as? JsonObject)
            ?: (frame["beginRendering"] as? JsonObject)
            ?: (frame["dataModelUpdate"] as? JsonObject)
            ?: (frame["deleteSurface"] as? JsonObject)
            ?: return null
        return inner["surfaceId"]?.jsonPrimitive?.contentOrNull
    }

    private fun rootComponentType(frames: List<JsonObject>): String? {
        // v0.8: beginRendering.root names the authoritative root component id;
        // surfaceUpdate.components may be in any order, so look up by id
        // instead of taking the first entry.
        val rootId = frames.firstNotNullOfOrNull { f ->
            (f["beginRendering"] as? JsonObject)
                ?.get("root")?.jsonPrimitive?.contentOrNull
        } ?: return null
        for (f in frames) {
            val update = f["surfaceUpdate"] as? JsonObject ?: continue
            val components = update["components"] as? JsonArray ?: continue
            for (item in components) {
                val obj = item as? JsonObject ?: continue
                if (obj["id"]?.jsonPrimitive?.contentOrNull != rootId) continue
                val componentObj = obj["component"] as? JsonObject ?: continue
                return componentObj.keys.firstOrNull()
            }
        }
        return null
    }

    // ── userAction envelope ↔ legacy [ui-action] translation ──────────

    private data class UserAction(val name: String, val context: JsonObject)

    private fun extractUserAction(json: String): UserAction? = try {
        val obj = Json.parseToJsonElement(json) as? JsonObject ?: return null
        val ua = obj["userAction"] as? JsonObject ?: return null
        val name = ua["name"]?.jsonPrimitive?.contentOrNull ?: return null
        val ctx = (ua["context"] as? JsonObject) ?: JsonObject(emptyMap())
        UserAction(name, ctx)
    } catch (_: Exception) { null }

    /** Compose ``{"component": <name>, ...context}`` JSON the agent expects. */
    private fun legacyPayload(name: String, context: JsonObject): String {
        val merged = LinkedHashMap<String, JsonElement>()
        merged["component"] = JsonPrimitive(name)
        for ((k, v) in context) merged[k] = v
        return JsonObject(merged).toString()
    }

    private fun humanizeAction(name: String, context: JsonObject): String {
        fun str(k: String) = context[k]?.jsonPrimitive?.contentOrNull
        return when (name) {
            "chip-group" -> str("value")?.replaceFirstChar { it.titlecase() } ?: "Selection"
            "card-grid" -> str("name") ?: "View item"
            "product-detail" -> "Add ${str("name") ?: "item"} to order"
            "product-detail-followup" -> "Tell me more about ${str("name") ?: "this"}"
            "product-detail-visit" -> "Visit ${str("vendor") ?: "vendor"}"
            "form" -> "Place order"
            "confirmation-card" -> "Confirmed"
            "payment-completed" -> "Paid"
            else -> "Selection"
        }
    }

    /**
     * Build a synthetic A2UI surface bundle for a transaction-detail
     * bubble from the ``tx-detail-open`` action's context. Uses the
     * **standard v0.8 catalog** — a Card wrapping a Column of labelled
     * Rows plus a Close button — so the WebView's standard-catalog
     * renderer paints it without any custom-component coupling. Mirrors
     * the Python ``a2ui.tx_detail`` builder.
     */
    private fun buildTxDetailSurface(context: JsonObject): List<JsonObject> {
        val builder = StandardSurface()
        val column = mutableListOf<String>()

        column.add(builder.text("Transaction details", usageHint = "h3"))

        fun row(label: String, value: String?) {
            if (value.isNullOrBlank()) return
            val lid = builder.text(label, usageHint = "caption")
            val vid = builder.text(value)
            column.add(builder.row(listOf(lid, vid), distribution = "spaceBetween"))
        }

        row("Order", context["order_id"]?.jsonPrimitive?.contentOrNull)
        row("Tx hash", context["tx_hash"]?.jsonPrimitive?.contentOrNull)
        context["total"]?.let { total ->
            val n = (total as? JsonPrimitive)?.contentOrNull?.toDoubleOrNull()
            // KMP doesn't have String.format — round to 2 decimals manually.
            if (n != null) row("Total", "$" + formatMoney(n))
        }
        row("Ships", context["ship_date"]?.jsonPrimitive?.contentOrNull)

        column.add(builder.button("Close", actionName = "tx-detail-close"))
        context["explorer_url"]?.jsonPrimitive?.contentOrNull?.let { url ->
            column.add(builder.button(
                "Open in explorer",
                actionName = "tx-detail-open",
                context = mapOf("explorer_url" to url),
                primary = true,
            ))
        }

        val colId = builder.column(column, alignment = "stretch")
        val cardId = builder.card(colId)
        return builder.finalize(rootId = cardId)
    }

    /** 2-decimal money formatting that works in commonMain (no String.format). */
    private fun formatMoney(n: Double): String {
        val cents = kotlin.math.round(n * 100).toLong()
        val whole = cents / 100
        val frac = (cents % 100).let { if (it < 10) "0$it" else "$it" }
        return "$whole.$frac"
    }

    /**
     * Tiny builder for v0.8 standard-catalog component graphs. Each helper
     * appends a component definition to the in-flight surface and returns
     * the new component's id, so higher-level helpers can wire them up by
     * id. ``finalize`` produces the surfaceUpdate + beginRendering pair.
     */
    private class StandardSurface {
        private val surfaceId = "s-${Uuid.random().toString().take(10)}"
        private val components = mutableListOf<JsonObject>()
        private var counter = 0

        private fun newId() = "c-${Uuid.random().toString().take(8)}-${counter++}"

        private fun bound(value: String): JsonElement =
            JsonObject(mapOf("literalString" to JsonPrimitive(value)))

        fun text(value: String, usageHint: String? = null): String {
            val id = newId()
            val props = LinkedHashMap<String, JsonElement>()
            props["text"] = bound(value)
            if (usageHint != null) props["usageHint"] = JsonPrimitive(usageHint)
            components.add(JsonObject(mapOf(
                "id" to JsonPrimitive(id),
                "component" to JsonObject(mapOf("Text" to JsonObject(props))),
            )))
            return id
        }

        fun row(childIds: List<String>, distribution: String? = null): String {
            val id = newId()
            val rowProps = LinkedHashMap<String, JsonElement>()
            rowProps["children"] = JsonObject(mapOf(
                "explicitList" to JsonArray(childIds.map { JsonPrimitive(it) })
            ))
            if (distribution != null) rowProps["distribution"] = JsonPrimitive(distribution)
            components.add(JsonObject(mapOf(
                "id" to JsonPrimitive(id),
                "component" to JsonObject(mapOf("Row" to JsonObject(rowProps))),
            )))
            return id
        }

        fun column(childIds: List<String>, alignment: String? = null): String {
            val id = newId()
            val colProps = LinkedHashMap<String, JsonElement>()
            colProps["children"] = JsonObject(mapOf(
                "explicitList" to JsonArray(childIds.map { JsonPrimitive(it) })
            ))
            if (alignment != null) colProps["alignment"] = JsonPrimitive(alignment)
            components.add(JsonObject(mapOf(
                "id" to JsonPrimitive(id),
                "component" to JsonObject(mapOf("Column" to JsonObject(colProps))),
            )))
            return id
        }

        fun card(childId: String): String {
            val id = newId()
            components.add(JsonObject(mapOf(
                "id" to JsonPrimitive(id),
                "component" to JsonObject(mapOf("Card" to JsonObject(mapOf(
                    "child" to JsonPrimitive(childId)
                )))),
            )))
            return id
        }

        fun button(
            label: String,
            actionName: String,
            context: Map<String, String> = emptyMap(),
            primary: Boolean = false,
        ): String {
            val labelId = text(label)
            val id = newId()
            val actionProps = LinkedHashMap<String, JsonElement>()
            actionProps["name"] = JsonPrimitive(actionName)
            if (context.isNotEmpty()) {
                actionProps["context"] = JsonArray(context.map { (k, v) ->
                    JsonObject(mapOf("key" to JsonPrimitive(k), "value" to bound(v)))
                })
            }
            val btnProps = LinkedHashMap<String, JsonElement>()
            btnProps["child"] = JsonPrimitive(labelId)
            btnProps["action"] = JsonObject(actionProps)
            if (primary) btnProps["primary"] = JsonPrimitive(true)
            components.add(JsonObject(mapOf(
                "id" to JsonPrimitive(id),
                "component" to JsonObject(mapOf("Button" to JsonObject(btnProps))),
            )))
            return id
        }

        fun finalize(rootId: String): List<JsonObject> {
            val surfaceUpdate = JsonObject(mapOf(
                "surfaceUpdate" to JsonObject(mapOf(
                    "surfaceId" to JsonPrimitive(surfaceId),
                    "components" to JsonArray(components),
                ))
            ))
            val beginRendering = JsonObject(mapOf(
                "beginRendering" to JsonObject(mapOf(
                    "surfaceId" to JsonPrimitive(surfaceId),
                    "root" to JsonPrimitive(rootId),
                    "catalogId" to JsonPrimitive(
                        "https://a2ui.org/specification/v0_8/standard_catalog_definition.json"
                    ),
                ))
            ))
            return listOf(surfaceUpdate, beginRendering)
        }
    }
}
