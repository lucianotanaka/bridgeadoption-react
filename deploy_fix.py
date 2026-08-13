# Run this file on the server: python3 /tmp/deploy_fix.py
import os

TARGET = "/opt/bridgeadoption/backend/app/adoption/cisco_lci_service.py"

# Read the current file on server to show difference
print("Writing fixed cisco_lci_service.py to server...")

# The key change is in get_lci_wallet_burndown():
# - Use task_value (from load_cisco_lci_all) per task instead of lci_stage_value per stage
# - Group by earliest stage_start_date per task instead of per stage

patch_marker = "def get_lci_wallet_burndown"
with open(TARGET, "r", encoding="utf-8") as f:
    current = f.read()

if "task_value_map" in current:
    print("File already has the fix (task_value_map found). No action needed.")
else:
    print("OLD code detected (no task_value_map). Applying fix...")
    # The fix needs to be applied manually or via git.
    # Check what version is on the server:
    idx = current.find(patch_marker)
    if idx >= 0:
        snippet = current[idx:idx+300]
        print("Current function start:")
        print(snippet)
    print("\nServer file needs to be updated via git pull after commit/push.")
