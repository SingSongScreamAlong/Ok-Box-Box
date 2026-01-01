; =====================================================================
; Ok, Box Box Relay Agent - NSIS Installer Script
; Creates professional Windows installer with auto-update support
; =====================================================================

!include "MUI2.nsh"
!include "FileFunc.nsh"

; General
Name "Ok, Box Box Relay"
OutFile "OkBoxBox-Relay-Setup.exe"
InstallDir "$PROGRAMFILES\Ok Box Box\Relay"
InstallDirRegKey HKLM "Software\OkBoxBox\Relay" "Install_Dir"
RequestExecutionLevel admin

; Version info
!define VERSION "1.0.0"
!define PUBLISHER "Ok, Box Box"
!define WEBSITE "https://okboxbox.com"
!define UPDATE_URL "https://okboxbox.com/api/relay/version"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "Ok, Box Box Relay"
VIAddVersionKey "CompanyName" "${PUBLISHER}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileDescription" "iRacing Telemetry Relay for Ok, Box Box - BlackBox/ControlBox/RaceBox"
VIAddVersionKey "LegalCopyright" "© 2024-2026 ${PUBLISHER}"

; Interface settings
!define MUI_ABORTWARNING
!define MUI_ICON "okboxbox.ico"
!define MUI_UNICON "okboxbox.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "installer-banner.bmp"

; Header text
!define MUI_WELCOMEPAGE_TITLE "Welcome to Ok, Box Box Relay Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will install the Ok, Box Box Relay Agent on your computer.$\r$\n$\r$\nThe relay connects your iRacing session to the Ok, Box Box cloud for:$\r$\n• BlackBox - Driver HUD & AI Race Engineer$\r$\n• ControlBox - Race Control & Stewarding$\r$\n• RaceBox - Live Broadcast Overlays$\r$\n$\r$\nClick Next to continue."

!define MUI_FINISHPAGE_RUN "$INSTDIR\OkBoxBox-Relay.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Ok, Box Box Relay"
!define MUI_FINISHPAGE_LINK "Visit okboxbox.com"
!define MUI_FINISHPAGE_LINK_LOCATION "https://okboxbox.com"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installation Section
Section "Install"
    SetOutPath $INSTDIR
    
    ; Main executable
    File "OkBoxBox-Relay.exe"
    File "README.md"
    
    ; Create config file with default settings
    FileOpen $0 "$INSTDIR\config.yaml" w
    FileWrite $0 "# Ok, Box Box Relay Configuration$\r$\n"
    FileWrite $0 "$\r$\n"
    FileWrite $0 "# Cloud server URL$\r$\n"
    FileWrite $0 "cloud_url: https://api.okboxbox.com$\r$\n"
    FileWrite $0 "$\r$\n"
    FileWrite $0 "# Telemetry update rate (Hz)$\r$\n"
    FileWrite $0 "poll_rate_hz: 10$\r$\n"
    FileWrite $0 "$\r$\n"
    FileWrite $0 "# Logging level (DEBUG, INFO, WARNING, ERROR)$\r$\n"
    FileWrite $0 "log_level: INFO$\r$\n"
    FileWrite $0 "$\r$\n"
    FileWrite $0 "# Auto-update check on startup$\r$\n"
    FileWrite $0 "auto_update: true$\r$\n"
    FileWrite $0 "$\r$\n"
    FileWrite $0 "# Version for update checks$\r$\n"
    FileWrite $0 "version: ${VERSION}$\r$\n"
    FileClose $0
    
    ; Create Start Menu shortcuts
    CreateDirectory "$SMPROGRAMS\Ok Box Box"
    CreateShortcut "$SMPROGRAMS\Ok Box Box\Ok Box Box Relay.lnk" "$INSTDIR\OkBoxBox-Relay.exe"
    CreateShortcut "$SMPROGRAMS\Ok Box Box\Uninstall Relay.lnk" "$INSTDIR\Uninstall.exe"
    
    ; Create Desktop shortcut
    CreateShortcut "$DESKTOP\Ok Box Box Relay.lnk" "$INSTDIR\OkBoxBox-Relay.exe"
    
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    
    ; Write registry keys for Add/Remove Programs
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "DisplayName" "Ok, Box Box Relay"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "DisplayIcon" "$INSTDIR\OkBoxBox-Relay.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "Publisher" "${PUBLISHER}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "DisplayVersion" "${VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "URLInfoAbout" "${WEBSITE}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "URLUpdateInfo" "${UPDATE_URL}"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "NoRepair" 1
    
    ; Get installed size
    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay" "EstimatedSize" "$0"
    
    ; Save install directory and version
    WriteRegStr HKLM "Software\OkBoxBox\Relay" "Install_Dir" "$INSTDIR"
    WriteRegStr HKLM "Software\OkBoxBox\Relay" "Version" "${VERSION}"
SectionEnd

; Uninstaller Section
Section "Uninstall"
    ; Remove files
    Delete "$INSTDIR\OkBoxBox-Relay.exe"
    Delete "$INSTDIR\README.md"
    Delete "$INSTDIR\config.yaml"
    Delete "$INSTDIR\Uninstall.exe"
    
    ; Remove shortcuts
    Delete "$SMPROGRAMS\Ok Box Box\Ok Box Box Relay.lnk"
    Delete "$SMPROGRAMS\Ok Box Box\Uninstall Relay.lnk"
    RMDir "$SMPROGRAMS\Ok Box Box"
    Delete "$DESKTOP\Ok Box Box Relay.lnk"
    
    ; Remove directories
    RMDir "$INSTDIR"
    RMDir "$PROGRAMFILES\Ok Box Box"
    
    ; Remove registry keys
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OkBoxBoxRelay"
    DeleteRegKey HKLM "Software\OkBoxBox\Relay"
SectionEnd
