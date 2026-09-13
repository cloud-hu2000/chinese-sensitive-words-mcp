import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
export type StoredAsset = {
  key: string;
  originalName: string;
  mimeType: string;
  bytes: number;
  sha256: string;
};

/** Stores originals outside the Next public directory. Mount this directory as a private persistent volume in production. */
export async function storePrivateImages(
  files: File[],
): Promise<StoredAsset[]> {
  const root = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
  await mkdir(root, { recursive: true });
  return Promise.all(
    files.map(async (file) => {
      if (!allowed.has(file.type) || file.size > 10 * 1024 * 1024)
        throw new Error(`${file.name} 必须是 10MB 以内的 JPG、PNG 或 WEBP。`);
      const bytes = Buffer.from(await file.arrayBuffer());
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
      const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
      const path = join(root, key);
      await mkdir(join(path, ".."), { recursive: true });
      await writeFile(path, bytes, { flag: "wx" });
      return {
        key,
        originalName: file.name,
        mimeType: file.type,
        bytes: bytes.length,
        sha256,
      };
    }),
  );
}
