# Publishing a Windows release

Requires Windows 10/11 x64, Node.js 22.12+ (or a supported newer version), npm, Git, and GitHub CLI authenticated with permission to publish releases to `huxhkuh/bou-time`. The bootstrapper uses the .NET Framework compiler bundled with Windows. No signing certificate is configured.

1. Update `version` in `package.json` and run `npm install --package-lock-only`.
2. Run `npm ci`, `npm test`, `npm run build`, `npm run test:desktop:compact`, and `powershell -ExecutionPolicy Bypass -File scripts/test-installer.ps1`.
3. Run `npm run build:windows`. Artifacts are written to `../windows`.
4. Run `powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1`, then `powershell -ExecutionPolicy Bypass -File scripts/prepare-release.ps1`.
5. Review source and `git diff`, run `npm audit`, commit, push, and create the matching `vX.Y.Z` tag. Do not publish personal data, backups, test profiles, `.env` files or credentials.
6. Create a **draft release** for that tag, attaching these five assets together: `Bou-Install.exe`, `Bou-Time-X.Y.Z-x64-Setup.exe`, `Bou-Time-X.Y.Z-x64-Portable.exe`, `windows-release.json`, and `SHA256SUMS.txt`. Review the manifest version, URL, size and SHA-256 against the actual setup file.
7. Publish the draft as the latest stable release only after all uploads succeed. Test the small installer against that public release. Never replace a versioned payload after publishing; issue a new version instead.

The small installer always requests the [latest release asset](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases), validates the manifest and payload hash, then runs the [NSIS installer](https://www.electron.build/nsis/) with `/S /currentuser`. The payload is installed into `%LOCALAPPDATA%\Programs\Bou Time`, or an existing per-user install location from Windows' uninstall registry. No elevation is requested. Application data stays under `%APPDATA%\BouTime`; uninstall does not delete it.

The checksum protects against a truncated or altered payload. It is **not a digital publisher signature**; the manifest and asset share the GitHub account trust boundary. Protect repository access. The current binaries are unsigned, so Windows may show an unknown publisher warning. Do not disable Windows security settings.

Download cancellation cleans up the temporary payload. Installation itself cannot be cancelled mid-write. Re-running the bootstrapper installs the latest version; there is no automatic background updater. The full setup asset is the offline fallback. Windows ARM and Windows versions older than 10 are not validated.

The graphical bootstrapper targets .NET Framework 4.x APIs available on supported Windows 10/11; [.NET Framework 4.8 is included with modern Windows](https://learn.microsoft.com/en-us/dotnet/framework/install/on-server-2019). No .NET SDK is required by end users.
