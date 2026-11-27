# Tạo icon PNG cho PWA từ thiết kế của public/favicon.svg (vẽ lại bằng System.Drawing, không cần thư viện ngoài)
# Chạy: powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
param([string]$OutDir = (Join-Path $PSScriptRoot '..\public'))

Add-Type -AssemblyName System.Drawing

function New-PointList([double[]]$Coords) {
  $points = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
  for ($i = 0; $i -lt $Coords.Length; $i += 2) {
    $points.Add((New-Object System.Drawing.PointF ([single]$Coords[$i]), ([single]$Coords[$i + 1])))
  }
  return , $points.ToArray()
}

function New-TrekIcon {
  param([int]$Size, [string]$FileName, [switch]$FullBleed, [double]$ContentScale = 1.0)

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $teal = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#0f766e'))
  $sun = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#fde68a'))
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $snow = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#99f6e4'))

  if ($FullBleed) {
    # Maskable / apple-touch-icon: nền phủ kín, hệ điều hành tự bo góc
    $g.FillRectangle($teal, 0, 0, $Size, $Size)
  } else {
    $r = 112.0 * $Size / 512.0
    $d = 2 * $r
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($Size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $Size - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($teal, $path)
  }

  # Hệ tọa độ 512x512 như favicon.svg, thu nhỏ quanh tâm theo ContentScale
  $k = $Size / 512.0 * $ContentScale
  $g.TranslateTransform($Size / 2.0, $Size / 2.0)
  $g.ScaleTransform($k, $k)
  $g.TranslateTransform(-256, -256)

  $g.FillEllipse($sun, 308, 124, 88, 88)
  $g.FillPolygon($white, (New-PointList @(80, 392, 208, 200, 272, 296, 320, 232, 432, 392)))
  $g.FillPolygon($snow, (New-PointList @(208, 200, 240, 248, 218, 240, 196, 262, 176, 248)))

  $target = Join-Path $OutDir $FileName
  $bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "Created $target"
}

New-Item -ItemType Directory -Force $OutDir | Out-Null
New-TrekIcon -Size 192 -FileName 'pwa-192.png'
New-TrekIcon -Size 512 -FileName 'pwa-512.png'
# Maskable: nội dung nằm trong vùng an toàn 80% → thu nhỏ còn 0.75
New-TrekIcon -Size 512 -FileName 'pwa-maskable-512.png' -FullBleed -ContentScale 0.75
New-TrekIcon -Size 180 -FileName 'apple-touch-icon.png' -FullBleed -ContentScale 0.85
