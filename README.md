# Anchor

A React Native breathing app for short grounding pauses.

Instead of full meditation sessions, Anchor focuses on simple breathing cycles you can do anywhere: open the app, take a few intentional breaths, and continue your day.

---

## Screenshots

| Home                             | Session                                | Stats                              | Settings                                 |
| -------------------------------- | -------------------------------------- | ---------------------------------- | ---------------------------------------- |
| ![Home](/assets/readme/home.png) | ![Session](/assets/readme/session.png) | ![Stats](/assets/readme/stats.png) | ![Settings](/assets/readme/settings.png) |

---

## Features

- **Guided breathing sessions** — inhale, hold, and exhale phases with a visual circle animation
- **Fully customizable** — set your own inhale / hold / exhale durations and cycle count
- **Breathing presets** — Relax, Focus, and Sleep presets for quick setup
- **Weekly statistics** — track your sessions and total cycles, navigate back through past weeks
- **Local reminders** — daily notification at a time you choose, with quiet hours support
- **Haptic feedback** — subtle vibrations on each phase transition
- **Dark mode** — fully themed for both light and dark system preferences
- **No internet required** — all data stored locally on device

---

## Why I built this

Most breathing apps feel too complex, too long, or too gamified.

I wanted something simpler: a small tool for taking a few intentional breaths whenever I need to come back to the present moment. Not a full meditation session, not a timer for minutes. Just 3 or 5 breaths that can be done anywhere, anytime.

Open it, breathe, close it.

---

## Tech stack

|                 |                                                                                      |
| --------------- | ------------------------------------------------------------------------------------ |
| Framework       | [Expo](https://expo.dev) (SDK 54) with [expo-router](https://expo.github.io/router/) |
| Language        | TypeScript                                                                           |
| Storage         | AsyncStorage (local, no backend)                                                     |
| Animations      | React Native `Animated` API                                                          |
| Haptics         | `expo-haptics`                                                                       |
| Notifications   | `expo-notifications`                                                                 |
| Target platform | Android                                                                              |

---

## Running locally

**Prerequisites:** Node.js, and either an Android emulator or a physical device with Expo Go.

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start
```

Then press `a` to open on Android, or scan the QR code with [Expo Go](https://expo.dev/go).

---

## Installing the APK

> A release APK can be found in the [Releases](../../releases) section of this repository.

1. Download the `.apk` file to your Android device
2. Open the file — Android will prompt you to allow installation from unknown sources if needed
3. Install and open **Anchor**

---

## Project structure

```
app/
  (tabs)/
    index.tsx      # Home + breathing session
    stats.tsx      # Weekly statistics
    settings.tsx   # Reminders, quiet hours, breathing config
  _layout.tsx      # Root layout + theme
  modal.tsx        # Modal screen
components/        # Shared UI components
constants/
  theme.ts         # Color tokens (light + dark)
hooks/             # useAppTheme, useColorScheme
```
