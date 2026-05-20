import org.jetbrains.kotlin.gradle.ExperimentalKotlinGradlePluginApi
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("org.jetbrains.kotlin.multiplatform")
    id("com.android.library")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

kotlin {
    androidTarget {
        @OptIn(ExperimentalKotlinGradlePluginApi::class)
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }

    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64(),
    ).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "shared"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            // Compose Multiplatform
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.ui)
            implementation(compose.components.resources)
            implementation(compose.materialIconsExtended)

            // Networking — Ktor replaces OkHttp for the SSE chat stream
            implementation("io.ktor:ktor-client-core:3.1.3")
            implementation("io.ktor:ktor-client-content-negotiation:3.1.3")

            // Kotlin std
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")

            // Lifecycle — JetBrains KMP fork supports iOS (plain androidx.lifecycle does not).
            // 2.10.0 matches what CMP 1.10.3 ships with.
            implementation("org.jetbrains.androidx.lifecycle:lifecycle-viewmodel:2.10.0")
            implementation("org.jetbrains.androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
            implementation("org.jetbrains.androidx.lifecycle:lifecycle-runtime-compose:2.10.0")

            // Multiplatform Markdown renderer (replaces Android-only jeziellago lib)
            implementation("com.mikepenz:multiplatform-markdown-renderer-m3:0.35.0")

            // Koin DI — KoinApplication composable + koinInject
            implementation("io.insert-koin:koin-core:4.0.4")
            implementation("io.insert-koin:koin-compose:4.0.4")
        }

        androidMain.dependencies {
            // Ktor Android engine
            implementation("io.ktor:ktor-client-okhttp:3.1.3")

            // Compose Android extras
            implementation("androidx.activity:activity-compose:1.9.3")

            // Biometric + Fragment (SecureWallet.android.kt + A2uiBridge.android.kt)
            implementation("androidx.biometric:biometric:1.1.0")
            implementation("androidx.fragment:fragment-ktx:1.8.5")

            // Android Credential Manager — age verification, DPC, loyalty (CredentialService.kt)
            implementation("androidx.credentials:credentials:1.5.0")
            implementation("androidx.credentials:credentials-play-services-auth:1.5.0")

            // WebView bridge support
            implementation("androidx.webkit:webkit:1.12.1")

            // EIP-712 signing (X402Signer.android.kt)
            implementation("org.web3j:core:4.12.2")
            runtimeOnly("org.slf4j:slf4j-nop:2.0.13")

            // HTTP settle POST (A2uiBridge.android.kt)
            implementation("com.squareup.okhttp3:okhttp:4.12.0")
        }

        iosMain.dependencies {
            // Ktor Darwin (iOS/macOS) engine
            implementation("io.ktor:ktor-client-darwin:3.1.3")
        }

        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
        }
    }
}

android {
    namespace = "com.diegoz.a2uiconcierge.shared"
    compileSdk = 35
    defaultConfig {
        minSdk = 26
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.diegoz.a2uiconcierge.shared"
    generateResClass = always
}
