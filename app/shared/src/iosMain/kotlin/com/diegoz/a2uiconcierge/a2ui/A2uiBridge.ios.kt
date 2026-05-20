package com.diegoz.a2uiconcierge.a2ui

import io.ktor.client.HttpClient
import io.ktor.client.engine.darwin.Darwin
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.UIKit.UIAlertAction
import platform.UIKit.UIAlertActionStyleDefault
import platform.UIKit.UIAlertController
import platform.UIKit.UIAlertControllerStyleAlert
import platform.UIKit.UIApplication
import platform.UIKit.UIViewController
import platform.UIKit.UIWindow
import platform.UIKit.UIWindowScene
import platform.WebKit.WKNavigation
import platform.WebKit.WKNavigationDelegateProtocol
import platform.WebKit.WKScriptMessage
import platform.WebKit.WKScriptMessageHandlerProtocol
import platform.WebKit.WKUserContentController
import platform.WebKit.WKWebView
import platform.darwin.NSObject
import kotlin.coroutines.resume

/**
 * iOS bridge — maps window.AndroidBridge.xxx() calls (via a JS shim) to
 * WKWebView message handlers. See A2uiWebContent.ios.kt for the shim injection.
 *
 * Credential operations (verifyAge, verifyDpc, applyLoyalty) are not yet
 * supported on iOS — they show an informational alert and block the purchase.
 */
