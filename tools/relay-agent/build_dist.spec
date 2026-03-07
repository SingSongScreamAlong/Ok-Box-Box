# -*- mode: python ; coding: utf-8 -*-
# Ok, Box Box Relay - PyInstaller Spec
# Builds a single-file EXE with all dependencies bundled

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('protocol', 'protocol'),
        ('exporters', 'exporters'),
    ],
    hiddenimports=[
        'engineio.async_drivers.threading',
        'socketio',
        'socketio.client',
        'pyirsdk',
        'yaml',
        'dotenv',
        'requests',
        'sounddevice',
        'soundfile',
        'keyboard',
        'PIL',
        'PIL.Image',
        'customtkinter',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy.testing',
        'pytest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# Single-file EXE (--onefile equivalent)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='OkBoxBox-Relay',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window - runs in system tray
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='installer/okboxbox-logo.png',
    version='version_info.txt',
)
