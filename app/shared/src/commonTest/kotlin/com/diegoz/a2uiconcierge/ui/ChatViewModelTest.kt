package com.diegoz.a2uiconcierge.ui

import com.diegoz.a2uiconcierge.chat.AgentEvent
import com.diegoz.a2uiconcierge.chat.ChatRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.serialization.json.buildJsonObject
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals

@OptIn(ExperimentalCoroutinesApi::class)
class ChatViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest fun setUp() { Dispatchers.setMain(dispatcher) }
    @AfterTest  fun tearDown() { Dispatchers.resetMain() }

    @Test fun `appends user then agent messages`() = runTest(dispatcher) {
        val repo = object : ChatRepository {
            override fun send(text: String) = flowOf<AgentEvent>(
                AgentEvent.Text("Three picks coming up."),
                AgentEvent.A2ui(buildJsonObject {}),
                AgentEvent.End,
            )
        }
        val vm = ChatViewModel(repo)
        vm.send("Need a gift")
        advanceUntilIdle()
        val kinds = vm.messages.value.map { it::class.simpleName }
        assertEquals(listOf("User", "AgentText", "AgentA2ui"), kinds)
    }
}
