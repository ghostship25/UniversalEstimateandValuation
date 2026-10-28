#!/usr/bin/env python3
"""
UEV Desktop Distribution Packager for Windows
Generates the complete 'dist-desktop' directory containing:
1. UEV-Setup-1.0.0.exe (Native Windows PE x86_64 GUI Installer)
2. UEV-OneClick-Setup.bat (Double-clickable Windows Batch Installer)
3. UEV-OneClick-Installer.cmd (Command line alias)
4. UEV-Setup.ps1 (Rich PowerShell installer with desktop shortcuts & registry registration)
5. UEV-Portable.bat (Zero-installation portable runner)
6. Uninstall-UEV.bat (Uninstaller)
7. UEV-InnoSetup.iss (Inno Setup Compiler script)
8. UEV-NSIS-Installer.nsi (NSIS script)
9. icon.ico & icon.png (Multi-resolution Windows icons)
10. app/ (Complete offline application bundle with index.html, assets, electron scripts)
11. README-WINDOWS-INSTALLATION.txt (Windows user manual)
"""

import os
import shutil
import struct
import zlib
import math

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
ELECTRON_DIR = os.path.join(ROOT_DIR, 'electron')
OUT_DIR = os.path.join(ROOT_DIR, 'dist-desktop')
APP_OUT_DIR = os.path.join(OUT_DIR, 'app')

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)

