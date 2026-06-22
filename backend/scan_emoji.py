"""Find all lines containing emoji in backend Python files, write paths to fix_emoji.txt"""
import os
import re
import sys

# Force utf-8 output
sys.stdout.reconfigure(encoding='utf-8')

emoji_pattern = re.compile(
    '[\U00002700-\U000027BF'
    '\U0001F600-\U0001F64F'
    '\U0001F300-\U0001F5FF'
    '\U0001F680-\U0001F6FF'
    '\U0001F1E0-\U0001F1FF'
    '\u2600-\u26FF'
    '\u2702-\u27B0'
    '\u24C2-\uFE0F'
    '\u23E9-\u23F3'
    '\u231A-\u231B'
    '\u2B50\u2B55'
    '\uFE0F'
    ']+',
    flags=re.UNICODE,
)

BACKEND = r'c:\Users\User\Fumorive\backend'

files_to_check = []
for dirpath, dirnames, filenames in os.walk(BACKEND):
    dirnames[:] = [d for d in dirnames if d not in ('__pycache__', 'venv', '.git', 'htmlcov')]
    for fn in filenames:
        if fn.endswith('.py'):
            files_to_check.append(os.path.join(dirpath, fn))

hits = {}  # path -> list of (lineno, line)
for path in files_to_check:
    with open(path, encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    matched = [(i+1, l.rstrip()) for i, l in enumerate(lines) if emoji_pattern.search(l)]
    if matched:
        hits[path] = matched

print(f"Files with emoji: {len(hits)}")
for path, lines in hits.items():
    rel = path.replace(BACKEND + os.sep, '')
    print(f"\n  {rel}:")
    for lineno, text in lines:
        print(f"    L{lineno}: {text[:100]}")
