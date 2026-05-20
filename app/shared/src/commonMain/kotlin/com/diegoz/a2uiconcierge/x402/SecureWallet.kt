package com.diegoz.a2uiconcierge.x402

/**
 * Biometric-bound wallet for x402 payments.
 *
 * Android actual: BiometricPrompt + Android Keystore (AES-256-GCM, StrongBox).
 * iOS actual: ASAuthorizationController + iOS Keychain (kSecAccessControlBiometryCurrentSet).
 *
 * One wallet per app install. The 32-byte secp256k1 seed is encrypted at rest
 * and only decrypted inside [withSeed]; the buffer is zeroed before returning.
 */
expect class SecureWallet {
    fun hasWallet(): Boolean
    suspend fun createWallet(): Boolean
    suspend fun <T> withSeed(action: suspend (ByteArray) -> T): T
}
