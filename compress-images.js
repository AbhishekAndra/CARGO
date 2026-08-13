const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');
const targetSize = 100 * 1024; // 100 KB in bytes

async function compressImage(filePath) {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase();
  
  // Skip video files
  if (['.mp4', '.avif'].includes(ext)) {
    console.log(`⊘ Skipping video: ${filename}`);
    return;
  }

  try {
    const oldSize = fs.statSync(filePath).size;
    
    // Check if already WebP and under 100KB
    if (ext === '.webp' && oldSize <= targetSize) {
      console.log(`✓ ${filename} (already under 100KB - no changes needed)`);
      return;
    }

    let quality = 80;
    let buffer;
    let outputPath = ext === '.webp' ? filePath : filePath.replace(ext, '.webp');
    let metadata;

    try {
      metadata = await sharp(filePath).metadata();
    } catch (e) {
      console.log(`⊘ Skipping ${filename} (unsupported format)`);
      return;
    }

    // Try different quality levels to get under 100KB
    while (quality > 10) {
      try {
        buffer = await sharp(filePath)
          .webp({ quality })
          .toBuffer();

        if (buffer.length <= targetSize) {
          break;
        }
      } catch (e) {
        quality -= 5;
        continue;
      }
      quality -= 5;
    }

    // If still over 100KB, resize image
    if (buffer && buffer.length > targetSize) {
      const scaleFactor = Math.sqrt(targetSize / buffer.length);
      const newWidth = Math.floor(metadata.width * scaleFactor);

      buffer = await sharp(filePath)
        .resize(newWidth, null, { withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
    }

    if (buffer) {
      // Write the new file
      fs.writeFileSync(outputPath, buffer);
      const newSize = buffer.length;
      const reduction = Math.round((1 - newSize / oldSize) * 100);

      console.log(`✓ ${filename} → ${path.basename(outputPath)}`);
      console.log(`  ${(oldSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${reduction}% reduction)`);

      // Delete original if it's a different file
      if (outputPath !== filePath) {
        fs.unlinkSync(filePath);
        console.log(`  Removed original`);
      }
    }
  } catch (error) {
    console.error(`✗ Error processing ${filename}: ${error.message}`);
  }
}

async function processAllImages() {
  const files = fs.readdirSync(imagesDir);
  
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isFile()) {
      await compressImage(filePath);
    }
  }
  
  console.log('\n✓ Image compression complete!');
}

processAllImages().catch(console.error);
