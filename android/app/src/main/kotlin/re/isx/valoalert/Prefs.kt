package re.isx.valoalert

import android.content.Context

class Prefs(
    context: Context,
) {
    private val sp = context.getSharedPreferences("valoalert", Context.MODE_PRIVATE)

    /** Last alert already shown; -1 until the first poll, which only records the position. */
    var lastAlertId: Long
        get() = sp.getLong("lastAlertId", -1)
        set(v) = sp.edit().putLong("lastAlertId", v).apply()

    // shortcut: the TGT sits in app-private SharedPreferences, not the Keystore; fine unless the
    // phone is rooted, and signing out anywhere else does not revoke it (only this one).
    var tgt: String
        get() = sp.getString("tgt", "").orEmpty()
        set(v) = sp.edit().putString("tgt", v).apply()

    var user: String
        get() = sp.getString("user", "").orEmpty()
        set(v) = sp.edit().putString("user", v).apply()

    /** Null until the user signs in. */
    fun api(): Api? = if (tgt.isBlank()) null else Api(tgt)
}
