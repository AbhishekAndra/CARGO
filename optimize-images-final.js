const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imageDir = path.join(__dirname, 'images');
const MAX_BYTES = 100 * 1024;

function cleanTempFiles() {
  const files = fs.readdirSync(imageDir);
  for (const file of files) {
    if (file.startsWith('.__tmp_') && file.endsWith('.webp')) {
      const target = path.join(imageDir, file);
      try { fs.unlinkSync(target); } catch (err) {}
    }
  }
}

async function compressToUnderLimit(filePath) {
  const originalSize = fs.statSync(filePath).size;
  if (originalSize <= MAX_BYTES) return { file: filePath, originalSize, optimizedSize: originalSize, changed: false };

  const metadata = await sharp(filePath).metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 900;

  let optimizedBuffer = null;
  let finalSize = originalSize;

  for (const q of [75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15]) {
    for (const scale of [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15]) {
      const targetW = Math.max(1, Math.round(width * scale));
      const targetH = Math.max(1, Math.round(height * scale));

      optimizedBuffer = await sharp(filePath)
        .rotate()
        .resize({ width: targetW, height: targetH, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: q, effort: 6 })
        .toBuffer();

      finalSize = optimizedBuffer.length;
      if (finalSize <= MAX_BYTES) {
        break;
      }
    }
    if (optimizedBuffer && optimizedBuffer.length <= MAX_BYTES) {
      break;
    }
  }

  if (!optimizedBuffer || optimizedBuffer.length > MAX_BYTES) {
    const fallback = await sharp(filePath)
      .rotate()
      .resize({ width: Math.min(width, 800), height: Math.min(height, 600), fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 18, effort: 7 })
      .toBuffer();
    optimizedBuffer = fallback;
    finalSize = fallback.length;
  }

  const tempPath = path.join(imageDir, `.__tmp_${Date.now()}.webp`);
  fs.writeFileSync(tempPath, optimizedBuffer);
  fs.unlinkSync(filePath);
  fs.renameSync(tempPath, filePath);

  return {
    file: filePath,
    originalSize,
    optimizedSize: finalSize,
    changed: finalSize !== originalSize,
  };
}

async function main() {
  cleanTempFiles();
  const files = fs.readdirSync(imageDir)
    .filter((name) => name.toLowerCase().endsWith('.webp'))
    .sort();

  const results = [];
  for (const fileName of files) {
    const filePath = path.join(imageDir, fileName);
    const result = await compressToUnderLimit(filePath);
    results.push({ name: fileName, ...result });
    console.log(`${fileName}: ${(result.originalSize / 1024).toFixed(2)} KB -> ${(result.optimizedSize / 1024).toFixed(2)} KB`);
  }

  const overLimit = results.filter((item) => item.optimizedSize > MAX_BYTES);
  console.log(`\nSummary: ${results.length} WebP files processed. ${overLimit.length} still above 100 KB.`);
  if (overLimit.length) {
    for (const item of overLimit) {
      console.log(`- ${item.name}: ${(item.optimizedSize / 1024).toFixed(2)} KB`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
