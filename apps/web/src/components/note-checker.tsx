"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import type { AuditReport, Platform } from "@/lib/moderation/types";

const platformName: Record<Platform, string> = {
  XIAOHONGSHU: "小红书",
  DOUYIN: "抖音",
};

function Header() {
  return (
    <header className="border-b border-[#eeebf5] bg-white/90 backdrop-blur">
      <div className="shell flex h-[68px] items-center justify-between">
        <a
          className="flex items-center gap-2.5 text-inherit no-underline"
          href="/"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#6857e8] text-lg text-white shadow-lg shadow-violet-200">
            ✦
          </span>
          <span className="font-bold tracking-tight">
            笔记卫士{" "}
            <small className="ml-1 text-xs font-medium text-[#9892ad]">
              NOTE GUARD
            </small>
          </span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          <a className="nav-link" href="/">
            发布前检测
          </a>
          <a className="nav-link" href="/history">
            检测记录
          </a>
          <a className="nav-link" href="/membership">
            会员中心
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <a className="nav-link hidden sm:block" href="/login">
            登录
          </a>
          <a className="btn-primary text-sm no-underline" href="/signup">
            免费开始
          </a>
        </div>
      </div>
    </header>
  );
}

function RiskBadge({ risk }: { risk: "LOW" | "MEDIUM" | "HIGH" }) {
  const map = {
    HIGH: ["高风险", "risk-high"],
    MEDIUM: ["建议修改", "risk-medium"],
    LOW: ["低风险", "risk-low"],
  } as const;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${map[risk][1]}`}
    >
      {map[risk][0]}
    </span>
  );
}

function ImageEvidence({
  report,
  previews,
}: {
  report: AuditReport;
  previews: Array<{ name: string; src: string }>;
}) {
  const imageIssues = report.issues.filter(
    (issue) => issue.source === "image" && issue.imageIndex && issue.bbox,
  );
  if (!imageIssues.length || !previews.length) return null;
  return (
    <section className="card mt-5 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">visual evidence</p>
          <h3 className="mt-1 font-bold">图片风险位置</h3>
        </div>
        <span className="text-xs text-[#8b8499]">框选区域来自模型证据</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {previews.map((image, index) => {
          const findings = imageIssues.filter(
            (issue) => issue.imageIndex === index + 1,
          );
          if (!findings.length) return null;
          return (
            <figure key={image.src} className="m-0">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f1eef8]">
                {/* Local previews avoid sending a public image URL back to the client. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="h-full w-full object-cover"
                  src={image.src}
                  alt={image.name}
                />
                {findings.map((issue) => {
                  const box = issue.bbox!;
                  return (
                    <span
                      key={issue.id}
                      className="absolute border-2 border-[#ee4e5b] bg-[#ee4e5b]/10"
                      style={{
                        left: `${box.x / 10}%`,
                        top: `${box.y / 10}%`,
                        width: `${box.width / 10}%`,
                        height: `${box.height / 10}%`,
                      }}
                      title={`${issue.category}: ${issue.evidence}`}
                    />
                  );
                })}
              </div>
              <figcaption className="mt-2 text-xs text-[#766f84]">
                图片 {index + 1} ·{" "}
                {findings.map((issue) => issue.category).join("、")}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

export function NoteChecker() {
  const [platform, setPlatform] = useState<Platform>("XIAOHONGSHU");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const previews = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        src: URL.createObjectURL(file),
      })),
    [files],
  );

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    const combined = [...files, ...selected].slice(0, 18);
    if (selected.length + files.length > 18)
      setMessage("一篇笔记最多上传 18 张图片。");
    setFiles(combined);
  }
  function fillExample() {
    setPlatform("XIAOHONGSHU");
    setTitle("全网第一减脂方法，30 天包瘦");
    setBody(
      "想了解方案可以加薇信 13800138000，老师会给你一对一指导。效果因人而异。",
    );
    setReport(null);
    setMessage("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    setReport(null);
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("body", body);
      form.set("platform", platform);
      files.forEach((file) => form.append("images", file));
      const response = await fetch("/api/audits", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as AuditReport & { error?: string };
      if (!response.ok) throw new Error(data.error || "审核没有完成");
      setReport(data);
      setState("idle");
      window.setTimeout(
        () =>
          document
            .getElementById("audit-result")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        40,
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "审核暂时不可用，请稍后重试。",
      );
    }
  }

  return (
    <>
      <Header />
      <main>
        <section className="shell grid gap-12 py-13 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-18">
          <div className="max-w-[520px]">
            <p className="eyebrow">发布前风险检测 · 小红书 / 抖音</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.17] tracking-[-.055em] text-[#25213b] sm:text-[52px]">
              先检查，再发布。
              <br />
              <span className="text-[#6958e8]">让笔记更安心。</span>
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-[#777288]">
              整合敏感词规则、图片 OCR、二维码与联系方式识别，并使用多模态 Agent
              做语境审核。给你具体证据、风险位置和改写建议。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <span className="rounded-full bg-white px-3 py-2 text-xs text-[#686278] shadow-sm">
                ✓ 不输出“必定违规”
              </span>
              <span className="rounded-full bg-white px-3 py-2 text-xs text-[#686278] shadow-sm">
                ✓ 规则与语境双重判断
              </span>
            </div>
          </div>
          <div className="relative rounded-[28px] bg-gradient-to-br from-[#ece9ff] to-[#fff0f3] p-6 shadow-[0_25px_60px_rgba(91,73,191,.14)]">
            <div className="absolute -right-5 top-7 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-[#d04f61] shadow-xl">
              ● 发现风险证据
            </div>
            <div className="rounded-[20px] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-[#efedf5] pb-4">
                <span className="h-3 w-3 rounded-full bg-[#ff7581]" />
                <span className="h-3 w-3 rounded-full bg-[#ffd467]" />
                <span className="h-3 w-3 rounded-full bg-[#71d19f]" />
                <span className="ml-2 text-xs text-[#9993aa]">
                  发布前审核报告
                </span>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[9px] border-[#f3b9bd] text-center">
                  <b className="text-2xl text-[#d54a57]">82</b>
                  <span className="text-[9px] text-[#a4909b]">风险分</span>
                </div>
                <div>
                  <b className="text-lg">建议修改后发布</b>
                  <p className="mt-1 text-xs leading-5 text-[#8a8498]">
                    识别出 2 项高风险、4 项中风险问题
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-[#fff2f3] px-3 py-2.5 text-xs">
                  <span>站外引流 · 主页+V</span>
                  <span className="font-bold text-[#e34d5b]">高风险</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#fff8eb] px-3 py-2.5 text-xs">
                  <span>极限词 · 全网第一</span>
                  <span className="font-bold text-[#c98327]">建议修改</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="shell pb-14">
          <form onSubmit={submit} className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#efecf5] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold">开始检测笔记</h2>
                <p className="mt-1 text-xs text-[#8a8499]">
                  标题、正文与图片会作为同一篇笔记综合判断
                </p>
              </div>
              <div className="flex rounded-xl bg-[#f5f3fa] p-1">
                {(["XIAOHONGSHU", "DOUYIN"] as Platform[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setPlatform(item)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${platform === item ? "bg-white text-[#5c4bd8] shadow-sm" : "text-[#908b9e]"}`}
                  >
                    {platformName[item]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-5 p-6 lg:grid-cols-[1fr_1.45fr]">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  标题{" "}
                  <span className="font-normal text-[#a19bae]">
                    （选填，最多 120 字）
                  </span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="输入笔记标题"
                  className="w-full rounded-xl border border-[#e5e1ed] px-4 py-3 outline-none transition focus:border-[#8a7beb] focus:ring-4 focus:ring-violet-100"
                />
                <p className="mt-2 text-right text-xs text-[#aaa5b4]">
                  {title.length}/120
                </p>
                <label className="mb-2 mt-4 block text-sm font-bold">
                  图片{" "}
                  <span className="font-normal text-[#a19bae]">
                    （1–18 张，每张不超过 10MB）
                  </span>
                </label>
                <label className="flex min-h-35 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfc8e8] bg-[#fbfaff] px-4 text-center hover:bg-[#f7f5ff]">
                  <span className="text-2xl text-[#7263e8]">＋</span>
                  <b className="mt-1 text-sm">上传图片</b>
                  <span className="mt-1 text-xs text-[#9a94a6]">
                    支持 JPG、PNG、WEBP
                  </span>
                  <input
                    onChange={chooseFiles}
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    type="file"
                    className="hidden"
                  />
                </label>
                {previews.length > 0 && (
                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {previews.map((image, index) => (
                      <div
                        className="relative aspect-square overflow-hidden rounded-lg bg-[#f1eef8]"
                        key={image.src}
                      >
                        <img
                          className="h-full w-full object-cover"
                          src={image.src}
                          alt={image.name}
                        />
                        <button
                          type="button"
                          aria-label={`删除图片 ${index + 1}`}
                          onClick={() =>
                            setFiles(
                              files.filter(
                                (_, fileIndex) => fileIndex !== index,
                              ),
                            )
                          }
                          className="absolute right-0 top-0 grid h-5 w-5 place-items-center bg-[#302c42]/75 text-xs text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold">
                  正文{" "}
                  <span className="font-normal text-[#a19bae]">
                    （最多 5,000 字）
                  </span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={5000}
                  placeholder="粘贴或输入笔记正文。会识别极限词、医疗/金融承诺、导流、谐音变体等，并结合全文语境判断。"
                  className="min-h-[288px] w-full resize-y rounded-xl border border-[#e5e1ed] px-4 py-3 leading-6 outline-none transition focus:border-[#8a7beb] focus:ring-4 focus:ring-violet-100"
                />
                <div className="mt-2 flex justify-between text-xs text-[#aaa5b4]">
                  <button
                    type="button"
                    onClick={fillExample}
                    className="text-[#6e5ee8] hover:underline"
                  >
                    载入一段示例
                  </button>
                  <span>{body.length}/5000</span>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7f6fb] p-3">
                  <p className="max-w-[390px] text-xs leading-5 text-[#888296]">
                    检测结果为发布前风险建议，不代表平台官方审核结论。图片将按你的数据留存策略保存。
                  </p>
                  <button
                    disabled={state === "loading"}
                    className="btn-primary min-w-35 disabled:cursor-wait disabled:opacity-70"
                  >
                    {state === "loading" ? "正在综合审核…" : "开始 AI 检测"}
                  </button>
                </div>
                {message && (
                  <p className="mt-3 text-sm text-[#d54a57]">{message}</p>
                )}
              </div>
            </div>
          </form>
        </section>
        {report && (
          <section id="audit-result" className="shell scroll-mt-6 pb-18">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">audit result</p>
                <h2 className="mt-1 text-2xl font-bold">本次发布前风险报告</h2>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs text-[#817a90] shadow-sm">
                {report.engine.visualReasoning
                  ? `多模态模型：${report.engine.model}`
                  : "规则引擎模式（配置百炼后启用图片语境审核）"}
              </span>
            </div>
            <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
              <aside className="card p-6">
                <div
                  className={`mx-auto grid h-39 w-39 place-items-center rounded-full border-[12px] ${report.overallRisk === "HIGH" ? "border-[#f3b8bd]" : report.overallRisk === "MEDIUM" ? "border-[#f5d7a6]" : "border-[#b8d0ff]"}`}
                >
                  <div className="text-center">
                    <b className="text-4xl">{report.score}</b>
                    <p className="mt-1 text-xs text-[#8b8499]">
                      综合风险 / 100
                    </p>
                  </div>
                </div>
                <div className="mt-5 text-center">
                  <RiskBadge risk={report.overallRisk} />
                  <h3 className="mt-3 text-lg font-bold">
                    {report.recommendation}
                  </h3>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-[#fff1f2] py-3">
                    <b className="block text-lg text-[#df4d5a]">
                      {report.summary.high}
                    </b>
                    高风险
                  </div>
                  <div className="rounded-xl bg-[#fff7e9] py-3">
                    <b className="block text-lg text-[#ce8925]">
                      {report.summary.medium}
                    </b>
                    中风险
                  </div>
                  <div className="rounded-xl bg-[#f0f5ff] py-3">
                    <b className="block text-lg text-[#5c7bd5]">
                      {report.summary.low}
                    </b>
                    低风险
                  </div>
                </div>
              </aside>
              <div className="card divide-y divide-[#efecf5] overflow-hidden">
                {report.issues.length ? (
                  report.issues.map((issue) => (
                    <article className="p-5" key={issue.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <RiskBadge risk={issue.severity} />
                            <b>{issue.category}</b>
                            {issue.source === "image" && (
                              <span className="text-xs text-[#928b9f]">
                                图片 {issue.imageIndex}
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-sm leading-6">
                            <mark className="rounded bg-[#fff2c9] px-1.5 py-0.5 text-inherit">
                              {issue.evidence}
                            </mark>{" "}
                            <span className="ml-1 text-[#777187]">
                              {issue.reason}
                            </span>
                          </p>
                        </div>
                        <span className="rounded-lg bg-[#f8f7fb] px-2 py-1 text-xs text-[#8c869a]">
                          {issue.rulePath?.join(" › ") || "语境审核"}
                        </span>
                      </div>
                      <div className="mt-3 rounded-lg bg-[#f6f5fa] px-3 py-2 text-sm text-[#625d72]">
                        <b className="mr-2 text-[#6857e8]">建议</b>
                        {issue.suggestion}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="p-10 text-center">
                    <b>暂未发现明确风险</b>
                    <p className="mt-2 text-sm text-[#898396]">
                      仍建议在发布前核对平台最新规则与素材授权。
                    </p>
                  </div>
                )}
              </div>
            </div>
            <ImageEvidence report={report} previews={previews} />
            <p className="mt-4 text-xs leading-5 text-[#8d879a]">
              {report.disclaimer}
            </p>
          </section>
        )}
      </main>
      <footer className="border-t border-[#edeaf3] bg-white py-7">
        <div className="shell flex flex-wrap justify-between gap-3 text-xs text-[#90899e]">
          <span>© 2026 笔记卫士 · 发布前风险检测</span>
          <span>不隶属于小红书、抖音或其关联公司</span>
        </div>
      </footer>
    </>
  );
}
