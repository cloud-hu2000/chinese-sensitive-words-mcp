import { Pool } from "pg";
import type { AuditReport } from "@/lib/moderation/types";
import type { StoredAsset } from "@/lib/storage";

declare global {
  var noteGuardPool: Pool | undefined;
}

export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("服务端尚未配置 DATABASE_URL。");
  if (!global.noteGuardPool)
    global.noteGuardPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  return global.noteGuardPool;
}

export async function userIdForSession(token?: string) {
  if (!token || !process.env.DATABASE_URL) return null;
  const { hashToken } = await import("@/lib/auth");
  const result = await database().query<{ user_id: string }>(
    "SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()",
    [hashToken(token)],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function assertMonthlyQuota(userId: string) {
  const db = database();
  const membership = await db.query<{ monthly_quota: number; status: string }>(
    "SELECT monthly_quota, status FROM memberships WHERE user_id = $1",
    [userId],
  );
  const quota = membership.rows[0];
  if (!quota || quota.status !== "ACTIVE")
    throw new Error("当前会员状态不可用，请在会员中心处理后重试。");
  const usage = await db.query<{ used: string }>(
    "SELECT COUNT(*) AS used FROM usage_events WHERE user_id = $1 AND created_at >= date_trunc('month', now())",
    [userId],
  );
  if (Number(usage.rows[0]?.used || 0) >= quota.monthly_quota)
    throw new Error("本月完整审核额度已用完，请升级会员或下月再试。");
}

export async function saveAudit(
  userId: string,
  report: AuditReport,
  input: { title: string; body: string },
  assets: StoredAsset[],
) {
  const db = database();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO audit_reports (id, user_id, platform, title, body, score, overall_risk, recommendation, engine) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        report.id,
        userId,
        report.platform,
        input.title || null,
        input.body || null,
        report.score,
        report.overallRisk,
        report.recommendation,
        JSON.stringify(report.engine),
      ],
    );
    for (const issue of report.issues)
      await client.query(
        "INSERT INTO audit_issues (report_id, source, image_index, category, severity, evidence, reason, suggestion, bbox, rule_path) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          report.id,
          issue.source,
          issue.imageIndex || null,
          issue.category,
          issue.severity,
          issue.evidence,
          issue.reason,
          issue.suggestion,
          issue.bbox ? JSON.stringify(issue.bbox) : null,
          issue.rulePath ? JSON.stringify(issue.rulePath) : null,
        ],
      );
    for (const asset of assets)
      await client.query(
        "INSERT INTO assets (report_id, storage_key, original_name, mime_type, byte_size, sha256) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          report.id,
          asset.key,
          asset.originalName,
          asset.mimeType,
          asset.bytes,
          asset.sha256,
        ],
      );
    await client.query(
      "INSERT INTO usage_events (user_id, report_id) VALUES ($1,$2)",
      [userId, report.id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
