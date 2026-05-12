plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
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
        // localhost works on:
        //   - emulator: maps to host loopback automatically
        //   - real device: requires `adb reverse tcp:8000 tcp:8000` while USB-connected
        buildConfigField("String", "BACKEND_BASE_URL", "\"http://localhost:8000\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    // web3j drags in two tuweni jars that each ship a META-INF/DISCLAIMER —
    // the Android packager refuses duplicates. Pick the first; the content
    // is identical Apache-2 boilerplate.
    packaging {
        resources {
            pickFirsts.add("META-INF/DISCLAIMER")
            pickFirsts.add("META-INF/INDEX.LIST")
            pickFirsts.add("META-INF/io.netty.versions.properties")
        }
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.10.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.webkit:webkit:1.12.1")
    // Biometric-bound StrongBox key wrap for the x402 wallet seed.
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.fragment:fragment-ktx:1.8.5")
    // EIP-712 hashing + secp256k1 signing for the x402 EIP-3009 envelope.
    // web3j hauls in Bouncy Castle, Jackson, and a slf4j contract; the
    // runtime-only slf4j-nop suppresses the "no implementation" warning.
    implementation("org.web3j:core:4.12.2")
    runtimeOnly("org.slf4j:slf4j-nop:2.0.13")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.github.jeziellago:compose-markdown:0.5.4")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
}
