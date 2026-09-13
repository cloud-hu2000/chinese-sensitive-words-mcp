export type Platform = "XIAOHONGSHU" | "DOUYIN";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type IssueSource = "title" | "body" | "image" | "rule";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ModerationIssue {
  id: string;
  source: IssueSource;
  imageIndex?: number;
  category: string;
  severity: RiskLevel;
  evidence: string;
  reason: string;
  suggestion: string;
  bbox?: BoundingBox;
  rulePath?: string[];
}

export interface AuditReport {
  id: string;
  platform: Platform;
  overallRisk: RiskLevel;
  score: number;
  recommendation: "可发布" | "建议修改" | "高风险，建议调整后发布";
  issues: ModerationIssue[];
  summary: { high: number; medium: number; low: number };
  disclaimer: string;
  engine: { ruleEngine: boolean; visualReasoning: boolean; model?: string };
}

export interface AuditInput {
  title: string;
  body: string;
  platform: Platform;
  images: Array<{ name: string; mimeType: string; dataUrl: string }>;
}
