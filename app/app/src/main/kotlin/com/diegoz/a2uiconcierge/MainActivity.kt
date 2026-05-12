package com.diegoz.a2uiconcierge

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.diegoz.a2uiconcierge.chat.HttpChatRepository
import com.diegoz.a2uiconcierge.credential.CredentialService
import com.diegoz.a2uiconcierge.theme.AppTheme
import com.diegoz.a2uiconcierge.ui.ChatScreen
import com.diegoz.a2uiconcierge.ui.ChatViewModel
import kotlinx.coroutines.launch

// FragmentActivity (not the bare ComponentActivity) so BiometricPrompt can
// attach to our lifecycle; FragmentActivity already extends ComponentActivity
// so Compose / setContent / viewModels keep working unchanged.
class MainActivity : FragmentActivity() {

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
        val credentialService = CredentialService()

        lifecycleScope.launch {
            vm.credentialRequest.collect { data ->
                val result = credentialService.requestCredential(this@MainActivity, data.dcqlQueryJson)
                vm.submitCredential(
                    credentialToken = result.token,
                    dcqlQueryJson = if (result.token != null) data.dcqlQueryJson else null,
                )
            }
        }

        setContent {
            AppTheme {
                ChatScreen(vm)
            }
        }
    }
}
