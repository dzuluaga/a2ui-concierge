package com.diegoz.a2uiconcierge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.diegoz.a2uiconcierge.chat.HttpChatRepository
import com.diegoz.a2uiconcierge.theme.AppTheme
import com.diegoz.a2uiconcierge.ui.ChatScreen
import com.diegoz.a2uiconcierge.ui.ChatViewModel

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val repo = HttpChatRepository(BuildConfig.BACKEND_BASE_URL)
        val factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return ChatViewModel(repo) as T
            }
        }
        val vm: ChatViewModel by viewModels { factory }
        setContent {
            AppTheme {
                ChatScreen(vm)
            }
        }
    }
}
