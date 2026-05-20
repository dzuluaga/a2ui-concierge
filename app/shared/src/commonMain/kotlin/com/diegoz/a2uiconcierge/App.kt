package com.diegoz.a2uiconcierge

import androidx.compose.runtime.Composable
import com.diegoz.a2uiconcierge.di.appModule
import com.diegoz.a2uiconcierge.theme.AppTheme
import com.diegoz.a2uiconcierge.ui.ChatScreen
import org.koin.compose.KoinApplication

@Composable
fun App(backendBaseUrl: String) {
    KoinApplication(application = {
        modules(appModule(backendBaseUrl))
    }) {
        AppTheme {
            ChatScreen()
        }
    }
}
