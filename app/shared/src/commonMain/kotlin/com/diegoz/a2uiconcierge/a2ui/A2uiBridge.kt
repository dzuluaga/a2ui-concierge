package com.diegoz.a2uiconcierge.a2ui

import kotlinx.coroutines.channels.Channel

/**
 * Platform-specific JavaScript bridge for the A2UI web host.
 *
 * Android actual: [JavascriptInterface] on a WebView.
 * iOS actual: WKScriptMessageHandler on a WKWebView.
 *
 * The [actions] and [resizes] channels expose JS events to the shared
 * Compose layer without any platform imports in commonMain.
 */
expect class A2uiBridge(backendBaseUrl: String) {
    val actions: Channel<String>
    val resizes: Channel<Int>
    fun evaluateScript(js: String)
}