# 1. ICON GENERATOR
def create_uev_png(size):
    raw = bytearray()
    center = size / 2.0
    corner_r = size * 0.18
    
    for y in range(size):
        raw.append(0)  # filter type None
        for x in range(size):
            dx = x - center
            dy = y - center
            
            # Rounded squircle container
            q_x = abs(dx) - (center - corner_r - 2)
            q_y = abs(dy) - (center - corner_r - 2)
            dist_box = math.sqrt(max(q_x, 0)**2 + max(q_y, 0)**2)
            in_base = (q_x <= 0 and q_y <= 0) or (dist_box <= corner_r)
            
            if not in_base:
                raw.extend([0, 0, 0, 0])
                continue
                
            # Base gradient: Deep Blueprint Slate/Navy Blue
            t = (y / float(size))
            r = int(15 + t * 20)
            g = int(30 + t * 35)
            b = int(60 + t * 85)
            a = 255
            
            # Outer Gold border
            if (q_x > -3 or q_y > -3) and (dist_box >= corner_r - 3 or (q_x <= 0 and q_y > -3) or (q_y <= 0 and q_x > -3)):
                r, g, b = 234, 179, 8  # Amber/Gold
            
            # Architectural Civil Emblem (Drafting Compass + Building Pillars + 'N')
            nx = (x - size * 0.22) / (size * 0.56)
            ny = (y - size * 0.22) / (size * 0.56)
            
            if 0.0 <= nx <= 1.0 and 0.0 <= ny <= 1.0:
                is_left_bar = (0.0 <= nx <= 0.22) and (0.05 <= ny <= 0.95)
                is_right_bar = (0.78 <= nx <= 1.0) and (0.05 <= ny <= 0.95)
                is_diag = abs((nx - 0.1) - (ny - 0.1)) < 0.14 and (0.05 <= ny <= 0.95)
                
                if is_left_bar or is_right_bar:
                    r, g, b = 16, 185, 129  # Emerald Green
                elif is_diag:
                    r, g, b = 245, 158, 11  # Warm Gold
                    
                # Architectural girder beam
                if abs(ny - 0.5) < 0.05 and 0.0 <= nx <= 1.0:
                    r, g, b = 255, 255, 255
                    
                # Pivot circle of compass
                cx = nx - 0.5
                cy = ny - 0.08
                if cx*cx + cy*cy < 0.014:
                    r, g, b = 250, 204, 21
            
            raw.extend([r, g, b, a])
            
    compressor = zlib.compressobj()
    compressed = compressor.compress(bytes(raw)) + compressor.flush()
    
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png.extend(struct.pack('>I', 13) + b'IHDR' + ihdr + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr)))
    png.extend(struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', zlib.crc32(b'IDAT' + compressed)))
    png.extend(struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND')))
    return bytes(png)

def generate_icons():
    sizes = [256, 128, 64, 48, 32, 16]
    pngs = [create_uev_png(s) for s in sizes]
    
    # Pack into .ico
    ico = bytearray()
    ico.extend(struct.pack('<HHH', 0, 1, len(sizes)))
    offset = 6 + 16 * len(sizes)
    
    for s, p in zip(sizes, pngs):
        w = 0 if s == 256 else s
        h = 0 if s == 256 else s
        ico.extend(struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(p), offset))
        offset += len(p)
        
    for p in pngs:
        ico.extend(p)
        
    ico_path = os.path.join(OUT_DIR, 'icon.ico')
    png_path = os.path.join(OUT_DIR, 'icon.png')
    
    with open(ico_path, 'wb') as f:
        f.write(ico)
    with open(png_path, 'wb') as f:
        f.write(pngs[0])
    print(f"Generated icons: {ico_path} and {png_path}")

# 2. GENERATE PE64 EXECUTABLE (UEV-Setup-1.0.0.exe)
def generate_pe64_installer():
    image_base = 0x140000000
    file_align = 0x200
    sect_align = 0x1000
    
    rdata = bytearray(0x200)
    rdata_rva = 0x2000
    import_dir_rva = rdata_rva + 0x00
    ilt_rva = rdata_rva + 0x28
    iat_rva = rdata_rva + 0x40
    hint_winexec_rva = rdata_rva + 0x58
    hint_exit_rva = rdata_rva + 0x64
    dll_name_rva = rdata_rva + 0x74
    cmd_str_rva = rdata_rva + 0x84
    
    struct.pack_into('<IIIII', rdata, 0, ilt_rva, 0, 0, dll_name_rva, iat_rva)
    struct.pack_into('<QQQ', rdata, 0x28, hint_winexec_rva, hint_exit_rva, 0)
    struct.pack_into('<QQQ', rdata, 0x40, hint_winexec_rva, hint_exit_rva, 0)
    
    struct.pack_into('<H8s', rdata, 0x58, 0, b'WinExec\0')
    struct.pack_into('<H12s', rdata, 0x64, 0, b'ExitProcess\0')
    dll_name = b'KERNEL32.DLL\0'
    rdata[0x74:0x74+len(dll_name)] = dll_name
    
    cmd_str = b'cmd.exe /c UEV-OneClick-Setup.bat\0'
    rdata[0x84:0x84+len(cmd_str)] = cmd_str
    
    text = bytearray(0x200)
    text[0:4] = b'\x48\x83\xec\x28'
    disp_cmd = cmd_str_rva - 0x100b
    text[4:11] = b'\x48\x8d\x0d' + struct.pack('<i', disp_cmd)
    text[11:16] = b'\xba\x01\x00\x00\x00'
    disp_winexec = (iat_rva + 0) - 0x1016
    text[16:22] = b'\xff\x15' + struct.pack('<i', disp_winexec)
    text[22:24] = b'\x31\xc9'
    disp_exit = (iat_rva + 8) - 0x101e
    text[24:30] = b'\xff\x15' + struct.pack('<i', disp_exit)
    text[30:35] = b'\x48\x83\xc4\x28\xc3'
    
    dos_hdr = bytearray(64)
    dos_hdr[0:2] = b'MZ'
    struct.pack_into('<I', dos_hdr, 0x3c, 0x80)
    
    dos_stub = b'\x0e\x1f\xba\x0e\x00\xb4\x09\xcd\x21\xb8\x01\x4c\xcd\x21' + b'This program cannot be run in DOS mode.\r\r\n$'
    dos_stub = dos_stub.ljust(64, b'\x00')
    
    pe_sig = b'PE\0\0'
    file_hdr = struct.pack('<HHIIIHH', 0x8664, 2, 0, 0, 0, 240, 0x0022)
    
    opt_standard = struct.pack('<HBBIIIII', 0x020B, 14, 0, 0x200, 0x200, 0, 0x1000, 0x1000)
    opt_windows = struct.pack('<QIIHHHHHHIIIIHHQQQQII',
        image_base,
        sect_align, file_align,
        6, 0, 1, 0, 6, 0,
        0, 0x3000, 0x200, 0,
        2, 0x8160,
        0x100000, 0x1000, 0x100000, 0x1000,
        0, 16
    )
    
    data_dirs = bytearray(16 * 8)
    struct.pack_into('<II', data_dirs, 1 * 8, import_dir_rva, 40)
    struct.pack_into('<II', data_dirs, 12 * 8, iat_rva, 24)
    
    opt_hdr = opt_standard + opt_windows + bytes(data_dirs)
    
    text_sect = struct.pack('<8sIIIIIIHHI', b'.text\0\0\0', 0x200, 0x1000, 0x200, 0x200, 0, 0, 0, 0, 0x60000020)
    rdata_sect = struct.pack('<8sIIIIIIHHI', b'.rdata\0\0', 0x200, 0x2000, 0x200, 0x400, 0, 0, 0, 0, 0x40000040)
    
    headers = dos_hdr + dos_stub + pe_sig + file_hdr + opt_hdr + text_sect + rdata_sect
    headers = headers.ljust(0x200, b'\x00')
    
    exe_data = headers + bytes(text) + bytes(rdata)
    exe_path = os.path.join(OUT_DIR, 'UEV-Setup-1.0.0.exe')
    with open(exe_path, 'wb') as f:
        f.write(exe_data)
    print(f"Generated PE64 Windows Installer: {exe_path} ({len(exe_data)} bytes)")

# 3. GENERATE BATCH ONE-CLICK INSTALLER (UEV-OneClick-Setup.bat)
def generate_batch_installer():
    content = r'''@echo off
setlocal EnableDelayedExpansion
title UEV - Windows One-Click Installer
color 1F

cls
echo ===============================================================================
echo          U E V - E S T I M A T I N G
echo        Rate Analysis, BOQ, Measurement Book & Quantity Estimation Platform
echo ===============================================================================
echo.
echo  [*] Initializing Automated One-Click Installation for Windows...
echo.

set "SOURCE_DIR=%~dp0"
set "APP_SOURCE=%SOURCE_DIR%app"
set "INSTALL_DIR=%LOCALAPPDATA%\Programs\UEV"

if not exist "%APP_SOURCE%\index.html" (
    echo [ERROR] Application bundle missing in "%APP_SOURCE%".
    echo Please make sure all files were extracted properly before running.
    pause
    exit /b 1
)

echo  [1/5] Creating application directory...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\app" mkdir "%INSTALL_DIR%\app"
if not exist "%INSTALL_DIR%\UserData" mkdir "%INSTALL_DIR%\UserData"

echo  [2/5] Deploying UEV offline core files...
xcopy /E /I /Y /Q "%APP_SOURCE%\*" "%INSTALL_DIR%\app\" >nul
copy /Y "%SOURCE_DIR%icon.ico" "%INSTALL_DIR%\icon.ico" >nul

echo  [3/5] Setting up Windows Desktop & Start Menu Launchers...

:: Create main application runner UEV.bat
(
echo @echo off
echo setlocal
echo title UEV - Universal Estimating ^& Valuation
echo cd /d "%%~dp0"
echo.
echo :: Check if Microsoft Edge is available
echo set "EDGE_EXE="
echo if exist "%%ProgramFiles(x86)%%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%%ProgramFiles(x86)%%\Microsoft\Edge\Application\msedge.exe"
echo if exist "%%ProgramFiles%%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%%ProgramFiles%%\Microsoft\Edge\Application\msedge.exe"
echo if exist "%%LOCALAPPDATA%%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%%LOCALAPPDATA%%\Microsoft\Edge\Application\msedge.exe"
echo.
echo :: Check if Chrome is available as fallback
echo set "CHROME_EXE="
echo if exist "%%ProgramFiles%%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%%ProgramFiles%%\Google\Chrome\Application\chrome.exe"
echo if exist "%%ProgramFiles(x86)%%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%%ProgramFiles(x86)%%\Google\Chrome\Application\chrome.exe"
echo.
echo :: Start local lightweight offline HTTP server via PowerShell to prevent CORS issues on file://
echo start "" /B powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "$port=37890; $prefix='http://127.0.0.1:'+$port+'/'; $listener=New-Object System.Net.HttpListener; $listener.Prefixes.Add($prefix); try { $listener.Start() } catch { exit }; $baseDir=Join-Path $PSScriptRoot 'app'; while($listener.IsListening){ $ctx=$listener.GetContext(); $reqPath=$ctx.Request.Url.AbsolutePath.TrimStart('/'); if([string]::IsNullOrEmpty($reqPath)){ $reqPath='index.html' }; $localFile=Join-Path $baseDir $reqPath; if(Test-Path $localFile){ $bytes=[System.IO.File]::ReadAllBytes($localFile); $ext=[System.IO.Path]::GetExtension($localFile).ToLower(); switch($ext){ '.html'{$ctx.Response.ContentType='text/html; charset=utf-8'} '.js'{$ctx.Response.ContentType='application/javascript; charset=utf-8'} '.css'{$ctx.Response.ContentType='text/css; charset=utf-8'} '.json'{$ctx.Response.ContentType='application/json'} '.svg'{$ctx.Response.ContentType='image/svg+xml'} '.png'{$ctx.Response.ContentType='image/png'} '.ico'{$ctx.Response.ContentType='image/x-icon'} default{$ctx.Response.ContentType='application/octet-stream'} }; $ctx.Response.ContentLength64=$bytes.Length; $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length); $ctx.Response.Close() } else { $ctx.Response.StatusCode=404; $ctx.Response.Close() } }"
echo.
echo :: Give server 500ms to bind
echo powershell -NoProfile -Command "Start-Sleep -Milliseconds 600"
echo.
echo :: Launch in Dedicated Desktop App Mode
echo if defined EDGE_EXE (
echo     start "" "%%EDGE_EXE%%" --app="http://127.0.0.1:37890" --window-size=1440,900 --user-data-dir="%%~dp0UserData"
echo     exit
echo )
echo if defined CHROME_EXE (
echo     start "" "%%CHROME_EXE%%" --app="http://127.0.0.1:37890" --window-size=1440,900 --user-data-dir="%%~dp0UserData"
echo     exit
echo )
echo :: Default system browser
echo start "" "http://127.0.0.1:37890"
) > "%INSTALL_DIR%\UEV.bat"

:: Create silent VBS launcher
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run chr(34^) ^& "%INSTALL_DIR%\UEV.bat" ^& chr(34^), 0
echo Set WshShell = Nothing
) > "%INSTALL_DIR%\UEV-Silent.vbs"

:: Create Uninstaller
(
echo @echo off
echo title Uninstall UEV
echo echo Uninstalling UEV...
echo del "%%USERPROFILE%%\Desktop\UEV - Estimating & Valuation.lnk" 2^>nul
echo rmdir /S /Q "%%APPDATA%%\Microsoft\Windows\Start Menu\Programs\UEV" 2^>nul
echo reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\UEV" /f 2^>nul
echo reg delete "HKCU\Software\Classes\.asp" /f 2^>nul
echo reg delete "HKCU\Software\Classes\.ast" /f 2^>nul
echo echo UEV shortcuts removed.
echo echo To completely delete data, remove the folder: "%INSTALL_DIR%"
echo pause
) > "%INSTALL_DIR%\Uninstall-UEV.bat"

echo  [4/5] Creating Desktop & Start Menu Shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $dPath = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut([System.IO.Path]::Combine($dPath, 'UEV - Estimating & Valuation.lnk')); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%INSTALL_DIR%\UEV-Silent.vbs\"'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.IconLocation = '%INSTALL_DIR%\icon.ico, 0'; $s.Description = 'UEV - Estimating & Valuation Rate Analysis & Quantity Estimation Platform'; $s.Save()"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$startDir = [System.IO.Path]::Combine([Environment]::GetFolderPath('Programs'), 'UEV'); if (!(Test-Path $startDir)) { New-Item -ItemType Directory -Path $startDir | Out-Null }; $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine($startDir, 'UEV.lnk')); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%INSTALL_DIR%\UEV-Silent.vbs\"'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.IconLocation = '%INSTALL_DIR%\icon.ico, 0'; $s.Description = 'UEV - Estimating & Valuation Platform'; $s.Save()"

echo  [5/5] Registering in Windows Add/Remove Programs...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\UEV" /v "DisplayName" /t REG_SZ /d "UEV - Estimating & Valuation Platform" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\UEV" /v "DisplayVersion" /t REG_SZ /d "1.0.0" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\UEV" /v "Publisher" /t REG_SZ /d "UEV Engineering Technologies" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\UEV" /v "DisplayIcon" /t REG_SZ /d "%INSTALL_DIR%\icon.ico" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\UEV" /v "UninstallString" /t REG_SZ /d "%INSTALL_DIR%\Uninstall-UEV.bat" /f >nul 2>&1

echo.
echo ===============================================================================
echo             SUCCESS! UEV has been installed successfully.
echo ===============================================================================
echo.
echo  [*] A shortcut has been added to your Windows Desktop:
echo      "UEV - Estimating & Valuation"
echo.
echo  [*] Launching UEV now...
echo.

start "" wscript.exe "%INSTALL_DIR%\UEV-Silent.vbs"
timeout /t 3 >nul
exit /b 0
'''
    bat_path = os.path.join(OUT_DIR, 'UEV-OneClick-Setup.bat')
    cmd_path = os.path.join(OUT_DIR, 'UEV-OneClick-Installer.cmd')
    
    with open(bat_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(content)
    with open(cmd_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(content)
    print(f"Generated Windows Batch Installer: {bat_path}")

# 4. GENERATE POWERSHELL INSTALLER (UEV-Setup.ps1)
def generate_powershell_installer():
    content = r'''# UEV - PowerShell Native One-Click Windows Installer
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         N I R M Ā Ṇ A  -  W I N D O W S   I N S T A L L E R           " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$SourceDir = $PSScriptRoot
$AppSource = Join-Path $SourceDir "app"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\UEV"

if (!(Test-Path (Join-Path $AppSource "index.html"))) {
    Write-Host "[ERROR] Could not find application bundle in: $AppSource" -ForegroundColor Red
    pause
    exit 1
}

Write-Host " -> Preparing target directory: $InstallDir" -ForegroundColor Gray
New-Item -ItemType Directory -Path (Join-Path $InstallDir "app") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $InstallDir "UserData") -Force | Out-Null

Write-Host " -> Copying UEV application files..." -ForegroundColor Gray
Copy-Item -Path (Join-Path $AppSource "*") -Destination (Join-Path $InstallDir "app") -Recurse -Force
Copy-Item -Path (Join-Path $SourceDir "icon.ico") -Destination (Join-Path $InstallDir "icon.ico") -Force

Write-Host " -> Creating desktop shortcut..." -ForegroundColor Green
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut((Join-Path $DesktopPath "UEV - Estimating & Valuation.lnk"))
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$InstallDir\UEV-Silent.vbs`""
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = "$InstallDir\icon.ico, 0"
$Shortcut.Description = "UEV - Estimating & Valuation Rate Analysis & Quantity Estimation Platform"
$Shortcut.Save()

Write-Host " -> Creating Start Menu entry..." -ForegroundColor Green
$StartMenuDir = Join-Path ([Environment]::GetFolderPath('Programs')) "UEV"
New-Item -ItemType Directory -Path $StartMenuDir -Force | Out-Null
$MenuShortcut = $WshShell.CreateShortcut((Join-Path $StartMenuDir "UEV.lnk"))
$MenuShortcut.TargetPath = "wscript.exe"
$MenuShortcut.Arguments = "`"$InstallDir\UEV-Silent.vbs`""
$MenuShortcut.WorkingDirectory = $InstallDir
$MenuShortcut.IconLocation = "$InstallDir\icon.ico, 0"
$MenuShortcut.Description = "UEV - Estimating & Valuation Platform"
$MenuShortcut.Save()

Write-Host " -> Registering Windows uninstall key..." -ForegroundColor Gray
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\UEV"
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name "DisplayName" -Value "UEV - Estimating & Valuation Platform"
Set-ItemProperty -Path $regPath -Name "DisplayVersion" -Value "1.0.0"
Set-ItemProperty -Path $regPath -Name "Publisher" -Value "UEV Engineering Technologies"
Set-ItemProperty -Path $regPath -Name "DisplayIcon" -Value "$InstallDir\icon.ico"
Set-ItemProperty -Path $regPath -Name "UninstallString" -Value "$InstallDir\Uninstall-UEV.bat"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "             INSTALLATION COMPLETED SUCCESSFULLY!                      " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "Launching UEV now..." -ForegroundColor Cyan

Start-Process "wscript.exe" -ArgumentList "`"$InstallDir\UEV-Silent.vbs`""
'''
    ps_path = os.path.join(OUT_DIR, 'UEV-Setup.ps1')
    with open(ps_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(content)
    print(f"Generated PowerShell Installer: {ps_path}")

# 5. GENERATE PORTABLE RUNNER (UEV-Portable.bat)
def generate_portable_runner():
    content = r'''@echo off
setlocal
title UEV Portable - Civil Rate Analysis & Estimation
cd /d "%~dp0"

echo Starting UEV in Portable Mode...

:: Detect Edge or Chrome
set "BROWSER_EXE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

:: Start local lightweight offline HTTP server
start "" /B powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "$port=37890; $prefix='http://127.0.0.1:'+$port+'/'; $listener=New-Object System.Net.HttpListener; $listener.Prefixes.Add($prefix); try { $listener.Start() } catch { exit }; $baseDir=Join-Path $PSScriptRoot 'app'; while($listener.IsListening){ $ctx=$listener.GetContext(); $reqPath=$ctx.Request.Url.AbsolutePath.TrimStart('/'); if([string]::IsNullOrEmpty($reqPath)){ $reqPath='index.html' }; $localFile=Join-Path $baseDir $reqPath; if(Test-Path $localFile){ $bytes=[System.IO.File]::ReadAllBytes($localFile); $ext=[System.IO.Path]::GetExtension($localFile).ToLower(); switch($ext){ '.html'{$ctx.Response.ContentType='text/html; charset=utf-8'} '.js'{$ctx.Response.ContentType='application/javascript; charset=utf-8'} '.css'{$ctx.Response.ContentType='text/css; charset=utf-8'} '.json'{$ctx.Response.ContentType='application/json'} '.svg'{$ctx.Response.ContentType='image/svg+xml'} '.png'{$ctx.Response.ContentType='image/png'} '.ico'{$ctx.Response.ContentType='image/x-icon'} default{$ctx.Response.ContentType='application/octet-stream'} }; $ctx.Response.ContentLength64=$bytes.Length; $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length); $ctx.Response.Close() } else { $ctx.Response.StatusCode=404; $ctx.Response.Close() } }"

powershell -NoProfile -Command "Start-Sleep -Milliseconds 600"

if defined BROWSER_EXE (
    start "" "%BROWSER_EXE%" --app="http://127.0.0.1:37890" --window-size=1440,900 --user-data-dir="%~dp0UserData"
    exit
)

start "" "http://127.0.0.1:37890"
exit
'''
    port_path = os.path.join(OUT_DIR, 'UEV-Portable.bat')
    with open(port_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(content)
    print(f"Generated Portable Runner: {port_path}")

# 6. GENERATE UNINSTALLER SCRIPT
def generate_uninstaller():
    content = r'''@echo off
title Uninstall UEV
color 0C
echo ===============================================================================
echo                      U N I N S T A L L   N I R M Ā Ṇ A
echo ===============================================================================
echo.
set /p CONFIRM="Are you sure you want to remove UEV from your computer? (Y/N): "
if /i not "%CONFIRM%"=="Y" exit /b 0

echo.
echo Removing Desktop and Start Menu shortcuts...
del "%USERPROFILE%\Desktop\UEV - Estimating & Valuation.lnk" 2>nul
rmdir /S /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\UEV" 2>nul

echo Removing Windows registry entries...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\UEV" /f 2>nul

echo.
echo UEV has been removed from your Start Menu and Desktop.
echo Installed application directory: %LOCALAPPDATA%\Programs\UEV
echo.
pause
'''
    un_path = os.path.join(OUT_DIR, 'Uninstall-UEV.bat')
    with open(un_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(content)
    print(f"Generated Uninstaller: {un_path}")

# 7. GENERATE INNO SETUP COMPILER SCRIPT (UEV-InnoSetup.iss)
def generate_inno_setup_script():
    content = r'''; Inno Setup Script for UEV
#define MyAppName "UEV"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "UEV Engineering Technologies"
#define MyAppURL "https://uev.app"
#define MyAppExeName "UEV.bat"

[Setup]
AppId={{D41A25B8-43B6-4A9B-B4B7-B5E34A0761A9}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={userpf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=UEV-Setup-x64
SetupIconFile=icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "UEV-Portable.bat"; DestDir: "{app}"; DestName: "UEV.bat"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\{#MyAppName} - Estimating & Valuation"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall skipifsilent
'''
    iss_path = os.path.join(OUT_DIR, 'UEV-InnoSetup.iss')
    with open(iss_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(content)
    print(f"Generated Inno Setup Script: {iss_path}")

# 8. GENERATE NSIS SCRIPT (UEV-NSIS-Installer.nsi)
def generate_nsis_script():
    content = r'''!define PRODUCT_NAME "UEV"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "UEV Engineering Technologies"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\UEV.bat"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

SetCompressor lzma
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "UEV-Installer-x64.exe"
InstallDir "$LOCALAPPDATA\Programs\UEV"
InstallDirRegKey HKCU "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  File /r "app"
  File "icon.ico"
  File /oname=UEV.bat "UEV-Portable.bat"
  
  CreateDirectory "$SMPROGRAMS\UEV"
  CreateShortCut "$SMPROGRAMS\UEV\UEV.lnk" "$INSTDIR\UEV.bat" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$DESKTOP\UEV - Estimating & Valuation.lnk" "$INSTDIR\UEV.bat" "" "$INSTDIR\icon.ico" 0
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\uninst.exe"
  WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd
'''
    nsi_path = os.path.join(OUT_DIR, 'UEV-NSIS-Installer.nsi')
    with open(nsi_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(content)
    print(f"Generated NSIS Script: {nsi_path}")

# 9. GENERATE README-WINDOWS-INSTALLATION.txt
def generate_readme():
    content = """================================================================================
          U E V - E S T I M A T I N G
      Government Norms, Rate Analysis, BOQ & Quantity Estimation Platform
================================================================================

WELCOME TO UEV FOR WINDOWS!
This 'dist-desktop' distribution folder contains ready-to-run and one-click
installable options for Windows 11, Windows 10, 8, and 7 (64-bit & 32-bit).

--------------------------------------------------------------------------------
OPTION 1: AUTOMATIC ONE-CLICK INSTALLATION (RECOMMENDED)
--------------------------------------------------------------------------------
Simply double-click either:
   1. UEV-Setup-1.0.0.exe
   OR
   2. UEV-OneClick-Setup.bat (or UEV-OneClick-Installer.cmd)

WHAT IT DOES AUTOMATICALLY:
   ✓ Deploys UEV to your local user directory:
     %LOCALAPPDATA%\\Programs\\UEV
     (No administrator rights needed!)
   ✓ Places a Desktop Shortcut: "UEV - Estimating & Valuation" with custom icon
   ✓ Creates a Start Menu shortcut under "UEV"
   ✓ Registers with Windows Add/Remove Programs
   ✓ Automatically launches the application in native desktop window mode!

--------------------------------------------------------------------------------
OPTION 2: ZERO-INSTALL PORTABLE MODE (RUN FROM USB OR FOLDER)
--------------------------------------------------------------------------------
If you do not want to install anything on the computer:
   1. Double-click "UEV-Portable.bat"
   2. UEV will launch instantly in standalone desktop application mode!
   3. All your data, offline database, and templates are stored safely.

--------------------------------------------------------------------------------
OPTION 3: POWERSHELL ONE-CLICK INSTALLER
--------------------------------------------------------------------------------
Right-click on "UEV-Setup.ps1" and select "Run with PowerShell".

--------------------------------------------------------------------------------
OPTION 4: ADVANCED DEVELOPER / COMPILER OPTIONS
--------------------------------------------------------------------------------
- Inno Setup Script: "UEV-InnoSetup.iss"
  If you have Inno Setup Compiler installed, right click -> "Compile" to build
  a single self-contained setup wizard executable.
- NSIS Script: "UEV-NSIS-Installer.nsi"
  Compatible with Nullsoft Scriptable Install System.
- Electron Desktop Packaging:
  From the project root: npm run desktop:build

--------------------------------------------------------------------------------
FEATURES INCLUDED IN THIS WINDOWS DESKTOP BUILD:
--------------------------------------------------------------------------------
- Full Standard Norms Library (Buildings, Roads, Irrigation, Water Supply)
- Multi-Zone Rate Analysis (77 Zones)
- Measurement Book (MB) with L × B × H dynamic formulas
- Cost Estimate / Bill of Quantities (BOQ) with Office & Contractor modes
- Bar Bending Schedule (BBS)
- Running Bills / IPC / Valuation Sheets
- 100% Offline Capability (SQLite / IndexedDB persistence)
- Excel Import & Export (.xlsx / .csv)
- PDF Document Printing & Exporting

SUPPORT & ASSISTANCE:
UEV Engineering Technologies
Website: https://uev.app
================================================================================
"""
    readme_path = os.path.join(OUT_DIR, 'README-WINDOWS-INSTALLATION.txt')
    with open(readme_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(content)
    print(f"Generated Windows User Manual: {readme_path}")

# 10. COPY BUNDLE TO app/
def copy_bundle():
    ensure_dir(APP_OUT_DIR)
    
    # Copy from dist/
    if os.path.exists(DIST_DIR):
        for item in os.listdir(DIST_DIR):
            s = os.path.join(DIST_DIR, item)
            d = os.path.join(APP_OUT_DIR, item)
            if os.path.isdir(s):
                if os.path.exists(d):
                    shutil.rmtree(d)
                shutil.copytree(s, d)
            else:
                shutil.copy2(s, d)
        print("Copied dist/ bundle to dist-desktop/app/")
    else:
        print("[WARNING] dist/ directory not found. Please run 'npm run build' first.")
        
    # Copy electron/
    electron_dest = os.path.join(APP_OUT_DIR, 'electron')
    if os.path.exists(ELECTRON_DIR):
        if os.path.exists(electron_dest):
            shutil.rmtree(electron_dest)
        shutil.copytree(ELECTRON_DIR, electron_dest)
        print("Copied electron/ scripts to dist-desktop/app/electron/")

def main():
    print(f"Building UEV Windows Desktop Distribution at: {OUT_DIR}")
    ensure_dir(OUT_DIR)
    
    generate_icons()
    generate_pe64_installer()
    generate_batch_installer()
    generate_powershell_installer()
    generate_portable_runner()
    generate_uninstaller()
    generate_inno_setup_script()
    generate_nsis_script()
    generate_readme()
    copy_bundle()
    
    print("\n✅ dist-desktop created successfully!")

if __name__ == '__main__':
    main()
