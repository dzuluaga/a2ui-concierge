package com.diegoz.a2uiconcierge.ui

import androidx.compose.ui.window.ComposeUIViewController
import com.diegoz.a2uiconcierge.App

// iOS Simulator routes localhost to the host machine automatically.
// Physical device: change to your machine's LAN IP, e.g. "http://192.168.1.x:8000"
private const val BACKEND_BASE_URL = "http://localhost:8000"

fun MainViewController() = ComposeUIViewController {
    App(BACKEND_BASE_URL)
}
