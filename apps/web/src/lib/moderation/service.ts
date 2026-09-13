import { assessWithVision } from "./qwen";
import { checkWithRules } from "./rule-engine";
import type {
  AuditInput,
  AuditReport,
  ModerationIssue,
  RiskLevel,
} from "./types";

const severityWeight: Record<RiskLevel, number> = {
  LOW: 7,
  MEDIUM: 18,
  HIGH: 35,
};

function dedupe(issues: ModerationIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.category}:${issue.evidence}:${issue.imageIndex || 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function auditNote(input: AuditInput): Promise<AuditReport> {
  const [titleIssues, bodyIssues] = await Promise.all([
    checkWithRules(input.title, input.platform, "title"),
    checkWithRules(input.body, input.platform, "body"),
  ]);
  const ruleIssues = [...titleIssues, ...bodyIssues];
  const vision = await assessWithVision(input, ruleIssues);
  const issues = dedupe([...ruleIssues, ...vision.issues]);
  const summary = {
    high: issues.filter((i) => i.severity === "HIGH").length,
    medium: issues.filter((i) => i.severity === "MEDIUM").length,
    low: issues.filter((i) => i.severity === "LOW").length,
  };
  const score = Math.min(
    100,
    issues.reduce((total, issue) => total + severityWeight[issue.severity], 0),
  );
  const overallRisk: RiskLevel = summary.high
    ? "HIGH"
    : summary.medium
      ? "MEDIUM"
      : "LOW";
  return {
    id: crypto.randomUUID(),
    platform: input.platform,
    overallRisk,
    score,
    recommendation:
      overallRisk === "HIGH"
        ? "高风险，建议调整后发布"
        : overallRisk === "MEDIUM"
          ? "建议修改"
          : "可发布",
    issues,
    summary,
    disclaimer:
      "本结果是基于公开规则与模型推理的发布前风险提示，不代表小红书、抖音或任何平台的官方审核结论；平台规则会动态变化。",
    engine: {
      ruleEngine: true,
      visualReasoning: Boolean(process.env.DASHSCOPE_API_KEY),
      model: vision.model,
    },
  };
}
