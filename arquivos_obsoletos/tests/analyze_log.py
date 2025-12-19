
import json
import os
import sys

# Find the latest log file in logs/app.hub.la
BASE_DIR = "logs/app.hub.la"

def find_latest_log():
    latest_file = None
    latest_time = 0
    for root, dirs, files in os.walk(BASE_DIR):
        for f in files:
            if f.endswith(".json"):
                path = os.path.join(root, f)
                mtime = os.path.getmtime(path)
                if mtime > latest_time:
                    latest_time = mtime
                    latest_file = path
    return latest_file

def analyze():
    fpath = find_latest_log()
    if not fpath:
        print("No log file found.")
        return

    print(f"Analyzing: {fpath}")
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        print(f"Run ID: {data.get('run_id')}")
        print(f"Status: {data.get('status')}") # Might not be top level
        
        # Check summary steps
        summary = data.get("summary", {})
        print("Summary keys:", summary.keys())
        
        if "by_category" in summary:
            print("Steps:", json.dumps(summary["by_category"], indent=2))
            
        if "checks" in summary:
             print("Checks:", json.dumps(summary["checks"], indent=2))
             
        # Check for errors in steps
        steps = data.get("steps", [])
        for s in steps:
            if s.get("status") == "erro" or s.get("erro"):
                print(f"STEP ERROR: {s['descricao']}")
                print(f"Error details: {s.get('erro')}")
                print(f"Details: {s.get('detalhes')}")
            
            # Print ingest details specifically
            if s.get("categoria") == "ingest":
                print(f"--- INGEST STEP ---")
                print(f"Status: {s.get('status')}")
                print(f"Details: {json.dumps(s.get('detalhes'), indent=2)}")
                print(f"Output: {s.get('output')}") # Sometimes output has file paths

        if "checks" in summary:
             print("Checks:", json.dumps(summary["checks"], indent=2))
             
        # Check LLM output if present
        if "llm_response" in data:
            print("LLM Response keys:", data["llm_response"].keys())
            
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        # Print raw tail if JSON is broken
        with open(fpath, "r", encoding="utf-8") as f:
            print("Raw tail:")
            print(f.read()[-500:])

if __name__ == "__main__":
    analyze()
