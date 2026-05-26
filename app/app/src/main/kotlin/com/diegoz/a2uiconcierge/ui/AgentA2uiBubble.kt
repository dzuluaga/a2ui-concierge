package com.diegoz.a2uiconcierge.ui

import android.annotation.SuppressLint
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import kotlinx.coroutines.launch
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.diegoz.a2uiconcierge.a2ui.A2uiBridge
import com.diegoz.a2uiconcierge.a2ui.ThemeTokens
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Hosts one A2UI v0.8 *surface* inside a chat bubble. ``fragments`` is the
 * accumulated list of v0.8 messages whose surfaceId matches this bubble
 * (typically a surfaceUpdate followed by a beginRendering); each is
 * replayed through ``window.a2ui.ingest`` in order, so the interpreter in
 * the WebView builds the same surface state it would over an SSE stream.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AgentA2uiBubble(
    fragments: List<JsonObject>,
    onAction: (String) -> Unit,
    isFaded: Boolean = false,
) {
    val bridge = remember { A2uiBridge() }
    val payload = fragmentsAsJsArray(fragments)
    val density = LocalDensity.current

    LaunchedEffect(bridge) {
        for (json in bridge.actions) onAction(json)
    }

    var measuredHeightDp by remember { mutableStateOf(80.dp) }
    LaunchedEffect(bridge) {
        for (px in bridge.resizes) {
            val dp = with(density) { px.toDp() }
            measuredHeightDp = dp.coerceIn(60.dp, 720.dp)
        }
    }
    val animatedHeight: Dp by animateDpAsState(
        targetValue = measuredHeightDp,
        animationSpec = spring(
            stiffness = Spring.StiffnessMediumLow,
            dampingRatio = Spring.DampingRatioLowBouncy,
        ),
        label = "a2ui-bubble-height",
    )

    val rootType = primaryComponentType(fragments)
    // Standard-catalog confirmation surfaces root at "Card"; we detect them
    // by the marker tx-detail-open Button action they always include.
    val isConfirmation = hasButtonAction(fragments, "tx-detail-open")
    val isProductDetail = rootType == "ProductDetail"

    val popScale = remember {
        Animatable(
            when {
                isConfirmation -> 0.85f
                isProductDetail -> 0.7f
                else -> 1f
            }
        )
    }
    val popTranslateY = remember { Animatable(if (isProductDetail) -60f else 0f) }
    LaunchedEffect(rootType) {
        when {
            isConfirmation -> {
                popScale.snapTo(0.85f)
                popScale.animateTo(
                    targetValue = 1f,
                    animationSpec = spring(
                        stiffness = Spring.StiffnessMedium,
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                    ),
                )
            }
            isProductDetail -> {
                popScale.snapTo(0.7f)
                popTranslateY.snapTo(-60f)
                kotlinx.coroutines.coroutineScope {
                    launch {
                        popScale.animateTo(
                            targetValue = 1f,
                            animationSpec = spring(
                                stiffness = Spring.StiffnessMediumLow,
                                dampingRatio = Spring.DampingRatioLowBouncy,
                            ),
                        )
                    }
                    launch {
                        popTranslateY.animateTo(
                            targetValue = 0f,
                            animationSpec = spring(
                                stiffness = Spring.StiffnessMediumLow,
                                dampingRatio = Spring.DampingRatioLowBouncy,
                            ),
                        )
                    }
                }
            }
        }
    }

    val fadeAlpha: Float by animateFloatAsState(
        targetValue = if (isFaded) 0.45f else 1f,
        animationSpec = tween(durationMillis = 240),
        label = "a2ui-bubble-fade",
    )
    val fadeScale: Float by animateFloatAsState(
        targetValue = if (isFaded) 0.97f else 1f,
        animationSpec = tween(durationMillis = 240),
        label = "a2ui-bubble-fade-scale",
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .graphicsLayer {
                scaleX = popScale.value * fadeScale
                scaleY = popScale.value * fadeScale
                translationY = popTranslateY.value
                transformOrigin = TransformOrigin(0.5f, 0f)
            }
            .alpha(fadeAlpha),
    ) {
        AndroidView(
            modifier = Modifier.fillMaxWidth().height(animatedHeight),
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    setBackgroundColor(0)
                    addJavascriptInterface(bridge, "AndroidBridge")
                    bridge.webView = this
                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(m: ConsoleMessage): Boolean {
                            Log.d("A2uiWebView",
                                "${m.messageLevel()} ${m.sourceId()}:${m.lineNumber()}  ${m.message()}")
                            return true
                        }
                    }
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView, url: String?) {
                            view.evaluateJavascript(
                                "window.a2ui.applyTheme(${ThemeTokens.asJson()});",
                                null,
                            )
                            if (payload.isNotEmpty()) {
                                view.evaluateJavascript(
                                    "window.a2ui.ingest($payload);", null,
                                )
                                view.tag = payload
                            } else {
                                view.tag = ""
                            }
                        }
                    }
                    loadUrl("file:///android_asset/host.html")
                }
            },
            update = { wv ->
                val lastRendered = wv.tag as? String ?: return@AndroidView
                if (lastRendered != payload && payload.isNotEmpty()) {
                    wv.tag = payload
                    // Re-ingest from scratch: reset clears prior surface
                    // buffers so the new message stream is interpreted as a
                    // fresh sequence (same surfaceId would otherwise merge).
                    wv.evaluateJavascript(
                        "window.a2ui.reset(); window.a2ui.ingest($payload);",
                        null,
                    )
                }
            },
        )
    }
}

