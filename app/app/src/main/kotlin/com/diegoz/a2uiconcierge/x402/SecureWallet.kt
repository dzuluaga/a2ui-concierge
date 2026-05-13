package com.diegoz.a2uiconcierge.x402

import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

/**
 * Biometric-bound wallet for the x402 USDC payment path.
 *
 * Stores a 32-byte secp256k1 private key ("seed") encrypted at rest with an
 * AES-256-GCM key in the Android Keystore (StrongBox if available, TEE
 * otherwise). Every call to [withSeed] pops a biometric prompt — the key has
 * a 0-second validity window so the seed is unreachable without a fresh tap.
 *
 * Used only for the USDC / x402 payment path. The DPC (Card Wallet) path does
 * not use this class — it goes through Android Credential Manager instead.
 */
class SecureWallet(private val context: Context) {

    companion object {
        private const val TAG = "SecureWallet"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val WRAP_KEY_ALIAS = "x402_seed_wrap"
        private const val PREFS = "x402_wallet"
        private const val PREF_CT = "seed_ct"
        private const val PREF_IV = "seed_iv"
        private const val GCM_TAG_BITS = 128
        private const val SEED_BYTES = 32
        private const val AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_STRONG
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun hasWallet(): Boolean = prefs.contains(PREF_CT) && prefs.contains(PREF_IV)

    fun isBiometricReady(): Boolean {
        val mgr = BiometricManager.from(context)
        return mgr.canAuthenticate(AUTHENTICATORS) == BiometricManager.BIOMETRIC_SUCCESS
    }

    /**
     * Generate a new seed and bind it to a StrongBox-wrapped key. Pops a
     * biometric prompt to authorize the initial wrap.
     */
    suspend fun createWallet(activity: FragmentActivity) {
        require(!hasWallet()) { "wallet already exists" }
        if (!isBiometricReady()) {
            throw IllegalStateException(
                "Biometric auth not available; enroll a fingerprint to use x402.",
            )
        }
        val key = getOrCreateWrapKey()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.ENCRYPT_MODE, key)
        }
        val authedCipher = promptForCipher(activity, cipher, purpose = "Create x402 wallet")
        val seed = ByteArray(SEED_BYTES).also { SecureRandom().nextBytes(it) }
        try {
            val ct = authedCipher.doFinal(seed)
            prefs.edit()
                .putString(PREF_CT, Base64.encodeToString(ct, Base64.NO_WRAP))
                .putString(PREF_IV, Base64.encodeToString(authedCipher.iv, Base64.NO_WRAP))
                .apply()
        } finally {
            seed.fill(0)
        }
    }

    /**
     * Run [action] with the wallet's decrypted seed. The seed buffer is zeroed
     * before this function returns. A biometric prompt fires every call.
     */
    suspend fun <T> withSeed(
        activity: FragmentActivity,
        action: (ByteArray) -> T,
    ): T {
        check(hasWallet()) { "no wallet — call createWallet() first" }
        val key = getOrCreateWrapKey()
        val iv = Base64.decode(prefs.getString(PREF_IV, null), Base64.NO_WRAP)
        val ct = Base64.decode(prefs.getString(PREF_CT, null), Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_BITS, iv))
        }
        val authed = promptForCipher(activity, cipher, purpose = "Authorize x402 payment")
        val seed = authed.doFinal(ct)
        try {
            return action(seed)
        } finally {
            seed.fill(0)
        }
    }

    private suspend fun promptForCipher(
        activity: FragmentActivity,
        cipher: Cipher,
        purpose: String,
    ): Cipher = withContext(Dispatchers.Main) {
        suspendCancellableCoroutine { cont ->
            val executor = androidx.core.content.ContextCompat.getMainExecutor(context)
            val prompt = BiometricPrompt(
                activity,
                executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        val unlocked = result.cryptoObject?.cipher
                        if (unlocked == null) {
                            cont.resumeWithException(
                                IllegalStateException("biometric succeeded but cipher missing"),
                            )
                        } else {
                            cont.resume(unlocked)
                        }
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        cont.resumeWithException(
                            BiometricCancelled("biometric error $errorCode: $errString"),
                        )
                    }

                    override fun onAuthenticationFailed() {
                        Log.d(TAG, "biometric attempt failed; awaiting retry")
                    }
                },
            )
            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle(purpose)
                .setSubtitle("Unlock the x402 wallet seed")
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(AUTHENTICATORS)
                .build()
            prompt.authenticate(info, BiometricPrompt.CryptoObject(cipher))
            cont.invokeOnCancellation { }
        }
    }

    private fun getOrCreateWrapKey(): SecretKey {
        val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (ks.getKey(WRAP_KEY_ALIAS, null) as? SecretKey)?.let { return it }
        return generateWrapKey()
    }

    private fun generateWrapKey(): SecretKey {
        val kgen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val hasStrongBox = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
            context.packageManager.hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE)
        val builder = KeyGenParameterSpec.Builder(
            WRAP_KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .setInvalidatedByBiometricEnrollment(true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
        } else {
            @Suppress("DEPRECATION")
            builder.setUserAuthenticationValidityDurationSeconds(-1)
        }
        if (hasStrongBox) {
            try {
                builder.setIsStrongBoxBacked(true)
                kgen.init(builder.build())
                return kgen.generateKey()
            } catch (e: Exception) {
                Log.w(TAG, "StrongBox unavailable on this device, falling back to TEE", e)
                builder.setIsStrongBoxBacked(false)
            }
        }
        kgen.init(builder.build())
        return kgen.generateKey()
    }
}

/** Thrown when the user cancels the biometric prompt or it errors out. */
class BiometricCancelled(message: String) : RuntimeException(message)
