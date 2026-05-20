package com.diegoz.a2uiconcierge.x402

import org.json.JSONArray
import org.json.JSONObject
import org.web3j.crypto.ECKeyPair
import org.web3j.crypto.Keys
import org.web3j.crypto.Sign
import org.web3j.crypto.StructuredDataEncoder
import org.web3j.utils.Numeric
import java.math.BigInteger

actual object X402Signer {

    actual fun signEnvelope(challengeJson: String, seed: ByteArray): String {
        require(seed.size == 32) { "seed must be 32 bytes, got ${seed.size}" }
        val keyPair: ECKeyPair = ECKeyPair.create(BigInteger(1, seed))
        val address = Keys.toChecksumAddress("0x" + Keys.getAddress(keyPair.publicKey))

        val challenge = JSONObject(challengeJson)
        val extra = challenge.getJSONObject("extra")
        val chainId = challenge.getLong("chain_id")
        val verifyingContract = challenge.getString("asset")
        val payTo = challenge.getString("pay_to")
        val value = challenge.getLong("amount_units")
        val validAfter = challenge.getLong("valid_after")
        val validBefore = challenge.getLong("valid_before")
        val nonce = challenge.getString("nonce")

        val typedData = buildTypedData(
            domainName = extra.getString("name"),
            domainVersion = extra.getString("version"),
            chainId = chainId,
            verifyingContract = verifyingContract,
            from = address,
            to = payTo,
            value = value,
            validAfter = validAfter,
            validBefore = validBefore,
            nonce = nonce,
        )
        val hash = StructuredDataEncoder(typedData).hashStructuredData()
        val sig = Sign.signMessage(hash, keyPair, false)
        val signature = "0x" +
            Numeric.toHexStringNoPrefixZeroPadded(BigInteger(1, sig.r), 64) +
            Numeric.toHexStringNoPrefixZeroPadded(BigInteger(1, sig.s), 64) +
            String.format("%02x", sig.v[0].toInt() and 0xff)

        return JSONObject().apply {
            put("scheme", "exact")
            put("network", challenge.getString("network"))
            put("from", address)
            put("to", payTo)
            put("value", value.toString())
            put("validAfter", validAfter.toString())
            put("validBefore", validBefore.toString())
            put("nonce", nonce)
            put("signature", signature)
        }.toString()
    }

    private fun buildTypedData(
        domainName: String,
        domainVersion: String,
        chainId: Long,
        verifyingContract: String,
        from: String,
        to: String,
        value: Long,
        validAfter: Long,
        validBefore: Long,
        nonce: String,
    ): String {
        val types = JSONObject().apply {
            put("EIP712Domain", JSONArray()
                .put(field("name", "string"))
                .put(field("version", "string"))
                .put(field("chainId", "uint256"))
                .put(field("verifyingContract", "address")))
            put("TransferWithAuthorization", JSONArray()
                .put(field("from", "address"))
                .put(field("to", "address"))
                .put(field("value", "uint256"))
                .put(field("validAfter", "uint256"))
                .put(field("validBefore", "uint256"))
                .put(field("nonce", "bytes32")))
        }
        val domain = JSONObject().apply {
            put("name", domainName)
            put("version", domainVersion)
            put("chainId", chainId.toString())
            put("verifyingContract", verifyingContract)
        }
        val message = JSONObject().apply {
            put("from", from)
            put("to", to)
            put("value", value.toString())
            put("validAfter", validAfter.toString())
            put("validBefore", validBefore.toString())
            put("nonce", nonce)
        }
        return JSONObject().apply {
            put("types", types)
            put("primaryType", "TransferWithAuthorization")
            put("domain", domain)
            put("message", message)
        }.toString()
    }

    private fun field(name: String, type: String): JSONObject =
        JSONObject().apply { put("name", name); put("type", type) }
}
