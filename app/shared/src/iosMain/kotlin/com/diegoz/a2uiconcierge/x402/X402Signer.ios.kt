package com.diegoz.a2uiconcierge.x402

actual object X402Signer {
    actual fun signEnvelope(challengeJson: String, seed: ByteArray): String {
        // secp256k1 + EIP-712 signing requires a pure-Kotlin or Swift interop
        // implementation. web3j is JVM-only and cannot run on iOS.
        // Deferred: implement using a Kotlin/Native secp256k1 binding or
        // expose a Swift function via @ObjCName and call it from here.
        throw NotImplementedError("X402 signing is not yet implemented on iOS")
    }
}
