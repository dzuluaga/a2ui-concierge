package com.diegoz.a2uiconcierge.a2ui

import android.util.Log
import android.webkit.JavascriptInterface
import kotlinx.coroutines.channels.Channel

class A2uiBridge {
    val actions = Channel<String>(capacity = Channel.UNLIMITED)
    val resizes = Channel<Int>(capacity = Channel.CONFLATED)

    @JavascriptInterface
    fun onAction(json: String) {
        Log.d(TAG, "onAction: $json")
        actions.trySend(json)
    }

    @JavascriptInterface
    fun onResize(heightPx: Int) {
        Log.d(TAG, "onResize: $heightPx px")
        resizes.trySend(heightPx)
    }

    @JavascriptInterface
    fun log(msg: String) {
        Log.d(TAG, "JS: $msg")
    }

    private companion object { const val TAG = "A2uiBridge" }
}
