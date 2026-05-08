package com.diegoz.a2uiconcierge.ui

import android.annotation.SuppressLint
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.core.animateDpAsState
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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.diegoz.a2uiconcierge.a2ui.A2uiBridge
import com.diegoz.a2uiconcierge.a2ui.ThemeTokens
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AgentA2uiBubble(
    fragments: List<JsonObject>,
    onAction: (String) -> Unit,
) {
    val bridge = remember { A2uiBridge() }
    var measured by remember { mutableStateOf(120.dp) }
    val animated by animateDpAsState(targetValue = measured, label = "a2ui-height")
    val density = LocalDensity.current

    LaunchedEffect(bridge) {
        launch {
            for (h in bridge.resizes) {
                measured = with(density) { h.toDp() }
            }
        }
        launch {
            for (json in bridge.actions) onAction(json)
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
    ) {
        AndroidView(
            modifier = Modifier.fillMaxWidth().height(animated),
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    setBackgroundColor(0)
                    addJavascriptInterface(bridge, "AndroidBridge")
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView, url: String?) {
                            view.evaluateJavascript(
                                "window.a2ui.applyTheme(${ThemeTokens.asJson()});",
                                null,
                            )
                            renderAll(view, fragments)
                        }
                    }
                    loadUrl("file:///android_asset/host.html")
                }
            },
            update = { wv -> renderAll(wv, fragments) },
        )
    }
}

private fun renderAll(wv: WebView, fragments: List<JsonObject>) {
    if (fragments.isEmpty()) return
    val payload = fragments.last().toString()
    wv.evaluateJavascript("window.a2ui.render($payload);", null)
}
