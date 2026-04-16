/**
 * Client-side image compression. Handles modern phone photos (10-30 MB)
 * by downscaling and re-encoding to JPEG/WebP before upload.
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeMB?: number;
  quality?: number; // 0-1
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
      type,
      quality
    );
  });

/**
 * Compress an image file. Returns a new File. SVG and small files are returned as-is.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    maxSizeMB = 1.5,
    quality = 0.82,
    mimeType = 'image/jpeg',
  } = opts;

  // Skip non-images, SVGs, GIFs (animation), and already small files
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  if (file.size <= maxSizeMB * 1024 * 1024 && file.size <= 2 * 1024 * 1024) return file;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file; // fall back to original on decode failure
  }

  // Compute scaled dimensions while preserving aspect ratio
  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  // Iteratively reduce quality until under target size
  let q = quality;
  let blob = await canvasToBlob(canvas, mimeType, q);
  while (blob.size > maxSizeMB * 1024 * 1024 && q > 0.4) {
    q -= 0.1;
    blob = await canvasToBlob(canvas, mimeType, q);
  }

  // If still too big, downscale further
  if (blob.size > maxSizeMB * 1024 * 1024) {
    canvas.width = Math.round(width * 0.75);
    canvas.height = Math.round(height * 0.75);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, mimeType, 0.75);
  }

  const ext = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.${ext}`, { type: mimeType, lastModified: Date.now() });
}
