# AKPromptpad

![Version](https://img.shields.io/badge/version-1.0.0-18181B?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11%20(x64)-2563EB?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Electron%20%7C%20React%20%7C%20TypeScript-3F3F46?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-15803D?style=flat-square)

**AKPromptpad** is an offline-first Windows desktop workspace for organizing, parametrizing, composing, and quickly copying AI prompts.

I built this tool to solve a recurring daily friction: digging through scattered Markdown notes and old chat threads just to reuse structured prompts. AKPromptpad keeps everything in a fast local library with `{{variable}}` templates, reusable prompt blocks, version history, and a global `Ctrl + Shift + Space` spotlight launcher.

---

## Highlights

- **Local-First & Zero Telemetry**: Runs 100% offline. Prompts, categories, reusable blocks, and version snapshots are stored locally in `%APPDATA%\AKPromptpad` using atomic file writes and automatic recovery backups.
- **Smart Template Variables (`{{var}}`)**: Automatically parses `{{variable_name}}` tokens (supports both English and Persian identifiers), renders form fields on the fly, previews the compiled output live, and copies the result without mutating the base template.
- **Deterministic Prompt Composer**: Assemble complex prompts from modular blocks (*Role*, *Objective*, *Context*, *Requirements*, *Constraints*, *Output Format*, *Quality Criteria*, *Additional Instructions*) with custom ordering.
- **Global Quick Launcher (`Ctrl + Shift + Space`)**: Summon a lightweight, frameless search bar from anywhere in Windows, filter prompts by keyword or tag, hit `Enter` to copy to clipboard, and get right back to work.
- **Version History & Duplicate Guard**: Tracks up to 10 previous versions per prompt on meaningful edits with one-click rollback, and warns before saving or importing exact duplicates.
- **Bilingual RTL/LTR & Neutral UI**: Native right-to-left (Persian) and left-to-right (English) layouts with `unicode-bidi: plaintext` support for mixed-script prompts, Light/Dark/System themes, Windows accent color sync, and Compact/Comfortable density modes.

---

## Architecture & Tech Stack

```text
AKPromptpad/
├── .github/workflows/ci.yml   # Windows CI pipeline (typecheck, Vitest, bundle build)
├── build/                     # Multi-resolution Windows .ico, .png, and .svg icons
├── src/
│   ├── main/
│   │   ├── index.ts           # Electron main process, window lifecycle, globalShortcut, IPC handlers
│   │   └── storage.ts         # Atomic JSON storage engine, backup rotation, import/export
│   ├── preload/
│   │   └── index.ts           # Strictly typed contextBridge API (window.akpromptpad)
│   ├── renderer/
│   │   ├── components/        # Modular React views (Sidebar, Inspector, Composer, Launcher, Settings)
│   │   ├── i18n/              # Bilingual fa/en dictionary
│   │   ├── styles/            # CSS custom properties & design tokens
│   │   └── utils/             # Live theme, contrast, and RTL/LTR DOM synchronization
│   └── shared/                # Pure TypeScript domain logic (variables, composer, history, validation)
└── tests/
    └── core.test.ts           # Unit & storage integration test suite (Vitest)
```

### Security Model
- `nodeIntegration: false` and `contextIsolation: true` across all windows.
- Renderer communicates with the main process strictly through validated IPC channels exposed via `contextBridge`.
- Clipboard access is write-only on explicit user action (never monitors or reads system clipboard in the background).
- Template compilation uses a single-pass token parser—prompt content is never passed to `eval` or `Function`.

---

## Getting Started (Windows PowerShell)

### Prerequisites
- **Windows 10 / 11 (x64)**
- **Node.js 18.18+** (or Node 20 LTS)

### 1. Install Dependencies
```powershell
git clone https://github.com/<your-username>/AKPromptpad.git
cd AKPromptpad
npm install
```

### 2. Run in Development Mode
```powershell
npm run dev
```

### 3. Run Unit & Storage Tests
```powershell
npm run test
npm run typecheck
```

### 4. Build the Windows x64 Installer (`.exe`)
```powershell
npm run dist
```
This compiles the main, preload, and renderer bundles via `electron-vite` and packages the NSIS installer at:
- **Installer**: `release\AKPromptpad Setup 1.0.0.exe`
- **Unpacked App**: `release\win-unpacked\AKPromptpad.exe`

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Shift + Space` | Toggle global Quick Launcher (customizable in Settings) |
| `Ctrl + N` | Create a new prompt |
| `Ctrl + K` | Focus global search bar |
| `Ctrl + S` | Save changes in the prompt editor |
| `Ctrl + Enter` | Copy active or variable-compiled prompt |
| `↑` / `↓` / `Enter` | Navigate and copy from Quick Launcher |
| `Escape` | Close active dialog, drawer, or Quick Launcher |

---

## Data Storage & Backups

User data is stored locally in:
```text
%APPDATA%\AKPromptpad\akpromptpad-data.json
```
Automatic pre-import and manual backups are stored in `%APPDATA%\AKPromptpad\backups\`. Uninstalling the application does **not** delete your `%APPDATA%\AKPromptpad` directory (`deleteAppDataOnUninstall: false`), ensuring upgrades never wipe your library.

---

## License

Released under the [MIT License](./LICENSE).
