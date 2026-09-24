$desktop = [Environment]::GetFolderPath('Desktop')
Write-Host "Desktop Path: $desktop"

$ws = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktop "EngSpeak.lnk"
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "e:\EnglishSpeaking\start-app.bat"
$shortcut.WorkingDirectory = "e:\EnglishSpeaking"

if (Test-Path "e:\EnglishSpeaking\public\liverpool.ico") {
    $shortcut.IconLocation = "e:\EnglishSpeaking\public\liverpool.ico,0"
} elseif (Test-Path "e:\EnglishSpeaking\src\app\favicon.ico") {
    $shortcut.IconLocation = "e:\EnglishSpeaking\src\app\favicon.ico,0"
}
$shortcut.Description = "English Speaking Coach"
$shortcut.Save()

Write-Host "Shortcut created successfully at: $shortcutPath"
