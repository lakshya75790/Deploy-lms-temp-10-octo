/**
 * Robust Signature Background Removal and Transparency Processor
 * Supports signatures on white paper, shadows/gradients, colored paper (yellow, pink, blue, cream),
 * and patterned paper (lined notebook paper, dot grid, paper grain/textures).
 */

/**
 * Processes raw ImageData to extract ink strokes and remove paper/surface backgrounds with soft alpha matting
 * @param {ImageData|Object} imgData - Canvas ImageData object containing .data, .width, .height
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {ImageData|Object} Processed ImageData with background removed and transparency applied
 */
export function processSignatureImageData(imgData, width, height) {
  const data = imgData.data;
  const totalPixels = width * height;

  // 1. Check for pre-existing clean transparency (e.g. user already provided transparent PNG)
  let transparentPixels = 0;
  let borderTransparent = 0;
  const borderWidth = Math.max(1, Math.floor(width * 0.05));
  const borderHeight = Math.max(1, Math.floor(height * 0.05));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 50) {
        transparentPixels++;
        if (x < borderWidth || x >= width - borderWidth || y < borderHeight || y >= height - borderHeight) {
          borderTransparent++;
        }
      }
    }
  }

  // If already transparent PNG with transparent borders, preserve it cleanly
  const borderTotal = (2 * borderWidth * height) + (2 * borderHeight * width) - (4 * borderWidth * borderHeight);
  if (transparentPixels / totalPixels > 0.1 && borderTransparent / borderTotal > 0.4) {
    // Just clean up faint semi-transparent stray artifacts (< 12 alpha)
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 12) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }
    return imgData;
  }

  // 2. Sample Border Pixels to estimate global background color and noise floor
  const bgSamplesR = [];
  const bgSamplesG = [];
  const bgSamplesB = [];
  const bgSamplesY = [];

  const samplePixel = (x, y) => {
    const idx = (y * width + x) * 4;
    const a = data[idx + 3];
    if (a > 100) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      bgSamplesR.push(r);
      bgSamplesG.push(g);
      bgSamplesB.push(b);
      bgSamplesY.push(lum);
    }
  };

  // Sample top and bottom borders
  for (let y = 0; y < borderHeight; y++) {
    for (let x = 0; x < width; x += 2) samplePixel(x, y);
  }
  for (let y = height - borderHeight; y < height; y++) {
    for (let x = 0; x < width; x += 2) samplePixel(x, y);
  }
  // Sample left and right borders
  for (let y = borderHeight; y < height - borderHeight; y += 2) {
    for (let x = 0; x < borderWidth; x++) samplePixel(x, y);
    for (let x = width - borderWidth; x < width; x++) samplePixel(x, y);
  }

  if (bgSamplesY.length === 0) {
    return imgData; // Fallback
  }

  // Calculate median / average background color
  const sampleCount = bgSamplesY.length;
  const meanBgR = bgSamplesR.reduce((a, b) => a + b, 0) / sampleCount;
  const meanBgG = bgSamplesG.reduce((a, b) => a + b, 0) / sampleCount;
  const meanBgB = bgSamplesB.reduce((a, b) => a + b, 0) / sampleCount;
  const meanBgY = bgSamplesY.reduce((a, b) => a + b, 0) / sampleCount;

  // Calculate background color variance (noise floor / pattern intensity)
  let sumSqDiff = 0;
  for (let i = 0; i < sampleCount; i++) {
    const dist = Math.sqrt(
      0.299 * (bgSamplesR[i] - meanBgR) ** 2 +
      0.587 * (bgSamplesG[i] - meanBgG) ** 2 +
      0.114 * (bgSamplesB[i] - meanBgB) ** 2
    );
    sumSqDiff += dist * dist;
  }
  const stdDevBg = Math.sqrt(sumSqDiff / sampleCount);

  // 3. Construct Local Background Illumination Grid (16x16 tiles) to handle phone camera shadows/gradients
  const GRID_SIZE = 16;
  const tileW = width / GRID_SIZE;
  const tileH = height / GRID_SIZE;
  const localBgGrid = [];

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    localBgGrid[gy] = [];
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const startX = Math.floor(gx * tileW);
      const endX = Math.floor((gx + 1) * tileW);
      const startY = Math.floor(gy * tileH);
      const endY = Math.floor((gy + 1) * tileH);

      const tileLums = [];
      const tileR = [];
      const tileG = [];
      const tileB = [];

      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          tileLums.push(lum);
          tileR.push(r);
          tileG.push(g);
          tileB.push(b);
        }
      }

      if (tileLums.length > 0) {
        // In signature paper, the 85th percentile represents the local paper surface
        const sortedIndices = tileLums.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
        const topIdx = Math.floor(sortedIndices.length * 0.85);
        const selected = sortedIndices.slice(Math.max(0, topIdx - 5), topIdx + 5);

        let tr = 0, tg = 0, tb = 0, ty = 0;
        for (const item of selected) {
          tr += tileR[item.idx];
          tg += tileG[item.idx];
          tb += tileB[item.idx];
          ty += item.val;
        }
        tr /= selected.length;
        tg /= selected.length;
        tb /= selected.length;
        ty /= selected.length;

        localBgGrid[gy][gx] = { r: tr, g: tg, b: tb, y: ty };
      } else {
        localBgGrid[gy][gx] = { r: meanBgR, g: meanBgG, b: meanBgB, y: meanBgY };
      }
    }
  }

  // 4. Dynamic threshold calculation
  // Paper texture, notebook lines, and background patterns have contrast typically up to 28-32,
  // while pen strokes typically have contrast 50-200+.
  let lowThreshold = Math.max(28, stdDevBg * 2.5);
  // Cap lowThreshold so faint pen flourishes are never clipped
  lowThreshold = Math.min(38, Math.max(28, lowThreshold));
  const highThreshold = lowThreshold + 30;

  // 5. Pixel processing: calculate contrast and soft alpha
  const newAlpha = new Uint8Array(totalPixels);
  const cleanR = new Uint8Array(totalPixels);
  const cleanG = new Uint8Array(totalPixels);
  const cleanB = new Uint8Array(totalPixels);

  for (let y = 0; y < height; y++) {
    // Find local background tile with bilinear interpolation
    const gyFloat = (y / height) * GRID_SIZE - 0.5;
    const gy0 = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gyFloat)));
    const gy1 = Math.max(0, Math.min(GRID_SIZE - 1, gy0 + 1));
    const ty = Math.max(0, Math.min(1, gyFloat - gy0));

    for (let x = 0; x < width; x++) {
      const gxFloat = (x / width) * GRID_SIZE - 0.5;
      const gx0 = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gxFloat)));
      const gx1 = Math.max(0, Math.min(GRID_SIZE - 1, gx0 + 1));
      const tx = Math.max(0, Math.min(1, gxFloat - gx0));

      const b00 = localBgGrid[gy0][gx0];
      const b10 = localBgGrid[gy0][gx1];
      const b01 = localBgGrid[gy1][gx0];
      const b11 = localBgGrid[gy1][gx1];

      // Interpolated local background color
      const localR = (1 - tx) * ((1 - ty) * b00.r + ty * b01.r) + tx * ((1 - ty) * b10.r + ty * b11.r);
      const localG = (1 - tx) * ((1 - ty) * b00.g + ty * b01.g) + tx * ((1 - ty) * b10.g + ty * b11.g);
      const localB = (1 - tx) * ((1 - ty) * b00.b + ty * b01.b) + tx * ((1 - ty) * b10.b + ty * b11.b);
      const localY = 0.299 * localR + 0.587 * localG + 0.114 * localB;

      const pIdx = y * width + x;
      const idx = pIdx * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const pixelY = 0.299 * r + 0.587 * g + 0.114 * b;

      // Luminance contrast (how much darker is pixel compared to local paper)
      const deltaY = localY - pixelY;

      // Color distance from local paper
      const deltaC = Math.sqrt(
        0.299 * (r - localR) ** 2 +
        0.587 * (g - localG) ** 2 +
        0.114 * (b - localB) ** 2
      );

      // Contrast metric combines darkness and color difference
      const contrast = Math.max(deltaY, deltaC * 0.95);

      if (contrast <= lowThreshold) {
        newAlpha[pIdx] = 0;
      } else if (contrast >= highThreshold) {
        newAlpha[pIdx] = 255;
        // Clean ink color
        cleanR[pIdx] = r;
        cleanG[pIdx] = g;
        cleanB[pIdx] = b;
      } else {
        // Smooth transition (Hermite smoothstep)
        const t = (contrast - lowThreshold) / (highThreshold - lowThreshold);
        const smoothT = t * t * (3 - 2 * t);
        const alpha = Math.round(smoothT * 255);
        newAlpha[pIdx] = alpha;

        // Background color de-mixing on edge pixels
        const normA = alpha / 255;
        cleanR[pIdx] = Math.max(0, Math.min(255, Math.round((r - (1 - normA) * localR) / normA)));
        cleanG[pIdx] = Math.max(0, Math.min(255, Math.round((g - (1 - normA) * localG) / normA)));
        cleanB[pIdx] = Math.max(0, Math.min(255, Math.round((b - (1 - normA) * localB) / normA)));
      }
    }
  }

  // 6. Despeckle pass: remove isolated noise dots (single pixels with no neighbors)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pIdx = y * width + x;
      if (newAlpha[pIdx] > 0 && newAlpha[pIdx] < 220) {
        let neighborCount = 0;
        if (newAlpha[pIdx - 1] > 0) neighborCount++;
        if (newAlpha[pIdx + 1] > 0) neighborCount++;
        if (newAlpha[pIdx - width] > 0) neighborCount++;
        if (newAlpha[pIdx + width] > 0) neighborCount++;
        if (newAlpha[pIdx - width - 1] > 0) neighborCount++;
        if (newAlpha[pIdx - width + 1] > 0) neighborCount++;
        if (newAlpha[pIdx + width - 1] > 0) neighborCount++;
        if (newAlpha[pIdx + width + 1] > 0) neighborCount++;

        if (neighborCount <= 1) {
          newAlpha[pIdx] = 0;
        }
      }
    }
  }

  // 7. Write back to ImageData
  for (let pIdx = 0; pIdx < totalPixels; pIdx++) {
    const idx = pIdx * 4;
    const a = newAlpha[pIdx];
    if (a === 0) {
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = 0;
    } else {
      data[idx] = cleanR[pIdx];
      data[idx + 1] = cleanG[pIdx];
      data[idx + 2] = cleanB[pIdx];
      data[idx + 3] = a;
    }
  }

  return imgData;
}

/**
 * Automatically makes an uploaded signature image transparent by removing paper backgrounds
 * (white, colored, and patterned) using HTML5 Canvas processing.
 *
 * @param {File|Blob} file - The original uploaded file
 * @returns {Promise<File>} - Resolves with a transparent PNG File
 */
export const processTransparentSignature = (file) => {
  return new Promise((resolve) => {
    if (!file || !(file instanceof Blob)) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Scale down if image is excessively large to optimize performance while preserving high-DPI detail
          let width = img.width;
          let height = img.height;
          const maxDimension = 2000;
          if (width > maxDimension || height > maxDimension) {
            const scale = maxDimension / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, width, height);

          const imgData = ctx.getImageData(0, 0, width, height);
          processSignatureImageData(imgData, width, height);
          ctx.putImageData(imgData, 0, 0);

          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
              const originalName = file.name || 'signature';
              const baseName = originalName.replace(/\.[^/.]+$/, '');
              const processedFile = new File([blob], `${baseName}_transparent.png`, {
                type: 'image/png',
                lastModified: Date.now()
              });
              resolve(processedFile);
            } else {
              resolve(file);
            }
          }, 'image/png');
        } catch (err) {
          console.warn('Transparent signature canvas processing fallback:', err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

