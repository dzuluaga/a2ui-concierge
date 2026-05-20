package com.diegoz.a2uiconcierge.a2ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import kotlinx.serialization.json.JsonObject

/**
 * Platform composable that hosts the A2UI web renderer.
 *
 * Android actual: [AndroidView] wrapping a [WebView].
 * iOS actual: [UIKitView] wrapping a [WKWebView].
 *
 * [isSheet] switches the view into sheet mode: fills available space,
 * enables native vertical scrolling, and disables the height-resize channel.
 */
@Composable
expect fun A2uiWebContent(
    bridge: A2uiBridge,
    fragments: List<JsonObject>,
    isSheet: Boolean,
    modifier: Modifier,
)
