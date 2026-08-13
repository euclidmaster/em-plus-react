# EM플러스 — 새 PC에서 프로젝트 되살리기

이 문서 하나면 새 컴퓨터에서 처음부터 이 프로젝트를 복구할 수 있습니다.
시각적인 안내가 필요하면 [docs/recovery.html](docs/recovery.html) 파일을 브라우저로 열어보세요.

---

## 지금 내 작업은 어디에 있나

| 위치 | 무엇 | 주소 |
|------|------|------|
| **GitHub** | 소스코드 전체 | https://github.com/euclidmaster/em-plus-react |
| **Vercel** | 배포된 앱 | https://em-plus-react.vercel.app |
| **Supabase** | 데이터베이스(학생·성적·클리닉 등) | 프로젝트 `gxnvbeoncmurgwvemvih` |

이 세 곳은 클라우드라 PC가 고장나도 안전합니다.

## ⚠️ clone에 딸려오지 않는 2가지 (보안상 GitHub에 안 올라감)

새 PC에서 이 두 파일만 다시 만들면 됩니다. 값은 대시보드에서 언제든 다시 받을 수 있습니다.

- **`.env`** — Supabase 접속 키
- **`.vercel-token`** — 배포용 토큰 (배포할 때만 필요)

---

## 복구 순서

### 0. 준비물 설치
- [VS Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) (LTS 버전)

### 1. 코드 내려받기
VS Code에서 `Ctrl+Shift+P` → **Git: Clone** → 아래 주소 붙여넣기:
```
https://github.com/euclidmaster/em-plus-react.git
```
저장할 폴더를 고르면 자동으로 내려받고 열립니다.
(터미널파: `git clone https://github.com/euclidmaster/em-plus-react.git`)

### 2. 패키지 설치
프로젝트 폴더의 터미널에서:
```
npm install
```

### 3. `.env` 다시 만들기 (필수)
Supabase 대시보드 → **Settings → API** 에서 값을 복사합니다.
- 대시보드: https://supabase.com/dashboard/project/gxnvbeoncmurgwvemvih/settings/api

프로젝트 루트에 `.env` 파일을 만들고 아래처럼 채웁니다:
```
VITE_SUPABASE_URL=https://gxnvbeoncmurgwvemvih.supabase.co
VITE_SUPABASE_ANON_KEY=여기에_anon_public_키_붙여넣기
```
> `URL`은 위 그대로, `ANON_KEY`는 대시보드의 **Project API keys → anon public** 값입니다.

### 4. `.vercel-token` 다시 만들기 (배포할 때만)
Vercel → 우측상단 프로필 → **Settings → Tokens** → **Create Token**
- Scope는 **팀 전체(All Projects)** 로 선택 (개별 프로젝트 X)
- 토큰 페이지: https://vercel.com/account/settings/tokens

PowerShell에서 (프로젝트 폴더 안에서):
```powershell
$t = Read-Host "토큰"
Set-Content .vercel-token -Value $t -NoNewline
```
(`Read-Host` 실행 후 토큰을 붙여넣고 Enter)

### 5. 실행 / 배포
```
npm run dev      # 로컬에서 미리보기 (http://localhost:5173)
npm run deploy   # 프로덕션 배포 (em-plus-react.vercel.app)
```

---

## 계정·로그인 메모

| 서비스 | 계정 | 로그인이 필요할 때 |
|--------|------|------|
| GitHub | euclidmaster | 코드 push 할 때 (VS Code가 브라우저 로그인 창을 띄움) |
| Vercel | silverbeautylee-4967 (팀: silverbeautys-projects) | 배포·대시보드 관리 |
| Supabase | 프로젝트 `gxnvbeoncmurgwvemvih` 소유 계정 | DB·키 관리 |

> 로그인 방식(구글/깃허브/이메일)은 각 서비스에서 설정한 대로입니다. 그 로그인 수단(예: 구글 계정)의 비밀번호와 복구 이메일·전화번호를 최신으로 관리하세요 — 사실상 모든 작업물의 마스터 열쇠입니다.

## 배포 파이프라인 메모
- `npm run deploy` → `scripts/deploy.sh` 가 `.vercel-token`(또는 `VERCEL_TOKEN` 환경변수)으로 배포
- 토큰 인증이라 재로그인·계정 혼동 없이 배포됨
- `.env`, `.vercel-token` 은 `.gitignore` 처리되어 커밋되지 않음
