
import os
import sys
import json
sys.path.append(os.getcwd())
from extrator_videos import credential_manager

# Create a temporary accounts.json for testing
test_accounts = {
    "test.com": {"email": "specific@test.com", "password": "specific_password"},
    "hub.la": {"email": "hub_user@hub.la", "password": "hub_password"}
}

with open("accounts.json", "w") as f:
    json.dump(test_accounts, f)

print("Created temporary accounts.json")

# Test 1: Specific domain
e, p = credential_manager.get_credentials("https://test.com/video")
print(f"Test 1 (Exact): {e} / {p} -> {'PASS' if e == 'specific@test.com' else 'FAIL'}")

# Test 2: Subdomain matching
e, p = credential_manager.get_credentials("https://app.hub.la/video")
print(f"Test 2 (Subdomain): {e} / {p} -> {'PASS' if e == 'hub_user@hub.la' else 'FAIL'}")

# Test 3: Fallback
e, p = credential_manager.get_credentials("https://other.com/video", "default@env", "default_pass")
print(f"Test 3 (Fallback): {e} / {p} -> {'PASS' if e == 'default@env' else 'FAIL'}")

# Cleanup
if os.path.exists("accounts.json"):
    os.remove("accounts.json")
    print("Cleaned up accounts.json")
