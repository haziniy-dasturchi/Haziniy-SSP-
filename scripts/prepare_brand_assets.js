const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function crop(srcPng, minX, minY, width, height) {
  const dst = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = ((minY + y) * srcPng.width + (minX + x)) * 4;
      const dstIdx = (y * width + x) * 4;
      dst.data[dstIdx] = srcPng.data[srcIdx];
      dst.data[dstIdx + 1] = srcPng.data[srcIdx + 1];
      dst.data[dstIdx + 2] = srcPng.data[srcIdx + 2];
      dst.data[dstIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }
  return dst;
}

// Bilinear resize for high quality downsampling
function resize(srcPng, targetWidth, targetHeight) {
  const dst = new PNG({ width: targetWidth, height: targetHeight });
  const xRatio = srcPng.width / targetWidth;
  const yRatio = srcPng.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const px = x * xRatio;
      const py = y * yRatio;
      const x1 = Math.floor(px);
      const y1 = Math.floor(py);
      const x2 = Math.min(x1 + 1, srcPng.width - 1);
      const y2 = Math.min(y1 + 1, srcPng.height - 1);

      const xDiff = px - x1;
      const yDiff = py - y1;

      const idx11 = (y1 * srcPng.width + x1) * 4;
      const idx12 = (y1 * srcPng.width + x2) * 4;
      const idx21 = (y2 * srcPng.width + x1) * 4;
      const idx22 = (y2 * srcPng.width + x2) * 4;

      const dstIdx = (y * targetWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        const val =
          srcPng.data[idx11 + c] * (1 - xDiff) * (1 - yDiff) +
          srcPng.data[idx12 + c] * xDiff * (1 - yDiff) +
          srcPng.data[idx21 + c] * (1 - xDiff) * yDiff +
          srcPng.data[idx22 + c] * xDiff * yDiff;
        dst.data[dstIdx + c] = Math.round(val);
      }
    }
  }
  return dst;
}

function findBounds(srcPng) {
  let minX = srcPng.width, maxX = 0, minY = srcPng.height, maxY = 0;
  for (let y = 0; y < srcPng.height; y++) {
    for (let x = 0; x < srcPng.width; x++) {
      const idx = (y * srcPng.width + x) * 4;
      if (srcPng.data[idx + 3] > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function savePng(pngObj, outPath) {
  const buffer = PNG.sync.write(pngObj);
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved: ${outPath} (${pngObj.width}x${pngObj.height}, ${(buffer.length/1024).toFixed(1)} KB)`);
}

function main() {
  const brandDir = path.resolve('web/public/brand');
  if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

  console.log('1. Processing Full Logo on Green (haziniy-16.png)...');
  const raw16 = PNG.sync.read(fs.readFileSync('Logo/PNG/haziniy-16.png'));
  const b16 = findBounds(raw16);
  const cropped16 = crop(raw16, b16.minX, b16.minY, b16.width, b16.height);
  const logoOnGreen = resize(cropped16, 500, Math.round(500 * (b16.height / b16.width)));
  savePng(logoOnGreen, path.join(brandDir, 'logo-full-on-green.png'));

  console.log('2. Processing Full Logo on White (haziniy-14.png)...');
  const raw14 = PNG.sync.read(fs.readFileSync('Logo/PNG/haziniy-14.png'));
  const b14 = findBounds(raw14);
  const cropped14 = crop(raw14, b14.minX, b14.minY, b14.width, b14.height);
  const logoOnWhite = resize(cropped14, 500, Math.round(500 * (b14.height / b14.width)));
  savePng(logoOnWhite, path.join(brandDir, 'logo-full-on-white.png'));

  console.log('3. Processing Mark Symbol...');
  // The mark in haziniy-14 is on the left side:
  // Let's find the left-side mark bounds (from minX to the gap before wordmark)
  let markMaxX = b14.minX;
  for (let x = b14.minX; x < b14.minX + Math.round(b14.width * 0.45); x++) {
    let colPixels = 0;
    for (let y = b14.minY; y <= b14.maxY; y++) {
      if (raw14.data[(y * raw14.width + x) * 4 + 3] > 30) colPixels++;
    }
    if (colPixels > 0) markMaxX = x;
  }
  const markWidth = markMaxX - b14.minX + 1;
  const croppedMark = crop(raw14, b14.minX, b14.minY, markWidth, b14.height);
  
  // Make it square with padding
  const maxDim = Math.max(croppedMark.width, croppedMark.height);
  const squareMark = new PNG({ width: maxDim, height: maxDim });
  const offsetX = Math.floor((maxDim - croppedMark.width) / 2);
  const offsetY = Math.floor((maxDim - croppedMark.height) / 2);

  for (let y = 0; y < croppedMark.height; y++) {
    for (let x = 0; x < croppedMark.width; x++) {
      const srcIdx = (y * croppedMark.width + x) * 4;
      const dstIdx = ((offsetY + y) * maxDim + (offsetX + x)) * 4;
      squareMark.data[dstIdx] = croppedMark.data[srcIdx];
      squareMark.data[dstIdx + 1] = croppedMark.data[srcIdx + 1];
      squareMark.data[dstIdx + 2] = croppedMark.data[srcIdx + 2];
      squareMark.data[dstIdx + 3] = croppedMark.data[srcIdx + 3];
    }
  }

  savePng(resize(squareMark, 512, 512), path.join(brandDir, 'pwa-512x512.png'));
  savePng(resize(squareMark, 192, 192), path.join(brandDir, 'pwa-192x192.png'));
  savePng(resize(squareMark, 180, 180), path.join(brandDir, 'apple-touch-icon.png'));
  savePng(resize(squareMark, 64, 64), path.join(brandDir, 'logo-mark.png'));
  savePng(resize(squareMark, 32, 32), path.join(brandDir, 'favicon.png'));
  savePng(resize(squareMark, 32, 32), path.resolve('web/public/favicon.png'));

  // Also create white mark for collapsed dark green sidebar
  const whiteSquareMark = new PNG({ width: maxDim, height: maxDim });
  for (let i = 0; i < squareMark.data.length; i += 4) {
    if (squareMark.data[i + 3] > 20) {
      whiteSquareMark.data[i] = 255;
      whiteSquareMark.data[i + 1] = 255;
      whiteSquareMark.data[i + 2] = 255;
      whiteSquareMark.data[i + 3] = squareMark.data[i + 3];
    }
  }
  savePng(resize(whiteSquareMark, 64, 64), path.join(brandDir, 'logo-mark-white.png'));

  console.log('✅ All brand assets successfully prepared in web/public/brand/!');
}

main();
