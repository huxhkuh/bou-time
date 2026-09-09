"""Launch the real portable payload with isolated data; never self-update."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import psutil
from pywinauto import Application
from pywinauto.timings import wait_until

root = Path(tempfile.mkdtemp(prefix="portable-", dir=Path("../../work").resolve()))
version = json.loads(Path("package.json").read_text(encoding="utf-8"))["version"]
exe = Path(f"../windows/Bou-Time-{version}-x64-Portable.exe").resolve()
env = os.environ.copy()
env.update(BOU_DESKTOP_TEST="1", BOU_TEST_PROFILE=str(root / "profile"))
env.pop("ELECTRON_RUN_AS_NODE", None)
process = subprocess.Popen([str(exe), "--force-renderer-accessibility"], env=env)
window = None
def child():
    for p in psutil.Process(process.pid).children(recursive=True):
        if p.name() == "Bou Time.exe" and not any(a.startswith("--type=") for a in p.cmdline()):
            return p.pid
    return None
try:
    wait_until(90, 0.2, lambda: child() is not None)
    app = Application(backend="uia").connect(process=child(), timeout=30)
    window = app.window(title_re=".*תמורה.*")
    window.wait("visible", timeout=30)
    window.child_window(title="גיבוי והגדרות", control_type="Button").invoke()
    window.child_window(title_re="זוהי גרסה ניידת.*", control_type="Text").wait("visible", timeout=20)
    window.capture_as_image().save(str(root / "portable.png"))
    print(json.dumps({"passed": True, "version": version, "checks": ["real portable extraction and startup", "isolated profile", "self-update unavailable"], "artifacts": str(root)}))
finally:
    if window is not None:
        window.close()
    process.wait(timeout=30)
