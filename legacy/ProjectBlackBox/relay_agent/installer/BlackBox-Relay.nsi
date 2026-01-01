; =====================================================================
; BlackBox Relay Agent - NSIS Installer Script
; Creates professional Windows installer
; =====================================================================

!include "MUI2.nsh"
!include "FileFunc.nsh"

; General
Name "BlackBox Relay Agent"
OutFile "BlackBox-Relay-Setup.exe"
InstallDir "$PROGRAMFILES\BlackBox\Relay Agent"
InstallDirRegKey HKLM "Software\BlackBox\Relay" "Install_Dir"
RequestExecutionLevel admin

; Version info
!define VERSION "1.0.0"
!define PUBLISHER "ProjectBlackBox"
!define WEBSITE "https://projectblackbox.ai"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "BlackBox Relay Agent"
VIAddVersionKey "CompanyName" "${PUBLISHER}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileDescription" "iRacing Telemetry Relay and AI Coach"
VIAddVersionKey "LegalCopyright" "© 2025 ${PUBLISHER}"

; Interface settings
!define MUI_ABORTWARNING
!define MUI_ICON "controlbox.ico" ; Using existing icon file
!define MUI_UNICON "controlbox.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\..\LICENSE" ; Assuming license at root, adjust if needed
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\BlackBox-Relay.exe"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installation Section
Section "Install"
    SetOutPath $INSTDIR
    
    ; Main executable from PyInstaller dist
    File /r "..\dist\BlackBox-Relay\*.*"
    
    ; Create default config if not exists
    IfFileExists "$INSTDIR\config.py" +2
    File "..\config.py"
    
    ; Create Start Menu shortcuts
    CreateDirectory "$SMPROGRAMS\BlackBox"
    CreateShortcut "$SMPROGRAMS\BlackBox\BlackBox Relay.lnk" "$INSTDIR\BlackBox-Relay.exe"
    CreateShortcut "$SMPROGRAMS\BlackBox\Configure PTT.lnk" "$INSTDIR\BlackBox-Relay.exe" "--configure-ptt" ; Requires main.py to handle this arg or use separate exe
    ; Actually, let's just point to main exe for now, or if bind_ptt was bundled separately.
    ; Since spec file bundled everything into one dir but 'main' is the entry, 
    ; we might need 'bind_ptt.exe' if we froze it separately.
    ; For simplicity in this iteration, we assume main.py handles everything or user runs CLI.
    
    CreateShortcut "$SMPROGRAMS\BlackBox\Uninstall Relay.lnk" "$INSTDIR\Uninstall.exe"
    
    ; Create Desktop shortcut
    CreateShortcut "$DESKTOP\BlackBox Relay.lnk" "$INSTDIR\BlackBox-Relay.exe"
    
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    
    ; Write registry keys
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BlackBoxRelay" "DisplayName" "BlackBox Relay Agent"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BlackBoxRelay" "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BlackBoxRelay" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BlackBoxRelay" "DisplayIcon" "$INSTDIR\BlackBox-Relay.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BlackBoxRelay" "Publisher" "${PUBLISHER}"
    
    ; Save install directory
    WriteRegStr HKLM "Software\BlackBox\Relay" "Install_Dir" "$INSTDIR"
SectionEnd

; Uninstaller Section
Section "Uninstall"
    ; Remove files (careful with recursive delete)
    RMDir /r "$INSTDIR"
    
    ; Remove shortcuts
    Delete "$SMPROGRAMS\BlackBox\BlackBox Relay.lnk"
    Delete "$SMPROGRAMS\BlackBox\Configure PTT.lnk"
    Delete "$SMPROGRAMS\BlackBox\Uninstall Relay.lnk"
    RMDir "$SMPROGRAMS\BlackBox"
    Delete "$DESKTOP\BlackBox Relay.lnk"
    
    ; Remove registry keys
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BlackBoxRelay"
    DeleteRegKey HKLM "Software\BlackBox\Relay"
SectionEnd
