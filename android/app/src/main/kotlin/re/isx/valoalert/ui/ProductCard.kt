package re.isx.valoalert.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import re.isx.valoalert.Offer
import re.isx.valoalert.Tier

private fun Modifier.glow(color: Color) =
    drawBehind {
        val brush =
            Brush.radialGradient(
                listOf(color.copy(alpha = 0.30f), Color.Transparent),
                Offset(size.width / 2, size.height * 0.46f),
                size.width * 0.6f,
            )
        drawRect(brush)
    }

private fun accent(tier: Tier?) = tier?.let { Color(it.color) } ?: Palette.Mute

@Composable
private fun Price(
    vp: Int,
    color: Color,
) = Box(Modifier.clip(Chamfer(6.dp)).background(color).padding(horizontal = 10.dp, vertical = 5.dp)) {
    Text("%,d VP".format(vp), color = Palette.Ink, style = Type.Label.copy(fontSize = 15.sp, letterSpacing = 0.8.sp))
}

/** A store offer: the skin art over its own oversized name, lit by its tier colour, price in a pill. */
@Composable
fun ProductCard(
    offer: Offer,
    tier: Tier?,
    hit: Boolean,
    modifier: Modifier = Modifier,
) {
    val shape = Chamfer(18.dp)
    Box(
        modifier
            .fillMaxWidth()
            .height(236.dp)
            .clip(shape)
            .background(Palette.Panel)
            .glow(accent(tier))
            .border(if (hit) 2.dp else 1.dp, if (hit) Palette.Bone else Palette.Rule, shape),
    ) {
        Text(
            offer.name.substringBefore(' ').uppercase(),
            Modifier.padding(start = 10.dp, top = 30.dp),
            color = Palette.Bone.copy(alpha = 0.07f),
            style = Type.Giant,
            maxLines = 1,
            softWrap = false,
        )
        AsyncImage(
            offer.icon,
            null,
            Modifier
                .align(Alignment.Center)
                .fillMaxWidth()
                .height(132.dp)
                .padding(horizontal = 18.dp),
            contentScale = ContentScale.Fit,
        )
        Row(Modifier.fillMaxWidth().padding(14.dp), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            TierTag(tier)
            if (hit) HitTag()
        }
        Row(Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(14.dp), Arrangement.SpaceBetween, Alignment.Bottom) {
            Text(offer.name.uppercase(), Modifier.weight(1f).padding(end = 10.dp), color = Palette.Bone, style = Type.Name, maxLines = 2)
            offer.cost?.let { Price(it, accent(tier)) }
        }
    }
}

/** Small tile for search results and the watch list; the whole tile is the action. */
@Composable
fun MiniCard(
    name: String,
    icon: String?,
    tier: Tier?,
    actionIcon: Int,
    actionLabel: String,
    onAction: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = Chamfer(12.dp)
    Box(
        modifier
            .height(168.dp)
            .clip(shape)
            .background(Palette.Panel)
            .glow(accent(tier))
            .border(1.dp, Palette.Rule, shape)
            .clickable(onClickLabel = actionLabel, role = Role.Button, onClick = onAction),
    ) {
        if (icon != null) {
            AsyncImage(
                icon,
                null,
                Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .height(84.dp)
                    .padding(horizontal = 10.dp, vertical = 14.dp),
                contentScale = ContentScale.Fit,
            )
        } else {
            // A loose word, not a skin of the catalog: it matches every skin whose name contains it.
            Label("Any skin containing", Modifier.align(Alignment.TopStart).padding(12.dp))
        }
        Box(Modifier.align(Alignment.TopEnd).padding(10.dp)) { TierDot(tier) }
        Box(Modifier.align(Alignment.BottomStart).padding(12.dp)) {
            Text(name.uppercase(), color = Palette.Bone, style = Type.Skin, maxLines = 2)
        }
        Box(Modifier.align(Alignment.BottomEnd).padding(8.dp)) {
            Icon(painterResource(actionIcon), null, Modifier.padding(2.dp), tint = Palette.Bone)
        }
    }
}
