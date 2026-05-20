package com.diegoz.a2uiconcierge.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val SAMPLE_PROMPTS = listOf(
    "Help me find a housewarming gift",
    "Anniversary gift under \$100",
    "Something thoughtful for my mom",
    "Gift for a coffee lover",
)

@Composable
fun WelcomeCard(onPromptTap: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "L",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = Color.White,
                    fontSize = 20.sp,
                ),
            )
        }
        Text(
            "Hi, I'm Lumen.",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(top = 14.dp),
        )
        Text(
            "Tell me who you're shopping for and I'll suggest a few thoughtful picks. Try one of these to get started:",
            style = MaterialTheme.typography.bodyLarge.copy(fontSize = 13.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp, start = 8.dp, end = 8.dp),
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 22.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            for (prompt in SAMPLE_PROMPTS) {
                PromptChip(prompt, onClick = { onPromptTap(prompt) })
            }
        }
    }
}

@Composable
private fun PromptChip(text: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outline,
                shape = RoundedCornerShape(14.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text(
            text,
            style = MaterialTheme.typography.bodyLarge.copy(fontSize = 13.5.sp),
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}
