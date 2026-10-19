package re.isx.valoalert.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
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
import androidx.compose.ui.unit.sp
import re.isx.valoalert.Tier

@Composable
fun Label(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = Palette.Mute,
) = Text(text.uppercase(), modifier, color = color, style = Type.Label)

@Composable
fun Field(
    value: String,
    label: String,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    secret: Boolean = false,
    keyboard: KeyboardType = KeyboardType.Text,
) {
    val source = remember { MutableInteractionSource() }
    val focused by source.collectIsFocusedAsState()
    Column(modifier) {
        Label(label)
        BasicTextField(
            value,
            onChange,
            Modifier.fillMaxWidth().heightIn(min = 44.dp).padding(top = 10.dp),
            singleLine = true,
            textStyle = Type.Body.copy(color = Palette.Bone),
            cursorBrush = SolidColor(Palette.Bone),
            keyboardOptions = KeyboardOptions(keyboardType = keyboard),
            visualTransformation = if (secret) PasswordVisualTransformation() else VisualTransformation.None,
            interactionSource = source,
        )
        Box(Modifier.fillMaxWidth().height(if (focused) 2.dp else 1.dp).background(if (focused) Palette.Bone else Palette.Rule))
    }
}

@Composable
fun BoneButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Box(
        modifier
            .heightIn(min = 48.dp)
            .clip(Chamfer(8.dp))
            .background(if (enabled) Palette.Bone else Palette.Rule)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text.uppercase(), color = if (enabled) Palette.Ink else Palette.Mute, style = Type.Label.copy(letterSpacing = 1.8.sp))
    }
}

/** Outlined, or filled with bone when selected; used for the shard picker. */
@Composable
fun Chip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val shape = Chamfer(6.dp)
    Box(
        Modifier
            .heightIn(min = 40.dp)
            .clip(shape)
            .background(if (selected) Palette.Bone else Palette.Ink)
            .border(1.dp, if (selected) Palette.Bone else Palette.Rule, shape)
            .clickable(role = Role.RadioButton, onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Label(text, color = if (selected) Palette.Ink else Palette.Bone)
    }
}

@Composable
fun IconBtn(
    @DrawableRes icon: Int,
    description: String,
    onClick: () -> Unit,
    tint: Color = Palette.Bone,
) {
    Box(Modifier.size(48.dp).clickable(role = Role.Button, onClick = onClick), contentAlignment = Alignment.Center) {
        Icon(painterResource(icon), description, Modifier.size(22.dp), tint = tint)
    }
}

@Composable
fun TierTag(tier: Tier?) {
    if (tier == null) return
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(8.dp).background(Color(tier.color)))
        Label(tier.name)
    }
}

/** Just the tier colour, for tiles too small for the name. */
@Composable
fun TierDot(tier: Tier?) {
    if (tier != null) Box(Modifier.size(10.dp).background(Color(tier.color)))
}

/** Inverted tag, the loudest thing on screen: used only for a wishlist hit. */
@Composable
fun HitTag() =
    Box(Modifier.background(Palette.Bone).padding(horizontal = 8.dp, vertical = 3.dp)) {
        Text("WISHLIST", color = Palette.Ink, style = Type.Label)
    }
