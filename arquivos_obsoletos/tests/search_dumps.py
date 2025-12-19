
import os
import glob

LOG_DIR = "logs/screenshots"

def search_dumps():
    files = glob.glob(os.path.join(LOG_DIR, "*.html"))
    print(f"Searching {len(files)} files...")
    
    for fpath in files:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            
            if "<iframe" in content.lower():
                import re
                srcs = re.findall(r'src=["\']([^"\']+)["\']', content)
                for s in srcs:
                    print(f"IFRAME SRC in {os.path.basename(fpath)}: {s}")
                
        except Exception as e:
            print(f"Error reading {fpath}: {e}")

if __name__ == "__main__":
    search_dumps()
