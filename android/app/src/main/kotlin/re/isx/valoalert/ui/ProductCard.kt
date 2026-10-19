package re.isx.valoalert.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import re.isx.valoalert.Offer
import re.isx.valoalert.Tier

/** A soft pool of colour behind the art; with the tier colour it tells the rarity at a glance. */
fun Modifier.glow(
    color: Color,
    alpha: Float = 0.28f,
    x: Float = 0.5f,
    y: Float = 0.55f,
) = drawBehind {
    drawRect(
        Brush.radialGradient(
            listOf(color.copy(alpha = alpha), Color.Transparent),
            Offset(size.width * x, size.height * y),
            size.width * 0.6f,
        ),
    )
}

private fun accent(tier: Tier?) = tier?.let { Color(it.color) } ?: Palette.Mute

/** A store offer: name and tier on top, the skin art in its tier glow, the price at the bottom. */
@Composable
fun ProductCard(
    offer: Offer,
    tier: Tier?,
    hit: Boolean,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(28.dp)
    Box(
        modifier
            .fillMaxWidth()
            .height(272.dp)
            .clip(shape)
            .background(Palette.Panel)
            .glow(if (hit) Palette.Ember else accent(tier))
            .border(if (hit) 1.5.dp else 1.dp, if (hit) Palette.Ember else Palette.Rule, shape)
            .padding(20.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(offer.name, Modifier.padding(end = 56.dp), color = Palette.Bone, style = Type.Name, maxLines = 2)
            TierTag(tier)
        }
        AsyncImage(
            offer.icon,
            null,
            Modifier
                .align(Alignment.Center)
                .padding(top = 36.dp)
                .fillMaxWidth()
                .height(110.dp),
            contentScale = ContentScale.Fit,
        )
        Row(Modifier.align(Alignment.BottomStart).fillMaxWidth(), Arrangement.SpaceBetween, Alignment.Bottom) {
            Column {
                Label("Price")
                Text(offer.cost?.let { "%,d VP".format(it) } ?: "-", color = Palette.Bone, style = Type.Price)
            }
            if (hit) HitTag()
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
    val shape = RoundedCornerShape(22.dp)
    Box(
        modifier
            .height(176.dp)
            .clip(shape)
            .background(Palette.Panel)
            .glow(accent(tier), y = 0.35f)
            .border(1.dp, Palette.Rule, shape)
            .pressable(onAction, label = actionLabel)
            .padding(14.dp),
    ) {
        if (icon != null) {
            AsyncImage(
                icon,
                null,
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 14.dp)
                    .fillMaxWidth()
                    .height(64.dp),
                contentScale = ContentScale.Fit,
            )
        } else {
            // A loose word, not a skin of the catalog: it matches every skin whose name contains it.
            Label("Any skin containing", Modifier.align(Alignment.TopStart))
        }
        Box(Modifier.align(Alignment.TopEnd)) { TierDot(tier) }
        Row(Modifier.align(Alignment.BottomStart).fillMaxWidth(), Arrangement.spacedBy(8.dp), Alignment.Bottom) {
            Text(name, Modifier.weight(1f), color = Palette.Bone, style = Type.Skin, maxLines = 2)
            Box(Modifier.size(32.dp).clip(CircleShape).background(Palette.Raised), contentAlignment = Alignment.Center) {
                Icon(painterResource(actionIcon), null, Modifier.size(16.dp), tint = Palette.Bone)
            }
        }
    }
}
