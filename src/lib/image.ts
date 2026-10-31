// Phone photos are often 3-8 MB, which is slow on rural mobile data and over
// Vercel's 4.5 MB request limit. Shrink to ~1.5 MP JPEG (Claude downsizes to
// about this anyway) before sending: typically 200-400 KB.

const MAX_EDGE = 1568;
const QUALITY = 0.82;

export async function shrinkPhoto(file: File): Promise<{ base64: string; mediaType: "image/jpeg"; previewUrl: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mediaType: "image/jpeg", previewUrl: dataUrl };
}
