# Rental-admin — 누리상사 법인차량 어드민

누리상사 총무팀 **법인차량 예약·운행 기록** 웹앱의 **총무팀용 관리 화면**(Next.js)입니다. 반납 확인, 미반납, 차량 현황표, 면허 승인, 정산 승인, 점검·사고 기록, 통계, 계정 관리를 합니다.

- 임직원용 화면(코어 웹) 저장소: [Rental-web](https://github.com/midayo13-droid/Rental-web)
- 서버(백엔드) 저장소: [Rental-backend](https://github.com/midayo13-droid/Rental-backend)
- 기획서: [기획서.md](기획서.md)
- 디자인: 쏘카 프레임 2.0 토큰(흰 바탕). 모든 이름·계정·차량은 **가상 데이터**입니다.

> ## ⚠ 첫 접속이 느릴 수 있어요
> 화면은 Vercel, 서버는 Render **무료 서버**에 있습니다. 서버가 한동안 쓰이지 않으면 잠들어서 **첫 로그인은 30초~1분쯤 걸릴 수 있습니다.** 그동안 "서버를 깨우는 중이에요" 안내가 뜹니다.

---

## 배포 주소 (확인용)

| 구분 | 주소 |
|---|---|
| 어드민(이 저장소) | https://rental-admin-nine.vercel.app |
| 코어 웹 | https://rental-web-one-puce.vercel.app |
| 백엔드(서버) | https://rental-backend-r63r.onrender.com  (확인: `/health`) |

## Vercel에 올리기

| 항목 | 값 |
|---|---|
| Root Directory | (비워 둠 — 저장소 맨 위에 `package.json` 이 있음) |
| Framework Preset | Next.js (자동 감지) |
| Build / Output | 기본값 그대로 |
| Node.js Version | 22.x |

### 환경변수 (Vercel → Settings → Environment Variables)

| 이름 | 뜻 | 예시 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | 백엔드(Render) 주소. 끝에 `/` 없이 | `https://rental-backend-r63r.onrender.com` |

> `NEXT_PUBLIC_` 로 시작하는 값은 **빌드할 때 화면 코드에 들어갑니다.** 바꾸면 **다시 배포(Redeploy)** 해야 반영됩니다. 비밀 값은 넣지 마세요.
> 서버(Render)의 `CORS_ORIGIN` 에 이 화면 주소가 정확히(https, 끝에 `/` 없이) 들어 있어야 로그인이 됩니다.

## 로컬에서 실행

백엔드가 `http://localhost:4000` 에서 켜져 있어야 합니다.

```bash
cp .env.example .env     # NEXT_PUBLIC_API_URL 확인
npm install
npm run dev              # http://localhost:3001
```

## 폴더

```
app/         화면(Next.js App Router)
components/  공통 부품 (사이드 메뉴, 비밀번호 입력, 로딩 등)
lib/         서버 호출 도우미
기획서.md     화면·규칙·데이터 설계
```
