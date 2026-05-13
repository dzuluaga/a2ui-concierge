package com.diegoz.a2uiconcierge.a2ui

import android.content.Context
import android.content.ContextWrapper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.fragment.app.FragmentActivity
import com.diegoz.a2uiconcierge.BuildConfig
import com.diegoz.a2uiconcierge.credential.CredentialService
import com.diegoz.a2uiconcierge.x402.SecureWallet
import com.diegoz.a2uiconcierge.x402.X402Signer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class A2uiBridge {
    val actions = Channel<String>(capacity = Channel.UNLIMITED)
    val resizes = Channel<Int>(capacity = Channel.CONFLATED)

    // Assigned by the AndroidView factory once the WebView exists, so the
    // bridge can deliver async settle results back into the JS runtime via
    // evaluateJavascript on the main thread.
    @Volatile var webView: WebView? = null

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

    /**
     * x402 settle bridge. The JS gives us the *unsigned* challenge object;
     * Kotlin owns the EIP-3009 signing (StrongBox-wrapped seed +
     * biometric per op) and the HTTP POST to /x402/settle. Result lands
     * back in JS via `evaluateJavascript` on a window-scoped callback.
     *
     * Two prompts on first use: one to create the wallet (set up the
     * StrongBox key + encrypt the seed), one to decrypt for signing.
     * Every subsequent payment is a single prompt.
     */
    @JavascriptInterface
    fun settle(orderId: String, challengeJson: String, callbackName: String) {
        Log.d(TAG, "settle: order=$orderId cb=$callbackName")
        scope.launch {
            val resultJson = try {
                val activity = currentActivity()
                    ?: error("No FragmentActivity in WebView context")
                val challenge = JSONObject(challengeJson)
                val wallet = SecureWallet(activity)
                if (!wallet.hasWallet()) wallet.createWallet(activity)
                val envelope = wallet.withSeed(activity) { seed ->
                    X402Signer(seed).signEnvelope(challenge)
                }
                val body = JSONObject().apply {
                    put("order_id", orderId)
                    put("envelope", envelope)
                }.toString()
                val req = Request.Builder()
                    .url("$BACKEND_BASE_URL/x402/settle")
                    .post(body.toRequestBody("application/json".toMediaType()))
                    .build()
                http.newCall(req).execute().use { resp ->
                    val text = resp.body?.string().orEmpty()
                    if (resp.isSuccessful) text else jsonError("HTTP ${resp.code}: $text")
                }
            } catch (e: Exception) {
                Log.e(TAG, "settle failed", e)
                jsonError(e.message ?: e::class.java.simpleName)
            }

            withContext(Dispatchers.Main) {
                webView?.evaluateJavascript(
                    "window['${callbackName.replace("'", "")}']($resultJson);",
                    null,
                )
            }
        }
    }

    /**
     * Digital Payment Credential bridge. Called by the payment-challenge
     * component when the user taps "Pay". Presents the DPC wallet picker via
     * Android Credential Manager; resolves to true if the wallet returns a
     * credential, false if cancelled or unavailable.
     */
    @JavascriptInterface
    fun verifyDpc(dcqlQueryJson: String, callbackName: String) {
        Log.d(TAG, "verifyDpc: cb=$callbackName")
        scope.launch {
            val authorized = try {
                val activity = currentActivity() ?: error("No FragmentActivity in WebView context")
                val result = CredentialService().requestCredential(activity, dcqlQueryJson)
                result.token != null
            } catch (e: Exception) {
                Log.e(TAG, "verifyDpc failed", e)
                false
            }

            withContext(Dispatchers.Main) {
                webView?.evaluateJavascript(
                    "window['${callbackName.replace("'", "")}']($authorized);",
                    null,
                )
            }
        }
    }

    /**
     * Loyalty discount bridge. Presents the loyalty credential via Android
     * Credential Manager; if granted, POSTs the order_id to /loyalty/apply
     * which rebuilds the x402 challenge at the discounted amount. Calls back
     * with {new_order_id, new_challenge, discount_amount, new_total} or an
     * {error} object on failure.
     */
    @JavascriptInterface
    fun applyLoyalty(orderId: String, dcqlQueryJson: String, callbackName: String) {
        Log.d(TAG, "applyLoyalty: order=$orderId cb=$callbackName")
        scope.launch {
            val resultJson = try {
                val activity = currentActivity() ?: error("No FragmentActivity in WebView context")
                val result = CredentialService().requestCredential(activity, dcqlQueryJson)
                if (result.token == null) {
                    """{"cancelled":true}"""
                } else {
                    val body = """{"order_id":"$orderId"}"""
                    val req = Request.Builder()
                        .url("$BACKEND_BASE_URL/loyalty/apply")
                        .post(body.toRequestBody("application/json".toMediaType()))
                        .build()
                    http.newCall(req).execute().use { resp ->
                        val text = resp.body?.string().orEmpty()
                        if (resp.isSuccessful) text else jsonError("HTTP ${resp.code}: $text")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "applyLoyalty failed", e)
                jsonError(e.message ?: e::class.java.simpleName)
            }

            withContext(Dispatchers.Main) {
                webView?.evaluateJavascript(
                    "window['${callbackName.replace("'", "")}']($resultJson);",
                    null,
                )
            }
        }
    }

    /**
     * DPC card settlement bridge. Called after verifyDpc succeeds. POSTs the
     * order_id to /dpc/settle and calls back with the JSON result (same shape
     * as /x402/settle: {order_id, tx_hash, explorer_url}).
     */
    @JavascriptInterface
    fun settleDpc(orderId: String, callbackName: String) {
        Log.d(TAG, "settleDpc: order=$orderId cb=$callbackName")
        scope.launch {
            val resultJson = try {
                val body = """{"order_id":"$orderId"}"""
                val req = Request.Builder()
                    .url("$BACKEND_BASE_URL/dpc/settle")
                    .post(body.toRequestBody("application/json".toMediaType()))
                    .build()
                http.newCall(req).execute().use { resp ->
                    val text = resp.body?.string().orEmpty()
                    if (resp.isSuccessful) text else jsonError("HTTP ${resp.code}: $text")
                }
            } catch (e: Exception) {
                Log.e(TAG, "settleDpc failed", e)
                jsonError(e.message ?: e::class.java.simpleName)
            }

            withContext(Dispatchers.Main) {
                webView?.evaluateJavascript(
                    "window['${callbackName.replace("'", "")}']($resultJson);",
                    null,
                )
            }
        }
    }

    /**
     * Age verification bridge. The JS payment-challenge component calls this
     * when the user taps "Verify Age". We invoke Android Credential Manager,
     * POST the VP token to /verify-age, and call back into JS with the boolean.
     */
    @JavascriptInterface
    fun verifyAge(dcqlQueryJson: String, callbackName: String) {
        Log.d(TAG, "verifyAge: cb=$callbackName")
        scope.launch {
            val verified = try {
                val activity = currentActivity() ?: error("No FragmentActivity in WebView context")
                val result = CredentialService().requestCredential(activity, dcqlQueryJson)
                if (result.token != null) {
                    val body = JSONObject().apply {
                        put("credentialToken", result.token)
                        put("dcqlQueryJson", dcqlQueryJson)
                    }.toString()
                    val req = Request.Builder()
                        .url("$BACKEND_BASE_URL/verify-age")
                        .post(body.toRequestBody("application/json".toMediaType()))
                        .build()
                    http.newCall(req).execute().use { resp ->
                        val text = resp.body?.string().orEmpty()
                        resp.isSuccessful && JSONObject(text).optBoolean("verified", false)
                    }
                } else {
                    false // cancelled or no token
                }
            } catch (e: Exception) {
                Log.e(TAG, "verifyAge failed", e)
                false
            }

            withContext(Dispatchers.Main) {
                webView?.evaluateJavascript(
                    "window['${callbackName.replace("'", "")}']($verified);",
                    null,
                )
            }
        }
    }

    /** Unwrap the WebView's context chain to find the hosting activity. */
    private fun currentActivity(): FragmentActivity? {
        var c: Context = webView?.context ?: return null
        while (c is ContextWrapper) {
            if (c is FragmentActivity) return c
            c = c.baseContext
        }
        return null
    }

    private fun jsonError(msg: String): String {
        val safe = msg.replace("\\", "\\\\").replace("\"", "\\\"").take(400)
        return """{"error":"$safe"}"""
    }

    private companion object {
        const val TAG = "A2uiBridge"
        // adb reverse tcp:8000 makes the laptop backend reachable here.
        val BACKEND_BASE_URL: String = BuildConfig.BACKEND_BASE_URL
        val http = OkHttpClient()
        val scope = CoroutineScope(Dispatchers.IO)
    }
}
