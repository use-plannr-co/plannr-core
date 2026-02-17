# 🗓️Plannr - Your Personal Auto-Scheduling Assistant

Welcome to Plannr - a dynamic auto-scheduling appliation. It generates smart, optimized weekly schedules for you based on your preferences, constraints, and priorities. Whether you're a student managing classes or a professional juggling tasks, Plannr helps you focus on what matters without the chaos of manual planning.

## 🚀 Features

- Intelligent scheduling algorithms based on your needs - choose from 3 different strategies
    - ⚡ Earliest-Fit: Finish your week early with the earliest possible scheduling of each task and enjoy your weekends like you're meant to!
    - ⚖️ Balanced-Work: Never overwork yourself, with help from Plannr. Spread out tasks across the week with intelligent scheduling to make sure the burnout doesn't catch you!
    - ❗ Deadline-Oriented: Procrastination has nothing on this strategy - Plannr won't let it get the best of you and ensure that you can get your work done - with that teensy bit of delay.

- 🔁 Real-Time Rescheduling for unexpected events or strategy shifts
    - 🫨 Unexpected Events: Tasks are bound to come out of nowhere in the middle of the week, but don't let that stop you from getting the work done. Plannr works efficiently to include new events in the middle of the week with minimal changes to your schedule.
    - 🥱 Strategy Switch: Is the current strategy not working for you? Well worry not, because with Plannr you can change whatever is left of your week to a different strategy.

- 📅 Rigid & Flexible Events with priorities, dependencies, and durations.

- 📤 ICS Export for calendar integration with Apple, Google, and Notion calendars.

- 🔔 Notification Service: Reminds you to mark tasks as done or reschedule.

## 🧠 How to Use

1. Users input tasks with details like type, priority, duration, and flexibility.

2. Plannr runs its intelligent scheduling algorithm to generate a feasible schedule.

3. Users can export or tweak the generated schedule and even change strategies mid-week. Users can also generate ICS files to add to their preferred calendar apps.

4. Schedules are stored locally as demanded by the user.

## � Authentication & Security

Plannr uses **Clerk** for authentication with **expo-secure-store** for secure token caching:

- **Secure Token Storage**: All authentication tokens are encrypted and stored in the device's secure keychain/keystore
- **Automatic Token Management**: Tokens are automatically cached and retrieved during app sessions
- **Secure Logout**: Complete token cleanup ensures no sensitive data remains after logout
- **Cross-Platform**: Works seamlessly on both iOS (Keychain) and Android (Keystore)

### Token Cache Implementation

The app uses a custom secure token cache (`cache.js`) that:

- Encrypts all Clerk authentication tokens using expo-secure-store
- Provides automatic cleanup on logout
- Includes debugging utilities for development
- Follows security best practices for mobile authentication

## �🖥️ Tech Stack

| Layer       | Technology                                 |
| ----------- | ------------------------------------------ |
| Core Logic  | JavaScript (Migrated from Java) (Pure OOP) |
| Frontend    | React Native                               |
| Persistence | JSON + RN AsyncStorage (Local)             |
| Deployment  | APK                                        |
