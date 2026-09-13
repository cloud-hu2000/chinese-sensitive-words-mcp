import { AuthForm } from "@/components/auth-form";

export default function SignUp() {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-[#f5f3ff] to-[#fff6f8] p-5">
      <section className="card w-full max-w-md p-7 sm:p-9">
        <a href="/" className="text-sm font-bold text-[#6857e8] no-underline">
          ✦ 笔记卫士
        </a>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">创建你的账户</h1>
        <p className="mt-2 text-sm leading-6 text-[#827b91]">
          免费账户每月含 3 次完整审核。升级会员后可获得更多图片与历史记录额度。
        </p>
        <div className="mt-6">
          <AuthForm />
        </div>
        <p className="mt-5 text-center text-sm text-[#898296]">
          已有账户？
          <a className="text-[#6655df]" href="/login">
            登录
          </a>
        </p>
      </section>
    </main>
  );
}
