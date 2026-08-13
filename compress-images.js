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
    let quality = 80;
    let buffer;
    let outputPath = filePath.replace(ext, '.webp');

    // Try different quality levels to get under 100KB
    while (quality > 10) {
      buffer = await sharp(filePath)
        .webp({ quality })
        .toBuffer();

      if (buffer.length <= targetSize) {
        break;
      }
      quality -= 5;
    }

    // If still over 100KB, resize image
    if (buffer.length > targetSize) {
      const metadata = await sharp(filePath).metadata();
      const scaleFactor = Math.sqrt(targetSize / buffer.length);
      const newWidth = Math.floor(metadata.width * scaleFactor);

      buffer = await sharp(filePath)
        .resize(newWidth, null, { withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
    }

    // Write the new file
    fs.writeFileSync(outputPath, buffer);
    const oldSize = fs.statSync(filePath).size;
    const newSize = buffer.length;
    const reduction = Math.round((1 - newSize / oldSize) * 100);

    console.log(`✓ ${filename} → ${path.basename(outputPath)}`);
    console.log(`  ${(oldSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${reduction}% reduction)`);

    // Delete original if it's not already a webp
    if (ext !== '.webp') {
      fs.unlinkSync(filePath);
      console.log(`  Removed original`);
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
