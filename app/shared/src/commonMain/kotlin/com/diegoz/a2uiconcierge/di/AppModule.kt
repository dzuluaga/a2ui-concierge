package com.diegoz.a2uiconcierge.di

import com.diegoz.a2uiconcierge.chat.ChatRepository
import com.diegoz.a2uiconcierge.chat.HttpChatRepository
import com.diegoz.a2uiconcierge.ui.ChatViewModel
import org.koin.dsl.module

fun appModule(backendBaseUrl: String) = module {
    single { AppConfig(backendBaseUrl) }
    single<ChatRepository> { HttpChatRepository(get<AppConfig>().backendBaseUrl) }
    single { ChatViewModel(get()) }
}
