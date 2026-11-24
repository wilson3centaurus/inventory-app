// Shop logos are stored as small data URLs on the organization row.
export const MAX_LOGO_DATA_URL_LENGTH = 400_000;
const LOGO_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function isValidLogoDataUrl(value: string) {
  return value.length <= MAX_LOGO_DATA_URL_LENGTH && LOGO_DATA_URL_PATTERN.test(value);
}

/** Resize an uploaded image in the browser so it fits in a 256px square. */
export async function resizeLogoFile(file: File, size = 256): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) throw new Error("Choose a PNG, JPG, WebP, GIF or SVG image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("That image is larger than 8 MB. Choose a smaller file.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("That file could not be read as an image."));
      element.src = objectUrl;
    });
    const scale = Math.min(1, size / Math.max(image.naturalWidth || size, image.naturalHeight || size));
    const width = Math.max(1, Math.round((image.naturalWidth || size) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || size) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not process the image.");
    context.drawImage(image, 0, 0, width, height);
    const webp = canvas.toDataURL("image/webp", 0.9);
    const dataUrl = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
    if (!isValidLogoDataUrl(dataUrl)) throw new Error("The logo is still too large after resizing. Try a simpler image.");
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
