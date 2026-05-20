package com.diegoz.a2uiconcierge.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.mikepenz.markdown.m3.Markdown
import com.mikepenz.markdown.m3.markdownColor
import com.mikepenz.markdown.m3.markdownTypography

@Composable
fun AgentTextBubble(markdown: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
    ) {
        val bubbleShape = RoundedCornerShape(
            topStart = 14.dp,
            topEnd = 14.dp,
            bottomEnd = 14.dp,
            bottomStart = 4.dp,
        )
        Box(
            modifier = Modifier
                .clip(bubbleShape)
                .background(MaterialTheme.colorScheme.surface, bubbleShape)
                .border(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outline,
                    shape = bubbleShape,
                )
                .padding(horizontal = 12.dp, vertical = 8.dp),
        ) {
            Markdown(
                content = markdown,
                colors = markdownColor(
                    text = MaterialTheme.colorScheme.onSurface,
                    codeBackground = MaterialTheme.colorScheme.background,
                ),
                typography = markdownTypography(
                    paragraph = MaterialTheme.typography.bodyLarge,
                ),
            )
        }
    }
}
