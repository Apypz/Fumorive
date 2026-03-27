import zipfile
import os
import shutil

src = r'C:\Users\User\Fumorive\eeg-processing'
dest = r'C:\Users\User\Fumorive\fumorive-eeg-server.zip'

# Files to include
root_files = [
    'main.py', 'server.py', 'config.py', 'utils.py',
    'check_stream.py', 'requirements.txt', 'start_eeg.bat',
    'setup_venv.ps1', 'activate.ps1', 'PANDUAN_SETUP.pdf'
]

eeg_files = ['__init__.py', 'acquisition.py', 'analysis.py', 'features.py', 'preprocessing.py']

prefix = 'fumorive-eeg-server/'

if os.path.exists(dest):
    os.remove(dest)

with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as zf:
    for f in root_files:
        path = os.path.join(src, f)
        if os.path.exists(path):
            zf.write(path, prefix + f)
            print(f'  + {f}')
        else:
            print(f'  ! SKIP (not found): {f}')
    
    for f in eeg_files:
        path = os.path.join(src, 'eeg', f)
        if os.path.exists(path):
            zf.write(path, prefix + 'eeg/' + f)
            print(f'  + eeg/{f}')

size_kb = round(os.path.getsize(dest) / 1024, 1)
print(f'\nSUCCESS! ZIP created: {dest}')
print(f'Size: {size_kb} KB')
print(f'\nContents:')
with zipfile.ZipFile(dest, 'r') as zf:
    for name in zf.namelist():
        print(f'  {name}')
