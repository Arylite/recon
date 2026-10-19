package re.isx.valoalert.ui

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import re.isx.valoalert.R

private const val REDIRECT = "https://playvalorant.com/opt_in"
private const val AUTH_URL =
    "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in" +
        "&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1"

/**
 * Riot's own login page in a WebView. Riot redirects to [REDIRECT] once the user is signed in; the
 * app then reads the session cookies and wipes the WebView. It never sees the password.
 */
@SuppressLint("SetJavaScriptEnabled") // Riot's login page does not work without JavaScript.
@Composable
fun RiotLogin(
    onCookies: (String) -> Unit,
    onCancel: () -> Unit,
) {
    val cookies = CookieManager.getInstance()
    var web by remember { mutableStateOf<WebView?>(null) }
    var done by remember { mutableStateOf(false) }
    BackHandler(onBack = onCancel)
    DisposableEffect(Unit) { onDispose { web?.destroy() } }

    Column(Modifier.fillMaxSize().background(Palette.Ink)) {
        Row(
            Modifier.fillMaxWidth().padding(start = 20.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Label("Sign in with Riot", Modifier.weight(1f), color = Palette.Bone)
            IconBtn(R.drawable.ic_remove, "Cancel", onCancel)
        }
        AndroidView(
            factory = { ctx ->
                WebView(ctx).also { view ->
                    web = view
                    // AndroidView sizes the view WRAP_CONTENT; Chromium then has no fixed height, sets
                    // 100vh to 0, and Riot's form draws empty and loses the caret on every key.
                    view.layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                    view.settings.javaScriptEnabled = true
                    view.settings.domStorageEnabled = true
                    // The default agent says "wv", which makes some pages treat this as an embedded browser.
                    view.settings.userAgentString = view.settings.userAgentString.replace("; wv", "")
                    cookies.setAcceptThirdPartyCookies(view, true)
                    view.webViewClient =
                        object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                view: WebView,
                                request: WebResourceRequest,
                            ): Boolean {
                                if (!request.url.toString().startsWith(REDIRECT)) return false
                                if (!done) {
                                    done = true
                                    val jar = cookies.getCookie("https://auth.riotgames.com").orEmpty()
                                    cookies.removeAllCookies(null)
                                    onCookies(jar)
                                }
                                return true
                            }
                        }
                    // Start clean so a Riot session left from another account is not reused.
                    cookies.removeAllCookies { view.loadUrl(AUTH_URL) }
                }
            },
            modifier = Modifier.weight(1f).fillMaxWidth(),
        )
    }
}
