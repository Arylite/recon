package re.isx.valoalert

import androidx.annotation.DrawableRes
import androidx.compose.animation.Crossfade
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import re.isx.valoalert.ui.AccountsScreen
import re.isx.valoalert.ui.Banner
import re.isx.valoalert.ui.Palette
import re.isx.valoalert.ui.RiotLogin
import re.isx.valoalert.ui.SignInScreen
import re.isx.valoalert.ui.StoreScreen
import re.isx.valoalert.ui.Type
import re.isx.valoalert.ui.WishlistScreen

private enum class Tab(
    val label: String,
    @DrawableRes val icon: Int,
) {
    Store("Store", R.drawable.ic_store),
    Wishlist("Wishlist", R.drawable.ic_wishlist),
    Accounts("Accounts", R.drawable.ic_accounts),
}

/** Floating pill: the current tab is a filled bone pill with its name, the others icons only. */
@Composable
private fun NavBar(
    current: Tab,
    onSelect: (Tab) -> Unit,
) {
    Row(
        Modifier
            .padding(horizontal = 20.dp, vertical = 12.dp)
            .fillMaxWidth()
            .clip(CircleShape)
            .background(Palette.Panel)
            .border(1.dp, Palette.Rule, CircleShape)
            .padding(6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Tab.entries.forEach { t ->
            val on = t == current
            val fill by animateColorAsState(if (on) Palette.Bone else Palette.Panel, tween(220), label = "tab")
            val ink by animateColorAsState(if (on) Palette.Ink else Palette.Mute, tween(220), label = "ink")
            Row(
                Modifier
                    .height(48.dp)
                    .clip(CircleShape)
                    .background(fill)
                    .selectable(on, role = Role.Tab, onClick = { onSelect(t) })
                    .padding(horizontal = 18.dp)
                    .animateContentSize(tween(220)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(painterResource(t.icon), t.label, Modifier.size(20.dp), tint = ink)
                if (on) Text(t.label, Modifier.padding(start = 8.dp), color = ink, style = Type.Skin)
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
    var loaded by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var tab by remember { mutableStateOf(Tab.Store) }
    var login by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf("") }

    fun fail(e: Exception) {
        message = friendly(e)
        // The TGT expired or was revoked: back to the sign-in screen.
        if (e is Unauthorized && e.signedOut) {
            prefs.tgt = ""
            api = null
        }
    }

    fun signOut() {
        val tgt = prefs.tgt
        scope.launch { withContext(Dispatchers.IO) { runCatching { Auth.signOut(tgt) } } }
        prefs.tgt = ""
        api = null
        accounts = emptyList()
        wishlist = emptyList()
        loaded = false
    }

    fun refresh() {
        val a = api ?: return
        scope.launch {
            try {
                val (acc, wl, cat) = withContext(Dispatchers.IO) { Triple(a.accounts(), a.wishlist(), CatalogCache.refresh(context, a)) }
                accounts = acc
                wishlist = wl
                catalog = cat ?: catalog
                loaded = true
            } catch (e: Exception) {
                fail(e)
            }
        }
    }

    // Runs one backend call off the main thread, then reloads the lists; [wait] is shown meanwhile.
    fun act(
        wait: String = "",
        call: (Api) -> Unit,
    ) {
        val a = api ?: return
        scope.launch {
            busy = wait
            try {
                withContext(Dispatchers.IO) { call(a) }
            } catch (e: Exception) {
                fail(e)
            }
            busy = ""
            refresh()
        }
    }

    LaunchedEffect(api) { refresh() }
    // An error reads in a few seconds; then it gets out of the way by itself.
    LaunchedEffect(message) {
        delay(4500)
        message = ""
    }

    Box(Modifier.fillMaxSize().background(Palette.Ink)) {
        Box(Modifier.fillMaxSize().safeDrawingPadding()) {
            when {
                api == null ->
                    SignInScreen { tgt, name ->
                        prefs.tgt = tgt
                        prefs.user = name
                        // Alert ids are per user: start over without replaying the old ones.
                        prefs.lastAlertId = -1
                        message = ""
                        api = prefs.api()
                    }
                login ->
                    RiotLogin(
                        onCookies = { cookies ->
                            login = false
                            if ("ssid=" in cookies) {
                                act("Adding your Riot account") { it.addAccount(cookies) }
                            } else {
                                message = "Riot didn't keep you signed in. Try again and tick Stay signed in."
                            }
                        },
                        onCancel = { login = false },
                    )
                else ->
                    Column {
                        Crossfade(tab, Modifier.weight(1f), tween(180), label = "tab") { t ->
                            when (t) {
                                Tab.Store -> StoreScreen(accounts, wishlist, catalog, loaded, ::refresh) { login = true }
                                Tab.Wishlist ->
                                    WishlistScreen(
                                        wishlist,
                                        catalog,
                                        onAdd = { n ->
                                            if (wishlist.none { it.equals(n, true) }) wishlist = wishlist + n
                                            act { it.addWish(n) }
                                        },
                                        onRemove = { n ->
                                            wishlist = wishlist - n
                                            act { it.deleteWish(n) }
                                        },
                                    )
                                Tab.Accounts ->
                                    AccountsScreen(
                                        prefs.user,
                                        accounts,
                                        loaded,
                                        onSignIn = { login = true },
                                        onDelete = { id ->
                                            accounts = accounts.filter { it.id != id }
                                            act { it.deleteAccount(id) }
                                        },
                                        onSignOut = ::signOut,
                                    )
                            }
                        }
                        // The keyboard already takes the bottom of the screen; the bar would ride on top of it.
                        if (WindowInsets.ime.getBottom(LocalDensity.current) == 0) NavBar(tab) { tab = it }
                    }
            }
        }
        Banner(message.ifEmpty { busy }, message.isNotEmpty(), { message = "" }, Modifier.align(Alignment.TopCenter).safeDrawingPadding())
    }
}
