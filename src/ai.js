function stripBase64Prefix(b64) {
  return b64.replace(/^data:image\/\w+;base64,/, '')
}

function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in response')
  return JSON.parse(match[0])
}

async function call(prompt, image = null, apiKey = null) {
  const body = { prompt }
  if (image) body.image = image
  if (apiKey) body.apiKey = apiKey

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `AI error ${res.status}`)
  }

  const data = await res.json()
  return data.text || ''
}

let _serverKeyCache = null
export async function hasServerKey() {
  if (_serverKeyCache !== null) return _serverKeyCache
  try {
    const res = await fetch('/api/config')
    if (!res.ok) { _serverKeyCache = false; return false }
    const data = await res.json()
    _serverKeyCache = !!data.hasServerKey
  } catch {
    _serverKeyCache = false
  }
  return _serverKeyCache
}

// Returns name, species, category, careSummary, confidence ("high"/"low"),
// confidenceScore (0-100), and alternatives for the confusion-matrix view.
export async function identifyPlant(apiKey, imageBase64) {
  const prompt = `You are a botanist. Look at this plant photo carefully and identify it.
Respond ONLY in JSON with no extra text:
{
  "name": "Basil",
  "species": "Ocimum basilicum",
  "category": "herb",
  "careSummary": "Needs full sun, water when top soil is dry, pinch flowers to keep bushy",
  "confidence": "high",
  "confidenceScore": 92,
  "alternatives": [
    {"name": "Thai Basil", "score": 6},
    {"name": "Lemon Basil", "score": 2}
  ]
}
Valid categories: vegetable, herb, flower, succulent, fruit, tree, other.
confidenceScore is 0-100. Include up to 2 alternatives if there is any uncertainty (scores must sum with main to 100).
If you cannot identify it: name="Unknown Plant", confidence="low", confidenceScore=0, alternatives=[].`

  const text = await call(prompt, imageBase64, apiKey)
  return extractJSON(text)
}

// Returns rich health analysis: score, confidence, diagnosis, problems with confidence
// bars, and prioritised solutions that can be tracked as done/not done.
export async function analyzeHealth(apiKey, plantName, species, imageBase64) {
  const prompt = `You are a plant health expert. Examine this photo of a ${plantName} (${species || 'unknown species'}).
Respond ONLY in JSON with no extra text:
{
  "healthScore": 72,
  "assessmentConfidence": 85,
  "diagnosis": "Plant showing early signs of overwatering stress with some nutrient deficiency",
  "trend": "declining",
  "problems": [
    {"issue": "Yellowing lower leaves", "confidence": 90, "severity": "high"},
    {"issue": "Possible root saturation from overwatering", "confidence": 75, "severity": "high"},
    {"issue": "Minor nutrient deficiency visible in leaf colour", "confidence": 60, "severity": "medium"}
  ],
  "solutions": [
    {"action": "Let soil dry completely before next watering — test by pushing finger 2cm into soil", "priority": "urgent"},
    {"action": "Check that pot drainage holes are not blocked", "priority": "high"},
    {"action": "Feed with balanced liquid fertiliser at half strength", "priority": "medium"}
  ],
  "notes": "Overall structure is good — early intervention will reverse this quickly"
}
healthScore: 0-100 (100 = perfect health).
assessmentConfidence: 0-100 (how certain you are of this analysis given photo quality and visibility).
severity: "low" | "medium" | "high" | "critical".
priority: "urgent" | "high" | "medium" | "low".
If the plant looks healthy, problems should be an empty array [] and healthScore should be 75-100.
Always include exactly 3 solutions.`

  const text = await call(prompt, imageBase64, apiKey)
  return extractJSON(text)
}

export async function refreshTips(apiKey, plantName, imageBase64) {
  const prompt = `Give me 3 fresh care tips for my ${plantName} based on this photo.
Respond ONLY in JSON:
{"tips":["Water only when the top 2cm of soil feels dry","Place in bright indirect sunlight","Feed with liquid fertiliser once a month"]}
Each tip must be one short practical sentence, no jargon.`

  const text = await call(prompt, imageBase64, apiKey)
  const parsed = extractJSON(text)
  return parsed.tips || []
}

// Scan a whole garden photo — returns all plants with positions and confidence.
export async function detectGardenPlants(apiKey, imageBase64) {
  const prompt = `You are a botanist scanning a garden, balcony, shelf, or plant collection photo.
Identify EVERY individual plant you can see. For each plant give its approximate CENTER position
as x (left=0.0, right=1.0) and y (top=0.0, bottom=1.0).

Respond ONLY in JSON with no extra text:
{"plants":[
  {"name":"Basil","species":"Ocimum basilicum","category":"herb","careSummary":"Water when dry, needs sun","confidence":"high","confidenceScore":90,"x":0.25,"y":0.60},
  {"name":"Peace Lily","species":"Spathiphyllum","category":"flower","careSummary":"Low light, water weekly","confidence":"high","confidenceScore":85,"x":0.70,"y":0.55}
]}
Valid categories: vegetable, herb, flower, succulent, fruit, tree, other.
For unknown plants use name="Unknown Plant", confidence="low", confidenceScore=30.
Return empty array if no plants visible: {"plants":[]}`

  const text = await call(prompt, imageBase64, apiKey)
  const parsed = extractJSON(text)
  return Array.isArray(parsed.plants) ? parsed.plants : []
}
