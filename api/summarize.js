/* global process */
/**
 * Vercel 서버리스 함수 — Claude AI 클리닉 요약
 *
 * 환경변수 설정 (Vercel Dashboard > Settings > Environment Variables):
 *   CLAUDE_API_KEY = sk-ant-api03-...
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'API_KEY_NOT_SET' });
  }

  const { prompt } = req.body ?? {};
  if (!prompt) {
    return res.status(400).json({ error: '프롬프트가 없습니다.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message ?? 'Claude API 오류',
      });
    }

    return res.json({ summary: data.content[0].text });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류: ' + e.message });
  }
}
