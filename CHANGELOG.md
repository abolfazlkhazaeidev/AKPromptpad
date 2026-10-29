# Changelog

All notable changes to **AKPromptpad** are documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-29

### Added
- **Windows x64 Installer**: Configured `electron-builder` NSIS installer (`AKPromptpad Setup 1.0.0.exe`) with custom directory selection and non-destructive uninstall (`deleteAppDataOnUninstall: false`).
- **Data Portability & Conflict Resolution**: Added full and filtered JSON export, per-prompt Markdown export, schema-validated JSON import with duplicate conflict resolution (`skip`, `copy`, `overwrite`), and pre-import safety backups.
- **Bilingual RTL/LTR Interface**: Complete Persian (`fa`, RTL) and English (`en`, LTR) localization with `unicode-bidi: plaintext` handling for mixed-direction prompt templates.
- **Appearance & Accessibility**: Added System, Light, and Dark themes, Windows system accent color synchronization, custom color picker, Compact/Comfortable density toggle, and reduced-motion support.

### Changed
- Hardened `BrowserWindow` navigation guards and restricted `contextBridge` surface area in `src/preload/index.ts`.
- Improved atomic write temp-file naming in `StorageManager` using PID + timestamp to avoid lock collisions on Windows NTFS.

## [0.3.0] - 2026-10-25

### Added
- **Global Quick Launcher (`Ctrl+Shift+Space`)**: Floating frameless search window (`#launcher`) with keyboard navigation, instant copy-on-Enter, and custom accelerator registration in Settings.
- **Prompt Composer**: Deterministic prompt assembly workspace supporting reusable blocks (`role`, `objective`, `context`, `requirements`, `constraints`, `output_format`, `quality_criteria`, `additional_instructions`).
- **Version History**: Automatic per-prompt version snapshots on meaningful content edits (configurable limit, default 10) with one-click version rollback.

## [0.2.0] - 2026-10-20

### Added
- **Smart Variable Builder**: Safe regex parser for `{{variable_name}}` placeholders (supporting ASCII and Persian identifiers) with live preview compilation and multiline field heuristics.
- **Exact Duplicate Detection**: Normalizes line endings and whitespace to warn before saving or importing duplicate prompts.
- **React Workspace UI**: Sidebar navigation, category management, tag filtering, Grid/List view toggle, and right-hand inspector drawer.

## [0.1.0] - 2026-10-15

### Added
- Initial `electron-vite` + TypeScript + React 18 project structure.
- Local JSON storage engine (`StorageManager`) in Electron `userData` with automatic backup recovery on malformed files.
- Core data models and Vitest test suite.
