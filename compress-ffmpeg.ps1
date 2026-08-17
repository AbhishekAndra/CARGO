$imagesDir = "images"
$targetSize = 100KB
$maxAttempts = 5

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

$successCount = 0
$skipCount = 0

foreach ($file in $largeFiles) {
    $filePath = Join-Path $imagesDir $file
    if (-not (Test-Path $filePath)) {
        Write-Host "[skip] Not found: $file"
        $skipCount++
        continue
    }
    
    $oldSize = (Get-Item $filePath).Length
    Write-Host "Processing: $file ($([math]::Round($oldSize/1KB, 1)) KB)"
    
    $compressed = $false
    
    # Try different quality and width settings
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
        
        # Use ffmpeg to resize and encode to WebP with controlled quality
        ffmpeg -hide_banner -loglevel error -i $filePath `
            -vf "scale=$($setting.width):-1" `
            -q:v $($setting.crf) `
            $tempFile 2>$null
        
        if (Test-Path $tempFile) {
            $newSize = (Get-Item $tempFile).Length
            
            if ($newSize -le $targetSize) {
                Move-Item $tempFile $filePath -Force
                $reduction = [math]::Round((1 - $newSize / $oldSize) * 100)
                Write-Host "✓ $file"
                $oldKB = [math]::Round($oldSize/1KB, 1)
                $newKB = [math]::Round($newSize/1KB, 1)
                Write-Host "  $oldKB KB => $newKB KB (reduced)"
                $compressed = $true
                $successCount++
            } else {
                Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    if (-not $compressed) {
        $currentSize = (Get-Item $filePath).Length
        $msg = "Could not compress below 100KB (final: $([math]::Round($currentSize/1KB, 1)) KB)"
        Write-Host "WARNING: $msg"
    }
    Write-Host ""
}

Write-Host "✓ Compressed $successCount files"
if ($skipCount -gt 0) {
    Write-Host "⊘ Skipped $skipCount files (not found)"
}

# Show final status
Write-Host "`n--- Final Image Check ---"
$webpFiles = Get-ChildItem $imagesDir -Filter "*.webp" -Exclude ".__tmp_*"
$under100 = $webpFiles | Where-Object { $_.Length -le $targetSize }
$over100 = $webpFiles | Where-Object { $_.Length -gt $targetSize }

Write-Host "Total WebP files: $($webpFiles.Count)"
Write-Host "Under 100KB: $($under100.Count)"
Write-Host "Over 100KB: $($over100.Count)"

if ($over100.Count -gt 0) {
    Write-Host "`nStill over 100KB:"
    $over100 | ForEach-Object {
        Write-Host "  - $($_.Name): $([math]::Round($_.Length/1KB, 1)) KB"
    }
}
