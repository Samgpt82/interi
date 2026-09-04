import { decodeImageDataUrl } from "../lib/image-data";

const STORAGE_BASE_URL = "https://storage.vibecodeapp.com/v1/files";
const STORAGE_TIMEOUT_MS = 12_000;
const STORAGE_RETRY_DELAYS_MS = [500];
const TRANSIENT_STORAGE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface StoredFile {
  id: string;
  url: string;
}

interface StorageUploadResponse {
  file: StoredFile;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function uploadImage(dataUrl: string, filename: string): Promise<StoredFile> {
  const decoded = decodeImageDataUrl(dataUrl);
  if (!decoded) throw new Error("Invalid image data");

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= STORAGE_RETRY_DELAYS_MS.length; attempt += 1) {
    let response: Response;
    try {
      const formData = new FormData();
      formData.append("file", new File([decoded.bytes], filename, { type: decoded.contentType }));
      response = await fetch(`${STORAGE_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Image upload failed");
      if (attempt >= STORAGE_RETRY_DELAYS_MS.length) break;
      await wait(STORAGE_RETRY_DELAYS_MS[attempt]!);
      continue;
    }

    const result = (await response.json().catch(() => null)) as StorageUploadResponse | { error?: string } | null;
    if (response.ok && result && "file" in result) return result.file;

    const message = result && "error" in result ? result.error : undefined;
    lastError = new Error(message ?? `Image upload failed (${response.status})`);
    if (!TRANSIENT_STORAGE_STATUSES.has(response.status)) throw lastError;
    if (attempt >= STORAGE_RETRY_DELAYS_MS.length) break;
    await wait(STORAGE_RETRY_DELAYS_MS[attempt]!);
  }

  throw lastError ?? new Error("Image upload failed");
}

export async function downloadImage(url: string, filename: string): Promise<File> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= STORAGE_RETRY_DELAYS_MS.length; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Image download failed");
      if (attempt >= STORAGE_RETRY_DELAYS_MS.length) break;
      await wait(STORAGE_RETRY_DELAYS_MS[attempt]!);
      continue;
    }

    if (response.ok) {
      const contentType = response.headers.get("content-type") ?? "image/jpeg";
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 0) return new File([bytes], filename, { type: contentType });
      lastError = new Error("Image download returned an empty file");
    } else {
      lastError = new Error(`Image download failed (${response.status})`);
      if (!TRANSIENT_STORAGE_STATUSES.has(response.status)) throw lastError;
    }

    if (attempt >= STORAGE_RETRY_DELAYS_MS.length) break;
    await wait(STORAGE_RETRY_DELAYS_MS[attempt]!);
  }

  throw lastError ?? new Error("Image download failed");
}

export async function deleteStoredFile(fileId: string): Promise<void> {
  const response = await fetch(`${STORAGE_BASE_URL}/${fileId}`, {
    method: "DELETE",
    signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Storage cleanup failed (${response.status})`);
  }
}

export async function cleanupStoredFiles(
  fileIds: Array<string | null | undefined>
): Promise<boolean> {
  const uniqueFileIds = [...new Set(fileIds.filter((id): id is string => Boolean(id)))];
  const results = await Promise.allSettled(uniqueFileIds.map(deleteStoredFile));
  let succeeded = true;
  for (const result of results) {
    if (result.status === "rejected") {
      succeeded = false;
      console.error("Stored image cleanup failed", result.reason);
    }
  }
  return succeeded;
}
