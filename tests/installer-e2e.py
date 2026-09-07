"""Opt-in Windows installer E2E. Installs/upgrades Bou for the current user.

pip install pywinauto psutil
python tests/installer-e2e.py --installer ../windows/Bou-Install.exe --install
Uses an isolated app profile; never removes the installed application/user data.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import winreg
import psutil
from pywinauto import Application
from pywinauto.timings import wait_until

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--installer", required=True)
parser.add_argument("--install", action="store_true", help="Allow actual per-user installation/update")
args = parser.parse_args()
if not args.install:
    parser.error("This test requires explicit --install; it updates the current user's installation.")

root = Path(tempfile.mkdtemp(prefix="bou-installer-e2e-"))
env = os.environ.copy()
env.update(BOU_DESKTOP_TEST="1", BOU_TEST_PROFILE=str(root / "profile"))
user_data = Path(os.environ["APPDATA"]) / "BouTime"


def fingerprints():
    return {str(p.relative_to(user_data)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in user_data.rglob("*") if p.is_file()}


before = fingerprints()
process = subprocess.Popen([str(Path(args.installer).resolve())], env=env)
app = Application(backend="uia").connect(process=process.pid, timeout=20)
window = app.window(title="בואו · התקנה")
window.wait("visible", timeout=20)
status = window.child_window(auto_id="Status")
primary = window.child_window(auto_id="InstallButton")
secondary = window.child_window(auto_id="CancelButton")
try:
    assert status.window_text() == "מוכנים כשנוח לך"
    primary.invoke()
    wait_until(60, 0.1, lambda: "מורידים את בואו" in status.window_text())
    secondary.invoke()
    wait_until(20, 0.2, lambda: status.window_text() == "ההורדה בוטלה")
    assert primary.is_enabled()
    print("PASS: real GitHub download cancelled safely", flush=True)
    primary.invoke()
    deadline = time.monotonic() + 360
    last_status = None
    while time.monotonic() < deadline:
        current = status.window_text()
        if current != last_status:
            print(json.dumps({"status": current}, ensure_ascii=True), flush=True)
            last_status = current
        if current == "ההתקנה הושלמה בהצלחה":
            break
        if current == "לא הצלחנו להשלים את ההתקנה":
            raise AssertionError(window.child_window(auto_id="Detail").window_text())
        # This is a bounded progress-observation loop, not UI synchronization.
        process.poll()
        if process.returncode is not None:
            raise AssertionError("Installer closed before completion")
        time.sleep(0.5)
    else:
        raise AssertionError("Installation timed out")
    window.set_focus()
    app.wait_cpu_usage_lower(threshold=3, timeout=15)
    window.capture_as_image().save(str(root / "success.png"))
    assert before == fingerprints(), "Existing user profile changed during installation"
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\3ead69c5-dfef-56f1-9730-ce3cff6c6279") as key:
        directory = Path(winreg.QueryValueEx(key, "InstallLocation")[0])
    executable = directory / "Bou Time.exe"
    assert executable.is_file()
    previous_ids = set(psutil.pids())
    primary.invoke()
    process.wait(timeout=20)

    def launched():
        for candidate in psutil.process_iter(["pid", "exe"]):
            if candidate.pid not in previous_ids and candidate.info["exe"] and Path(candidate.info["exe"]) == executable:
                return candidate.pid
        return None

    wait_until(30, 0.2, lambda: launched() is not None)
    application = Application(backend="uia").connect(process=launched(), timeout=20)
    main = application.window(title_re=".*בואו.*")
    main.wait("visible", timeout=30)
    main.close()
    assert before == fingerprints(), "Opening with an isolated profile changed user data"
    print(json.dumps({"passed": ["download", "cancel", "retry", "sha256", "per-user install", "existing data unchanged", "open app"], "artifacts": str(root)}, ensure_ascii=True), flush=True)
except Exception:
    if process.poll() is None:
        try:
            window.set_focus()
            window.capture_as_image().save(str(root / "failure.png"))
            window.close()
        except Exception:
            pass
    print("Failure artifacts: " + str(root), flush=True)
    raise
