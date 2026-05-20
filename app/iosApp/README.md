# iOS App

This directory holds the Swift entry-point for the Compose Multiplatform iOS app.

## First-time setup

Generate the Xcode project from the KMP Gradle plugin:

```bash
cd ..   # from app/
./gradlew :shared:generateXcodeProject
```

This scaffolds `iosApp/iosApp.xcodeproj` with the correct framework embedding
and build phases. The `shared.xcframework` is embedded automatically via the
`embedAndSignAppleFrameworkForXcode` Gradle task, which Xcode calls as a
pre-build script phase.

## Building

1. Open `iosApp/iosApp.xcodeproj` in Xcode.
2. Select an iOS simulator or device.
3. Build & Run (⌘R).

Xcode calls the Gradle `embedAndSignAppleFrameworkForXcode` task before
compiling Swift, so the `shared` framework is always up to date.

## Web assets

`host.html` and `a2ui-host.js` from `androidApp/src/main/assets/` must be
copied into the Xcode project as bundle resources so `WKWebView` can load
them via `NSBundle.mainBundle.URLForResource(...)`. Add them to the Xcode
target's "Copy Bundle Resources" build phase.

## Notes

- `SecureWallet` uses `LAContext` + Keychain. On simulator, biometric is
  mocked. On device, Face ID / Touch ID is required.
- `X402Signer` stubs with `NotImplementedError` — secp256k1 signing on iOS
  is deferred until a Kotlin/Native binding or Swift interop is implemented.
