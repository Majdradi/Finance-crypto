#!/bin/bash

# Script to build Android APK using Expo EAS Build

echo "Setting up EAS Build for Android..."

# Install EAS CLI
npm install -g eas-cli

# Login to Expo (would require interactive login in actual use)
# eas login

# Configure the build
eas build:configure

# Create eas.json configuration
cat > eas.json << 'EOL'
{
  "cli": {
    "version": ">= 3.13.3"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    },
    "local": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
EOL

# Build APK locally if possible, otherwise use EAS cloud build
if command -v ./gradlew &> /dev/null; then
    echo "Building APK locally..."
    cd android && ./gradlew assembleRelease
    echo "APK built at: android/app/build/outputs/apk/release/app-release.apk"
else
    echo "For local builds, you need Android SDK and Gradle installed."
    echo "You can use Expo EAS cloud build instead:"
    echo "eas build -p android --profile preview"
fi

echo "Build script completed."