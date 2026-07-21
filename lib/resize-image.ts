/**
 * Resize an image file client-side to a maximum dimension.
 * Uses Canvas API to produce a compressed JPEG Data URL small enough
 * to save in MongoDB without hitting body size limits (default ~50-80 KB).
 *
 * @param file  The image file selected by the user
 * @param maxDimension  Maximum width or height in pixels (default 300)
 * @param quality  JPEG quality 0-1 (default 0.7)
 * @returns A Promise that resolves with the resized Data URL string
 */
export function resizeImage(
  file: File,
  maxDimension = 300,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read file."));

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error("Failed to decode image."));

      img.onload = () => {
        // Calculate new dimensions while preserving aspect ratio
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Draw resized image onto canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context."));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG Data URL
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
