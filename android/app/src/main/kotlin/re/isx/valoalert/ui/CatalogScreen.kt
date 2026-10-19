package re.isx.valoalert.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import re.isx.valoalert.Catalog
import re.isx.valoalert.R
import re.isx.valoalert.Skin

private val GROUPS = listOf("Weapon", "Rarity", "Line")

// Buy-menu order; a weapon added to the game later goes at the end.
private val WEAPONS =
    listOf(
        "Classic",
        "Shorty",
        "Frenzy",
        "Ghost",
        "Bandit",
        "Sheriff",
        "Stinger",
        "Spectre",
        "Bucky",
        "Judge",
        "Bulldog",
        "Guardian",
        "Phantom",
        "Vandal",
        "Marshal",
        "Outlaw",
        "Operator",
        "Ares",
        "Odin",
        "Melee",
    )

private fun weaponRank(name: String) = WEAPONS.indexOf(name).let { if (it < 0) WEAPONS.size else it }

/** Small toggle pill; a coloured dot when it stands for a rarity. */
@Composable
private fun FilterChip(
    text: String,
    selected: Boolean,
    dot: Color? = null,
    onClick: () -> Unit,
) {
    val fill by animateColorAsState(if (selected) Palette.Bone else Palette.Panel, tween(180), label = "chip")
    Row(
        Modifier
            .heightIn(min = 40.dp)
            .clip(CircleShape)
            .background(fill)
            .border(1.dp, if (selected) Palette.Bone else Palette.Rule, CircleShape)
            .pressable(onClick, Role.Checkbox)
            .padding(horizontal = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (dot != null) Box(Modifier.size(8.dp).clip(CircleShape).background(dot))
        Text(text, color = if (selected) Palette.Ink else Palette.Bone, style = Type.Skin)
    }
}

/** Every skin of the game, grouped by weapon, rarity or line, each one a tap away from the wishlist. */
@Composable
fun CatalogScreen(
    catalog: Catalog?,
    wishlist: List<String>,
    onAdd: (String) -> Unit,
    onRemove: (String) -> Unit,
    onOpen: (Skin) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var group by remember { mutableIntStateOf(0) }
    var weapon by remember { mutableStateOf<String?>(null) }
    var rarity by remember { mutableStateOf<String?>(null) }
    val skins = catalog?.skins.orEmpty()
    val tiers = remember(catalog) { catalog?.tiers.orEmpty().sortedBy { it.rank } }
    val weapons =
        remember(catalog) {
            skins
                .map { it.weapon }
                .filter { it.isNotEmpty() }
                .distinct()
                .sortedBy(::weaponRank)
        }
    val q = query.trim().lowercase()
    val groups: List<Pair<String, List<Skin>>> =
        remember(catalog, q, weapon, rarity, group) {
            val shown =
                skins.filter { s ->
                    (q.isEmpty() || q in s.name.lowercase() || s.line?.lowercase()?.contains(q) == true) &&
                        (weapon == null || s.weapon == weapon) &&
                        (rarity == null || s.tier == rarity)
                }
            when (group) {
                0 -> shown.groupBy { it.weapon }.toList().sortedBy { weaponRank(it.first) }
                // Rarest first.
                1 ->
                    shown.groupBy { catalog?.tier(it.tier) }.toList().sortedByDescending { it.first?.rank ?: -1 }.map { (t, v) ->
                        (
                            t?.name
                                ?: "Other"
                        ) to
                            v
                    }
                else -> shown.groupBy { it.line ?: "Other" }.toList().sortedBy { it.first }
            }.map { (name, v) -> name to v.sortedBy { it.name } }
        }

    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Column(Modifier.padding(top = 12.dp, bottom = 8.dp)) {
                Label(if (catalog == null) "Every skin in the game" else "${skins.size} skins in the game")
                Text("Catalog", color = Palette.Bone, style = Type.Title)
            }
        }
        if (catalog == null) {
            items(3) { Skeleton(176.dp) }
            return@LazyColumn
        }
        item { Field(query, "Search a skin or a line", { query = it }, Modifier.fillMaxWidth()) }
        item { Segmented(GROUPS, group) { group = it } }
        item {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip("All weapons", weapon == null) { weapon = null }
                weapons.forEach { w -> FilterChip(w, weapon == w) { weapon = if (weapon == w) null else w } }
            }
        }
        item {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip("All rarities", rarity == null) { rarity = null }
                tiers.forEach { t -> FilterChip(t.name, rarity == t.id, Color(t.color)) { rarity = if (rarity == t.id) null else t.id } }
            }
        }
        if (groups.isEmpty()) {
            item {
                Text(
                    "No skin matches. Try another word or clear a filter.",
                    Modifier.fillMaxWidth().dashed(RoundedCornerShape(22.dp)).padding(20.dp),
                    color = Palette.Mute,
                    style = Type.Body,
                )
            }
        }
        groups.forEach { (name, list) ->
            item(key = "h:$name") {
                Row(Modifier.fillMaxWidth().padding(top = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(name, Modifier.weight(1f), color = Palette.Bone, style = Type.Name)
                    Label("${list.size}")
                }
            }
            items(list.chunked(2), key = { "r:$name:${it.first().level}" }) { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    pair.forEach { s ->
                        val watched = wishlist.firstOrNull { it.equals(s.name, true) }
                        MiniCard(
                            s.name,
                            s.icon,
                            catalog.tier(s.tier),
                            if (watched != null) R.drawable.ic_remove else R.drawable.ic_add,
                            if (watched != null) "Stop watching ${s.name}" else "Watch ${s.name}",
                            { if (watched != null) onRemove(watched) else onAdd(s.name) },
                            Modifier.weight(1f),
                        ) { onOpen(s) }
                    }
                    if (pair.size == 1) Box(Modifier.weight(1f))
                }
            }
        }
    }
}
