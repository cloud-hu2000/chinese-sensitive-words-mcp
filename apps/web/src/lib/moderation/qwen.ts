import { HIERARCHY, PLATFORM_POLICY } from "./policies";
import type {
  AuditInput,
  BoundingBox,
  ModerationIssue,
  RiskLevel,
} from "./types";

type ModelIssue = Omit<ModerationIssue, "id">;

function cleanBox(value: unknown): BoundingBox | undefined {
  if (!value || typeof value !== "object") return undefined;
  const box = value as Record<string, unknown>;
  const nums = ["x", "y", "width", "height"].map((key) => Number(box[key]));
  if (nums.some((n) => !Number.isFinite(n))) return undefined;
  return {
    x: Math.max(0, Math.min(1000, nums[0])),
    y: Math.max(0, Math.min(1000, nums[1])),
    width: Math.max(0, Math.min(1000, nums[2])),
    height: Math.max(0, Math.min(1000, nums[3])),
  };
}

const outputShape = `{"issues":[{"source":"title|body|image","imageIndex":1,"category":"分类","severity":"LOW|MEDIUM|HIGH","evidence":"不超过30字的可见证据","reason":"根据规则定义的简短理由","suggestion":"可执行修改建议","bbox":{"x":0,"y":0,"width":0,"height":0},"rulePath":["一级","二级","三级"]}]}`;

export async function assessWithVision(
  input: AuditInput,
  ruleEvidence: ModerationIssue[],
): Promise<{ issues: ModerationIssue[]; model?: string }> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return { issues: [] };
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: `审核笔记。标题：${input.title}\n正文：${input.body}\n\n规则引擎证据（仅作线索，避免机械误判）：${JSON.stringify(ruleEvidence.map(({ category, evidence, severity }) => ({ category, evidence, severity })))}\n\n${PLATFORM_POLICY[input.platform]}\n风险标签树：${HIERARCHY.join("；")}\n\n请执行分层审核：先判断是否存在需要修改的风险，再为每项选择最细粒度路径。图片中有问题时必须给出归一化到 0-1000 的 bbox，覆盖证据区域；未见证据就不要猜测。二维码、手机号、账号名、外链或引流话术需要特别检查。只返回 JSON：${outputShape}`,
    },
  ];
  input.images.forEach((image, index) =>
    content.push(
      { type: "text", text: `图片 ${index + 1}：` },
      { type: "image_url", image_url: { url: image.dataUrl } },
    ),
  );
  try {
    const response = await fetch(
      `${(process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.DASHSCOPE_VL_MODEL || "qwen-vl-max-latest",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "你是谨慎的内容发布前风险审核员。只依据给定证据；输出严格 JSON，不能宣称官方裁决。",
            },
            { role: "user", content },
          ],
        }),
        signal: AbortSignal.timeout(60000),
      },
    );
    if (!response.ok) throw new Error(`DashScope ${response.status}`);
    const responseBody = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const parsed = JSON.parse(
      responseBody.choices?.[0]?.message?.content || "{}",
    ) as { issues?: ModelIssue[] };
    return {
      model: process.env.DASHSCOPE_VL_MODEL || "qwen-vl-max-latest",
      issues: (parsed.issues || []).flatMap((issue, index) => {
        if (!issue || !["LOW", "MEDIUM", "HIGH"].includes(issue.severity))
          return [];
        const source = ["title", "body", "image"].includes(issue.source)
          ? issue.source
          : "body";
        return [
          {
            ...issue,
            id: `vision-${index}`,
            source,
            severity: issue.severity as RiskLevel,
            bbox: cleanBox(issue.bbox),
            imageIndex:
              source === "image" ? Number(issue.imageIndex || 1) : undefined,
            evidence: String(issue.evidence || "").slice(0, 80),
            reason: String(issue.reason || "需要人工结合上下文复核。"),
            suggestion: String(issue.suggestion || "调整为客观、中性的表达。"),
          },
        ];
      }),
    };
  } catch (error) {
    console.error("Vision moderation unavailable", error);
    return { issues: [] };
  }
}