@OptIn(ExperimentalForeignApi::class)
actual class A2uiBridge actual constructor(val backendBaseUrl: String) {

    actual val actions = Channel<String>(capacity = Channel.UNLIMITED)
    actual val resizes = Channel<Int>(capacity = Channel.CONFLATED)

    var webView: WKWebView? = null

    private val scope = CoroutineScope(Dispatchers.Main)
    private val http = HttpClient(Darwin)

    // Emits true once the WKWebView finishes loading the host page.
    private val _pageReady = MutableStateFlow(false)
    val pageReady: StateFlow<Boolean> = _pageReady

    // WKNavigationDelegate — fires when the page finishes loading.
    val navigationDelegate: WKNavigationDelegateProtocol = object : NSObject(),
        WKNavigationDelegateProtocol {
        override fun webView(webView: WKWebView, didFinishNavigation: WKNavigation?) {
            _pageReady.value = true
        }
    }

    // ── Message handlers ────────────────────────────────────────────────────

    val actionHandler = makeHandler { msg ->
        val body = msg.body as? String ?: return@makeHandler
        actions.trySend(body)
    }

    val resizeHandler = makeHandler { msg ->
        val px = (msg.body as? Number)?.toInt() ?: return@makeHandler
        resizes.trySend(px)
    }

    val logHandler = makeHandler { msg ->
        println("A2uiBridge JS: ${msg.body}")
    }

    /**
     * x402 USDC settle — not yet supported on iOS.
     *
     * secp256k1 / EIP-712 signing requires a native cryptography binding that
     * is not yet available on iOS (web3j is JVM-only). Show an informational
     * alert and return an error JSON so the WebView can surface a clear message.
     */
    val settleHandler = makeHandler { msg ->
        val body = msg.body as? Map<*, *> ?: return@makeHandler
        val cb   = body["cb"] as? String ?: return@makeHandler
        scope.launch {
            showAlert(
                title   = "USDC Payment Not Supported",
                message = "On-chain USDC payment is not yet available on iOS. Please use the Android app to complete this purchase.",
            )
            callJsCallback(cb, jsonError("USDC payment not yet supported on iOS"))
        }
    }

    /**
     * Age verification — not yet supported on iOS.
     * Shows an informational alert and returns false to block the purchase.
     */
    val verifyAgeHandler = makeHandler { msg ->
        val body = msg.body as? Map<*, *> ?: return@makeHandler
        val cb   = body["cb"] as? String ?: return@makeHandler
        scope.launch {
            showAlert(
                title   = "Age Verification Required",
                message = "Age verification via a digital ID is not yet supported on this device. Please use the Android app to complete this purchase.",
            )
            callJsCallback(cb, "false")
        }
    }

    /**
     * DPC card verification — not yet supported on iOS.
     * Shows an informational alert and returns false to block the purchase.
     */
    val verifyDpcHandler = makeHandler { msg ->
        val body = msg.body as? Map<*, *> ?: return@makeHandler
        val cb   = body["cb"] as? String ?: return@makeHandler
        scope.launch {
            showAlert(
                title   = "Digital Card Required",
                message = "Digital Payment Credential verification is not yet supported on this device. Please use the Android app to complete this purchase.",
            )
            callJsCallback(cb, "false")
        }
    }

    /**
     * Loyalty discount — not yet supported on iOS.
     * Shows an informational alert and returns {"cancelled":true} so the
     * purchase can still proceed at the regular price.
     */
    val applyLoyaltyHandler = makeHandler { msg ->
        val body = msg.body as? Map<*, *> ?: return@makeHandler
        val cb   = body["cb"] as? String ?: return@makeHandler
        scope.launch {
            showAlert(
                title   = "Loyalty Program Unavailable",
                message = "The loyalty discount feature is not yet supported on this device. You can continue your purchase at the regular price.",
            )
            callJsCallback(cb, """{"cancelled":true}""")
        }
    }

    /** DPC settle — POST order_id to /dpc/settle */
    val settleDpcHandler = makeHandler { msg ->
        val body    = msg.body as? Map<*, *> ?: return@makeHandler
        val orderId = body["orderId"] as? String ?: return@makeHandler
        val cb      = body["cb"]      as? String ?: return@makeHandler
        scope.launch {
            val result = try {
                val resp = http.post("$backendBaseUrl/dpc/settle") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"order_id":"$orderId"}""")
                }
                if (resp.status.value in 200..299) resp.bodyAsText()
                else jsonError("HTTP ${resp.status.value}")
            } catch (e: Exception) {
                jsonError(e.message ?: "error")
            }
            callJsCallback(cb, result)
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    actual fun evaluateScript(js: String) {
        scope.launch { webView?.evaluateJavaScript(js, null) }
    }

    private fun callJs(js: String) {
        scope.launch { webView?.evaluateJavaScript(js, null) }
    }

    /**
     * Call a named JS callback safely via window['name'](result) — same pattern
     * Android uses so any global function name is dispatched correctly.
     */
    private fun callJsCallback(name: String, result: String) {
        val safeName = name.replace("'", "").replace("\\", "")
        callJs("window['$safeName']($result);")
    }

    /**
     * Presents a UIAlertController on the topmost view controller and suspends
     * until the user taps OK.
     */
    private suspend fun showAlert(title: String, message: String) =
        suspendCancellableCoroutine { cont ->
            val alert = UIAlertController.alertControllerWithTitle(
                title   = title,
                message = message,
                preferredStyle = UIAlertControllerStyleAlert,
            )
            alert.addAction(
                UIAlertAction.actionWithTitle(
                    title   = "OK",
                    style   = UIAlertActionStyleDefault,
                    handler = { cont.resume(Unit) },
                )
            )
            topmostViewController()?.presentViewController(alert, animated = true, completion = null)
                ?: cont.resume(Unit)
        }

    /** Finds the topmost presented view controller to host the alert. */
    private fun topmostViewController(): UIViewController? {
        val scene = UIApplication.sharedApplication
            .connectedScenes
            .filterIsInstance<UIWindowScene>()
            .firstOrNull() ?: return null
        val window = scene.windows.firstOrNull { (it as? UIWindow)?.isKeyWindow() == true }
            as? UIWindow ?: return null
        var vc = window.rootViewController ?: return null
        while (true) {
            vc = vc.presentedViewController ?: return vc
        }
    }

    private fun jsonError(msg: String): String {
        val safe = msg.replace("\\", "\\\\").replace("\"", "\\\"").take(400)
        return """{"error":"$safe"}"""
    }

    private fun makeHandler(
        block: (WKScriptMessage) -> Unit,
    ): WKScriptMessageHandlerProtocol = object : NSObject(), WKScriptMessageHandlerProtocol {
        override fun userContentController(
            userContentController: WKUserContentController,
            didReceiveScriptMessage: WKScriptMessage,
        ) = block(didReceiveScriptMessage)
    }
}
