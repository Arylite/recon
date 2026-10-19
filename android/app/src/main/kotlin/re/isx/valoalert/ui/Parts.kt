package re.isx.valoalert.ui

import androidx.annotation.DrawableRes
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import re.isx.valoalert.R
import re.isx.valoalert.Tier

/** Small uppercase caption above a section or a value. */
@Composable
fun Label(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = Palette.Mute,
) = Text(text.uppercase(), modifier, color = color, style = Type.Label)

/** Pill text field; the placeholder doubles as its label. */
@Composable
fun Field(
    value: String,
    placeholder: String,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    @DrawableRes icon: Int? = R.drawable.ic_search,
    secret: Boolean = false,
) {
    BasicTextField(
        value,
        onChange,
        modifier,
        singleLine = true,
        textStyle = Type.Body.copy(color = Palette.Bone),
        cursorBrush = SolidColor(Palette.Ember),
        keyboardOptions = KeyboardOptions(keyboardType = if (secret) KeyboardType.Password else KeyboardType.Text),
        visualTransformation = if (secret) PasswordVisualTransformation() else VisualTransformation.None,
        decorationBox = { inner ->
            Row(
                Modifier
                    .heightIn(min = 52.dp)
                    .clip(CircleShape)
                    .background(Palette.Panel)
                    .padding(horizontal = 18.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (icon != null) Icon(painterResource(icon), null, Modifier.size(20.dp), tint = Palette.Mute)
                Box(Modifier.weight(1f)) {
                    if (value.isEmpty()) Text(placeholder, color = Palette.Mute, style = Type.Body)
                    inner()
                }
            }
        },
    )
}

/** The main action: a bone pill with its arrow in a separate circle, the whole thing one button. */
@Composable
fun PillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier.pressable(onClick),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(
            Modifier
                .weight(1f)
                .height(52.dp)
                .clip(CircleShape)
                .background(Palette.Bone)
                .padding(horizontal = 22.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            Text(text, color = Palette.Ink, style = Type.Skin)
        }
        Box(Modifier.size(52.dp).clip(CircleShape).background(Palette.Bone), contentAlignment = Alignment.Center) {
            Icon(painterResource(R.drawable.ic_arrow), null, Modifier.size(20.dp), tint = Palette.Ink)
        }
    }
}

/** One choice out of a few, like the Today / Weekly switch of a tracker app. Scrolls when long. */
@Composable
fun Segmented(
    items: List<String>,
    selected: Int,
    onSelect: (Int) -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(CircleShape)
            .background(Palette.Panel)
            .border(1.dp, Palette.Rule, CircleShape)
            .horizontalScroll(rememberScrollState())
            .padding(4.dp),
    ) {
        items.forEachIndexed { i, text ->
            val on = i == selected
            Box(
                Modifier
                    .heightIn(min = 44.dp)
                    .clip(CircleShape)
                    .background(animateColorAsState(if (on) Palette.Raised else Palette.Panel, tween(200), label = "seg").value)
                    .clickable(role = Role.RadioButton, onClick = { onSelect(i) })
                    .padding(horizontal = 18.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(text, color = if (on) Palette.Bone else Palette.Mute, style = Type.Skin)
            }
        }
    }
}

/** Round icon button on a raised disc; 48dp so it is easy to hit. */
@Composable
fun IconBtn(
    @DrawableRes icon: Int,
    description: String,
    onClick: () -> Unit,
    tint: Color = Palette.Bone,
) {
    Box(
        Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(Palette.Raised)
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(icon), description, Modifier.size(20.dp), tint = tint)
    }
}

/** Tier name after a short bar of its colour, the way a tracker tags its metrics. */
@Composable
fun TierTag(tier: Tier?) {
    if (tier == null) return
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(
            Modifier
                .width(3.dp)
                .height(12.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(Color(tier.color)),
        )
        Label(tier.name)
    }
}

/** Just the tier colour, for tiles too small for the name. */
@Composable
fun TierDot(tier: Tier?) {
    if (tier != null) Box(Modifier.size(8.dp).clip(CircleShape).background(Color(tier.color)))
}

/** Ember pill, the loudest thing on screen: used only for a wishlist hit. */
@Composable
fun HitTag() =
    Row(
        Modifier.clip(CircleShape).background(Palette.Ember).padding(horizontal = 10.dp, vertical = 5.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(R.drawable.ic_wishlist), null, Modifier.size(12.dp), tint = Palette.Ink)
        Text("ON YOUR WISHLIST", color = Palette.Ink, style = Type.Label)
    }
