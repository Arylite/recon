package re.isx.valoalert

import android.content.Context
import android.graphics.Color
import org.json.JSONObject
import java.io.File

data class Tier(
    val id: String,
    val name: String,
    val color: Int,
)

data class Skin(
    val level: String,
    val name: String,
    val icon: String,
    val tier: String?,
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
                    }.map { Tier(it.getString("id"), it.getString("name"), Color.parseColor(it.getString("color"))) },
                (0 until skins.length()).map { skins.getJSONObject(it) }.map {
                    Skin(it.getString("l"), it.getString("n"), it.getString("i"), if (it.isNull("t")) null else it.getString("t"))
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
        if (cached != null && System.currentTimeMillis() - f.lastModified() < MAX_AGE_MS) return cached
        return runCatching {
            val json = api.catalog()
            val fresh = Catalog.parse(json)
            f.writeText(json)
            fresh
        }.getOrDefault(cached)
    }
}
