package re.isx.valoalert.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import re.isx.valoalert.Account
import re.isx.valoalert.Prefs
import re.isx.valoalert.R

@Composable
private fun Section(
    title: String,
    content: @Composable () -> Unit,
) = Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
    Text(title.uppercase(), color = Palette.Bone, style = Type.Title)
    content()
}

@Composable
private fun ServerSection(
    prefs: Prefs,
    onSaved: () -> Unit,
) {
    var url by remember { mutableStateOf(prefs.url) }
    var token by remember { mutableStateOf(prefs.token) }
    Section("Server") {
        Field(url, "URL", { url = it }, Modifier.fillMaxWidth(), keyboard = KeyboardType.Uri)
        Field(token, "API token", { token = it }, Modifier.fillMaxWidth(), secret = true)
        BoneButton("Save", {
            prefs.url = url
            prefs.token = token
            onSaved()
        })
    }
}

@Composable
private fun AccountRow(
    account: Account,
    onDelete: () -> Unit,
) {
    val failed = account.error != null
    Row(Modifier.fillMaxWidth().background(Palette.Panel).padding(start = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f).padding(vertical = 10.dp)) {
            Text(account.name.uppercase(), color = Palette.Bone, style = Type.Skin)
            Label("${account.shard}  /  ${account.error ?: "ok"}", color = if (failed) Palette.Danger else Palette.Mute)
        }
        IconBtn(R.drawable.ic_remove, "Remove ${account.name}", onDelete)
    }
}

@Composable
private fun AddAccount(onSignIn: () -> Unit) {
    BoneButton("Add account with Riot", onSignIn)
    Text(
        "Opens Riot's own login page inside the app. Tick Stay signed in. " +
            "Google and Apple logins are blocked inside apps: use your Riot ID. " +
            "The region and the account name are detected for you.",
        color = Palette.Mute,
        style = Type.Body,
    )
}

@Composable
fun SetupScreen(
    prefs: Prefs,
    accounts: List<Account>,
    onServerSaved: () -> Unit,
    onSignIn: () -> Unit,
    onDelete: (String) -> Unit,
) {
    Column(
        Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(36.dp),
    ) {
        ServerSection(prefs, onServerSaved)
        Section("Accounts") {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                accounts.forEach { AccountRow(it) { onDelete(it.id) } }
            }
            AddAccount(onSignIn)
        }
    }
}
