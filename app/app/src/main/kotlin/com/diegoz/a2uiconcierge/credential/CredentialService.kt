package com.diegoz.a2uiconcierge.credential

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.DigitalCredential
import androidx.credentials.ExperimentalDigitalCredentialApi
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetDigitalCredentialOption
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class CredentialResult(
    val token: String?,
    val error: String?,
    val cancelled: Boolean = false,
)

class CredentialService {

    @OptIn(ExperimentalDigitalCredentialApi::class)
    suspend fun requestCredential(activity: Activity, dcqlQueryJson: String): CredentialResult {
        return try {
            val credentialManager = CredentialManager.create(activity)

            val mdocFormats = JSONObject().apply {
                put("issuerauth_alg_values", JSONArray().apply { put(-7) })
                put("deviceauth_alg_values", JSONArray().apply { put(-7) })
            }
            val clientMetadata = JSONObject().apply {
                put("vp_formats_supported", JSONObject().apply {
                    put("mso_mdoc", mdocFormats)
                })
            }
            val requestData = JSONObject().apply {
                put("response_type", "vp_token")
                put("response_mode", "dc_api")
                put("nonce", UUID.randomUUID().toString())
                put("dcql_query", JSONObject(dcqlQueryJson))
                put("client_metadata", clientMetadata)
                put("transaction_data", JSONArray())
            }
            val envelope = JSONObject().apply {
                put("requests", JSONArray().apply {
                    put(JSONObject().apply {
                        put("protocol", "openid4vp-v1-unsigned")
                        put("data", requestData)
                    })
                })
            }

            val option = GetDigitalCredentialOption(envelope.toString())
            val response = credentialManager.getCredential(
                activity,
                GetCredentialRequest(listOf(option)),
            )
            val digital = response.credential as? DigitalCredential
            if (digital != null) {
                CredentialResult(token = digital.credentialJson, error = null)
            } else {
                CredentialResult(null, "Returned credential was not a DigitalCredential")
            }
        } catch (e: GetCredentialCancellationException) {
            CredentialResult(token = null, error = null, cancelled = true)
        } catch (e: NoCredentialException) {
            CredentialResult(null, "No matching credentials found in wallet.")
        } catch (e: Exception) {
            e.printStackTrace()
            CredentialResult(null, e.message ?: "Unknown credential error")
        }
    }
}
