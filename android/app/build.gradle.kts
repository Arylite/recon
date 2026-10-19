plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ktlint)
}

android {
    namespace = "re.isx.valoalert"
    compileSdk = 37

    defaultConfig {
        applicationId = "re.isx.valoalert"
        minSdk = 30
        targetSdk = 36
        versionCode = (System.getenv("VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("VERSION_NAME") ?: "0.1.0"
        // The app key is baked into the APK and only keeps scanners out; user tickets guard the data.
        // Pass it with -PapiToken=... (CI: ORG_GRADLE_PROJECT_apiToken); apiUrl points a debug build
        // at a local backend (http://localhost:8080 with adb reverse).
        val apiUrl = providers.gradleProperty("apiUrl").getOrElse("https://recon.isx.re")
        val apiToken = providers.gradleProperty("apiToken").getOrElse("")
        buildConfigField("String", "API_URL", "\"$apiUrl\"")
        buildConfigField("String", "API_TOKEN", "\"$apiToken\"")
    }

    // Release builds are signed with the keystore given in the environment (CI), else with the
    // debug key, which the build creates when missing (forks and local builds).
    val keystore = System.getenv("VALOALERT_KEYSTORE")
    signingConfigs {
        if (keystore != null) {
            create("release") {
                storeFile = file(keystore)
                storePassword = System.getenv("VALOALERT_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("VALOALERT_KEY_ALIAS")
                keyPassword = System.getenv("VALOALERT_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName(if (keystore != null) "release" else "debug")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        warningsAsErrors = true
        // Version nags would break the build whenever a new SDK or library ships.
        disable += setOf("OldTargetApi", "GradleDependency", "AndroidGradlePluginVersion", "NewerVersionAvailable")
        // Suggests androidx core-ktx helpers; not worth a dependency for one call.
        disable += "UseKtx"
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.material3)
    implementation(libs.activity.compose)
    implementation(libs.work.runtime)
    implementation(libs.coil.compose)
    implementation(libs.coil.network)
}
