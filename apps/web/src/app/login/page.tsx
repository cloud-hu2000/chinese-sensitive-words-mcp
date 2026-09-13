import { LoginForm } from "@/components/login-form";
export default function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-[#f5f3ff] to-[#fff6f8] p-5">
      <section className="card w-full max-w-md p-7 sm:p-9">
        <a href="/" className="text-sm font-bold text-[#6857e8] no-underline">
          ✦ 笔记卫士
        </a>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">欢迎回来</h1>
        <p className="mt-2 text-sm leading-6 text-[#827b91]">
          登录后可查看历史审核记录并管理会员额度。
        </p>
        <LoginForm />
        <p className="mt-5 text-center text-sm text-[#898296]">
          还没有账户？
          <a className="text-[#6655df]" href="/signup">
            免费注册
          </a>
        </p>
      </section>
    </main>
  );
}
