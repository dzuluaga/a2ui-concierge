package com.diegoz.a2uiconcierge.ui

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Surface
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.diegoz.a2uiconcierge.chat.Message
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(vm: ChatViewModel) {
    val messages by vm.messages.collectAsState()
    val isThinking by vm.isThinking.collectAsState()
    val productDetail by vm.productDetail.collectAsState()
    val paymentChallenge by vm.paymentChallenge.collectAsState()
    val txDetail by vm.txDetail.collectAsState()
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size, isThinking) {
        val target = messages.size - 1 + if (isThinking) 1 else 0
        if (target >= 0) listState.animateScrollToItem(target.coerceAtLeast(0))
    }

    val haptic = LocalHapticFeedback.current
    LaunchedEffect(messages.size) {
        val last = messages.lastOrNull()
        if (last is Message.AgentA2ui && isConfirmationSurface(last.fragments)) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "Lumen Concierge",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            "Personal shopping, thoughtfully picked",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp,
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        bottomBar = { InputRow(onSend = vm::send) },
    ) { padding ->
        ChatList(
            messages = messages,
            isThinking = isThinking,
            listState = listState,
            onAction = vm::onA2uiAction,
            onPromptTap = vm::send,
            contentPadding = padding,
        )
    }

    val sheetFragment = productDetail
    if (sheetFragment != null) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { vm.dismissProductDetail() },
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp),
            tonalElevation = 0.dp,
            // Explicit drag handle — the implicit default wasn't rendering
            // (likely because A2uiSheetContent's fillMaxSize Box is consuming
            // the entire content slot in the sheet's Column, with the WebView
            // drawing over where the handle would sit). Wrapping the default
            // handle in a Surface gives it a guaranteed paint pass above the
            // WebView background.
            dragHandle = {
                // The sheet expands edge-to-edge, so the handle sits at y=0 of
                // the surface — directly behind the status bar. statusBarsPadding
                // pushes it down so the capsule is visible.
                Box(
                    modifier = Modifier.statusBarsPadding().fillMaxWidth(),
                    contentAlignment = Alignment.TopCenter,
                ) {
                    Surface(
                        modifier = Modifier.padding(vertical = 10.dp),
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.55f),
                        shape = RoundedCornerShape(50),
                    ) {
                        Box(modifier = Modifier.size(width = 36.dp, height = 4.dp))
                    }
                }
            },
        ) {
            A2uiSheetContent(
                fragments = sheetFragment,
                onAction = vm::onA2uiAction,
            )
        }
    }

    // Payment-challenge sheet. Auto-opens when the agent emits the bubble;
    // ChatViewModel sets _paymentChallenge.value = null on `payment-completed`,
    // so successful settlement closes this sheet automatically.
    val paymentFragment = paymentChallenge
    if (paymentFragment != null) {
        val paymentSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { vm.dismissPaymentChallenge() },
            sheetState = paymentSheetState,
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp),
            tonalElevation = 0.dp,
        ) {
            A2uiSheetContent(
                fragments = paymentFragment,
                onAction = vm::onA2uiAction,
            )
        }
    }

    // Transaction-detail sheet — opened from a tap on the confirmation card's
    // on-chain payment row. Pure client-side; no agent involvement.
    val txFragment = txDetail
    if (txFragment != null) {
        val txSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { vm.dismissTxDetail() },
            sheetState = txSheetState,
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp),
            tonalElevation = 0.dp,
        ) {
            A2uiSheetContent(
                fragments = txFragment,
                onAction = vm::onA2uiAction,
            )
        }
    }
}

@Composable
private fun ChatList(
    messages: List<Message>,
    isThinking: Boolean,
    listState: androidx.compose.foundation.lazy.LazyListState,
    onAction: (String) -> Unit,
    onPromptTap: (String) -> Unit,
    contentPadding: PaddingValues,
) {
    LazyColumn(
        state = listState,
        modifier = Modifier.padding(contentPadding).fillMaxSize(),
    ) {
        if (messages.isEmpty() && !isThinking) {
            item(key = "welcome") {
                WelcomeCard(onPromptTap = onPromptTap)
            }
        }
        items(messages, key = { it.id }) { m ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .animateItem(
                        fadeInSpec = tween(durationMillis = 220),
                        placementSpec = spring(
                            stiffness = Spring.StiffnessMediumLow,
                            dampingRatio = Spring.DampingRatioLowBouncy,
                        ),
                    ),
            ) {
                when (m) {
                    is Message.User -> UserBubble(m.text)
                    is Message.AgentText -> AgentTextBubble(m.markdown)
                    is Message.AgentA2ui -> AgentA2uiBubble(
                        fragments = m.fragments,
                        onAction = onAction,
                    )
                }
            }
        }
        if (isThinking) {
            item(key = "thinking-indicator") {
                Column(
                    modifier = Modifier.animateItem(
                        fadeInSpec = tween(durationMillis = 180),
                    ),
                ) {
                    ThinkingDots()
                }
            }
        }
    }
}

/**
 * Confirmation surfaces are now built from the standard catalog (Card →
 * Column → ...), so we can't distinguish them by root component type
 * alone. Instead we look for the marker ``tx-detail-open`` Button action
 * that only confirmation surfaces emit.
 */
private fun isConfirmationSurface(fragments: List<JsonObject>): Boolean =
    hasButtonAction(fragments, "tx-detail-open")

private fun hasButtonAction(fragments: List<JsonObject>, actionName: String): Boolean {
    for (f in fragments) {
        val update = f["surfaceUpdate"] as? JsonObject ?: continue
        val components = update["components"] as? JsonArray ?: continue
        for (item in components) {
            val obj = item as? JsonObject ?: continue
            val componentObj = obj["component"] as? JsonObject ?: continue
            val buttonProps = componentObj["Button"] as? JsonObject ?: continue
            val action = buttonProps["action"] as? JsonObject ?: continue
            val name = action["name"]?.jsonPrimitive?.contentOrNull
            if (name == actionName) return true
        }
    }
    return false
}
