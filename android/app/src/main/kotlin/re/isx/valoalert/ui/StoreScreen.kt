package re.isx.valoalert.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import re.isx.valoalert.Account
import re.isx.valoalert.Catalog
import re.isx.valoalert.R
import re.isx.valoalert.friendly

private const val DAY_MS = 24 * 3600 * 1000L

/** Time left until the store rotates, every day at 00:00 UTC. */
@Composable
private fun resetIn(): String {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            now = System.currentTimeMillis()
        }
    }
    val s = (DAY_MS - now % DAY_MS) / 1000
    return "%02d:%02d:%02d".format(s / 3600, s / 60 % 60, s % 60)
}

private fun Account.hits(wishlist: List<String>) = offers.count { o -> wishlist.any { it.lowercase() in o.name.lowercase() } }

/** Four cards breathing in place of the offers, with a line saying what is going on. */
@Composable
private fun Loading(text: String) =
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(text, color = Palette.Mute, style = Type.Body)
        repeat(4) { Skeleton(272.dp) }
    }

/** No Riot account yet: the four daily slots drawn empty, the first one pinging. */
@Composable
private fun Empty(onAdd: () -> Unit) {
    val shape = RoundedCornerShape(22.dp)
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(2) { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(2) { col ->
                    Box(Modifier.weight(1f).height(124.dp).dashed(shape), contentAlignment = Alignment.Center) {
                        if (row == 0 && col == 0) Image(painterResource(R.drawable.ic_launcher_foreground), null, Modifier.size(72.dp))
                    }
                }
            }
        }
        Text("Your four daily skins land here", Modifier.padding(top = 12.dp), color = Palette.Bone, style = Type.Name)
        Text(
            "Add your Riot account and Recon checks your store every 15 minutes, even with the app closed.",
            color = Palette.Mute,
            style = Type.Body,
        )
        PillButton("Add a Riot account", onAdd, Modifier.fillMaxWidth().padding(top = 8.dp))
    }
}

@Composable
private fun AccountOffers(
    account: Account,
    wishlist: List<String>,
    catalog: Catalog?,
) {
    when {
        account.error != null && account.offers.isEmpty() -> Text(friendly(account.error), color = Palette.Ember, style = Type.Body)
        account.offers.isEmpty() -> Loading("Looking at this store for the first time.")
        else ->
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                if (account.error != null) Text(friendly(account.error), color = Palette.Ember, style = Type.Body)
                account.offers.forEach { o ->
                    ProductCard(o, catalog?.tier(o.tier), wishlist.any { it.lowercase() in o.name.lowercase() })
                }
            }
    }
}

@Composable
fun StoreScreen(
    accounts: List<Account>,
    wishlist: List<String>,
    catalog: Catalog?,
    loaded: Boolean,
    onRefresh: () -> Unit,
    onAddAccount: () -> Unit,
) {
    var selected by remember { mutableIntStateOf(0) }
    val account = accounts.getOrNull(selected.coerceAtMost(accounts.lastIndex))
    val hits = account?.hits(wishlist) ?: 0
    Column(
        // The warm light in the corner is the only ambient colour; the cards carry the rest.
        Modifier.glow(Palette.Ember, alpha = 0.16f, x = 0.1f, y = 0f).verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f)) {
                Label("Store resets in")
                Text(resetIn(), color = Palette.Bone, style = Type.Clock)
                if (hits > 0) {
                    Text(
                        if (hits ==
                            1
                        ) {
                            "1 skin from your wishlist today"
                        } else {
                            "$hits skins from your wishlist today"
                        },
                        color = Palette.Ember,
                        style = Type.Skin,
                    )
                }
            }
            IconBtn(R.drawable.ic_refresh, "Refresh", onRefresh)
        }
        if (accounts.size > 1) Segmented(accounts.map { it.name.substringBefore('#') }, selected) { selected = it }
        // Fades between loading, empty and each account's offers instead of jumping.
        AnimatedContent(
            if (!loaded) null else account?.id ?: "",
            transitionSpec = { (fadeIn(tween(220)) + slideInVertically(tween(220)) { it / 24 }) togetherWith fadeOut(tween(120)) },
            label = "store",
        ) { key ->
            when (key) {
                null -> Loading("Getting your store.")
                "" -> Empty(onAddAccount)
                else -> accounts.firstOrNull { it.id == key }?.let { AccountOffers(it, wishlist, catalog) }
            }
        }
    }
}
