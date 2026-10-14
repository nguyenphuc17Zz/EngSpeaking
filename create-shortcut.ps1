$desktop = [Environment]::GetFolderPath('Desktop')
Write-Host "Desktop Path: $desktop"

$ws = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktop "EngSpeak.lnk"
if (Test-Path $shortcutPath) {
    Remove-Item -Force $shortcutPath
}

$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "e:\EnglishSpeaking\start-app.bat"
$shortcut.WorkingDirectory = "e:\EnglishSpeaking"

if (Test-Path "e:\EnglishSpeaking\public\app-icon.ico") {
    $shortcut.IconLocation = "e:\EnglishSpeaking\public\app-icon.ico,0"
} elseif (Test-Path "e:\EnglishSpeaking\public\favicon.ico") {
    $shortcut.IconLocation = "e:\EnglishSpeaking\public\favicon.ico,0"
}
$shortcut.Description = "English Speaking Coach"
$shortcut.Save()

# Force Explorer to refresh icon
try {
    $code = @"
    [System.Runtime.InteropServices.DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
"@
    $type = Add-Type -MemberDefinition $code -Name ShellHelper -Namespace Win32 -PassThru
    $type::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
} catch {
    # Ignore if reflection not supported
}

Write-Host "Shortcut created successfully at: $shortcutPath"
