"use client";

/* Shrink a photo on the phone before it travels.
 *
 * A raw phone photo is 3–5 MB; a receipt or a visit snapshot needs nothing
 * like that. Capped at 1600px on the long edge and re-encoded as JPEG, the
 * same picture is ~200–400 KB — perfectly legible, a tenth of the rep's data
 * plan, and a tenth of the storage bill.
 *
 * Only images shrink. Anything else — a PDF invoice, a voice note — passes
 * through untouched, as does an image the browser cannot decode (better to
 * store the original than to lose the receipt to a HEIC quirk).
 */
export async function compressImage(file: File): Promise<File> {
  if (!/^image\//.test(file.type)) return file;
  if (file.size < 300 * 1024) return file; // already small — recompressing only loses quality

  try {
    const bitmap = await createImageBitmap(file);
    const MAX = 1600;
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!blob || blob.size >= file.size) return file; // shrinking made it bigger — keep the original

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
