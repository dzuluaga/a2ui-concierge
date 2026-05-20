package com.diegoz.a2uiconcierge.x402

/**
 * Signs an x402 USDC TransferWithAuthorization (EIP-3009) envelope.
 *
 * Android actual: web3j — ECKeyPair + StructuredDataEncoder for EIP-712.
 * iOS actual: stub (NotImplementedError) — secp256k1 port deferred.
 *
 * [signEnvelope] takes the raw JSON challenge string and the 32-byte seed,
 * and returns the canonical camelCase JSON envelope expected by the backend.
 */
expect object X402Signer {
    fun signEnvelope(challengeJson: String, seed: ByteArray): String
}
