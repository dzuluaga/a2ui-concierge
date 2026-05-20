package com.diegoz.a2uiconcierge.x402

import kotlinx.cinterop.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import platform.CoreFoundation.CFDictionaryRef
import platform.CoreFoundation.CFTypeRefVar
import platform.CoreFoundation.kCFBooleanTrue
import platform.Foundation.NSData
import platform.Foundation.NSMutableDictionary
import platform.Foundation.NSString
import platform.Foundation.create
import platform.LocalAuthentication.LAContext
import platform.LocalAuthentication.LAPolicyDeviceOwnerAuthenticationWithBiometrics
import platform.Security.*
import platform.darwin.OSStatus
import platform.posix.memcpy
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

@OptIn(ExperimentalForeignApi::class)
actual class SecureWallet {

    companion object {
        private const val SERVICE = "com.diegoz.a2uiconcierge.x402"
        private const val ACCOUNT = "wallet_seed"
        private const val SEED_BYTES = 32

        // CF string constants are toll-free bridged to NSString.
        // interpretObjCPointer reinterprets the raw pointer so it can be used as a
        // dict key (NSString satisfies the NSCopyingProtocol requirement).
        private fun cfStr(ref: CPointer<*>?): NSString =
            interpretObjCPointer(ref!!.rawValue)
    }

    actual fun hasWallet(): Boolean {
        val query = NSMutableDictionary().apply {
            setObject(cfStr(kSecClassGenericPassword), forKey = cfStr(kSecClass))
            setObject(SERVICE, forKey = cfStr(kSecAttrService))
            setObject(ACCOUNT, forKey = cfStr(kSecAttrAccount))
        }
        @Suppress("UNCHECKED_CAST")
        val status = SecItemCopyMatching(query as CFDictionaryRef?, null)
        return status == errSecSuccess
    }

    actual suspend fun createWallet(): Boolean {
        require(!hasWallet()) { "wallet already exists" }
        biometricGate("Create x402 wallet")

        val seed = ByteArray(SEED_BYTES)
        seed.usePinned { pinned ->
            SecRandomCopyBytes(kSecRandomDefault, SEED_BYTES.toULong(), pinned.addressOf(0))
        }

        try {
            val seedData: NSData = seed.usePinned { pinned ->
                NSData.create(bytes = pinned.addressOf(0), length = SEED_BYTES.toULong())
            } ?: throw IllegalStateException("Failed to create NSData from seed")

            val addQuery = NSMutableDictionary().apply {
                setObject(cfStr(kSecClassGenericPassword), forKey = cfStr(kSecClass))
                setObject(SERVICE, forKey = cfStr(kSecAttrService))
                setObject(ACCOUNT, forKey = cfStr(kSecAttrAccount))
                setObject(cfStr(kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly), forKey = cfStr(kSecAttrAccessible))
                setObject(seedData, forKey = cfStr(kSecValueData))
            }
            @Suppress("UNCHECKED_CAST")
            val status: OSStatus = SecItemAdd(addQuery as CFDictionaryRef?, null)
            check(status == errSecSuccess) { "Keychain add failed: $status" }
        } finally {
            seed.fill(0)
        }
        return true
    }

    actual suspend fun <T> withSeed(action: suspend (ByteArray) -> T): T {
        check(hasWallet()) { "no wallet — call createWallet() first" }
        biometricGate("Authorize x402 payment")

        val query = NSMutableDictionary().apply {
            setObject(cfStr(kSecClassGenericPassword), forKey = cfStr(kSecClass))
            setObject(SERVICE, forKey = cfStr(kSecAttrService))
            setObject(ACCOUNT, forKey = cfStr(kSecAttrAccount))
            // kCFBooleanTrue is CFBooleanRef — toll-free bridges to NSNumber
            setObject(interpretObjCPointer<NSString>(kCFBooleanTrue!!.rawValue), forKey = cfStr(kSecReturnData))
        }

        val seed = memScoped {
            val dataRef = alloc<ObjCObjectVar<Any?>>()
            @Suppress("UNCHECKED_CAST")
            val status = SecItemCopyMatching(
                query as CFDictionaryRef?,
                dataRef.ptr as CValuesRef<CFTypeRefVar>,
            )
            check(status == errSecSuccess) { "Keychain read failed: $status" }
            val data = dataRef.value as? NSData
                ?: throw IllegalStateException("Keychain returned null or unexpected data")

            ByteArray(data.length.toInt()).also { buf ->
                buf.usePinned { pinned ->
                    memcpy(pinned.addressOf(0), data.bytes, data.length)
                }
            }
        }

        try {
            return action(seed)
        } finally {
            seed.fill(0)
        }
    }

    private suspend fun biometricGate(reason: String) = withContext(Dispatchers.Main) {
        suspendCancellableCoroutine { cont ->
            val context = LAContext()
            if (!context.canEvaluatePolicy(LAPolicyDeviceOwnerAuthenticationWithBiometrics, error = null)) {
                cont.resumeWithException(IllegalStateException("Biometric auth not available"))
                return@suspendCancellableCoroutine
            }
            context.evaluatePolicy(
                LAPolicyDeviceOwnerAuthenticationWithBiometrics,
                localizedReason = reason,
            ) { success, authError ->
                if (success) {
                    cont.resume(Unit)
                } else {
                    cont.resumeWithException(
                        BiometricCancelledException(authError?.localizedDescription ?: "Biometric failed"),
                    )
                }
            }
        }
    }
}

class BiometricCancelledException(message: String) : RuntimeException(message)
