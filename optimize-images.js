const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imageDir = path.join(__dirname, 'images');
const maxBytes = 100 * 1024;
const allowedExtensions = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif']);

function logStep(message) {
  console.log(message);
}

async function convertLegacyImages() {
  const entries = fs.readdirSync(imageDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const originalPath = path.join(imageDir, entry.name);
    const ext = path.extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext) || ext === '.webp') continue;

    const targetName = entry.name.replace(/\.[^/.]+$/, '.webp');
    const targetPath = path.join(imageDir, targetName);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(originalPath);
      logStep(`Replaced legacy image ${entry.name} with existing ${targetName}`);
      continue;
    }

    await sharp(originalPath)
      .rotate()
      .webp({ quality: 78, effort: 6 })
      .toFile(targetPath);

    fs.unlinkSync(originalPath);
    logStep(`Converted ${entry.name} to ${targetName}`);
  }
}

async function optimizeWebP(pathToFile) {
  const stats = fs.statSync(pathToFile);
  const currentSize = stats.size;
  if (currentSize <= maxBytes) return currentSize;

  const metadata = await sharp(pathToFile).metadata();
  const naturalWidth = metadata.width || 1200;
  const naturalHeight = metadata.height || 900;

  const scales = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4];
  const qualities = [75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25];

  for (const quality of qualities) {
    for (const scale of scales) {
      const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
      const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

      const buffer = await sharp(pathToFile)
        .rotate()
        .resize({
          width: targetWidth,
          height: targetHeight,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 6 })
        .toBuffer();

      if (buffer.length <= maxBytes) {
        fs.writeFileSync(pathToFile, buffer);
        return buffer.length;
      }
    }
  }

  const fallback = await sharp(pathToFile)
    .rotate()
    .resize({
      width: Math.min(naturalWidth, 900),
      height: Math.min(naturalHeight, 700),
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 28, effort: 7 })
    .toBuffer();

  fs.writeFileSync(pathToFile, fallback);
  return fallback.length;
}

async function optimizeAllImages() {
  const entries = fs.readdirSync(imageDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(webp|jpg|jpeg|png|avif)$/i.test(name));

  let compressedCount = 0;
  let underLimitCount = 0;
  let overLimitFiles = [];

  for (const fileName of files) {
    const filePath = path.join(imageDir, fileName);
    const ext = path.extname(fileName).toLowerCase();

    if (ext !== '.webp') {
      continue;
    }

    const originalSize = fs.statSync(filePath).size;
    const optimizedSize = await optimizeWebP(filePath);

    if (optimizedSize !== originalSize) {
      compressedCount += 1;
    }

    if (optimizedSize <= maxBytes) {
      underLimitCount += 1;
    } else {
      overLimitFiles.push({ name: fileName, size: optimizedSize });
    }

    logStep(`${fileName}: ${(originalSize / 1024).toFixed(2)} KB -> ${(optimizedSize / 1024).toFixed(2)} KB`);
  }

  logStep(`\nSummary: ${files.length} image files scanned; ${compressedCount} compressed; ${underLimitCount} under 100 KB; ${overLimitFiles.length} still over limit.`);
  if (overLimitFiles.length) {
    logStep('Remaining over-limit files:');
    overLimitFiles.forEach((item) => logStep(`- ${item.name}: ${(item.size / 1024).toFixed(2)} KB`));
  }
}

(async () => {
  await convertLegacyImages();
  await optimizeAllImages();
})();
