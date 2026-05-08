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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AgentA2uiBubble(
    fragments: List<JsonObject>,
    onAction: (String) -> Unit,
    isFaded: Boolean = false,
) {
    val bridge = remember { A2uiBridge() }
    val payload = fragments.lastOrNull()?.toString().orEmpty()
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

    val component = fragments.lastOrNull()?.get("component")?.jsonPrimitive?.content
    val isConfirmation = component == "confirmation-card"
    val isProductDetail = component == "product-detail"

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
    LaunchedEffect(component) {
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
            .padding(horizontal = 12.dp, vertical = 4.dp)
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
                            val initial = fragments.lastOrNull()?.toString().orEmpty()
                            if (initial.isNotEmpty()) {
                                view.evaluateJavascript(
                                    "window.a2ui.render($initial);", null,
                                )
                                view.tag = initial
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
                    wv.evaluateJavascript("window.a2ui.render($payload);", null)
                }
            },
        )
    }
}
