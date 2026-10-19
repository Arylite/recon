package re.isx.valoalert

import android.content.Context
import android.graphics.Color
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

data class Tier(
    val id: String,
    val name: String,
    val color: Int,
    /** 0 for Select up to 4 for Ultra. */
    val rank: Int,
)

data class Skin(
    /** The skin itself, to fetch its variants. */
    val uuid: String,
    val level: String,
    val name: String,
    val icon: String,
    val tier: String?,
    val weapon: String,
    /** The skin line, like Reaver or Prime. */
    val line: String?,
)

/** Skin names, art and tier colours, served by the backend from valorant-api.com. */
class Catalog(
    val tiers: List<Tier>,
    val skins: List<Skin>,
) {
    private val byName = skins.associateBy { it.name.lowercase() }

    fun tier(id: String?) = tiers.firstOrNull { it.id == id }

    fun skin(name: String) = byName[name.lowercase()]

    fun search(
        query: String,
        limit: Int = 30,
    ): List<Skin> {
        val q = query.trim().lowercase()
        return if (q.length < 2) emptyList() else skins.filter { q in it.name.lowercase() }.take(limit)
    }

    companion object {
        fun parse(json: String): Catalog {
            val o = JSONObject(json)
            val tiers = o.getJSONArray("tiers")
            val skins = o.getJSONArray("skins")
            return Catalog(
                (0 until tiers.length())
                    .map {
                        tiers.getJSONObject(it)
                    }.map { Tier(it.getString("id"), it.getString("name"), Color.parseColor(it.getString("color")), it.optInt("r")) },
                (0 until skins.length()).map { skins.getJSONObject(it) }.map {
                    Skin(
                        it.optString("u"),
                        it.getString("l"),
                        it.getString("n"),
                        it.getString("i"),
                        if (it.isNull("t")) null else it.getString("t"),
                        it.optString("w"),
                        if (it.isNull("s") || !it.has("s")) null else it.getString("s"),
                    )
                },
            )
        }
    }
}

object CatalogCache {
    private const val MAX_AGE_MS = 24 * 3600 * 1000L

    private fun file(context: Context) = File(context.filesDir, "catalog.json")

    fun load(context: Context): Catalog? = runCatching { Catalog.parse(file(context).readText()) }.getOrNull()

    /** Fetches a new catalog when the cached one is over a day old; falls back to the cache on failure. */
    fun refresh(
        context: Context,
        api: Api,
    ): Catalog? {
        val f = file(context)
        val cached = load(context)
        // A cache from before weapons, lines and skin ids were sent is refetched at once.
        val complete =
            cached
                ?.skins
                ?.firstOrNull()
                ?.uuid
                ?.isNotEmpty() == true
        if (cached != null && complete && System.currentTimeMillis() - f.lastModified() < MAX_AGE_MS) return cached
        return runCatching {
            val json = api.catalog()
            val fresh = Catalog.parse(json)
            f.writeText(json)
            fresh
        }.getOrDefault(cached)
    }
}

data class Variant(
    val name: String,
    val render: String?,
    val swatch: String?,
)

data class Level(
    val name: String,
    val video: String?,
)

data class SkinDetail(
    val variants: List<Variant>,
    val levels: List<Level>,
)

/** Colour variants and upgrade levels of one skin, straight from valorant-api.com; blocking. */
object SkinDetails {
    private val cache = mutableMapOf<String, SkinDetail>()

    // "Reaver Vandal Level 4\r\n(Variant 2 Black)" -> "Black"; the first chroma is the skin as sold.
    private fun variantName(
        raw: String,
        first: Boolean,
    ) = if (first) {
        "Base"
    } else {
        Regex("""\((?:Variant \d+ )?([^)]*)\)""")
            .find(raw)
            ?.groupValues
            ?.get(1)
            ?.trim() ?: raw.trim()
    }

    // "EEquippableSkinLevelItem::SoundEffects" -> "Sound Effects"
    private fun levelName(item: String?) = item?.substringAfter("::")?.replace(Regex("(?<=[a-z])(?=[A-Z])"), " ") ?: "Base"

    private fun JSONObject.str(key: String) = if (isNull(key)) null else optString(key).ifEmpty { null }

    fun get(uuid: String): SkinDetail =
        cache.getOrPut(uuid) {
            val c = URL("https://valorant-api.com/v1/weapons/skins/$uuid").openConnection() as HttpURLConnection
            c.connectTimeout = 10_000
            c.readTimeout = 20_000
            val o =
                c.inputStream
                    .bufferedReader()
                    .use { JSONObject(it.readText()) }
                    .getJSONObject("data")
            val chromas = o.getJSONArray("chromas")
            val levels = o.getJSONArray("levels")
            SkinDetail(
                (0 until chromas.length()).map { i ->
                    val ch = chromas.getJSONObject(i)
                    Variant(variantName(ch.getString("displayName"), i == 0), ch.str("fullRender"), ch.str("swatch"))
                },
                (0 until levels.length()).map { i ->
                    val l = levels.getJSONObject(i)
                    Level(levelName(l.str("levelItem")), l.str("streamedVideo"))
                },
            )
        }
}
