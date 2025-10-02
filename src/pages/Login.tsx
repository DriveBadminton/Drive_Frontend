import { type FormEvent, useState } from "react";

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    // TODO: Replace with real auth integration
    setTimeout(() => {
      setIsSubmitting(false);
      alert("로그인이 구현되면 이곳에서 처리됩니다.");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="mx-auto flex w-full max-w-6xl justify-center px-4 pt-20 pb-24 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur sm:p-8">
            <div className="mb-6 flex items-center justify-center gap-3">
              <img src="/drive-favicon.svg" alt="Drive Icon" className="h-10 w-10" />
              <img src="/drive-wordmark.svg" alt="Drive Wordmark" className="hidden h-7 w-auto sm:block" />
            </div>

            <h1 className="text-center text-2xl font-semibold text-gray-900">로그인</h1>

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  이메일
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="drive@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="remember"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  로그인 상태 유지
                </label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  비밀번호 찾기
                </a>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                disabled={isSubmitting}
              >
                {isSubmitting ? "로그인 중..." : "로그인"}
              </button>

              <div className="space-y-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <img src="/google-icon.svg" alt="Google" className="h-5 w-5" />
                  Google 계정으로 계속하기
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-yellow-300 bg-[#FEE500] px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                >
                  <img src="/kakao-icon.svg" alt="Kakao" className="h-5 w-5" />
                  Kakao 계정으로 계속하기
                </button>
              </div>

              <p className="text-center text-sm text-gray-500">
                아직 계정이 없다면 <a href="#" className="font-medium text-blue-600 hover:text-blue-500">회원가입</a>을 진행해주세요.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
