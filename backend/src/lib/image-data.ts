const IMAGE_DATA_URL_PATTERN = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\r\n]+)$/;

export function decodeImageDataUrl(dataUrl: string): { contentType: string; bytes: Buffer } | null {
  const match = IMAGE_DATA_URL_PATTERN.exec(dataUrl);
  const contentType = match?.[1];
  const base64 = match?.[2]?.replace(/\s/g, "");
  if (!contentType || !base64) return null;

  try {
    const bytes = Buffer.from(base64, "base64");
    return bytes.length > 0 ? { contentType, bytes } : null;
  } catch {
    return null;
  }
}

export function imageDataUrlToFile(dataUrl: string, filenamePrefix = "room"): File | null {
  const decoded = decodeImageDataUrl(dataUrl);
  if (!decoded) return null;

  const extension = decoded.contentType === "image/jpeg" || decoded.contentType === "image/jpg"
    ? "jpg"
    : decoded.contentType.split("/")[1];
  return new File([decoded.bytes], `${filenamePrefix}.${extension}`, { type: decoded.contentType });
}
