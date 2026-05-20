package com.diegoz.a2uiconcierge.a2ui

import android.content.Context
import android.content.ContextWrapper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.fragment.app.FragmentActivity
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

actual class A2uiBridge actual constructor(private val backendBaseUrl: String) {

    actual val actions = Channel<String>(capacity = Channel.UNLIMITED)
    actual val resizes = Channel<Int>(capacity = Channel.CONFLATED)

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
     * x402 settle bridge. Receives the unsigned challenge from JS, signs it
     * with the biometric-bound seed, POSTs to the backend, and delivers the
     * result back via a window-scoped JS callback.
     */
    @JavascriptInterface
    fun settle(orderId: String, challengeJson: String, callbackName: String) {
        Log.d(TAG, "settle: order=$orderId cb=$callbackName")
        scope.launch {
            val resultJson = try {
                val activity = currentActivity()
                    ?: error("No FragmentActivity in WebView context")
                val wallet = SecureWallet(activity)
                if (!wallet.hasWallet()) wallet.createWallet()
                val envelopeJson = wallet.withSeed { seed ->
                    X402Signer.signEnvelope(challengeJson, seed)
                }
                val body = """{"order_id":"$orderId","envelope":$envelopeJson}"""
                val req = Request.Builder()
                    .url("$backendBaseUrl/x402/settle")
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
     * Age verification bridge. Invokes Android Credential Manager with the
     * DCQL query, POSTs the VP token to /verify-age, and calls back into JS
     * with the boolean result.
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
                        .url("$backendBaseUrl/verify-age")
                        .post(body.toRequestBody("application/json".toMediaType()))
                        .build()
                    http.newCall(req).execute().use { resp ->
                        val text = resp.body?.string().orEmpty()
                        resp.isSuccessful && JSONObject(text).optBoolean("verified", false)
                    }
                } else {
                    false
                }
            } catch (e: Exception) {
                Log.e(TAG, "verifyAge failed", e)
                false
            }
            withContext(Dispatchers.Main) {
                webView?.evaluateJavascript(
                    "window['${callbackName.replace("'", "")}']($verified);", null,
                )
            }
        }
    }

    /**
     * Digital Payment Credential bridge. Presents the DPC wallet picker;
     * resolves to true if the wallet returns a credential, false if cancelled.
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
                    "window['${callbackName.replace("'", "")}']($authorized);", null,
                )
            }
        }
    }

    /**
     * Loyalty discount bridge. Presents loyalty credential via Credential
     * Manager; if granted, POSTs to /loyalty/apply and calls back with the
     * discounted order JSON.
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
                        .url("$backendBaseUrl/loyalty/apply")
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
                    "window['${callbackName.replace("'", "")}']($resultJson);", null,
                )
            }
        }
    }

    /**
     * DPC card settlement bridge. Called after verifyDpc succeeds. POSTs the
     * order_id to /dpc/settle and calls back with {order_id, tx_hash, explorer_url}.
     */
    @JavascriptInterface
    fun settleDpc(orderId: String, callbackName: String) {
        Log.d(TAG, "settleDpc: order=$orderId cb=$callbackName")
        scope.launch {
            val resultJson = try {
                val body = """{"order_id":"$orderId"}"""
                val req = Request.Builder()
                    .url("$backendBaseUrl/dpc/settle")
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
                    "window['${callbackName.replace("'", "")}']($resultJson);", null,
                )
            }
        }
    }

    actual fun evaluateScript(js: String) {
        scope.launch(Dispatchers.Main) {
            webView?.evaluateJavascript(js, null)
        }
    }

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
        val http = OkHttpClient()
        val scope = CoroutineScope(Dispatchers.IO)
    }
}
