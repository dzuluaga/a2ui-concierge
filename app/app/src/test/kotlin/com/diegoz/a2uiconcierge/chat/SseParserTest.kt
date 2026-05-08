package com.diegoz.a2uiconcierge.chat

import org.junit.Assert.assertEquals
import org.junit.Test

class SseParserTest {

    @Test fun `parses single event with data`() {
        val raw = "event: text\ndata: {\"text\":\"Hi\"}\n\n"
        val events = parseSseStream(raw.lineSequence())
        assertEquals(1, events.size)
        assertEquals("text", events[0].name)
        assertEquals("{\"text\":\"Hi\"}", events[0].data)
    }

    @Test fun `parses two events separated by blank line`() {
        val raw = "event: text\ndata: {\"text\":\"a\"}\n\nevent: end\ndata: {}\n\n"
        val events = parseSseStream(raw.lineSequence())
        assertEquals(2, events.size)
        assertEquals(listOf("text", "end"), events.map { it.name })
    }
}
