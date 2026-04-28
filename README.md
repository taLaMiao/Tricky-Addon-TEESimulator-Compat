# Tricky Addon - Update Target List (TEESimulator-compat fork)

A fork of [KOWX712/Tricky-Addon-Update-Target-List](https://github.com/KOWX712/Tricky-Addon-Update-Target-List) patched to run **standalone with [TEESimulator](https://github.com/JingMatrix/TEESimulator)** — no Tricky Store dependency required.

## Why this fork?

The upstream KOWX712 module is a KSU/APatch/Magisk WebUI for configuring `/data/adb/tricky_store/` (target.txt, keybox.xml, security_patch.txt). However, it requires the original Tricky Store module to be installed and active — its `post-fs-data.sh` self-uninstalls when it doesn't find Tricky Store.

[TEESimulator](https://github.com/JingMatrix/TEESimulator) by JingMatrix is a stronger alternative to Tricky Store that **shares the exact same config path** (`/data/adb/tricky_store/`). You shouldn't need to keep a disabled Tricky Store module around just to satisfy a check.

This fork patches the dependency check so the module runs cleanly with TEESimulator alone.

## Patches applied to upstream

| File | Change |
|---|---|
| `module/customize.sh` | Detects TEESimulator as a valid backend; warns instead of aborts when neither is present |
| `module/post-fs-data.sh` | Skips self-uninstall when TEESimulator (or `/data/adb/tricky_store/` config dir) is detected |
| `module/service.sh` | Skips Tricky Store symlinks when TS missing; keeps `module.prop` visible so users can launch the WebUI from the module's own KSU manager entry |
| `module/module.prop` | New module ID `TA_utl_tee` to avoid collision with upstream `TA_utl` |
| `module/common/get_extra.sh` | Falls back to writing TEESimulator's `security_patch.txt` directly when Tricky Store's `module.prop` is absent |
| `webui/vite.config.js` | Build output redirected to `module/webroot/` (so KSU manager auto-detects the WebUI) |

## Install

1. Download the latest zip from [Releases](../../releases/latest):
   `TrickyAddon-TEESimulator-Compat-vX.Y.Z-N.zip`
2. Make sure **TEESimulator** is already installed (Magisk/KSU/APatch module).
3. Flash this zip via your root manager.
4. Reboot.
5. Open KSU/APatch manager → Modules → "Tricky Addon (TEESimulator-compat fork)" → tap "Open WebUI".

## Requirements

- Android 10+
- KernelSU/KernelSU-Next versionCode ≥ 32234, OR APatch versionCode ≥ 11159, OR Magisk
- TEESimulator (recommended) or Tricky Store installed as backend

## Usage

The WebUI manages three files in `/data/adb/tricky_store/` that TEESimulator reads live:

- `target.txt` — apps to apply key attestation simulation to (with `!`/`?`/auto mode suffix)
- `keybox.xml` — hardware-backed keybox for cert chain (import via UI)
- `security_patch.txt` — security patch level overrides (per-app supported)

TEESimulator detects file changes via inotify and reloads instantly — no reboot needed after config changes.

## Auto-sync from upstream

This repo runs a daily GitHub Actions workflow (`.github/workflows/sync-upstream.yml`) that:
1. Fetches changes from KOWX712's main branch
2. Attempts a clean three-way merge (preserves our patches via git semantics)
3. Pushes if clean, or opens a PR for manual resolution if conflicts

## Auto-build releases

Every push to `main` triggers `.github/workflows/build.yml`:
1. Installs pnpm 10.28.2 + Node 22
2. Builds the WebUI bundle
3. Packages the module zip
4. Uploads as a build artifact AND creates/updates the `latest` rolling pre-release

Tag a manual release for stable builds.

## License

GPL-3.0 (inherited from upstream KOWX712/Tricky-Addon-Update-Target-List)

## Credits

- Upstream: [KOWX712](https://github.com/KOWX712) and the 30+ contributors of the original Tricky-Addon-Update-Target-List
- TEESimulator: [JingMatrix](https://github.com/JingMatrix)
- Patch maintainer: this fork
