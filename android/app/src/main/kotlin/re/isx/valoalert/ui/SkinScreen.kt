package re.isx.valoalert.ui

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import re.isx.valoalert.R
import re.isx.valoalert.Skin
import re.isx.valoalert.SkinDetail
import re.isx.valoalert.SkinDetails
import re.isx.valoalert.Tier

/** One skin up close: its colour variants and what each upgrade level adds, with the videos. */
@Composable
fun SkinScreen(
    skin: Skin,
    tier: Tier?,
    watched: Boolean,
    onToggle: () -> Unit,
    onClose: () -> Unit,
) {
    val context = LocalContext.current
    var detail by remember(skin) { mutableStateOf<SkinDetail?>(null) }
    var failed by remember(skin) { mutableStateOf(false) }
    var variant by remember(skin) { mutableIntStateOf(0) }
    BackHandler(onBack = onClose)
    LaunchedEffect(skin) {
        detail = runCatching { withContext(Dispatchers.IO) { SkinDetails.get(skin.uuid) } }.getOrNull()
        failed = detail == null
    }
    val accent = tier?.let { Color(it.color) } ?: Palette.Mute
    val render = detail?.variants?.getOrNull(variant)?.render ?: skin.icon

    Column(
        Modifier
            .fillMaxSize()
            .background(Palette.Ink)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Label(listOfNotNull(skin.weapon.ifEmpty { null }, skin.line).joinToString("  /  "), Modifier.weight(1f))
            IconBtn(R.drawable.ic_remove, "Close", onClose)
        }
        Text(skin.name, color = Palette.Bone, style = Type.Title)
        TierTag(tier)
        val shape = RoundedCornerShape(28.dp)
        Box(
            Modifier
                .fillMaxWidth()
                .height(220.dp)
                .clip(shape)
                .background(Palette.Panel)
                .glow(accent)
                .border(1.dp, Palette.Rule, shape),
        ) {
            // Fades between variants instead of popping.
            Crossfade(render, Modifier.fillMaxSize(), tween(200), label = "variant") { url ->
                AsyncImage(url, skin.name, Modifier.fillMaxSize().padding(24.dp), contentScale = ContentScale.Fit)
            }
        }
        PillButton(if (watched) "Remove from wishlist" else "Add to wishlist", onToggle, Modifier.fillMaxWidth())
        when {
            failed -> Text("Couldn't load the variants. Check your connection.", color = Palette.Ember, style = Type.Body)
            detail == null -> repeat(2) { Skeleton(56.dp) }
            else -> {
                val d = detail!!
                if (d.variants.size > 1) {
                    Label("Variants", Modifier.padding(top = 8.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        d.variants.forEachIndexed { i, v ->
                            val on = i == variant
                            Column(
                                Modifier.clip(RoundedCornerShape(18.dp)).pressable({ variant = i }).padding(6.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                AsyncImage(
                                    v.swatch ?: v.render,
                                    null,
                                    Modifier
                                        .size(
                                            56.dp,
                                        ).clip(
                                            CircleShape,
                                        ).background(
                                            Palette.Panel,
                                        ).border(if (on) 2.dp else 1.dp, if (on) Palette.Bone else Palette.Rule, CircleShape),
                                    contentScale = ContentScale.Crop,
                                )
                                Text(v.name, color = if (on) Palette.Bone else Palette.Mute, style = Type.Label)
                            }
                        }
                    }
                }
                if (d.levels.size > 1) {
                    Label("Levels", Modifier.padding(top = 8.dp))
                    val rowShape = RoundedCornerShape(22.dp)
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(rowShape)
                            .background(Palette.Panel)
                            .border(1.dp, Palette.Rule, rowShape),
                    ) {
                        d.levels.forEachIndexed { i, l ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 60.dp)
                                    .then(
                                        if (l.video !=
                                            null
                                        ) {
                                            Modifier.pressable(
                                                { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(l.video))) },
                                                label = "Play level ${i + 1}",
                                            )
                                        } else {
                                            Modifier
                                        },
                                    ).padding(start = 18.dp, end = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("Level ${i + 1}", Modifier.weight(1f), color = Palette.Bone, style = Type.Skin)
                                Text(l.name, Modifier.padding(end = 12.dp), color = Palette.Mute, style = Type.Body)
                                if (l.video != null) {
                                    Box(
                                        Modifier.size(40.dp).clip(CircleShape).background(Palette.Raised),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(painterResource(R.drawable.ic_play), null, Modifier.size(16.dp), tint = Palette.Bone)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
