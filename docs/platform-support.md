# Platform Support Checklist

## Shared Core
- Single API server lives in `src/core/server/index.js`; keep this as the only backend entry point.
- Browser pool configuration (`config/index.js -> browserPool`) feeds all environments.
- Snapshots and exports share storage via `output/snapshots` and `output/exports`.

## macOS & Windows Packaging Steps
- Install dependencies: `npm install`.
- Build frontend bundle: `npm run build:frontend`.
- Package Electron app: `npm run build:electron` (uses electron-builder targets).
- macOS artifact: `dist/mac/*`.
- Windows artifact: `dist/win-unpacked/` and corresponding installer.

## Platform Adapters
- UI chrome handled by Electron shell (`electron/main.js`), no OS-specific APIs required.
- Server control module checks availability of core server before loading macOS helper scripts.
- Avoid hardcoded platform strings in menus/dialogs; rely on `process.platform` checks.

## Verification
- Run diagnostics: `npm run diagnose` (ensures ports/assets ready).
- Launch Electron app via `npm run start:electron`.
- Execute a sample comparison to confirm snapshot export works (`/api/export/snapshots`).
- On Windows, confirm exported bundles appear under `%USERPROFILE%\AppData\Roaming\compare/snapshots` if using default storage.

