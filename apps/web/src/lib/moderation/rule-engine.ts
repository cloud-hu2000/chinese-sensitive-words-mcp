import type { ModerationIssue, Platform, RiskLevel } from "./types";

type RemoteWord = {
  keyword: string;
  category: string;
  level: string;
  suggestion?: string[];
};
type RemoteResponse = { code: string; data?: { wordList: RemoteWord[] } };

const levelMap: Record<string, RiskLevel> = {
  高: "HIGH",
  中: "MEDIUM",
  低: "LOW",
  提示: "LOW",
};
const localPatterns: Array<{
  pattern: RegExp;
  category: string;
  severity: RiskLevel;
  suggestion: string;
}> = [
  {
    pattern: /(?:微信|薇信|微\s*信|加\s*[vV]|V\s*信|vx|v信)/i,
    category: "站外引流",
    severity: "HIGH",
    suggestion: "删除站外联系方式，改为平台内的合规互动表达。",
  },
  {
    pattern: /(?:1[3-9]\d{9}|https?:\/\/|www\.)/i,
    category: "联系方式或外链",
    severity: "HIGH",
    suggestion: "删除手机号、网址等站外联系方式。",
  },
  {
    pattern: /(?:最[好佳]|全网第[一1]|顶级|100%|百分百|绝对)/i,
    category: "极限或绝对化宣传",
    severity: "MEDIUM",
    suggestion: "改为可验证、具体且保守的描述，避免绝对化表述。",
  },
  {
    pattern: /(?:治愈|根治|药到病除|减肥神药|包瘦)/i,
    category: "医疗功效承诺",
    severity: "HIGH",
    suggestion: "删除治疗、治愈或保证性效果承诺，使用客观信息并补充必要资质。",
  },
  {
    pattern: /(?:稳赚|保本|荐股|内部消息|翻倍)/i,
    category: "金融收益承诺",
    severity: "HIGH",
    suggestion: "删除收益保证、荐股或内幕信息暗示，补充风险提示。",
  },
];

function localCheck(text: string, source: "title" | "body"): ModerationIssue[] {
  return localPatterns.flatMap(
    ({ pattern, category, severity, suggestion }, index) => {
      const match = text.match(pattern);
      return match
        ? [
            {
              id: `local-${source}-${index}`,
              source,
              category,
              severity,
              evidence: match[0],
              reason: "规则引擎发现可能触发平台审核的明确表达。",
              suggestion,
              rulePath: [category],
            },
          ]
        : [];
    },
  );
}

export async function checkWithRules(
  text: string,
  platform: Platform,
  source: "title" | "body",
): Promise<ModerationIssue[]> {
  const fallback = localCheck(text, source);
  const base = process.env.WORDSCHECK_API_BASE;
  if (!base) return fallback;
  try {
    const response = await fetch(`${base.replace(/\/+$/, "")}/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.WORDSCHECK_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.WORDSCHECK_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ text, ner: true, platform }),
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as RemoteResponse;
    if (payload.code !== "0" || !payload.data) return fallback;
    return payload.data.wordList.map((word, index) => ({
      id: `rule-${source}-${index}`,
      source: "rule",
      category: word.category,
      severity: levelMap[word.level] ?? "LOW",
      evidence: word.keyword,
      reason: "规则词库命中；仍应由语境审核决定最终风险。",
      suggestion: word.suggestion?.join("、") || "结合上下文改写或删除该表达。",
      rulePath: [platform, word.category],
    }));
  } catch {
    return fallback;
  }
}
