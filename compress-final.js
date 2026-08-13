const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = 'images';
const targetSize = 100 * 1024; // 100 KB

async function compressLargeWebP() {
  try {
    // Get all WebP files over 100KB
    const files = fs.readdirSync(imagesDir);
    const filesToCompress = files
      .filter(f => f.endsWith('.webp'))
      .filter(f => fs.statSync(path.join(imagesDir, f)).size > targetSize);

    if (filesToCompress.length === 0) {
      console.log('✓ All WebP files are already under 100KB!');
      return;
    }

    console.log(`Compressing ${filesToCompress.length} WebP files...\n`);

    for (const file of filesToCompress) {
      const filePath = path.join(imagesDir, file);
      const oldSize = fs.statSync(filePath).size;
      
      try {
        // First, try reducing quality
        let quality = 70;
        let buffer = await sharp(filePath).webp({ quality }).toBuffer();

        // If still too large, resize and reduce quality
        if (buffer.length > targetSize) {
          const metadata = await sharp(filePath).metadata();
          let scaleFactor = Math.sqrt(targetSize / buffer.length);
          
          // Try different scales
          while (scaleFactor > 0.3 && buffer.length > targetSize) {
            const newWidth = Math.floor(metadata.width * scaleFactor);
            buffer = await sharp(filePath)
              .resize(newWidth, null, { withoutEnlargement: true })
              .webp({ quality: 60 })
              .toBuffer();
            scaleFactor -= 0.1;
          }
        }

        fs.writeFileSync(filePath, buffer);
        const newSize = buffer.length;
        const reduction = Math.round((1 - newSize / oldSize) * 100);

        if (newSize <= targetSize) {
          console.log(`✓ ${file}`);
          console.log(`  ${(oldSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${reduction}% reduction)`);
        } else {
          console.log(`⚠ ${file} (final: ${(newSize / 1024).toFixed(1)} KB - compressed but still over limit)`);
        }
      } catch (err) {
        console.error(`✗ Error with ${file}: ${err.message}`);
      }
    }

    console.log('\n✓ Compression complete!');
  } catch (err) {
    console.error('Error:', err);
  }
}

compressLargeWebP();
