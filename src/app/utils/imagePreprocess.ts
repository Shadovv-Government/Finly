// Tesseract accuracy degrades sharply on images smaller than ~1600px.
// We upscale small images first, then cap at 4096px to avoid memory issues.
const MIN_LONG_SIDE = 1600;
const MAX_LONG_SIDE = 4096;

/**
 * OCR-optimised preprocessing: grayscale + percentile contrast + Otsu binarization.
 * Produces pure black-on-white — ideal for Tesseract.
 *
 * EXIF orientation is handled automatically by the browser's Image element;
 * naturalWidth/naturalHeight already reflect the displayed orientation.
 */
export async function preprocessReceiptImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const longSide = Math.max(w, h);

      if (longSide < MIN_LONG_SIDE) {
        const scale = MIN_LONG_SIDE / longSide;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      } else if (longSide > MAX_LONG_SIDE) {
        const scale = MAX_LONG_SIDE / longSide;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      toGrayscaleContrast(imageData.data);
      binarizeOtsu(imageData.data);
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg',
        0.92,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

// Step 1: grayscale + percentile contrast stretch.
// Pulls the 1st/99th percentile to 0/255 — handles yellowed or faded paper.
// Exported for use in QR scanning pipeline (without Otsu binarization).
export function toGrayscaleContrast(data: Uint8ClampedArray) {
  const n = data.length / 4;
  const hist = new Uint32Array(256);

  for (let i = 0; i < n; i++) {
    const j = i * 4;
    hist[Math.round(0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2])]++;
  }

  const cutoff = Math.round(n * 0.01);
  let lo = 0, hi = 255, cumLo = 0, cumHi = 0;
  for (let v = 0; v < 256; v++) { cumLo += hist[v]; if (cumLo <= cutoff) lo = v; }
  for (let v = 255; v >= 0; v--) { cumHi += hist[v]; if (cumHi <= cutoff) hi = v; }
  const range = hi - lo || 1;

  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const gray = Math.round(0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]);
    const v = Math.min(255, Math.max(0, Math.round(((gray - lo) / range) * 255)));
    data[j] = data[j + 1] = data[j + 2] = v;
  }
}

// 3×3 box blur — low-pass filter that eliminates moiré patterns when
// photographing a monitor/screen. Each output pixel is the average of a 3×3
// neighbourhood. Fast (single-pass, separable equivalent) and preserves QR
// module edges when modules are ≥3px wide (our upscale target).
// Operates in-place on grayscale data (reads R channel, writes R/G/B).
export function boxBlur3x3(data: Uint8ClampedArray, width: number, height: number) {
  // Accumulate one row of 3 columns: colSum[x] = sum of 3 vertical pixels at (x, y)
  // We slide a 3×3 window: maintain 3 colSums, sum them for the kernel total.
  const stride = width * 4;
  const buf = new Uint8ClampedArray(data.length);

  for (let y = 1; y < height - 1; y++) {
    // Initialise column sums for the three rows of the window at x=0.
    const row = y * stride;
    let a = data[row - stride] + data[row] + data[row + stride];
    let b = data[row - stride + 4] + data[row + 4] + data[row + stride + 4];
    let c = data[row - stride + 8] + data[row + 8] + data[row + stride + 8];

    for (let x = 1; x < width - 1; x++) {
      // Shift window right: drop left column, add new right column.
      const avg = Math.round((a + b + c) / 9);
      const off = row + x * 4;
      buf[off] = buf[off + 1] = buf[off + 2] = avg;
      buf[off + 3] = data[off + 3]; // preserve alpha

      // Slide window: a gets b, b gets c, c is new column.
      const nx = (x + 2) * 4;
      a = b;
      b = c;
      c = data[row - stride + nx] + data[row + nx] + data[row + stride + nx];
    }
  }

  // Copy back, leaving the 1px border untouched (minor edge case — receipt
  // QR codes are never at the extreme edge of the image).
  for (let i = stride + 4; i < data.length - stride - 4; i++) {
    if (buf[i] !== 0) data[i] = buf[i];
  }
}

// Step 2: Otsu binarization — finds the optimal threshold that maximises
// inter-class variance, producing pure black text on white background.
// Thermal receipt paper responds very well to this approach.
function binarizeOtsu(data: Uint8ClampedArray) {
  const n = data.length / 4;
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[data[i * 4]]++;

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mDiff = sumB / wB - (sum - sumB) / wF;
    const variance = wB * wF * mDiff * mDiff;
    if (variance > maxVar) { maxVar = variance; threshold = t; }
  }

  for (let i = 0; i < n; i++) {
    const v = data[i * 4] >= threshold ? 255 : 0;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
  }
}
