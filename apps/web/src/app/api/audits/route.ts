import { auditNote } from "@/lib/moderation/service";
import { storePrivateImages } from "@/lib/storage";
import {
  assertMonthlyQuota,
  saveAudit,
  userIdForSession,
} from "@/lib/database";
import type { Platform } from "@/lib/moderation/types";

export const runtime = "nodejs";
const MAX_IMAGES = 18;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  const body = String(form.get("body") || "").trim();
  const platform =
    form.get("platform") === "DOUYIN" ? "DOUYIN" : ("XIAOHONGSHU" as Platform);
  const files = form
    .getAll("images")
    .filter((value): value is File => value instanceof File);
  if (!title && !body && !files.length)
    return Response.json(
      { error: "请至少提供标题、正文或一张图片。" },
      { status: 400 },
    );
  if (files.length > MAX_IMAGES)
    return Response.json(
      { error: "单篇笔记最多上传 18 张图片。" },
      { status: 400 },
    );
  const images = await Promise.all(
    files.map(async (file) => {
      if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES)
        throw new Error(`${file.name} 不是支持的图片，或超过 10MB。`);
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      return {
        name: file.name,
        mimeType: file.type,
        dataUrl: `data:${file.type};base64,${base64}`,
      };
    }),
  );
  try {
    const session = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)note_guard_session=([^;]+)/)?.[1];
    const userId = await userIdForSession(session);
    if (userId) await assertMonthlyQuota(userId);
    // Originals are persisted in a private volume. Do not expose these keys publicly.
    const assets = await storePrivateImages(files);
    const report = await auditNote({
      title: title.slice(0, 120),
      body: body.slice(0, 5000),
      platform,
      images,
    });
    if (userId) await saveAudit(userId, report, { title, body }, assets);
    return Response.json(report);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "审核暂时不可用，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
