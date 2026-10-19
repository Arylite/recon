package re.isx.valoalert.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp
import re.isx.valoalert.R

object Palette {
    val Ink = Color(0xFF0E1116)
    val Panel = Color(0xFF161B22)
    val Raised = Color(0xFF1D232B)
    val Rule = Color(0xFF2B323C)
    val Bone = Color(0xFFE9E4DA)
    val Mute = Color(0xFF98A1AC)
    val Danger = Color(0xFFF0614F)
}

private val Condensed = FontFamily(Font(R.font.barlow_condensed_semibold, FontWeight.SemiBold))
private val Barlow = FontFamily(Font(R.font.barlow_regular, FontWeight.Normal), Font(R.font.barlow_medium, FontWeight.Medium))

object Type {
    val Clock =
        TextStyle(fontFamily = Condensed, fontWeight = FontWeight.SemiBold, fontSize = 56.sp, lineHeight = 56.sp, letterSpacing = 1.sp)

    /** The oversized word behind a product, partly hidden by it. */
    val Giant =
        TextStyle(fontFamily = Condensed, fontWeight = FontWeight.SemiBold, fontSize = 104.sp, lineHeight = 104.sp, letterSpacing = 2.sp)
    val Name =
        TextStyle(fontFamily = Condensed, fontWeight = FontWeight.SemiBold, fontSize = 28.sp, lineHeight = 28.sp, letterSpacing = 0.6.sp)
    val Title =
        TextStyle(fontFamily = Condensed, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 28.sp, letterSpacing = 1.sp)
    val Skin =
        TextStyle(fontFamily = Condensed, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 22.sp, letterSpacing = 0.6.sp)
    val Label =
        TextStyle(fontFamily = Condensed, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, lineHeight = 16.sp, letterSpacing = 1.6.sp)
    val Body = TextStyle(fontFamily = Barlow, fontWeight = FontWeight.Normal, fontSize = 15.sp, lineHeight = 22.sp)
}

/** Two opposite corners cut at 45 degrees: the one shape the app repeats, same as the logo. */
class Chamfer(
    private val cut: Dp,
) : Shape {
    override fun createOutline(
        size: Size,
        layoutDirection: LayoutDirection,
        density: Density,
    ): Outline {
        val c = with(density) { cut.toPx() }
        return Outline.Generic(
            Path().apply {
                moveTo(0f, 0f)
                lineTo(size.width - c, 0f)
                lineTo(size.width, c)
                lineTo(size.width, size.height)
                lineTo(c, size.height)
                lineTo(0f, size.height - c)
                close()
            },
        )
    }
}

@Composable
fun ValoTheme(content: @Composable () -> Unit) {
    val scheme =
        darkColorScheme(
            primary = Palette.Bone,
            onPrimary = Palette.Ink,
            background = Palette.Ink,
            onBackground = Palette.Bone,
            surface = Palette.Ink,
            onSurface = Palette.Bone,
            error = Palette.Danger,
        )
    MaterialTheme(colorScheme = scheme, content = content)
}
