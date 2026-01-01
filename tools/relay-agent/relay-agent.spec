import sys
from PyInstaller.utils.hooks import collect_submodules, collect_all

block_cipher = None

# Collect all cv2 data/binaries
tmp_binaries, tmp_datas, tmp_hiddenimports = collect_all('cv2')

# Hidden imports needed for socketio and engineio
hidden_imports = [
    'engineio.async_drivers.threading',
    'socketio.async_drivers.threading',
    'dns', 'dns.asyncbackend', 'dns.asyncquery', 'dns.asyncresolver', # dnspython often needs explicit help
    'pydantic',
    'pydantic.deprecated.decorator',
    'cv2',
    'numpy'
]

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=tmp_binaries,
    datas=tmp_datas,
    hiddenimports=hidden_imports + tmp_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='relay-agent',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='relay-agent',
)
