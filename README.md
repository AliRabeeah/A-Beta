# A

---

# Focus & Productivity Suite 🚀 (Android)

An all-in-one, feature-rich productivity and habit-tracking React Native (Expo) application designed for Android devices. Build habits, track tasks, manage notes, stay focused with Pomodoro timers, and monitor long-term growth through insights and Android Home Screen Widgets.

---

## ✨ Features

### 📅 Daily Overview & Task Management

* **Today Dashboard:** Get a quick view of your daily tasks, habits, and progress at a glance.
* **Task Management:** Create, prioritize, organize, and track tasks with quick checklists and detailed views.
* **Archive & Favorites:** Easily bookmark top priorities or archive completed items for clutter-free screens.

### 🔄 Habit Tracking & Challenges

* **Habit Streaks:** Monitor your daily and weekly habits with streak counters and completion heatmaps.
* **Challenges:** Join multi-day challenges to push personal growth and display unlocked achievements in your **Trophy Case**.

### 📝 Dynamic Rich Notes

* **Block-Based Note Editor:** Add rich text, paragraphs, headings, image blocks, audio attachments, link reference chips, and embedded documents.
* **Organization:** Tagging system, color-coded notes, masonry grid layouts, and advanced search filters.
* **Collaboration Features:** Add collaborators, tag reminders, and interact with notes using emoji reactions.

### ⏱️ Focus Timer & Sound Effects

* **Pomodoro Timer:** Built-in timer with custom work/rest intervals to boost deep focus.
* **Audio Alerts:** Custom audio cues on timer completion.

### 📊 Analytics & Insights

* **Calendar Heatmap:** Visualize long-term activity and consistency over time.
* **Progress Rings & Metrics:** Track task completion rates and streak evaluations.

### 📱 Android Home Screen Widgets

Includes custom Android home screen widgets:

* **Pomodoro Widget**
* **Today Summary Widget**
* **Habit Focus & Weekly Heatmap Widgets**
* **Quick-Add Widget**

### 🔒 Security, Sync & Customization

* **Biometric Auth:** Secure sensitive notes and tasks using Android Fingerprint / Biometric Prompt.
* **Auto Cloud / GitHub Backup:** Automated background backups to GitHub repositories or local JSON exports.
* **Internationalization (i18n):** Multi-language support driven by context.
* **Custom Theming:** Light/Dark themes and customizable design tokens.

---

## 🛠️ Tech Stack

* **Framework:** [React Native](https://reactnative.dev/) / [Expo](https://expo.dev/)
* **Navigation:** React Navigation (Drawer & Stack)
* **State Management:** React Context API (`TaskContext`, `HabitContext`, `NoteContext`, `PlanningContext`, etc.)
* **Storage & Backups:** AsyncStorage, GitHub API integration
* **Security:** Android Biometrics (`expo-local-authentication`)
* **Audio:** Expo AV (`timer_complete.wav`)

---

## 📂 Project Structure

```text
├── assets/                  # Icons, Android adaptive icons, app logos, audio clips
├── src/
│   ├── components/          # Reusable UI components & note blocks
│   │   └── notes/           # Note cards, emoji pickers, masonry cards, block renderers
│   ├── context/             # Global application state contexts
│   ├── i18n/                # Translations and localization context
│   ├── navigation/          # React Navigation configuration & drawers
│   ├── screens/             # Screen components (Today, Habits, Notes, Timer, Stats, etc.)
│   ├── theme/               # Theme Context & Design tokens
│   ├── utils/               # Biometrics, notifications, backups, streak logic
│   └── widgets/             # Native Android widget handoff & sync handlers
├── App.js                   # Application entry point
├── app.json                 # Expo configuration
├── package.json             # Dependencies and scripts
└── push.sh                  # Deployment / quick git helper script

```

---

## 🚀 Getting Started on Android

### Prerequisites

* [Node.js](https://nodejs.org/) (v16 or higher)
* [Expo CLI](https://www.google.com/search?q=https://docs.expo.dev/get-started/installation/)
* **Android Device** with Expo Go installed OR an **Android Studio Emulator**

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

```


2. **Install dependencies:**
```bash
npm install

```


3. **Start the development server:**
```bash
npx expo start

```


4. **Run on Android:**
* **Physical Android Device:** Scan the QR code displayed in the terminal using the **Expo Go** app from the Google Play Store.
* **Android Emulator:** Ensure Android Studio emulator is running, then press `a` in your terminal.



---

## ⚙️ Configuration & Customization

* **Language Settings:** Edit translations under `src/i18n/translations.js`.
* **Theme Tokens:** Modify colors, spacing, and typography tokens inside `src/theme/tokens.js`.
* **Automated GitHub Backups:** Configure your credentials inside the backup settings pane in the app to sync data safely to a private repository.
