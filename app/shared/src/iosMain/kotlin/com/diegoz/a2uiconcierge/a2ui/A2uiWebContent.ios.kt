package com.diegoz.a2uiconcierge.a2ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import com.diegoz.a2uiconcierge.shared.Res
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.serialization.json.JsonObject
import org.jetbrains.compose.resources.ExperimentalResourceApi
import platform.CoreGraphics.CGRectMake
import platform.WebKit.WKUserScript
import platform.WebKit.WKUserScriptInjectionTime
import platform.WebKit.WKWebViewConfiguration

/**
 * JS shim injected at document-start so that existing `window.AndroidBridge.xxx()`
 * calls in a2ui-host.js are transparently forwarded to WKWebView message handlers.
 *
 * Credential operations (verifyAge, verifyDpc, applyLoyalty) route entirely through
 * native Kotlin handlers which open an ASWebAuthenticationSession — a real Safari
 * sheet where navigator.identity.get() is available.
 */
private val ANDROID_BRIDGE_SHIM = """
(function() {
  window.AndroidBridge = {
    onAction:     function(json)                    { window.webkit.messageHandlers.onAction.postMessage(json); },
    onResize:     function(px)                      { window.webkit.messageHandlers.onResize.postMessage(px); },
    log:          function(msg)                     { window.webkit.messageHandlers.log.postMessage(msg); },
    settle:       function(orderId,challengeJson,cb) { window.webkit.messageHandlers.settle.postMessage({orderId:orderId,challengeJson:challengeJson,cb:cb}); },
    verifyAge:    function(dcqlQueryJson,cb)         { window.webkit.messageHandlers.verifyAge.postMessage({dcqlQueryJson:dcqlQueryJson,cb:cb}); },
    verifyDpc:    function(dcqlQueryJson,cb)         { window.webkit.messageHandlers.verifyDpc.postMessage({dcqlQueryJson:dcqlQueryJson,cb:cb}); },
    applyLoyalty: function(orderId,dcqlQueryJson,cb) { window.webkit.messageHandlers.applyLoyalty.postMessage({orderId:orderId,dcqlQueryJson:dcqlQueryJson,cb:cb}); },
    settleDpc:    function(orderId,cb)              { window.webkit.messageHandlers.settleDpc.postMessage({orderId:orderId,cb:cb}); }
  };
})();
""".trimIndent()

@OptIn(ExperimentalForeignApi::class, ExperimentalResourceApi::class)
@Composable
actual fun A2uiWebContent(
    bridge: A2uiBridge,
    fragments: List<JsonObject>,
    isSheet: Boolean,
    modifier: Modifier,
) {
    val payload = fragments.lastOrNull()?.toString().orEmpty()
    val pageReady by bridge.pageReady.collectAsState()

    // Build self-contained HTML by inlining a2ui-host.js
    var htmlContent by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        val jsText = Res.readBytes("files/a2ui-host.js").decodeToString()
        htmlContent = """
            <!doctype html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet">
              <style>
                /* Match the app's Ivory background so the WebView is never black
                   before the a2ui theme tokens are applied. */
                html, body {
                  margin: 0;
                  padding: 0;
                  background-color: #F8F4ED;
                }
              </style>
            </head>
            <body>
              <div id="a2ui-root"></div>
              <script>$jsText</script>
            </body>
            </html>
        """.trimIndent()
    }

    val webView = remember(bridge) {
        val config = WKWebViewConfiguration()
        val ctrl = config.userContentController

        // Inject the AndroidBridge shim before any page script runs
        ctrl.addUserScript(
            WKUserScript(
                source = ANDROID_BRIDGE_SHIM,
                injectionTime = WKUserScriptInjectionTime.WKUserScriptInjectionTimeAtDocumentStart,
                forMainFrameOnly = true,
            )
        )

        // Register all message handlers
        ctrl.addScriptMessageHandler(bridge.actionHandler,       name = "onAction")
        ctrl.addScriptMessageHandler(bridge.resizeHandler,       name = "onResize")
        ctrl.addScriptMessageHandler(bridge.logHandler,          name = "log")
        ctrl.addScriptMessageHandler(bridge.settleHandler,       name = "settle")
        ctrl.addScriptMessageHandler(bridge.verifyAgeHandler,    name = "verifyAge")
        ctrl.addScriptMessageHandler(bridge.verifyDpcHandler,    name = "verifyDpc")
        ctrl.addScriptMessageHandler(bridge.applyLoyaltyHandler, name = "applyLoyalty")
        ctrl.addScriptMessageHandler(bridge.settleDpcHandler,    name = "settleDpc")

        val wv = platform.WebKit.WKWebView(
            frame = CGRectMake(0.0, 0.0, 0.0, 0.0),
            configuration = config,
        )
        // Use the app's Ivory background (#F8F4ED) so the WKWebView never
        // flashes black before the HTML or theme tokens have loaded.
        wv.opaque = true
        wv.backgroundColor = platform.UIKit.UIColor(
            red = 248.0 / 255.0,
            green = 244.0 / 255.0,
            blue = 237.0 / 255.0,
            alpha = 1.0,
        )
        wv.navigationDelegate = bridge.navigationDelegate

        // Disable inner scrolling for inline (non-sheet) mode so the Compose
        // parent handles scrolling; the WKWebView fills the Kotlin-measured height.
        if (!isSheet) {
            wv.scrollView.scrollEnabled = false
            wv.scrollView.bounces = false
        }

        bridge.webView = wv
        wv
    }

    // Load HTML once the inline content is assembled
    LaunchedEffect(htmlContent) {
        val html = htmlContent ?: return@LaunchedEffect
        webView.loadHTMLString(html, baseURL = null)
    }

    // Render payload once the page signals it's ready (didFinishNavigation).
    // At that point window.AndroidBridge and window.a2ui are both defined.
    LaunchedEffect(pageReady, payload) {
        if (pageReady && payload.isNotEmpty()) {
            webView.evaluateJavaScript(
                "window.a2ui.applyTheme(${ThemeTokens.asJson()});window.a2ui.render($payload);",
                null,
            )
        }
    }

    UIKitView(
        factory = { webView },
        modifier = modifier,
        update = { wv ->
            if (pageReady && payload.isNotEmpty()) {
                wv.evaluateJavaScript("window.a2ui.render($payload);", null)
            }
        },
    )
}
