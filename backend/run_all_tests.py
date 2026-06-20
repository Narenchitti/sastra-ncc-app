import subprocess
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

test_scripts = [
    "verify_models.py",
    "verify_auth_flow.py",
    "verify_events_flow.py",
    "verify_permissions_flow.py",
    "verify_attendance.py",
    "verify_query_agent.py",
    "verify_scheduler_agent.py",
    "verify_scheduler_audit.py",
    "verify_calendar_upload.py",
    "verify_telemetry.py"
]

print("==================================================")
print("   SASTRA NCC APPLICATION SYSTEM VERIFICATION    ")
print("==================================================")

python_exe = sys.executable or "python"
results = {}

for script in test_scripts:
    print(f"[RUN] Running {script}...")
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.run([python_exe, script], capture_output=True, text=True, env=env, encoding="utf-8")
    if proc.returncode == 0:
        print(f"[PASS] {script} succeeded.\n")
        results[script] = "PASS"
    else:
        print(f"[FAIL] {script} failed with exit code {proc.returncode}.")
        print("--- Stdout ---")
        print(proc.stdout)
        print("--- Stderr ---")
        print(proc.stderr)
        print("\n")
        results[script] = "FAIL"

print("==================================================")
print("               VERIFICATION SUMMARY               ")
print("==================================================")
all_pass = True
for script, status in results.items():
    print(f"| {script:<30} | {status:<6} |")
    if status != "PASS":
        all_pass = False

print("==================================================")
if all_pass:
    print("  ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ")
    sys.exit(0)
else:
    print("  SOME VERIFICATION TESTS FAILED. PLEASE DEBUG. ")
    sys.exit(1)
