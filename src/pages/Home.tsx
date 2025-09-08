// src/pages/Home.tsx

export default function Home() {
    return (
        <section className="mx-auto">
            <header className="bg-white">
                <div className="h-18 px-10 flex items-center justify-between">
                    {/*왼쪽 로고*/}
                    <a href="/" className="flex items-center">
                        <img
                            src="/drive-logo.svg"
                            alt="Drive Logo"
                            className="h-12 w-auto"
                            />
                    </a>

                    {/*가운데 네비게이션*/}

                    <div className="flex flex-1 justify-center">
                        <nav className="flex gap-14 text-gray-700 font-medium">
                            <p>공지 사항</p>
                            <p>회사 소개</p>
                            <p>대회 일정</p>
                            <p>대회 기록</p>
                            <p>선수 검색</p>
                            <p>클럽 찾기</p>
                            <p>구장 예약</p>
                        </nav>
                    </div>

                    {/*오른쪽 로그인*/}
                    <div className="w-[140px] flex justify-end">
                        <button
                          className="flex items-center gap-2 rounded-full border border-blue-500 px-5 py-2 text-blue-600 bg-white hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          aria-label="로그인"
                        >
                            <img
                                src="/user-icon.svg"
                                alt="사용자"
                                className="h-5 w-5 text-blue-600"
                            />
                          <span className="font-medium">로그인</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex flex-col items-center justify-center mt-12 text-center">
                    <img
                        src="/drive-logo.svg"
                        alt="Drive Logo"
                        className="h-[180px] w-auto"
                    />
                <div className="flex justify-center w-full">
                    <div className="relative w-full max-w-3xl">
                        {/* 2) 검색 인풋 */}
                        <input
                            type="text"
                            placeholder="검색어를 입력하세요"
                            className="
                                h-12 w-full rounded-full bg-white pl-11 pr-28
                                ring-1 ring-gray-300 shadow-sm
                                placeholder:text-gray-400
                                focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="검색"
                        />
                        {/* 3) 좌측 돋보기 아이콘 */}
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                     className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"
                                     strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="7" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                            </span>
                    </div>
                </div>
            </main>
        </section>
    );
}