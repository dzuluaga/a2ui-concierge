package com.diegoz.a2uiconcierge.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import kotlinx.coroutines.launch
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.diegoz.a2uiconcierge.a2ui.A2uiBridge
import com.diegoz.a2uiconcierge.a2ui.A2uiWebContent
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

@Composable
fun AgentA2uiBubble(
    fragments: List<JsonObject>,
    onAction: (String) -> Unit,
    backendBaseUrl: String,
    isFaded: Boolean = false,
) {
    val bridge = remember { A2uiBridge(backendBaseUrl) }
    val density = LocalDensity.current

    LaunchedEffect(bridge) {
        for (json in bridge.actions) onAction(json)
    }

    var measuredHeightDp by remember { mutableStateOf(80.dp) }
    LaunchedEffect(bridge) {
        for (px in bridge.resizes) {
            val dp = with(density) { px.toDp() }
            measuredHeightDp = dp.coerceIn(60.dp, 720.dp)
        }
    }
    val animatedHeight: Dp by animateDpAsState(
        targetValue = measuredHeightDp,
        animationSpec = spring(
            stiffness = Spring.StiffnessMediumLow,
            dampingRatio = Spring.DampingRatioLowBouncy,
        ),
        label = "a2ui-bubble-height",
    )

    val component = fragments.lastOrNull()?.get("component")?.jsonPrimitive?.content
    val isConfirmation = component == "confirmation-card"
    val isProductDetail = component == "product-detail"

    val popScale = remember {
        Animatable(
            when {
                isConfirmation -> 0.85f
                isProductDetail -> 0.7f
                else -> 1f
            }
        )
    }
    val popTranslateY = remember { Animatable(if (isProductDetail) -60f else 0f) }
    LaunchedEffect(component) {
        when {
            isConfirmation -> {
                popScale.snapTo(0.85f)
                popScale.animateTo(
                    targetValue = 1f,
                    animationSpec = spring(
                        stiffness = Spring.StiffnessMedium,
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                    ),
                )
            }
            isProductDetail -> {
                popScale.snapTo(0.7f)
                popTranslateY.snapTo(-60f)
                kotlinx.coroutines.coroutineScope {
                    launch {
                        popScale.animateTo(
                            targetValue = 1f,
                            animationSpec = spring(
                                stiffness = Spring.StiffnessMediumLow,
                                dampingRatio = Spring.DampingRatioLowBouncy,
                            ),
                        )
                    }
                    launch {
                        popTranslateY.animateTo(
                            targetValue = 0f,
                            animationSpec = spring(
                                stiffness = Spring.StiffnessMediumLow,
                                dampingRatio = Spring.DampingRatioLowBouncy,
                            ),
                        )
                    }
                }
            }
        }
    }

    val fadeAlpha: Float by animateFloatAsState(
        targetValue = if (isFaded) 0.45f else 1f,
        animationSpec = tween(durationMillis = 240),
        label = "a2ui-bubble-fade",
    )
    val fadeScale: Float by animateFloatAsState(
        targetValue = if (isFaded) 0.97f else 1f,
        animationSpec = tween(durationMillis = 240),
        label = "a2ui-bubble-fade-scale",
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .graphicsLayer {
                scaleX = popScale.value * fadeScale
                scaleY = popScale.value * fadeScale
                translationY = popTranslateY.value
                transformOrigin = TransformOrigin(0.5f, 0f)
            }
            .alpha(fadeAlpha),
    ) {
        A2uiWebContent(
            bridge = bridge,
            fragments = fragments,
            isSheet = false,
            modifier = Modifier.fillMaxWidth().height(animatedHeight),
        )
    }
}

/**
 * Sheet variant — fills available space and lets the web content scroll natively.
 * Used inside ModalBottomSheet for product-detail, payment-challenge, tx-detail.
 */
@Composable
fun A2uiSheetContent(
    fragment: JsonObject,
    onAction: (String) -> Unit,
    backendBaseUrl: String,
    modifier: Modifier = Modifier,
) {
    val bridge = remember { A2uiBridge(backendBaseUrl) }

    LaunchedEffect(bridge) {
        for (json in bridge.actions) onAction(json)
    }
    LaunchedEffect(bridge) {
        for (px in bridge.resizes) Unit
    }

    Box(modifier = modifier.fillMaxSize()) {
        A2uiWebContent(
            bridge = bridge,
            fragments = listOf(fragment),
            isSheet = true,
            modifier = Modifier.fillMaxSize(),
        )
    }
}
