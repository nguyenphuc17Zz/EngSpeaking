Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\defaultuser0\.gemini\antigravity-ide\brain\5e193cc4-a625-4496-9fab-59185ff9f225\engspeak_app_icon_1789791570008.jpg"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image not found: $sourcePath"
    exit 1
}

$rawImg = [System.Drawing.Bitmap]::FromFile($sourcePath)

# Badge bounding box: centered at x=505, y=442, size=650x650
$cropX = 180
$cropY = 117
$cropSize = 650

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropSize, $cropSize)
$croppedBmp = New-Object System.Drawing.Bitmap($cropSize, $cropSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gCrop = [System.Drawing.Graphics]::FromImage($croppedBmp)
$gCrop.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gCrop.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gCrop.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Draw the cropped region with rounded squircle clipping
$radius = [int]($cropSize * 0.22) # ~22% squircle curvature
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
$path.AddArc($cropSize - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
$path.AddArc($cropSize - $radius * 2, $cropSize - $radius * 2, $radius * 2, $radius * 2, 0, 90)
$path.AddArc(0, $cropSize - $radius * 2, $radius * 2, $radius * 2, 90, 90)
$path.CloseFigure()

$gCrop.SetClip($path)
$gCrop.DrawImage($rawImg, [System.Drawing.Rectangle]::new(0, 0, $cropSize, $cropSize), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$gCrop.ResetClip()

# Draw a subtle glow border around squircle edge
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 56, 189, 248), 3) # subtle cyan accent rim
$gCrop.DrawPath($pen, $path)
$pen.Dispose()
$path.Dispose()
$gCrop.Dispose()
$rawImg.Dispose()

# Helper function to resize bitmap
function Resize-Bitmap($sourceBmp, $width, $height) {
    $dest = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($sourceBmp, 0, 0, $width, $height)
    $g.Dispose()
    return $dest
}

# 1. Generate 512x512 icon.png
$icon512 = Resize-Bitmap $croppedBmp 512 512
$icon512.Save("E:\EnglishSpeaking\src\app\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon512.Save("E:\EnglishSpeaking\public\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Created icon.png (512x512)"

# 2. Generate 180x180 apple-icon.png
$appleIcon = Resize-Bitmap $croppedBmp 180 180
$appleIcon.Save("E:\EnglishSpeaking\src\app\apple-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$appleIcon.Save("E:\EnglishSpeaking\public\apple-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Created apple-icon.png (180x180)"

# 3. Create Multi-Resolution .ICO (16, 32, 48, 64, 128, 256)
$sizes = @(16, 32, 48, 64, 128, 256)
$pngStreams = @()

foreach ($sz in $sizes) {
    $resized = Resize-Bitmap $croppedBmp $sz $sz
    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $ms.ToArray()
    $ms.Dispose()
    $resized.Dispose()
    $pngStreams += ,@($sz, $pngBytes)
}

function Save-Ico($outputPath, $streams) {
    $fs = New-Object System.IO.FileStream($outputPath, [System.IO.FileMode]::Create)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR
    $bw.Write([UInt16]0) # Reserved
    $bw.Write([UInt16]1) # Type 1 = ICO
    $bw.Write([UInt16]$streams.Count) # Image count

    $offset = 6 + ($streams.Count * 16) # Header (6) + entries (16 each)

    foreach ($item in $streams) {
        $sz = $item[0]
        $bytes = $item[1]

        $bWidth = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
        $bHeight = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

        $bw.Write($bWidth)
        $bw.Write($bHeight)
        $bw.Write([byte]0) # Color count
        $bw.Write([byte]0) # Reserved
        $bw.Write([UInt16]1) # Planes
        $bw.Write([UInt16]32) # Bit count
        $bw.Write([UInt32]$bytes.Length) # Size of image data
        $bw.Write([UInt32]$offset) # Offset of image data

        $offset += $bytes.Length
    }

    foreach ($item in $streams) {
        $bytes = $item[1]
        $bw.Write($bytes)
    }

    $bw.Flush()
    $bw.Close()
    $fs.Close()
}

Save-Ico "E:\EnglishSpeaking\src\app\favicon.ico" $pngStreams
Save-Ico "E:\EnglishSpeaking\public\favicon.ico" $pngStreams
Write-Output "Created multi-resolution favicon.ico (16, 32, 48, 64, 128, 256)"

$icon512.Dispose()
$appleIcon.Dispose()
$croppedBmp.Dispose()
