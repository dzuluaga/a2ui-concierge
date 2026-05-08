package com.diegoz.a2uiconcierge.ui

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.diegoz.a2uiconcierge.chat.Message
import kotlinx.serialization.json.jsonPrimitive

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(vm: ChatViewModel) {
    val messages by vm.messages.collectAsState()
    val isThinking by vm.isThinking.collectAsState()
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size, isThinking) {
        val target = messages.size - 1 + if (isThinking) 1 else 0
        if (target >= 0) listState.animateScrollToItem(target.coerceAtLeast(0))
    }

    val haptic = LocalHapticFeedback.current
    LaunchedEffect(messages.size) {
        val last = messages.lastOrNull()
        if (last is Message.AgentA2ui && last.fragments.lastOrNull()?.get("component")?.toString()
                ?.contains("confirmation-card") == true) {
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
        LazyColumn(
            state = listState,
            modifier = Modifier.padding(padding).fillMaxSize(),
        ) {
            val latestA2uiComponent = messages
                .asReversed()
                .firstOrNull { it is Message.AgentA2ui }
                ?.let { (it as Message.AgentA2ui).fragments.lastOrNull() }
                ?.get("component")?.jsonPrimitive?.content
            val latestA2uiId = messages
                .asReversed()
                .firstOrNull { it is Message.AgentA2ui }
                ?.id
            items(messages, key = { it.id }) { m ->
                Column(
                    modifier = Modifier.animateItem(
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
                        is Message.AgentA2ui -> {
                            val isStaleCardGrid = latestA2uiComponent == "product-detail" &&
                                    m.id != latestA2uiId &&
                                    m.fragments.lastOrNull()
                                        ?.get("component")?.jsonPrimitive?.content == "card-grid"
                            AgentA2uiBubble(
                                fragments = m.fragments,
                                onAction = vm::onA2uiAction,
                                isFaded = isStaleCardGrid,
                            )
                        }
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
}
