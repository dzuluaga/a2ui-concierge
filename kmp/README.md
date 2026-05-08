# Kotlin Multiplatform Migration — `feat/kmp`

In-progress port of the Android app to Kotlin Multiplatform (Android + iOS) using
Compose Multiplatform for shared UI.

The original `app/` (Android-only) project is **still the source of truth** for the
running demo. This `kmp/` tree adds shared modules in parallel; once feature parity
is reached, `app/` will be removed and replaced by `kmp/androidApp/`.

## Status

### Done
- Gradle KMP scaffold (`settings.gradle.kts`, `gradle/libs.versions.toml`, wrapper).
- `:shared` module with `androidTarget` + iOS targets (x64, arm64, simulatorArm64).
- `commonMain`:
  - `Message` sealed interface + `AgentEvent` sealed interface — pure
    `kotlinx.serialization` types, no platform dependencies.
  - `ChatRepository` interface and `HttpChatRepository` impl using **ktor 3.x** with
    the built-in SSE plugin (replaces OkHttp).
  - `ChatViewModel` using KMP `androidx.lifecycle:lifecycle-viewmodel:2.8.x` and
    `kotlin.uuid.Uuid` (no `java.util.UUID`).
- Compiles cleanly for `:shared:compileDebugKotlinAndroid` and
  `:shared:compileKotlinIosSimulatorArm64`.

### Next
- [ ] **`expect class A2uiWebView`** in commonMain with `actual` impls:
  - `androidMain` → wraps `android.webkit.WebView` + `addJavascriptInterface`.
  - `iosMain` → wraps `WKWebView` + `WKScriptMessageHandler`.
- [ ] Rename JS bridge from `window.AndroidBridge` → `window.HostBridge` across all
  Lit components in `host-bundle/src/components/` so the same JS works under both
  WebView implementations.
- [ ] **`:composeApp`** module (Compose Multiplatform): port `UserBubble`,
  `AgentTextBubble`, `ThinkingDots`, `InputRow`, `ChatScreen`, `AgentA2uiBubble`,
  and theme to `commonMain`. Most are pure Compose and lift over directly.
- [ ] **`:androidApp`** module: thin Android entry point that hosts the Compose UI
  and configures `HttpChatRepository`.
- [ ] **`:iosApp`** module: SwiftUI shell that embeds the Compose UI via
  `ComposeUIViewController`; bundle `host.html` + `a2ui-host.iife.js` as iOS
  resources; load via `Bundle.main.url(forResource:)`.
- [ ] Asset path abstraction (`expect fun a2uiAssetUrl(): String`) — Android returns
  `file:///android_asset/host.html`, iOS returns the `Bundle.main` URL.
- [ ] CSS-px ↔ device-px conversion in shim.js needs an iOS-aware check
  (`window.devicePixelRatio` is reliable on both platforms — should work as-is).
- [ ] Verify the demo runs on iOS Simulator with all 5 A2UI components.

## Run (so far)

```shell
cd kmp
./gradlew :shared:compileDebugKotlinAndroid          # Android target
./gradlew :shared:compileKotlinIosSimulatorArm64     # iOS sim arm64 target
```

There is no runnable app in this tree yet — the `:composeApp`, `:androidApp`, and
`:iosApp` modules are the next deliverables.

## Decision log

- **Kotlin 2.1.0** for stable `kotlin.uuid.Uuid` and current Compose Multiplatform
  compatibility.
- **ktor 3.0.3** for built-in SSE client plugin; OkHttp engine on Android, Darwin
  engine on iOS.
- **androidx.lifecycle 2.8.x** for KMP-ready `ViewModel` + `viewModelScope` (no need
  to write our own).
- **Static iOS frameworks** (`isStatic = true`) — simpler for the demo than
  dynamic + dSYM bundling.
