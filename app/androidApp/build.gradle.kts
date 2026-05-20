plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.diegoz.a2uiconcierge"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.diegoz.a2uiconcierge"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        // 10.0.2.2 is the emulator's alias for the host loopback.
        // Physical device options:
        //   USB-connected: keep localhost + run `adb reverse tcp:8000 tcp:8000`
        //   Wi-Fi only: set to your machine's LAN IP, e.g. "http://192.168.1.x:8000"
        buildConfigField("String", "BACKEND_BASE_URL", "\"http://10.0.2.2:8000\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    // web3j drags in two tuweni jars that each ship a META-INF/DISCLAIMER —
    // the Android packager refuses duplicates.
    packaging {
        resources {
            pickFirsts.add("META-INF/DISCLAIMER")
            pickFirsts.add("META-INF/INDEX.LIST")
            pickFirsts.add("META-INF/io.netty.versions.properties")
            pickFirsts.add("META-INF/versions/9/OSGI-INF/MANIFEST.MF")
        }
    }
}

dependencies {
    implementation(project(":shared"))

    // Android entry-point Compose glue
    implementation("androidx.activity:activity-compose:1.9.3")

    // Biometric-bound StrongBox key wrap for the x402 wallet seed.
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.fragment:fragment-ktx:1.8.5")

    // EIP-712 hashing + secp256k1 signing for the x402 EIP-3009 envelope.
    implementation("org.web3j:core:4.12.2")
    runtimeOnly("org.slf4j:slf4j-nop:2.0.13")

    // OkHttp for the x402 settle POST (A2uiBridge.settle uses it directly)
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // WebView bridge support
    implementation("androidx.webkit:webkit:1.12.1")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    debugImplementation("androidx.compose.ui:ui-tooling:1.7.8")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
}
