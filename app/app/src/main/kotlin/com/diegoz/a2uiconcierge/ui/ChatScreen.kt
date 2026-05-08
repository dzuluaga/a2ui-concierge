package com.diegoz.a2uiconcierge.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.diegoz.a2uiconcierge.chat.Message

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(vm: ChatViewModel) {
    val messages by vm.messages.collectAsState()
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Lumen Concierge") }) },
        bottomBar = { InputRow(onSend = vm::send) },
    ) { padding ->
        LazyColumn(
            state = listState,
            modifier = Modifier.padding(padding).fillMaxSize(),
        ) {
            items(messages, key = { it.id }) { m ->
                when (m) {
                    is Message.User -> UserBubble(m.text)
                    is Message.AgentText -> AgentTextBubble(m.markdown)
                    is Message.AgentA2ui -> AgentA2uiBubble(
                        fragments = m.fragments,
                        onAction = { /* hooked up in C7 */ },
                    )
                }
            }
        }
    }
}
