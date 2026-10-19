package re.isx.valoalert

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

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

/** Blocking client for the backend; call it off the main thread. */
class Api(
    private val baseUrl: String,
    private val token: String,
) {
    private fun call(
        method: String,
        path: String,
        body: JSONObject? = null,
    ): String {
        val c = URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            c.requestMethod = method
            c.connectTimeout = 10_000
            c.readTimeout = 20_000
            c.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json")
                c.outputStream.use { it.write(body.toString().toByteArray()) }
            }
            val ok = c.responseCode in 200..299
            val text = (if (ok) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (!ok) {
                // Error bodies are JSON from the backend, but HTML when the tunnel itself fails.
                val reason = runCatching { JSONObject(text).optString("error") }.getOrNull()
                error(if (reason.isNullOrEmpty()) "HTTP ${c.responseCode}" else reason)
            }
            return text
        } finally {
            c.disconnect()
        }
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
