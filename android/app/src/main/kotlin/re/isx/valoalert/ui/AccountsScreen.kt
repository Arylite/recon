package re.isx.valoalert.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import re.isx.valoalert.Account
import re.isx.valoalert.R
import re.isx.valoalert.friendly

@Composable
private fun AccountRow(
    account: Account,
    onDelete: () -> Unit,
) {
    val failed = account.error != null
    val shape = RoundedCornerShape(22.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Palette.Panel)
            .border(1.dp, Palette.Rule, shape)
            .padding(start = 18.dp, end = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(account.name.substringBefore('#'), color = Palette.Bone, style = Type.Skin)
            Text(
                if (failed) friendly(account.error) else "Watching",
                color = if (failed) Palette.Ember else Palette.Mute,
                style = Type.Body,
            )
        }
        IconBtn(R.drawable.ic_remove, "Remove ${account.name}", onDelete)
    }
}

/** Dashed slot with a plus: where the next account goes. */
@Composable
private fun AddSlot(onClick: () -> Unit) {
    val shape = RoundedCornerShape(22.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 72.dp)
            .clip(shape)
            .dashed(shape)
            .pressable(onClick)
            .padding(start = 18.dp, end = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Add a Riot account", Modifier.weight(1f), color = Palette.Bone, style = Type.Skin)
        Box(Modifier.size(48.dp).clip(CircleShape).background(Palette.Ember), contentAlignment = Alignment.Center) {
            Icon(painterResource(R.drawable.ic_add), null, Modifier.size(20.dp), tint = Palette.Ink)
        }
    }
}

@Composable
private fun Step(
    @DrawableRes icon: Int,
    text: String,
) = Row(
    Modifier.padding(vertical = 10.dp),
    horizontalArrangement = Arrangement.spacedBy(14.dp),
    verticalAlignment = Alignment.CenterVertically,
) {
    Box(Modifier.size(40.dp).clip(CircleShape).background(Palette.Raised), contentAlignment = Alignment.Center) {
        Icon(painterResource(icon), null, Modifier.size(18.dp), tint = Palette.Bone)
    }
    Text(text, Modifier.weight(1f), color = Palette.Mute, style = Type.Body)
}

@Composable
fun AccountsScreen(
    user: String,
    accounts: List<Account>,
    loaded: Boolean,
    onSignIn: () -> Unit,
    onDelete: (String) -> Unit,
    onSignOut: () -> Unit,
) {
    Column(
        Modifier.verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.padding(top = 12.dp, bottom = 12.dp)) {
            Label("Hi $user")
            Text("Your Riot accounts", color = Palette.Bone, style = Type.Title)
        }
        if (!loaded) Skeleton(72.dp)
        accounts.forEach { AccountRow(it) { onDelete(it.id) } }
        AddSlot(onSignIn)
        Label("How it works", Modifier.padding(top = 24.dp))
        val shape = RoundedCornerShape(22.dp)
        Column(
            Modifier
                .fillMaxWidth()
                .clip(
                    shape,
                ).background(Palette.Panel)
                .border(1.dp, Palette.Rule, shape)
                .padding(horizontal = 16.dp, vertical = 6.dp),
        ) {
            Step(R.drawable.ic_accounts, "You sign in on Riot's own page. Recon never sees your password.")
            Step(R.drawable.ic_refresh, "Recon looks at your store every 15 minutes, even with the app closed.")
            Step(R.drawable.ic_wishlist, "A skin from your wishlist shows up: you get a notification.")
        }
        Text(
            "Sign out",
            Modifier
                .padding(top = 12.dp)
                .clip(CircleShape)
                .pressable(onSignOut)
                .padding(horizontal = 4.dp, vertical = 14.dp),
            color = Palette.Mute,
            style = Type.Skin,
        )
    }
}