/**
 * Modal-sheet host variant. Drops the height-channel animation so the
 * WebView fills the available sheet area and its own native scrolling
 * handles overflow.
 */
@SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
@Composable
fun A2uiSheetContent(
    fragments: List<JsonObject>,
    onAction: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val bridge = remember { A2uiBridge() }
    val payload = fragmentsAsJsArray(fragments)

    LaunchedEffect(bridge) {
        for (json in bridge.actions) onAction(json)
    }
    LaunchedEffect(bridge) {
        for (px in bridge.resizes) Unit
    }

    Box(modifier = modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    isVerticalScrollBarEnabled = true
                    isNestedScrollingEnabled = true
                    setBackgroundColor(0)
                    addJavascriptInterface(bridge, "AndroidBridge")
                    bridge.webView = this
                    setOnTouchListener { v, ev ->
                        when (ev.actionMasked) {
                            android.view.MotionEvent.ACTION_DOWN ->
                                v.parent?.requestDisallowInterceptTouchEvent(true)
                            android.view.MotionEvent.ACTION_UP,
                            android.view.MotionEvent.ACTION_CANCEL ->
                                v.parent?.requestDisallowInterceptTouchEvent(false)
                        }
                        false
                    }
                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(m: ConsoleMessage): Boolean {
                            Log.d("A2uiSheet",
                                "${m.messageLevel()} ${m.sourceId()}:${m.lineNumber()}  ${m.message()}")
                            return true
                        }
                    }
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView, url: String?) {
                            view.evaluateJavascript(
                                "window.a2ui.applyTheme(${ThemeTokens.asJson()});",
                                null,
                            )
                            view.evaluateJavascript("window.a2ui.ingest($payload);", null)
                            view.tag = payload
                        }
                    }
                    loadUrl("file:///android_asset/host.html")
                }
            },
            update = { wv ->
                val lastRendered = wv.tag as? String ?: return@AndroidView
                if (lastRendered != payload) {
                    wv.tag = payload
                    wv.evaluateJavascript(
                        "window.a2ui.reset(); window.a2ui.ingest($payload);",
                        null,
                    )
                }
            },
        )
    }
}

/**
 * Serialise the per-bubble fragment list as a JS-array literal suitable
 * for ``window.a2ui.ingest(...)``. An empty list serialises to ``""`` so
 * callers can guard with ``isNotEmpty``.
 */
private fun fragmentsAsJsArray(fragments: List<JsonObject>): String {
    if (fragments.isEmpty()) return ""
    return fragments.joinToString(prefix = "[", postfix = "]", separator = ",") { it.toString() }
}

/**
 * Resolve the root component type from the fragment stream. v0.8 specifies
 * the root by id via ``beginRendering.root``; the first entry of
 * ``surfaceUpdate.components`` is not guaranteed to be the root, so we look
 * up by id. Used to pick the per-component entrance animation.
 */
private fun primaryComponentType(fragments: List<JsonObject>): String? {
    val rootId = fragments.firstNotNullOfOrNull { f ->
        (f["beginRendering"] as? JsonObject)
            ?.get("root")?.jsonPrimitive?.contentOrNull
    } ?: return null
    for (frame in fragments) {
        val update = frame["surfaceUpdate"] as? JsonObject ?: continue
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

/** True if any Button in the buffered surface declares ``action.name`` == [actionName]. */
private fun hasButtonAction(fragments: List<JsonObject>, actionName: String): Boolean {
    for (frame in fragments) {
        val update = frame["surfaceUpdate"] as? JsonObject ?: continue
        val components = update["components"] as? JsonArray ?: continue
        for (item in components) {
            val obj = item as? JsonObject ?: continue
            val componentObj = obj["component"] as? JsonObject ?: continue
            val buttonProps = componentObj["Button"] as? JsonObject ?: continue
            val action = buttonProps["action"] as? JsonObject ?: continue
            val name = action["name"]?.jsonPrimitive?.contentOrNull
            if (name == actionName) return true
        }
    }
    return false
}
