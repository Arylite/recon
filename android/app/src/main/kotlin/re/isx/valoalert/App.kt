package re.isx.valoalert

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import re.isx.valoalert.ui.Label
import re.isx.valoalert.ui.Palette
import re.isx.valoalert.ui.RiotLogin
import re.isx.valoalert.ui.SetupScreen
import re.isx.valoalert.ui.StoreScreen
import re.isx.valoalert.ui.Type
import re.isx.valoalert.ui.WishlistScreen

private enum class Tab(
    val label: String,
    @DrawableRes val icon: Int,
) {
    Store("Store", R.drawable.ic_store),
    Wishlist("Wishlist", R.drawable.ic_wishlist),
    Setup("Setup", R.drawable.ic_setup),
}

@Composable
private fun NavBar(
    current: Tab,
    onSelect: (Tab) -> Unit,
) {
    Column {
        Box(Modifier.fillMaxWidth().height(1.dp).background(Palette.Rule))
        Row(Modifier.fillMaxWidth().background(Palette.Ink)) {
            Tab.entries.forEach { t ->
                val on = t == current
                Column(
                    Modifier.weight(1f).height(60.dp).selectable(on, role = Role.Tab, onClick = { onSelect(t) }),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Icon(painterResource(t.icon), null, Modifier.size(22.dp), tint = if (on) Palette.Bone else Palette.Mute)
                    Label(t.label, Modifier.padding(top = 4.dp), color = if (on) Palette.Bone else Palette.Mute)
                }
            }
        }
    }
}

@Composable
fun App(prefs: Prefs) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var api by remember { mutableStateOf(prefs.api()) }
    var accounts by remember { mutableStateOf(emptyList<Account>()) }
    var wishlist by remember { mutableStateOf(emptyList<String>()) }
    var catalog by remember { mutableStateOf(CatalogCache.load(context)) }
    var message by remember { mutableStateOf("") }
    var tab by remember { mutableStateOf(if (api == null) Tab.Setup else Tab.Store) }
    var login by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }

    fun refresh() {
        val a = api ?: return
        scope.launch {
            try {
                val (acc, wl, cat) = withContext(Dispatchers.IO) { Triple(a.accounts(), a.wishlist(), CatalogCache.refresh(context, a)) }
                accounts = acc
                wishlist = wl
                catalog = cat ?: catalog
                message = ""
            } catch (e: Exception) {
                message = e.message ?: "error"
            }
        }
    }

    // Runs one backend call off the main thread, then reloads the lists.
    fun act(call: (Api) -> Unit) {
        val a = api ?: return
        scope.launch {
            busy = true
            try {
                withContext(Dispatchers.IO) { call(a) }
                message = ""
            } catch (e: Exception) {
                message = e.message ?: "error"
            }
            busy = false
            refresh()
        }
    }

    LaunchedEffect(api) { refresh() }

    if (login) {
        Box(Modifier.fillMaxSize().background(Palette.Ink).safeDrawingPadding()) {
            RiotLogin(
                onCookies = { cookies ->
                    login = false
                    if ("ssid=" in cookies) {
                        act { it.addAccount(cookies) }
                    } else {
                        message = "Riot did not return a session, sign in again and tick Stay signed in"
                    }
                },
                onCancel = { login = false },
            )
        }
        return
    }

    Column(Modifier.fillMaxSize().background(Palette.Ink).safeDrawingPadding()) {
        if (message.isNotEmpty()) {
            Text(message, Modifier.fillMaxWidth().background(Palette.Panel).padding(16.dp), color = Palette.Danger, style = Type.Body)
        }
        if (busy) Label("Checking the Riot session", Modifier.fillMaxWidth().background(Palette.Panel).padding(16.dp), color = Palette.Bone)
        Box(Modifier.weight(1f)) {
            when (tab) {
                Tab.Store -> StoreScreen(accounts, wishlist, catalog, api != null, ::refresh) { tab = Tab.Setup }
                Tab.Wishlist -> WishlistScreen(wishlist, catalog, { n -> act { it.addWish(n) } }, { n -> act { it.deleteWish(n) } })
                Tab.Setup ->
                    SetupScreen(
                        prefs,
                        accounts,
                        onServerSaved = {
                            prefs.lastAlertId = -1
                            api = prefs.api()
                        },
                        onSignIn = { login = true },
                        onDelete = { id -> act { it.deleteAccount(id) } },
                    )
            }
        }
        // The keyboard already takes the bottom of the screen; the bar would ride on top of it.
        if (WindowInsets.ime.getBottom(LocalDensity.current) == 0) NavBar(tab) { tab = it }
    }
}
