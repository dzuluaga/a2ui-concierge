package com.diegoz.a2uiconcierge.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.diegoz.a2uiconcierge.shared.Res
import com.diegoz.a2uiconcierge.shared.fraunces_bold
import com.diegoz.a2uiconcierge.shared.fraunces_medium
import com.diegoz.a2uiconcierge.shared.fraunces_semibold
import com.diegoz.a2uiconcierge.shared.inter_bold
import com.diegoz.a2uiconcierge.shared.inter_medium
import com.diegoz.a2uiconcierge.shared.inter_regular
import com.diegoz.a2uiconcierge.shared.inter_semibold
import org.jetbrains.compose.resources.Font

@Composable
private fun interFontFamily() = FontFamily(
    Font(Res.font.inter_regular, FontWeight.Normal),
    Font(Res.font.inter_medium, FontWeight.Medium),
    Font(Res.font.inter_semibold, FontWeight.SemiBold),
    Font(Res.font.inter_bold, FontWeight.Bold),
)

@Composable
private fun frauncesontFamily() = FontFamily(
    Font(Res.font.fraunces_medium, FontWeight.Medium),
    Font(Res.font.fraunces_semibold, FontWeight.SemiBold),
    Font(Res.font.fraunces_bold, FontWeight.Bold),
)

@Composable
fun rememberAppTypography(): Typography {
    val inter = interFontFamily()
    val fraunces = frauncesontFamily()
    return Typography(
        bodyLarge = TextStyle(
            fontFamily = inter,
            fontSize = 16.sp,
            fontWeight = FontWeight.Normal,
        ),
        titleMedium = TextStyle(
            fontFamily = fraunces,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
        ),
        titleLarge = TextStyle(
            fontFamily = fraunces,
            fontSize = 22.sp,
            fontWeight = FontWeight.SemiBold,
        ),
        labelSmall = TextStyle(
            fontFamily = inter,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
        ),
    )
}
