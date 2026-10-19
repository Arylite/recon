package re.isx.valoalert.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import re.isx.valoalert.Catalog
import re.isx.valoalert.R

/** Tiles two per row; a plain Column of Rows because the screen already scrolls. */
@Composable
private fun <T> Grid(
    items: List<T>,
    tile: @Composable (T, Modifier) -> Unit,
) = Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
    items.chunked(2).forEach { pair ->
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            pair.forEach { tile(it, Modifier.weight(1f)) }
            if (pair.size == 1) Box(Modifier.weight(1f))
        }
    }
}

@Composable
fun WishlistScreen(
    wishlist: List<String>,
    catalog: Catalog?,
    onAdd: (String) -> Unit,
    onRemove: (String) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val results = catalog?.search(query).orEmpty().filter { r -> wishlist.none { it.equals(r.name, true) } }

    fun add(name: String) {
        onAdd(name)
        query = ""
    }
    Column(
        Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        Text("WISHLIST", color = Palette.Bone, style = Type.Clock)
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Field(query, "Search a skin", { query = it }, Modifier.fillMaxWidth())
            if (query.isNotBlank()) {
                // Matching is a substring test, so a loose word watches a whole line of skins.
                Row(
                    Modifier.fillMaxWidth().background(Palette.Panel).padding(start = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Any skin containing \"${query.trim()}\"", Modifier.weight(1f), color = Palette.Mute, style = Type.Body)
                    IconBtn(R.drawable.ic_add, "Watch any skin containing ${query.trim()}", { add(query.trim()) })
                }
            }
            Grid(
                results,
            ) { s, m -> MiniCard(s.name, s.icon, catalog?.tier(s.tier), R.drawable.ic_add, "Watch ${s.name}", { add(s.name) }, m) }
        }
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Label("Watching (${wishlist.size})")
            if (wishlist.isEmpty()) Text("Nothing yet. Search a skin above.", color = Palette.Mute, style = Type.Body)
            Grid(wishlist) { w, m ->
                val skin = catalog?.skin(w)
                MiniCard(w, skin?.icon, catalog?.tier(skin?.tier), R.drawable.ic_remove, "Stop watching $w", { onRemove(w) }, m)
            }
        }
    }
}
