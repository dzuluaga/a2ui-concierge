package com.diegoz.a2uiconcierge.a2ui

import android.webkit.JavascriptInterface
import kotlinx.coroutines.channels.Channel

class A2uiBridge {
    val actions = Channel<String>(capacity = Channel.UNLIMITED)
    val resizes = Channel<Int>(capacity = Channel.CONFLATED)

    @JavascriptInterface
    fun onAction(json: String) { actions.trySend(json) }

    @JavascriptInterface
    fun onResize(heightPx: Int) { resizes.trySend(heightPx) }
}
