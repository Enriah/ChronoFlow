# ChronoFlow

[Tiếng Việt](./README.vi.md) · [Download](https://github.com/Enriah/ChronoFlow/releases/latest) · [Changelog](./CHANGELOG.md)

![ChronoFlow](./ChronoFlow.png)

ChronoFlow is a local-first Windows desktop planner for turning a daily plan into timed events and focused work sessions. It keeps the calendar, event automation, session timer, reports, themes, and animated visual engine in one Tauri application without requiring a cloud account.

## Download

The current desktop release is **ChronoFlow 0.1.0** for Windows 10/11 x64.

- [Download the recommended Windows installer (.exe)](https://github.com/Enriah/ChronoFlow/releases/latest/download/ChronoFlow_0.1.0_x64-setup.exe)
- [Download the Windows Installer package (.msi)](https://github.com/Enriah/ChronoFlow/releases/latest/download/ChronoFlow_0.1.0_x64_en-US.msi)
- [Open all releases and release notes](https://github.com/Enriah/ChronoFlow/releases)

Run one installer, complete the setup wizard, and open ChronoFlow from the Start menu. Windows SmartScreen may show an unrecognized-publisher warning because the community build is not code-signed; verify that the file comes from this repository's Releases page before continuing.

## What ChronoFlow Does

| Area | Purpose |
| --- | --- |
| **Schedule** | Shows today's running plan. EventTrack occupies the main area, while Today's Timeline remains a compact reference panel. |
| **Planner** | Creates and edits dated schedule blocks and their Event Timeline. Today's Planner items synchronize into Schedule automatically. |
| **Sessions** | Runs a standalone focus timer with flow steps, checklists, notes, interruptions, and approved actions. Sessions are independent from Schedule. |
| **Session Templates** | Stores reusable Session setups: duration, actions, flow steps, and notes. A template never creates a Planner or Schedule item by itself. |
| **Reports** | Calculates real metrics only from completed Sessions, including focused time, project totals, planned vs. actual time, and recent sessions. |
| **Themes** | Applies complete theme palettes, backgrounds, typography, widget surfaces, and Visual Engine effects. |
| **Settings** | Manages approved developer actions, timer sounds, floating widget options, and local backup/restore. |

## Quick Start

### 1. Register an action (optional)

Open **Settings → Developer Actions → Add Action**. Choose an app, file, folder, URL, or command, then set whether it is enabled and whether ChronoFlow must ask before launching it. Command actions always require confirmation and receive a safety classification.

Only registered and enabled actions can be bound to timeline events. This prevents schedule text from becoming an unrestricted command runner.

### 2. Plan a day

Open **Planner**, choose a date, and create a schedule block. Set its title, start time, duration, and Event Timeline. Duration accepts any minute value; values below five minutes are normalized to five.

Timeline events may be actions, reminders, checklist groups, notes, or alerts. Events are placed relative to the schedule block and can be arranged on separate tracks.

### 3. Create a plan from text

Use **Quick Add** in Planner to parse a deterministic local command. No AI service or API key is used.

```text
Day 06/07/2026, from "09:30" to "10:30", "Fix CI Pipeline",
event(from "09:45" to "09:50", name "Open Chrome", action "Chrome"),
event(from "10:00" to "10:05", name "Check logs", reminder),
event(from "10:15" to "10:25", name "Verify", checklist "check health|check logs|check dashboard")
```

The parser validates dates and times, detects overlaps or out-of-range events, resolves enabled actions, and presents an editable preview before anything is created.

### 4. Follow today's plan

Items dated today appear in **Schedule**. EventTrack displays the events from those items and triggers bound actions at their configured times. The compact panel on the right shows the day's chronological blocks.

### 5. Run an independent Session

Open **Sessions → New session** to create a manual focus session. Add flow steps, checklists, notes, and actions, then start the timer. Save useful setups as Session Templates for reuse. Completed sessions become the source of truth for Reports.

## Themes and Visual Effects

ChronoFlow includes Minimal Dark, Cyber Dev, Terminal, Sakura Day, Enchanted Realm, Maple Forest, Sakura Evening, and Deep Galaxy themes. Available Canvas Visual Engine effects include aurora, electricity, fog, maple leaves, matrix rain, rain, sakura petals, snow, and stars.

The effect layer is rendered above the background and below application widgets. Effect colors adapt to light and dark palettes so particles remain visible without reducing widget readability.

## Improvements and Optimizations in This Release

- Separated the Session timer from Schedule so each feature has one clear responsibility.
- Reworked Schedule into a large EventTrack plus a narrow Today's Timeline.
- Added a wide Planner schedule editor and a flexible minute-based duration field.
- Added the Event Timeline editor with tracks, zoom, snapping, checklists, actions, reminders, notes, and alerts.
- Added strict local text-to-plan creation with validation and an editable confirmation preview.
- Rebuilt action launching around an explicit local registry and Tauri permissions.
- Clarified Session Templates as reusable manual-session configurations.
- Removed report placeholders; Reports now reflect completed Session data only.
- Standardized controls, switches, spacing, opaque surfaces, and theme tokens across the UI.
- Expanded the theme system with fantasy, maple, sakura, and galaxy palettes.
- Moved each animated effect into its own module for isolated maintenance and debugging.
- Reduced Visual Engine GPU load with adaptive frame rate and render scale, cached sprites/textures, optimized drawing primitives, background-tab pausing, and blur reduction while effects are active.
- Removed obsolete Companion, wake-word, unused widget, alias-editor, and legacy presentation assets from the production path.

See [CHANGELOG.md](./CHANGELOG.md) for the release-oriented summary.

## Local Data and Privacy

ChronoFlow is local-first. Schedules, Planner items, Sessions, templates, actions, theme settings, and widget settings are stored on the device. The app does not require an account and the current production build has no AI Companion or cloud-memory subsystem.

Use **Settings → Data / Backup** to export a backup before reinstalling or moving to another machine, and import that backup to restore supported application data.

## Development

### Requirements

- Node.js 22 LTS or newer
- pnpm 10
- Rust stable through [rustup](https://rustup.rs/)
- Microsoft C++ Build Tools and WebView2 on Windows

### Install and run

```bash
git clone https://github.com/Enriah/ChronoFlow.git
cd ChronoFlow
pnpm install
pnpm tauri dev
```

### Verify and build

```bash
pnpm lint
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
pnpm tauri build
```

Windows packages are generated under:

```text
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/nsis/
```

## Project Structure

```text
src/
  components/               Shared application UI and settings
  core/                     Session and domain-level state
  features/
    developer-actions/      Approved action registry
    event-timeline/         Timeline editor and runtime controllers
    quick-planner/          Strict local text parser and preview
    schedule/               Today's EventTrack
    sessions/               Session editor and timer runtime
    session-templates/      Reusable manual-session templates
  models/                   Persisted TypeScript domain models
  services/                 Audio, persistence, scheduling, actions, widgets
  store/                    Zustand application stores
  themes/                   Theme definitions and provider
  visual-engine/            Canvas renderer and isolated effect modules
  widgets/                  Planner, timeline, floating and styled widgets
src-tauri/
  capabilities/             Tauri v2 permissions
  src/                      Native Rust commands
.github/workflows/          Reproducible GitHub Release build
```

## Creating a Release

The `release.yml` workflow builds Windows installers and publishes them to GitHub Releases whenever a version tag is pushed:

```bash
git tag -a v0.1.0 -m "ChronoFlow 0.1.0"
git push origin v0.1.0
```

Keep the tag synchronized with `src-tauri/tauri.conf.json`. Release files are generated by GitHub Actions and should not be committed to Git.

## License

ChronoFlow is available under the [MIT License](./LICENSE).
