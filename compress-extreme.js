(async () => {
const imagemin = (await import('imagemin')).default;
const imageminWebp = (await import('imagemin-webp')).default;
const fs = require('fs');
const path = require('path');

const imagesDir = 'images';
const targetSize = 100 * 1024;

async function aggressiveCompress() {
  try {
    const files = fs.readdirSync(imagesDir);
    const webpFiles = files
      .filter(f => f.endsWith('.webp') && !f.startsWith('.__tmp_'))
      .map(f => ({ name: f, size: fs.statSync(path.join(imagesDir, f)).size }))
      .sort((a, b) => b.size - a.size);

    const filesToCompress = webpFiles.filter(f => f.size > targetSize);

    if (filesToCompress.length === 0) {
      console.log('✓ All WebP files are already under 100KB!');
      return;
    }

    console.log(`Found ${filesToCompress.length} WebP files to compress\n`);
    let successCount = 0;

    for (const {name: file, size: oldSize} of filesToCompress) {
      console.log(`Processing: ${file} (${(oldSize/1024).toFixed(1)} KB)`);
      
      let compressed = false;
      const filePath = path.join(imagesDir, file);

      // Try extreme quality reduction
      const qualityLevels = [60, 50, 40, 30, 20, 15, 10, 5];
      
      for (const quality of qualityLevels) {
        if (compressed) break;
        
        try {
          await imagemin([filePath], {
            destination: imagesDir,
            plugins: [imageminWebp({ quality, alphaQuality: quality })]
          });

          const newSize = fs.statSync(filePath).size;
          
          if (newSize <= targetSize) {
            const reduction = Math.round((1 - newSize / oldSize) * 100);
            console.log(`✓ ${file}`);
            console.log(`  ${(oldSize/1024).toFixed(1)} KB → ${(newSize/1024).toFixed(1)} KB (-${reduction}%)\n`);
            compressed = true;
            successCount++;
          }
        } catch (e) {
          // Continue
        }
      }

      if (!compressed) {
        const finalSize = fs.statSync(filePath).size;
        console.log(`⚠ Could not compress below 100KB (final: ${(finalSize/1024).toFixed(1)} KB)\n`);
      }
    }

    console.log(`✓ Successfully compressed ${successCount}/${filesToCompress.length} files`);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

aggressiveCompress();
})();
