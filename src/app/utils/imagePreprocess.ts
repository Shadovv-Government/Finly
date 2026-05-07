// Tesseract accuracy degrades sharply on images smaller than ~1600px.
// We upscale small images first, then cap at 4096px to avoid memory issues.
const MIN_LONG_SIDE = 1600;
const MAX_LONG_SIDE = 4096;

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

export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
