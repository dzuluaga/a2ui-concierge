package com.diegoz.a2uiconcierge.a2ui

import android.annotation.SuppressLint
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.serialization.json.JsonObject

@SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
@Composable
actual fun A2uiWebContent(
    bridge: A2uiBridge,
    fragments: List<JsonObject>,
    isSheet: Boolean,
    modifier: Modifier,
) {
    val payload = fragmentsAsJsArray(fragments)

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                setBackgroundColor(0)
                addJavascriptInterface(bridge, "AndroidBridge")
                bridge.webView = this

                if (isSheet) {
                    isVerticalScrollBarEnabled = true
                    isNestedScrollingEnabled = true
                    // Prevent the ModalBottomSheet drag handler from stealing
                    // horizontal carousel swipes mid-flick.
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
                }

                webChromeClient = object : WebChromeClient() {
                    override fun onConsoleMessage(m: ConsoleMessage): Boolean {
                        Log.d(
                            if (isSheet) "A2uiSheet" else "A2uiWebView",
                            "${m.messageLevel()} ${m.sourceId()}:${m.lineNumber()}  ${m.message()}"
                        )
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
                            view.evaluateJavascript("window.a2ui.ingest($payload);", null)
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
                wv.evaluateJavascript("window.a2ui.reset(); window.a2ui.ingest($payload);", null)
            }
        },
    )
}

/**
 * Serialise the per-bubble fragment list as a JS-array literal suitable for
 * ``window.a2ui.ingest(...)``. Empty list → "" so callers can guard.
 */
private fun fragmentsAsJsArray(fragments: List<JsonObject>): String {
    if (fragments.isEmpty()) return ""
    return fragments.joinToString(prefix = "[", postfix = "]", separator = ",") { it.toString() }
}
