package re.isx.valoalert.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import re.isx.valoalert.Auth
import re.isx.valoalert.R
import re.isx.valoalert.friendly

/** Sign in or create a Recon account; each account only ever sees its own Riot accounts. */
@Composable
fun SignInScreen(onSignedIn: (tgt: String, name: String) -> Unit) {
    val scope = rememberCoroutineScope()
    var mode by remember { mutableIntStateOf(0) }
    var name by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val create = mode == 1

    fun submit() {
        if (busy) return
        busy = true
        scope.launch {
            try {
                val n = name.trim().lowercase()
                onSignedIn(withContext(Dispatchers.IO) { Auth.signIn(n, password, create) }, n)
            } catch (e: Exception) {
                message = friendly(e)
            }
            busy = false
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .glow(Palette.Ember, alpha = 0.22f, x = 0.2f, y = 0f)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Image(painterResource(R.drawable.ic_launcher_foreground), null, Modifier.padding(top = 24.dp).size(88.dp))
        Text(
            buildAnnotatedString {
                append("Get pinged when your skin hits the ")
                withStyle(SpanStyle(color = Palette.Ember, textDecoration = TextDecoration.Underline)) { append("store") }
            },
            color = Palette.Bone,
            style = Type.Title.copy(fontSize = 34.sp, lineHeight = 38.sp),
        )
        Text(
            "Recon watches the daily store of your Riot accounts and tells you when a wishlisted skin is in it.",
            color = Palette.Mute,
            style = Type.Body,
        )
        Segmented(listOf("Sign in", "Create account"), mode) { mode = it }
        Field(name, "Name", { name = it }, Modifier.fillMaxWidth(), icon = R.drawable.ic_accounts)
        Field(password, if (create) "Password, 8 characters or more" else "Password", {
            password = it
        }, Modifier.fillMaxWidth(), icon = null, secret = true)
        if (message.isNotEmpty()) Text(message, color = Palette.Ember, style = Type.Body)
        PillButton(
            if (busy) {
                "One moment"
            } else if (create) {
                "Create my account"
            } else {
                "Sign in"
            },
            ::submit,
            Modifier.fillMaxWidth(),
        )
    }
}
