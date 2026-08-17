const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagesDir = path.join(__dirname, 'images');
const targetSize = 100 * 1024; // 100 KB

async function compressImages() {
  try {
    const files = fs.readdirSync(imagesDir);
    const webpFiles = files.filter(f => f.endsWith('.webp') && !f.startsWith('.__tmp_'));
    
    const filesToCompress = [];
    for (const file of webpFiles) {
      const filePath = path.join(imagesDir, file);
      const size = fs.statSync(filePath).size;
      if (size > targetSize) {
        filesToCompress.push(file);
      }
    }

    if (filesToCompress.length === 0) {
      console.log('✓ All WebP files are already under 100KB!');
      return;
    }

    console.log(`Found ${filesToCompress.length} WebP files to compress\n`);
    let successCount = 0;

    for (const file of filesToCompress) {
      const filePath = path.join(imagesDir, file);
      const oldSize = fs.statSync(filePath).size;
      
      try {
        const metadata = await sharp(filePath).metadata();
        const currentWidth = metadata.width || 1920;
        const currentHeight = metadata.height || 1440;
        
        let compressed = false;
        
        // Try progressively smaller dimensions
        for (const maxWidth of [2000, 1600, 1200, 800]) {
          if (compressed) break;
          
          if (currentWidth <= maxWidth) continue;
          
          const scale = maxWidth / currentWidth;
          const newHeight = Math.round(currentHeight * scale);
          
          // Try different quality levels
          for (let quality = 80; quality >= 25; quality -= 10) {
            try {
              const buffer = await sharp(filePath)
                .resize(maxWidth, newHeight, { withoutEnlargement: true, fit: 'inside' })
                .webp({ quality })
                .toBuffer();
              
              if (buffer.length <= targetSize) {
                await fs.promises.writeFile(filePath, buffer);
                const newSize = fs.statSync(filePath).size;
                const reduction = Math.round((1 - newSize / oldSize) * 100);
                console.log(`✓ ${file}`);
                console.log(`  ${(oldSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (-${reduction}%)`);
                console.log(`  Resized: ${maxWidth}px width, quality: ${quality}`);
                compressed = true;
                successCount++;
                break;
              }
            } catch (e) {
              // Continue to next quality level
            }
          }
        }

        if (!compressed) {
          const newSize = fs.statSync(filePath).size;
          console.log(`⚠ ${file}: Still ${(newSize / 1024).toFixed(1)} KB`);
        }
      } catch (err) {
        console.error(`✗ ${file}: ${err.message}`);
      }
    }

    console.log(`\n✓ Compressed ${successCount}/${filesToCompress.length} files`);
    
  } catch (err) {
    console.error('Fatal error:', err.message);
  }
}

compressImages().catch(err => console.error(err));
