package com.diegoz.a2uiconcierge.a2ui

object ThemeTokens {
    fun asJson(): String = buildString {
        append("{")
        append("\"color-bg\":\"#F8F4ED\",")
        append("\"color-fg\":\"#1B1B1F\",")
        append("\"color-accent\":\"#5B6CFF\",")
        append("\"color-success\":\"#7AB87A\",")
        append("\"radius-md\":\"14px\",")
        append("\"font-sans\":\"Inter, system-ui, sans-serif\",")
        append("\"font-serif\":\"Fraunces, 'Times New Roman', serif\"")
        append("}")
    }
}
