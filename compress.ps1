$imagesDir = "images"
$targetSize = 100KB
$successCount = 0

$largeFiles = @(
    "service-sunset-ship.webp",
    "service-railyard.webp",
    "thankyou-warehouse.webp",
    "mission-yard1.webp",
    "project-warehouse.webp",
    "welcome-crane.webp",
    "contact-port.webp",
    "portfolio-ship.webp",
    "hero-port.webp",
    "mission-yard3.webp",
    "portfolio-rig.webp",
    "mission-yard2.webp",
    "global-cargo-transport-logistics-network-illustration-captures-complex-interconnected-world-shipping-visualizes-296263757.webp"
)

foreach ($file in $largeFiles) {
    $filePath = Join-Path $imagesDir $file
    if (-not (Test-Path $filePath)) {
        continue
    }
    
    $oldSize = (Get-Item $filePath).Length
    Write-Host "Processing: $file"
    
    $compressed = $false
    
    $settings = @(
        @{width = 1200; crf = 23},
        @{width = 1000; crf = 23},
        @{width = 800; crf = 25},
        @{width = 600; crf = 25},
        @{width = 500; crf = 28}
    )
    
    foreach ($setting in $settings) {
        if ($compressed) { break }
        
        $tempFile = "$filePath.tmp.webp"
        
        ffmpeg -hide_banner -loglevel error -i $filePath `
            -vf "scale=$($setting.width):-1" `
            -q:v $($setting.crf) `
            $tempFile 2>&1 | Out-Null
        
        if (Test-Path $tempFile) {
            $newSize = (Get-Item $tempFile).Length
            
            if ($newSize -le $targetSize) {
                Move-Item $tempFile $filePath -Force
                $oldKB = [math]::Round($oldSize/1KB, 1)
                $newKB = [math]::Round($newSize/1KB, 1)
                Write-Host "  SUCCESS: $oldKB KB to $newKB KB"
                $compressed = $true
                $successCount++
            } else {
                Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    if (-not $compressed) {
        $currentSize = (Get-Item $filePath).Length
        $currentKB = [math]::Round($currentSize/1KB, 1)
        Write-Host "  FAILED: Could not compress ($currentKB KB)"
    }
}

Write-Host ""
Write-Host "Compressed $successCount files"

$webpFiles = Get-ChildItem $imagesDir -Filter "*.webp" -Exclude ".__tmp_*"
$under100 = @($webpFiles | Where-Object { $_.Length -le $targetSize })
$over100 = @($webpFiles | Where-Object { $_.Length -gt $targetSize })

Write-Host "Total: $($webpFiles.Count), Under 100KB: $($under100.Count), Over 100KB: $($over100.Count)"
