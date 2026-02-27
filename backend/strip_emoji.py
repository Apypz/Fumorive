"""
Strip emoji from backend Python files that crash on Windows cp1252 console.
Replaces common emoji with ASCII equivalents in print/logger statements.
"""
import re
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

REPLACEMENTS = {
    '\u2705': '[OK]',
    '\u274c': '[ERR]',
    '\u26a0': '[WARN]',
    '\u26a0\ufe0f': '[WARN]',
    '\u2139\ufe0f': '[INFO]',
    '\u2139': '[INFO]',
    '\U0001f680': '[START]',
    '\U0001f6d1': '[STOP]',
    '\U0001f525': '[FIREBASE]',
    '\U0001f4dd': '[LOG]',
    '\U0001f310': '[WEB]',
    '\U0001f4ca': '[DATA]',
    '\U0001f4da': '[DOCS]',
    '\U0001f50c': '[WS]',
    '\U0001f527': '[REDIS]',
    '\U0001f510': '[AUTH]',
    '\U0001f4e4': '[SEND]',
    '\U0001f4e5': '[RECV]',
    '\U0001f4f9': '[CAM]',
    '\U0001f3ae': '[GAME]',
    '\U0001f9e0': '[BRAIN]',
    '\U0001f50d': '[SEARCH]',
    '\U0001f4cb': '[LIST]',
    '\U0001f516': '[TAG]',
    '\U0001f4f8': '[PHOTO]',
    '\U0001f4c8': '[CHART]',
    '\U0001f3c1': '[FLAG]',
    '\U0001f6a7': '[WIP]',
    '\U0001f4a1': '[TIP]',
    '\U0001f9ea': '[TEST]',
    '\u23f1\ufe0f': '[TIMER]',
    '\u23f1': '[TIMER]',
    '\u231b': '[WAIT]',
    '\u2b50': '[STAR]',
    '\u2764\ufe0f': '[HEART]',
    '\u2764': '[HEART]',
    '\u23e9': '[>>]',
    '\u23ea': '[<<]',
    '\u2728': '[NEW]',
    '\u2192': '->',
    '\u2190': '<-',
    '\u2714': '[OK]',
    '\u2716': '[X]',
    '\u270d\ufe0f': '[WRITE]',
    '\u270d': '[WRITE]',
    '\U0001f4af': '[100]',
    '\U0001f44d': '[OK]',
    '\U0001f44e': '[NO]',
    '\U0001f3c3': '[RUN]',
    '\U0001f6b6': '[WALK]',
    '\u2139': '[i]',
    '\U0001f5c4': '[ARCHIVE]',
    '\U0001f4c2': '[FOLDER]',
    '\U0001f4c1': '[DIR]',
    '\u2705\ufe0f': '[OK]',
    '\u274c\ufe0f': '[ERR]',
    # Box-drawing Unicode chars used as separators — keep as ASCII dashes
    '\u2500': '-',
    '\u2501': '-',
    '\u2502': '|',
    '\u2550': '=',
    '\u2551': '|',
    '\u256c': '+',
    '\u2554': '+',
    '\u2557': '+',
    '\u255a': '+',
    '\u255d': '+',
    '\u2560': '+',
    '\u2563': '+',
    '\u2566': '+',
    '\u2569': '+',
    '\u2550': '=',
    '\u2551': '|',
    '\u2588': '#',
    '\u25b6': '>',
    '\u25c0': '<',
    # Double-line box  
    '\u2552': '+',
    '\u2555': '+',
    '\u2558': '+',
    '\u255b': '+',
    '\u255e': '|',
    '\u2561': '|',
    '\u2564': '-',
    '\u2567': '-',
    '\u256a': '+',
    '\u256b': '+',
    '\u2591': ' ',
    '\u2592': '#',
    '\u2593': '#',
    '\u2562': '|',  
    '\u255f': '|',
    '\u2565': '-',
    '\u2568': '-',
    '\u256d': '+',
    '\u256e': '+',
    '\u256f': '+',
    '\u2570': '+',
    '\u2571': '/',
    '\u2572': '\\',
    '\u2573': 'X',
    '\u2574': '-',
    '\u2575': '|',
    '\u2576': '-',
    '\u2577': '|',
    '\u2578': '-',
    '\u2579': '|',
    '\u257a': '-',
    '\u257b': '|',
    '\u257c': '-',
    '\u257d': '|',
    '\u257e': '-',
    '\u257f': '|',
    '\u2580': '[',
    '\u2584': '_',
    '\u2590': ']',
    '\u2596': '.',
    '\u25E6': 'o',
    '\u25CF': '*',
    '\u25A0': '#',
    '\u25B2': '^',
    '\u25BC': 'v',
    # Variation selector
    '\ufe0f': '',
    # Leftwards/rightwards arrows
    '\u21e6': '<-',
    '\u21e8': '->',
    '\u2194': '<->',
    '\u2195': '^v',
    # Check + cross
    '\u2713': '[ok]',
    '\u2714': '[OK]',
    '\u2717': '[x]',
    '\u2718': '[X]',
    # Warning sign (non-emoji variant)
    '\u26a0': '[!]',
}

# Build a single regex that matches all keys (longest first)
sorted_keys = sorted(REPLACEMENTS.keys(), key=len, reverse=True)
pattern = re.compile('(' + '|'.join(re.escape(k) for k in sorted_keys) + ')')

def strip_line(line: str) -> str:
    return pattern.sub(lambda m: REPLACEMENTS[m.group(0)], line)

# Files that are executed at import/startup time — these MUST be fixed
CRITICAL_FILES = [
    r'c:\Users\User\Fumorive\backend\main.py',
    r'c:\Users\User\Fumorive\backend\app\core\redis.py',
    r'c:\Users\User\Fumorive\backend\app\core\cache.py',
    r'c:\Users\User\Fumorive\backend\app\core\firebase.py',
    r'c:\Users\User\Fumorive\backend\app\core\security.py',
    r'c:\Users\User\Fumorive\backend\app\core\security_headers.py',
    r'c:\Users\User\Fumorive\backend\app\api\dependencies.py',
    r'c:\Users\User\Fumorive\backend\app\api\routes\export.py',
    r'c:\Users\User\Fumorive\backend\app\api\routes\reporting.py',
    r'c:\Users\User\Fumorive\backend\app\db\init_db.py',
    r'c:\Users\User\Fumorive\backend\app\db\init_timescaledb.py',
    r'c:\Users\User\Fumorive\backend\load_test.py',
]

total_fixed = 0
for path in CRITICAL_FILES:
    if not os.path.exists(path):
        print(f'  SKIP (not found): {path}')
        continue
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    new_lines = [strip_line(l) for l in lines]
    changed = sum(1 for a, b in zip(lines, new_lines) if a != b)
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f'  FIXED {changed:3d} lines: {os.path.basename(path)}')
        total_fixed += changed
    else:
        print(f'  CLEAN             : {os.path.basename(path)}')

print(f'\nTotal lines fixed: {total_fixed}')
