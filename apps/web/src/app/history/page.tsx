const rows = [
  {
    title: "秋季通勤穿搭分享",
    platform: "小红书",
    score: 16,
    risk: "低风险",
    time: "今天 10:24",
  },
  {
    title: "全网第一减脂方法",
    platform: "小红书",
    score: 82,
    risk: "高风险",
    time: "昨天 16:18",
  },
  {
    title: "护肤成分说明",
    platform: "抖音",
    score: 41,
    risk: "建议修改",
    time: "09-10 09:42",
  },
];
export default function History() {
  return (
    <main className="shell py-12">
      <a className="text-sm text-[#6857e8]" href="/">
        ← 返回检测
      </a>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">my audits</p>
          <h1 className="mt-1 text-3xl font-bold">检测记录</h1>
        </div>
        <a className="btn-primary text-sm no-underline" href="/">
          新建检测
        </a>
      </div>
      <section className="card mt-7 overflow-hidden">
        <div className="grid grid-cols-[1.6fr_.8fr_.6fr_.8fr] gap-2 border-b border-[#eeeaf4] px-6 py-4 text-xs font-bold text-[#958fa1]">
          <span>笔记</span>
          <span>平台</span>
          <span>风险分</span>
          <span>检测时间</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.title}
            className="grid grid-cols-[1.6fr_.8fr_.6fr_.8fr] items-center gap-2 border-b border-[#f1eef6] px-6 py-5 text-sm last:border-0"
          >
            <b>{row.title}</b>
            <span className="text-[#766f83]">{row.platform}</span>
            <span
              className={
                row.score > 70
                  ? "text-[#df4d5a]"
                  : row.score > 30
                    ? "text-[#c98724]"
                    : "text-[#5279d9]"
              }
            >
              {row.score} · {row.risk}
            </span>
            <span className="text-[#888195]">{row.time}</span>
          </div>
        ))}
      </section>
      <p className="mt-4 text-xs text-[#9690a2]">
        上线数据库后，这里将展示当前账户真实的审核报告、图片证据与使用额度。
      </p>
    </main>
  );
}
