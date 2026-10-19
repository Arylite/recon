package re.isx.valoalert.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import re.isx.valoalert.R

object Palette {
    val Ink = Color(0xFF101010)
    val Panel = Color(0xFF1B1B1B)
    val Raised = Color(0xFF282828)
    val Rule = Color(0xFF2E2E2E)
    val Bone = Color(0xFFF3F0EA)
    val Mute = Color(0xFF8F8B85)

    /** The one accent: a wishlist hit, an error, the ping of the logo. Nothing decorative. */
    val Ember = Color(0xFFE8492F)
}

// Outfit is a variable font: one file, each weight picked on its axis.
private fun outfit(weight: FontWeight) =
    Font(R.font.outfit, weight, variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)))

private val Outfit = FontFamily(outfit(FontWeight.Normal), outfit(FontWeight.Medium), outfit(FontWeight.SemiBold))

object Type {
    val Clock =
        TextStyle(fontFamily = Outfit, fontWeight = FontWeight.SemiBold, fontSize = 48.sp, lineHeight = 52.sp, letterSpacing = (-1).sp)
    val Title =
        TextStyle(fontFamily = Outfit, fontWeight = FontWeight.SemiBold, fontSize = 30.sp, lineHeight = 34.sp, letterSpacing = (-0.5).sp)
    val Name =
        TextStyle(fontFamily = Outfit, fontWeight = FontWeight.SemiBold, fontSize = 22.sp, lineHeight = 26.sp, letterSpacing = (-0.2).sp)
    val Price = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 28.sp)
    val Skin = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.Medium, fontSize = 16.sp, lineHeight = 20.sp)
    val Body = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.Normal, fontSize = 15.sp, lineHeight = 22.sp)
    val Label = TextStyle(fontFamily = Outfit, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 1.2.sp)
}

@Composable
fun ReconTheme(content: @Composable () -> Unit) {
    val scheme =
        darkColorScheme(
            primary = Palette.Bone,
            onPrimary = Palette.Ink,
            background = Palette.Ink,
            onBackground = Palette.Bone,
            surface = Palette.Ink,
            onSurface = Palette.Bone,
            error = Palette.Ember,
        )
    MaterialTheme(colorScheme = scheme, content = content)
}
