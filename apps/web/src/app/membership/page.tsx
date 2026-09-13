const plans = [
  {
    name: "免费版",
    price: "¥0",
    quota: "3 次完整审核 / 月",
    features: ["标题与正文规则检测", "每篇最多 3 张图片", "最近 7 天记录"],
    active: true,
  },
  {
    name: "专业版",
    price: "¥39",
    quota: "100 次完整审核 / 月",
    features: [
      "1–18 张图片多模态审核",
      "风险图片区域标记",
      "完整历史记录与导出",
    ],
    active: false,
  },
  {
    name: "团队版",
    price: "¥199",
    quota: "800 次完整审核 / 月",
    features: ["5 个成员席位", "抖音/小红书策略配置", "优先模型队列与 API"],
    active: false,
  },
];
export default function Membership() {
  return (
    <main className="shell py-12">
      <a className="text-sm text-[#6857e8]" href="/">
        ← 返回检测
      </a>
      <div className="mt-7 text-center">
        <p className="eyebrow">membership</p>
        <h1 className="mt-2 text-3xl font-bold">按发布频率选择会员</h1>
        <p className="mt-3 text-sm text-[#827b91]">
          额度按完整审核次数计费；图片 OCR 与语境审核都包含在一次检测中。
        </p>
      </div>
      <section className="mx-auto mt-9 grid max-w-5xl gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`card p-6 ${plan.name === "专业版" ? "border-[#8a7bef] ring-4 ring-violet-100" : ""}`}
          >
            <h2 className="text-lg font-bold">{plan.name}</h2>
            <p className="mt-4 text-3xl font-bold">
              {plan.price}
              <span className="text-sm font-normal text-[#8b8499]"> / 月</span>
            </p>
            <p className="mt-3 rounded-lg bg-[#f6f4ff] px-3 py-2 text-sm text-[#6757d4]">
              {plan.quota}
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-5 text-[#716b7e]">
              {plan.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            <button
              className={
                plan.active
                  ? "btn-secondary mt-7 w-full"
                  : "btn-primary mt-7 w-full"
              }
            >
              {plan.active ? "当前方案" : "选择方案（支付接入后启用）"}
            </button>
          </article>
        ))}
      </section>
      <p className="mx-auto mt-7 max-w-3xl text-center text-xs leading-5 text-[#9892a3]">
        会员订单已在数据库模型中预留第三方订阅
        ID。支付宝/微信支付的商户参数和回调地址配置完成后，即可接入实际支付。
      </p>
    </main>
  );
}
