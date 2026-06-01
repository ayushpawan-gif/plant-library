export const config = { runtime: 'edge' }

export default function handler() {
  return Response.json({ hasServerKey: !!process.env.GEMINI_API_KEY })
}
