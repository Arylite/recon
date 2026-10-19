package re.isx.valoalert

import android.content.Context

// shortcut: the API token sits in app-private SharedPreferences, not the Keystore; fine unless the
// phone is rooted, rotate API_TOKEN if it is lost.
class Prefs(
    context: Context,
) {
    private val sp = context.getSharedPreferences("valoalert", Context.MODE_PRIVATE)

    var url: String
        get() = sp.getString("url", "").orEmpty()
        set(v) = sp.edit().putString("url", v.trim()).apply()

    var token: String
        get() = sp.getString("token", "").orEmpty()
        set(v) = sp.edit().putString("token", v.trim()).apply()

    /** Last alert already shown; -1 until the first poll, which only records the position. */
    var lastAlertId: Long
        get() = sp.getLong("lastAlertId", -1)
        set(v) = sp.edit().putLong("lastAlertId", v).apply()

    fun api(): Api? = if (url.isBlank() || token.isBlank()) null else Api(url, token)
}
