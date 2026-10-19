package re.isx.valoalert.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Clickable that sinks a little under the finger, so a tap feels answered before the network does. */
fun Modifier.pressable(
    onClick: () -> Unit,
    role: Role = Role.Button,
    label: String? = null,
): Modifier =
    composed {
        val source = remember { MutableInteractionSource() }
        val pressed by source.collectIsPressedAsState()
        val scale by animateFloatAsState(if (pressed) 0.96f else 1f, tween(120), label = "press")
        graphicsLayer {
            scaleX = scale
            scaleY = scale
        }.clickable(source, null, role = role, onClickLabel = label, onClick = onClick)
    }

/** Dashed outline for a slot waiting to be filled, like an empty "connect a device" card. */
fun Modifier.dashed(shape: Shape) =
    drawBehind {
        val stroke = Stroke(1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(10.dp.toPx(), 8.dp.toPx())))
        drawOutline(shape.createOutline(size, layoutDirection, this), Palette.Rule, style = stroke)
    }

/** A card-sized block that breathes while its content loads. */
@Composable
fun Skeleton(
    height: Dp,
    modifier: Modifier = Modifier,
) {
    val alpha by rememberInfiniteTransition(label = "skeleton").animateFloat(
        0.45f,
        1f,
        infiniteRepeatable(tween(900), RepeatMode.Reverse),
        label = "alpha",
    )
    val shape = RoundedCornerShape(28.dp)
    Box(
        modifier
            .fillMaxWidth()
            .height(height)
            .graphicsLayer {
                this.alpha = alpha
            }.clip(shape)
            .background(Palette.Panel)
            .border(1.dp, Palette.Rule, shape),
    )
}

/** Floats over the screen instead of pushing it down; slides in from the top and out again. */
@Composable
fun Banner(
    text: String,
    error: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Keeps the last text on screen while the banner slides away.
    val last = remember { arrayOf("") }
    if (text.isNotEmpty()) last[0] = text
    AnimatedVisibility(
        text.isNotEmpty(),
        modifier,
        enter = slideInVertically { -it } + fadeIn(),
        exit =
            slideOutVertically { -it } + fadeOut(),
    ) {
        val shape = RoundedCornerShape(20.dp)
        Text(
            last[0],
            Modifier
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .fillMaxWidth()
                .clip(shape)
                .background(Palette.Raised)
                .border(1.dp, if (error) Palette.Ember else Palette.Rule, shape)
                .clickable(onClickLabel = "Dismiss", onClick = onDismiss)
                .padding(16.dp),
            color = Palette.Bone,
            style = Type.Body,
        )
    }
}
