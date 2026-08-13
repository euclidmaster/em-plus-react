#!/usr/bin/env bash
# 만료 걱정 없는 Vercel 토큰으로 프로덕션 배포.
# 토큰 우선순위: 환경변수 VERCEL_TOKEN > 프로젝트 루트의 .vercel-token 파일
# (토큰은 em-plus-react를 소유한 silverbeautylee 계정에서 발급해야 함)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOKEN="${VERCEL_TOKEN:-$(cat "$ROOT/.vercel-token" 2>/dev/null || true)}"
TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]')"

if [ -z "$TOKEN" ]; then
  echo "❌ Vercel 토큰이 없습니다."
  echo "   1) https://vercel.com/account/settings/tokens 에서 토큰 발급 (silverbeautylee 계정)"
  echo "   2) 프로젝트 루트에서:  echo \"발급받은토큰\" > .vercel-token"
  echo "   3) 다시:  npm run deploy"
  exit 1
fi

echo "▲ 프로덕션 배포 중..."
npx vercel --prod --yes --token="$TOKEN"
