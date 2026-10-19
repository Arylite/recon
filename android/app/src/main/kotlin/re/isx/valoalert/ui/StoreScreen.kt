package re.isx.valoalert.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import re.isx.valoalert.Account
import re.isx.valoalert.Catalog
import re.isx.valoalert.R

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

@Composable
private fun AccountOffers(
    account: Account,
    wishlist: List<String>,
    catalog: Catalog?,
) {
    when {
        account.error != null -> Text(account.error, color = Palette.Danger, style = Type.Body)
        account.offers.isEmpty() -> Text("Waiting for the first check.", color = Palette.Mute, style = Type.Body)
        else ->
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
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
    configured: Boolean,
    onRefresh: () -> Unit,
    onSetup: () -> Unit,
) {
    var selected by remember { mutableIntStateOf(0) }
    val account = accounts.getOrNull(selected.coerceAtMost(accounts.lastIndex))
    Column(
        Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f)) {
                Label("Store resets in")
                Text(resetIn(), color = Palette.Bone, style = Type.Clock)
            }
            IconBtn(R.drawable.ic_refresh, "Refresh", onRefresh)
        }
        if (accounts.size > 1) {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                accounts.forEachIndexed { i, a -> Chip(a.name, i == selected) { selected = i } }
            }
        }
        if (account == null) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    if (configured) "No account yet. Add one to see its store." else "Connect your server first.",
                    color = Palette.Mute,
                    style = Type.Body,
                )
                BoneButton("Open setup", onSetup)
            }
        } else {
            AccountOffers(account, wishlist, catalog)
        }
    }
}
