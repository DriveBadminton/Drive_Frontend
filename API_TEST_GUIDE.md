# 배포 후 API 연동 확인 가이드

## 1. 브라우저 개발자 도구 - Network 탭

### 확인 방법:

1. 배포된 사이트 열기 (F12 또는 우클릭 → 검사)
2. **Network 탭** 열기
3. 페이지 로드 또는 기능 사용 시 API 요청 확인

### 확인 포인트:

#### ✅ 정상 작동 시:

- 요청이 `NEXT_PUBLIC_API_URL`로 정확히 전송되는지 확인
- 응답 상태 코드: `200 OK`, `201 Created` 등
- 응답 본문에 데이터가 있는지 확인

#### ❌ 문제 발생 시:

- `CORS error`: 백엔드 CORS 설정 확인 필요
- `404 Not Found`: API 엔드포인트 경로 확인
- `401 Unauthorized`: 인증 토큰 문제
- `500 Internal Server Error`: 백엔드 서버 오류
- `Failed to fetch` / `Network Error`:
  - API_URL이 잘못 설정되었거나
  - 백엔드 서버가 다운되었거나
  - 네트워크 문제

## 2. 콘솔 로그 확인

### 확인 위치:

- 브라우저 개발자 도구 → **Console 탭**

### 주요 로그:

```javascript
// 에러 발생 시 나타나는 로그
console.error("Auth error:", error);
console.error("Get user error:", error);
console.error("Submit profile error:", error);
console.error("Account status error:", error);
```

### 확인 방법:

1. 페이지 로드 시 콘솔 확인
2. 로그인 시도 시 콘솔 확인
3. API 호출 시 에러 메시지 확인

## 3. 실제 기능 테스트

### 테스트 시나리오:

#### A. 로그인 플로우 테스트

1. **로그인 버튼 클릭** (Google/Kakao)
2. **OAuth 콜백 페이지** 도달 확인
3. **Network 탭에서 확인:**
   - `POST /auth/login` 요청 성공 (200)
   - 쿠키 설정 확인 (Set-Cookie 헤더)
4. **프로필 페이지 또는 홈으로 리다이렉트** 확인

#### B. 사용자 정보 조회 테스트

1. **페이지 로드 시:**
   - Network 탭에서 `GET /users/me` 요청 확인
   - 응답에 사용자 정보가 있는지 확인
2. **마이페이지 접근:**
   - 사용자 정보가 정상적으로 표시되는지 확인

#### C. 프로필 등록/수정 테스트

1. **프로필 입력 후 제출**
2. **Network 탭에서 확인:**
   - `POST /users/profile` 요청 성공 (200/201)
3. **성공 후 리다이렉트** 확인

## 4. CORS 에러 확인

### 증상:

```
Access to fetch at 'https://api.example.com/auth/login' from origin 'https://app.example.com'
has been blocked by CORS policy
```

### 해결:

- 백엔드에서 프론트엔드 도메인을 CORS 허용 목록에 추가해야 함

## 5. 쿠키 설정 확인

### 확인 방법:

1. 개발자 도구 → **Application 탭** (Chrome) 또는 **Storage 탭** (Firefox)
2. **Cookies** 섹션 확인
3. 로그인 후 다음 쿠키가 설정되는지 확인:
   - `access_token` (HTTP-Only)
   - `refresh_token` (HTTP-Only)

### 문제 발생 시:

- 쿠키가 없으면: 백엔드에서 쿠키 설정 실패
- 쿠키가 있지만 API 호출 실패: 토큰 검증 문제

## 6. 환경 변수 확인 (프로덕션)

### Vercel 배포 시:

1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 다음 변수들이 올바르게 설정되어 있는지 확인:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `NEXT_PUBLIC_GOOGLE_REDIRECT_URI`
   - `NEXT_PUBLIC_KAKAO_CLIENT_ID`
   - `NEXT_PUBLIC_KAKAO_REDIRECT_URI`

## 7. 빠른 확인 체크리스트

- [ ] 환경 변수가 올바르게 설정되었는가?
- [ ] Network 탭에서 API 요청이 올바른 URL로 가는가?
- [ ] API 응답이 200/201인가?
- [ ] 콘솔에 에러 메시지가 없는가?
- [ ] 로그인 후 쿠키가 설정되는가?
- [ ] 사용자 정보가 정상적으로 표시되는가?
- [ ] CORS 에러가 없는가?

## 8. 일반적인 문제 해결

### 문제: "서버와 연결할 수 없습니다"

**원인:**

- `NEXT_PUBLIC_API_URL`이 잘못 설정됨
- 백엔드 서버가 다운됨
- 네트워크 문제

**확인:**

- Network 탭에서 요청 URL 확인
- 브라우저 콘솔에서 실제 API_URL 확인
- 백엔드 서버 상태 확인

### 문제: CORS 에러

**원인:**

- 백엔드에서 프론트엔드 도메인을 CORS 허용하지 않음

**해결:**

- 백엔드 CORS 설정에 프론트엔드 도메인 추가

### 문제: 401 Unauthorized

**원인:**

- 쿠키가 설정되지 않았거나 만료됨
- 토큰 검증 실패

**확인:**

- Application 탭에서 쿠키 존재 여부 확인
- 다시 로그인 시도
