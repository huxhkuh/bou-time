"""Read unique physical RAM for only the explicitly supplied QA process IDs."""
import json
import sys
import psutil

rows = []
for pid in map(int, sys.argv[1:]):
    try:
        process = psutil.Process(pid)
        memory = process.memory_full_info()
        rows.append({"pid": pid, "uss": memory.uss, "rss": memory.rss})
    except psutil.NoSuchProcess:
        pass
print(json.dumps(rows))
