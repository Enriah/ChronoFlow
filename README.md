# ChronoFlow

ChronoFlow is a local-first desktop focus planner built with Tauri, React, TypeScript, Tailwind CSS, and Zustand. It combines a scheduler, countdown timer, timeline, future planner, floating widgets, themes, visual effects, audio notifications, and an AI Companion into one desktop workspace.

Version 0.2 expands the Companion from a chat panel into a present, voice-capable assistant with local memory, journaling, wake word support, and user-approved command actions.

![ChronoFlow Dashboard](./screenshots/MainApp.png)

## Highlights

- Scheduler and countdown for current focus sessions
- Timeline view for the day
- Future planner and recurring schedule support
- Floating desktop widgets
- Theme system with custom backgrounds and visual effects
- Audio notifications for session transitions
- Gemini-powered Companion chat
- Local JSON persistence
- Local-first Companion memory and journal systems
- Optional voice input/output with Browser TTS and ElevenLabs
- Smart Wake Vosk wake word support bundled into the MSI
- Companion Actions for user-approved apps, folders, URLs, and built-in commands

## New In Version 0.2

### Companion Presence

- Top-right Companion popup messages
- Companion avatar, name, and personality tone
- Local reaction templates without extra Gemini calls
- Cooldowns to prevent popup spam

### Companion Memory

- Local memory files under the app config companion folder
- Memory categories for goals, projects, habits, interests, preferences, milestones, and notes
- Memory viewer, edit, delete, import, export, and reset flows
- Relevant memory retrieval for future Gemini context without sending the whole database

### Journal And Reflection

- Daily journal entries with stats, important events, and reflections
- Weekly and monthly summaries
- Journal viewer with timeline grouping and search
- Safe fallback when Gemini is unavailable

### Relationship And Recall

- Relationship profile with days known, focus hours, memory count, journal count, and milestones
- Local milestones for focus time, journals, memory count, streaks, and projects
- Recall service for searching memories, journals, and milestones

### Voice And Wake Word

- Push-to-talk voice input
- Browser Web Speech recognition when available
- Browser TTS fallback
- Optional ElevenLabs TTS with voice selection and preview
- Smart Wake Vosk mode for custom wake names such as Airi, Nova, Luna, and Chronos
- MSI bundle includes the default Vosk model and `libvosk.dll`

### Companion Actions

- User-approved action registry stored locally
- Supported actions: app, folder, URL, and built-in command
- Confirmation required by default
- No arbitrary shell command execution
- Voice and text commands use the same action detection path
- Built-in action: skip current session

## Tech Stack

- Desktop: Tauri v2 and Rust
- Frontend: React, TypeScript, Vite
- Styling: Tailwind CSS
- State: Zustand
- Persistence: localStorage and local JSON files
- AI: Gemini API integration
- Voice: Browser STT/TTS, optional ElevenLabs, bundled Vosk wake detection

## Development Setup

### Requirements

- Node.js LTS
- pnpm
- Rust via [rustup](https://rustup.rs/)
- Windows Build Tools for Windows builds

### Install

```bash
pnpm install
```

### Run The Desktop App

```bash
pnpm tauri dev
```

### Build Frontend

```bash
pnpm build
```

### Build Desktop Installers

```bash
pnpm tauri build
```

The MSI output is generated under:

```text
src-tauri/target/release/bundle/msi/
```

## Bundled Wake Word Assets

ChronoFlow bundles the default Vosk files for Smart Wake mode:

```text
src-tauri/resources/vosk/
  libvosk.dll
  vosk-model-small-en-us-0.15/
```

The Tauri config includes:

```json
"resources": ["resources/vosk/**/*"]
```

When installed from MSI, users do not need to download a Vosk model or DLL separately. Advanced users can still override the model path in:

```text
Settings > Companion > Voice > Wake Word > Custom Vosk Model Folder Path
```

Leave that field empty to use the bundled model.

## Companion Actions

Open:

```text
Settings > Companion > Actions
```

Users can register:

- App actions with `.exe` or `.lnk` paths
- Folder actions
- URL actions
- Built-in commands

Each action supports aliases, enable/disable, confirmation, test, and delete.

Example aliases:

```text
vscode, code, visual studio code, open code
```

Voice command example:

```text
Airi, open VS Code
```

ChronoFlow asks for confirmation before execution unless the action has confirmation disabled.

## Modding The UI

ChronoFlow's UI is component-driven. Most visual changes should start in these areas:

```text
src/components/
src/components/ui/
src/components/companion/
src/index.css
src/store/useThemeStore.ts
```

### Common UI Mod Points

- Global app surface, contrast, and shared utility styles: `src/index.css`
- Theme persistence and theme values: `src/store/useThemeStore.ts`
- Generic controls such as switches and buttons: `src/components/ui/`
- Dashboard layout: `src/components/Dashboard.tsx`
- Companion settings and panels: `src/components/companion/`

### Add Or Tune A Theme

1. Locate the theme configuration in the theme store or theme config files used by the current build.
2. Add or edit color tokens for background, surface, primary, text, borders, and accents.
3. Keep text contrast high against custom backgrounds.
4. Test the Settings page, Companion panel, dashboard, and floating widgets.

### UI Quality Rules

- Keep settings panels readable on both dark and custom backgrounds.
- Use existing UI controls before adding new control styles.
- Keep toggles consistent with the rest of Settings.
- Avoid nested cards unless the content is genuinely grouped.
- Verify that labels and buttons do not overflow on small windows.

## Project Structure

```text
src/
  companion/          Companion services: memory, journal, voice, actions, recall
  components/         React UI
  hooks/              App and Companion hooks
  models/             TypeScript types
  services/           Scheduler, persistence, audio, Gemini, widgets
  store/              Zustand stores

src-tauri/
  src/                Rust commands and native integrations
  resources/          Bundled runtime assets
  capabilities/       Tauri permission config
```

## Safety Model

- Companion popup reactions use local templates.
- Gemini is used for manual chat and controlled reflection/extraction flows.
- Wake detection does not call Gemini, memory, journal, or TTS before activation.
- Companion Actions cannot run arbitrary shell commands.
- User API keys stay local.
- Memory, journal, and action registries are local-first.

## License

MIT. See [LICENSE](./LICENSE).
