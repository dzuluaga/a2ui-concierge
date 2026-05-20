package com.diegoz.a2uiconcierge.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Indigo,
    onPrimary = Color.White,
    background = Ivory,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    outline = Mist,
    tertiary = SoftGreen,
)

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = rememberAppTypography(),
        content = content,
    )
}
