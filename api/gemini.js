export const config = { runtime: 'edge' }

const MODEL = 'gemini-1.5-flash'
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export default async function handler(req) {
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/config')) {
    return Response.json({ hasServerKey: !!process.env.GEMINI_API_KEY })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body
  try { body = await req.json() } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Server env var takes priority; fall back to key sent from device
  const apiKey = process.env.GEMINI_API_KEY || body.apiKey

  if (!apiKey) {
    return Response.json(
      { error: 'No API key. Add a free Gemini key in Settings, or ask whoever set up this app to add it to Vercel.' },
      { status: 401 }
    )
  }

  const { prompt, image } = body
  const parts = []
  if (image) {
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: image.replace(/^data:image\/\w+;base64,/, '')
      }
    })
  }
  parts.push({ text: prompt })

  try {
    const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return Response.json(
        { error: err?.error?.message || `Gemini error ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return Response.json({ text })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
