import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import type { AuditReport } from "@/lib/moderation/types";
import type { StoredAsset } from "@/lib/storage";

declare global {
  var noteGuardPool: Pool | undefined;
}

export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("服务端尚未配置 DATABASE_URL。");
  if (!global.noteGuardPool)
    global.noteGuardPool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "Z",
    });
  return global.noteGuardPool;
}

export async function query<T extends RowDataPacket>(
  sql: string,
  values: Array<string | number | Date | Buffer | null> = [],
) {
  const [rows] = await database().execute(sql, values);
  return rows as T[];
}

export async function userIdForSession(token?: string) {
  if (!token || !process.env.DATABASE_URL) return null;
  const { hashToken } = await import("@/lib/auth");
  const rows = await query<{ user_id: string } & RowDataPacket>(
    "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP()",
    [hashToken(token)],
  );
  return rows[0]?.user_id ?? null;
}

export async function assertMonthlyQuota(userId: string) {
  const membership = await query<
    { monthly_quota: number; status: string } & RowDataPacket
  >("SELECT monthly_quota, status FROM memberships WHERE user_id = ?", [
    userId,
  ]);
  const quota = membership[0];
  if (!quota || quota.status !== "ACTIVE")
    throw new Error("当前会员状态不可用，请在会员中心处理后重试。");
  const usage = await query<{ used: number } & RowDataPacket>(
    "SELECT COUNT(*) AS used FROM usage_events WHERE user_id = ? AND created_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')",
    [userId],
  );
  if (Number(usage[0]?.used || 0) >= quota.monthly_quota)
    throw new Error("本月完整审核额度已用完，请升级会员或下月再试。");
}

export async function saveAudit(
  userId: string,
  report: AuditReport,
  input: { title: string; body: string },
  assets: StoredAsset[],
) {
  const client = await database().getConnection();
  try {
    await client.beginTransaction();
    await client.execute(
      "INSERT INTO audit_reports (id, user_id, platform, title, body, score, overall_risk, recommendation, engine) VALUES (?,?,?,?,?,?,?,?,?)",
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
      await client.execute(
        "INSERT INTO audit_issues (id, report_id, source, image_index, category, severity, evidence, reason, suggestion, bbox, rule_path) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
          randomUUID(),
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
      await client.execute(
        "INSERT INTO assets (id, report_id, storage_key, original_name, mime_type, byte_size, sha256) VALUES (?,?,?,?,?,?,?)",
        [
          randomUUID(),
          report.id,
          asset.key,
          asset.originalName,
          asset.mimeType,
          asset.bytes,
          asset.sha256,
        ],
      );
    await client.execute(
      "INSERT INTO usage_events (id, user_id, report_id) VALUES (?,?,?)",
      [randomUUID(), userId, report.id],
    );
    await client.commit();
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }
}
