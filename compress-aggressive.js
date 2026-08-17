(async () => {
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagesDir = 'images';
const targetSize = 100 * 1024; // 100 KB

async function compressWithResize() {
  try {
    // Get all WebP files over 100KB
    const files = fs.readdirSync(imagesDir);
    const filesToCompress = files
      .filter(f => f.endsWith('.webp') && !f.startsWith('.__tmp_'))
      .filter(f => fs.statSync(path.join(imagesDir, f)).size > targetSize);

    if (filesToCompress.length === 0) {
      console.log('✓ All WebP files are already under 100KB!');
      return;
    }

    console.log(`Found ${filesToCompress.length} WebP files to compress...\n`);
    let successCount = 0;

    for (const file of filesToCompress) {
      const filePath = path.join(imagesDir, file);
      const oldSize = fs.statSync(filePath).size;
      
      try {
        // Get image dimensions
        const metadata = await sharp(filePath).metadata();
        const currentWidth = metadata.width;
        const currentHeight = metadata.height;
        
        // Try different width limits with quality reduction
        const widthLimits = [2400, 1600, 1200, 800];
        let compressed = false;
        
        for (const targetWidth of widthLimits) {
          if (compressed) break;
          
          if (currentWidth <= targetWidth) continue; // Skip if already smaller
          
          const scale = targetWidth / currentWidth;
          const newWidth = Math.round(currentWidth * scale);
          const newHeight = Math.round(currentHeight * scale);
          
          // Try different quality levels
          for (let quality = 75; quality >= 30; quality -= 10) {
            const buffer = await sharp(filePath)
              .resize(newWidth, newHeight, { withoutEnlargement: true })
              .webp({ quality })
              .toBuffer();
            
            if (buffer.length <= targetSize) {
              fs.writeFileSync(filePath, buffer);
              const newSize = fs.statSync(filePath).size;
              const reduction = Math.round((1 - newSize / oldSize) * 100);
              console.log(`✓ ${file}`);
              console.log(`  ${(oldSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${reduction}% reduction)`);
              console.log(`  Resized to ${newWidth}x${newHeight}px, quality: ${quality}`);
              compressed = true;
              successCount++;
              break;
            }
          }
        }

        if (!compressed) {
          const newSize = fs.statSync(filePath).size;
          console.log(`⚠ ${file} could not be compressed to under 100KB (current: ${(newSize / 1024).toFixed(1)} KB)`);
          console.log(`  Original dimensions: ${currentWidth}x${currentHeight}px`);
        }
      } catch (err) {
        console.error(`✗ Error processing ${file}: ${err.message}`);
      }
    }

    console.log(`\n✓ Compressed ${successCount} / ${filesToCompress.length} files`);
    
    // Verify all files
    console.log('\n--- Final Image Sizes ---');
    const allFiles = fs.readdirSync(imagesDir);
    const webpFiles = allFiles.filter(f => f.endsWith('.webp') && !f.startsWith('.__tmp_'));
    const under100 = webpFiles.filter(f => fs.statSync(path.join(imagesDir, f)).size <= targetSize);
    const over100 = webpFiles.filter(f => fs.statSync(path.join(imagesDir, f)).size > targetSize);
    
    console.log(`Under 100KB: ${under100.length}/${webpFiles.length}`);
    if (over100.length > 0) {
      console.log(`Still over 100KB: ${over100.length}`);
      over100.forEach(f => {
        const size = fs.statSync(path.join(imagesDir, f)).size;
        console.log(`  - ${f}: ${(size / 1024).toFixed(1)} KB`);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

compressWithResize();
})();
