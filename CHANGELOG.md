# Changelog

All notable changes to ChronoFlow are documented here.

## [0.1.0] - 2026-07-06

### Added

- Independent Sessions workspace with timer, flow steps, checklists, notes, actions, pause/resume, and completion metrics.
- Reusable Session Templates that do not alter Planner or Schedule data.
- Planner Event Timeline with tracks, snapping, zoom, and typed events.
- Strict Quick Planner for deterministic local text-to-schedule parsing and editable validation preview.
- Developer Action registry for approved apps, files, folders, URLs, and guarded commands.
- Schedule EventTrack synchronized from today's Planner items.
- Completed-session Reports for focused time, project breakdown, and planned-versus-actual duration.
- Fantasy, maple forest, sakura, and galaxy themes.
- Canvas Visual Engine effects: aurora, electricity, fog, maple leaves, matrix, rain, sakura petals, snow, and stars.

### Changed

- Separated the Session timer from daily scheduling.
- Redesigned Schedule around a large EventTrack and compact vertical Today's Timeline.
- Expanded the schedule editor and made minute duration directly editable with a five-minute minimum.
- Standardized switches, buttons, layout spacing, surfaces, and theme-aware contrast.
- Clarified Templates and Reports in both UI and documentation.

### Optimized

- Added adaptive effect frame rate and render scale.
- Cached expensive aurora buffers, fog textures, and particle sprites.
- Replaced expensive particle paths with lighter drawing primitives where visuals remain equivalent.
- Paused or reduced rendering for hidden/unfocused windows.
- Disabled live widget backdrop blur while animated effects are active and compensated surface opacity.
- Split every effect into an isolated module for focused debugging and maintenance.

### Removed

- Legacy Companion, voice, wake-word, and Vosk production paths.
- Unused widget implementations and obsolete presentation assets.
- Report placeholders and non-functional settings.
- The obsolete action alias editor; legacy aliases remain readable for compatible stored data.

[0.1.0]: https://github.com/Enriah/ChronoFlow/releases/tag/v0.1.0
