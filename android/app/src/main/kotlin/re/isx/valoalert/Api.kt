package re.isx.valoalert

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

data class Offer(
    val name: String,
    val icon: String?,
    val tier: String?,
    /** Price in Valorant Points. */
    val cost: Int?,
)

data class Account(
    val id: String,
    val name: String,
    val shard: String,
    val offers: List<Offer>,
    val error: String?,
)

data class Alert(
    val id: Long,
    val account: String,
    val skin: String,
)

/** A 401: the service ticket expired, or with [signedOut] the TGT itself is gone. */
class Unauthorized(
    message: String,
    val signedOut: Boolean = false,
) : Exception(message)

private fun request(
    method: String,
    url: String,
    auth: String?,
    body: JSONObject? = null,
): String {
    val c = URL(url).openConnection() as HttpURLConnection
    try {
        c.requestMethod = method
        c.connectTimeout = 10_000
        c.readTimeout = 20_000
        c.setRequestProperty("X-App-Key", BuildConfig.API_TOKEN)
        if (auth != null) c.setRequestProperty("Authorization", "Bearer $auth")
        if (body != null) {
            c.doOutput = true
            c.setRequestProperty("Content-Type", "application/json")
            c.outputStream.use { it.write(body.toString().toByteArray()) }
        }
        val ok = c.responseCode in 200..299
        val text = (if (ok) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
        if (!ok) {
            // Error bodies are JSON from the backend, but HTML when Cloudflare itself fails.
            val reason = runCatching { JSONObject(text).optString("error") }.getOrNull()
            val msg = if (reason.isNullOrEmpty()) "HTTP ${c.responseCode}" else reason
            if (c.responseCode == 401) throw Unauthorized(msg)
            error(msg)
        }
        return text
    } finally {
        c.disconnect()
    }
}

private fun url(path: String) = BuildConfig.API_URL.trimEnd('/') + path

object Auth {
    /**
     * The password never leaves the phone: the server only gets this hash, salted with the user
     * name, and hashes it again before storing it.
     */
    private fun clientHash(
        name: String,
        password: String,
    ): String {
        val spec = PBEKeySpec(password.toCharArray(), "recon:$name".toByteArray(), 100_000, 256)
        return SecretKeyFactory
            .getInstance("PBKDF2WithHmacSHA256")
            .generateSecret(spec)
            .encoded
            .joinToString("") { "%02x".format(it) }
    }

    /** Creates the user or signs in; returns the ticket-granting ticket to keep. */
    fun signIn(
        name: String,
        password: String,
        create: Boolean,
    ): String {
        // Same wording as the server's validation errors, so friendly() covers both.
        if (password.length < 8) error("invalid: password")
        val body = JSONObject().put("name", name).put("password", clientHash(name, password))
        return JSONObject(request("POST", url(if (create) "/auth/register" else "/auth/login"), null, body)).getString("tgt")
    }

    fun signOut(tgt: String) {
        request("POST", url("/auth/logout"), tgt)
    }
}

/**
 * Blocking client for the backend; call it off the main thread. The TGT is traded for a one-hour
 * service ticket, renewed on the first 401.
 */
class Api(
    private val tgt: String,
) {
    @Volatile private var ticket: String? = null

    private fun newTicket(): String =
        try {
            JSONObject(request("POST", url("/auth/ticket"), tgt)).getString("ticket").also { ticket = it }
        } catch (e: Unauthorized) {
            throw Unauthorized(e.message.orEmpty(), signedOut = true)
        }

    private fun call(
        method: String,
        path: String,
        body: JSONObject? = null,
    ): String =
        try {
            request(method, url(path), ticket ?: newTicket(), body)
        } catch (e: Unauthorized) {
            if (e.signedOut) throw e
            request(method, url(path), newTicket(), body)
        }

    private fun <T> JSONArray.map(f: (JSONObject) -> T) = (0 until length()).map { f(getJSONObject(it)) }

    private fun JSONObject.str(key: String) = if (isNull(key)) null else getString(key)

    fun catalog(): String = call("GET", "/catalog")

    fun accounts(): List<Account> =
        JSONArray(call("GET", "/accounts")).map { o ->
            Account(
                o.getString("id"),
                o.getString("name"),
                o.getString("shard"),
                o.getJSONArray("offers").map {
                    Offer(it.getString("name"), it.str("icon"), it.str("tier"), if (it.isNull("cost")) null else it.getInt("cost"))
                },
                o.str("error"),
            )
        }

    /** The backend logs in with the cookies and detects the region and the Riot ID itself. */
    fun addAccount(cookies: String) {
        call("POST", "/accounts", JSONObject().put("cookies", cookies))
    }

    fun deleteAccount(id: String) {
        call("DELETE", "/accounts/$id")
    }

    fun wishlist(): List<String> = JSONArray(call("GET", "/wishlist")).let { a -> (0 until a.length()).map { a.getString(it) } }

    fun addWish(name: String) {
        call("POST", "/wishlist", JSONObject().put("name", name))
    }

    fun deleteWish(name: String) {
        call("DELETE", "/wishlist/" + URLEncoder.encode(name, "UTF-8").replace("+", "%20"))
    }

    fun alerts(since: Long): List<Alert> =
        JSONArray(call("GET", "/alerts?since=$since")).map {
            Alert(it.getLong("id"), it.getString("account"), it.getString("skin"))
        }
}

/** Turns a backend or network error into a sentence for someone who never saw a server. */
fun friendly(error: String?): String {
    val e = error.orEmpty().lowercase()
    return when {
        "invalid: name" in e -> "Names use 3 to 32 letters, digits or _."
        "invalid: password" in e -> "Your password needs at least 8 characters."
        "wrong name or password" in e -> "Wrong name or password."
        "name is taken" in e -> "This name is taken, pick another one."
        "signed out" in e -> "You were signed out. Sign in again."
        "riot session expired" in e || "ssid" in e -> "Riot signed this account out. Add it again to keep watching it."
        "unknown app" in e -> "This version of Recon is out of date. Install the latest one."
        "answered" in e || "region" in e || "riot" in e -> "Riot isn't answering right now. Recon tries again in a few minutes."
        else -> "Something went wrong. Try again in a moment."
    }
}

fun friendly(e: Exception): String = if (e is java.io.IOException) "Recon can't be reached. Check your connection." else friendly(e.message)
