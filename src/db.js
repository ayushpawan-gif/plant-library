import { openDB } from 'idb'

const DB_NAME = 'plant-library'
const DB_VERSION = 2

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const plants = db.createObjectStore('plants', { keyPath: 'id', autoIncrement: true })
        plants.createIndex('dateAdded', 'dateAdded')
        const snapshots = db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true })
        snapshots.createIndex('plantId', 'plantId')
        snapshots.createIndex('date', 'date')
        db.createObjectStore('tips', { keyPath: 'plantId' })
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (oldVersion < 2) {
        // {id:'main', thumbnail:base64, pins:[{id, x, y, plantId}]}
        db.createObjectStore('garden', { keyPath: 'id' })
      }
    },
  })
}

// Plants
export async function getPlants() {
  const db = await getDB()
  return db.getAll('plants')
}

export async function getPlant(id) {
  const db = await getDB()
  return db.get('plants', id)
}

export async function addPlant(plant) {
  const db = await getDB()
  const id = await db.add('plants', { ...plant, dateAdded: new Date().toISOString() })
  return { ...plant, id, dateAdded: new Date().toISOString() }
}

export async function updatePlant(plant) {
  const db = await getDB()
  await db.put('plants', plant)
}

export async function deletePlant(id) {
  const db = await getDB()
  const tx = db.transaction(['plants', 'snapshots', 'tips'], 'readwrite')
  await tx.objectStore('plants').delete(id)
  const allSnapshots = await tx.objectStore('snapshots').index('plantId').getAll(id)
  for (const s of allSnapshots) await tx.objectStore('snapshots').delete(s.id)
  try { await tx.objectStore('tips').delete(id) } catch (_) {}
  await tx.done
}

// Snapshots
export async function getSnapshots(plantId) {
  const db = await getDB()
  const all = await db.getAllFromIndex('snapshots', 'plantId', plantId)
  return all.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export async function addSnapshot(snapshot) {
  const db = await getDB()
  const id = await db.add('snapshots', { ...snapshot, date: new Date().toISOString() })
  return { ...snapshot, id, date: new Date().toISOString() }
}

export async function getLatestSnapshot(plantId) {
  const snapshots = await getSnapshots(plantId)
  return snapshots[0] || null
}

// Tips
export async function getTips(plantId) {
  const db = await getDB()
  return db.get('tips', plantId)
}

export async function saveTips(plantId, tips) {
  const db = await getDB()
  await db.put('tips', { plantId, tips, savedAt: new Date().toISOString() })
}

// Settings
export async function getSetting(key) {
  const db = await getDB()
  const row = await db.get('settings', key)
  return row ? row.value : null
}

export async function saveSetting(key, value) {
  const db = await getDB()
  await db.put('settings', { key, value })
}

// Garden
export async function getGarden() {
  const db = await getDB()
  return db.get('garden', 'main') || null
}

export async function saveGarden(thumbnail, pins) {
  const db = await getDB()
  await db.put('garden', { id: 'main', thumbnail, pins })
}

export async function saveGardenPins(pins) {
  const db = await getDB()
  const existing = await db.get('garden', 'main')
  if (!existing) return
  await db.put('garden', { ...existing, pins })
}

// Solution tracking — mark a solution in a snapshot as applied or not
export async function markSolutionApplied(snapshotId, solutionIndex, applied) {
  const db = await getDB()
  const snap = await db.get('snapshots', snapshotId)
  if (!snap || !Array.isArray(snap.solutions)) return
  snap.solutions = snap.solutions.map((s, i) =>
    i === solutionIndex
      ? { ...s, applied, appliedDate: applied ? new Date().toISOString() : null }
      : s
  )
  await db.put('snapshots', snap)
  return snap
}
