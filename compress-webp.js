(async () => {
const imagemin = (await import('imagemin')).default;
const imageminWebp = (await import('imagemin-webp')).default;
const fs = require('fs');
const path = require('path');

const imagesDir = 'images';
const targetSize = 100 * 1024; // 100 KB

async function compressWebP() {
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

    console.log(`Found ${filesToCompress.length} WebP files to compress...\n`);

    for (const file of filesToCompress) {
      const filePath = path.join(imagesDir, file);
      const oldSize = fs.statSync(filePath).size;
      
      try {
        // Try different quality levels
        for (let quality = 75; quality >= 10; quality -= 5) {
          await imagemin([filePath], {
            destination: imagesDir,
            plugins: [imageminWebp({ quality })]
          });

          const newSize = fs.statSync(filePath).size;
          if (newSize <= targetSize) {
            const reduction = Math.round((1 - newSize / oldSize) * 100);
            console.log(`✓ ${file}`);
            console.log(`  ${(oldSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${reduction}% reduction)`);
            break;
          }
        }

        // Check if we still need to resize
        const finalSize = fs.statSync(filePath).size;
        if (finalSize > targetSize) {
          console.log(`⚠ ${file} could not be compressed to under 100KB (final: ${(finalSize / 1024).toFixed(1)} KB)`);
        }
      } catch (err) {
        console.error(`✗ Error compressing ${file}: ${err.message}`);
      }
    }

    console.log('\n✓ Compression complete!');
  } catch (err) {
    console.error('Error:', err);
  }
}

compressWebP();
})();
