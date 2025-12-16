// Simple IndexedDB KV store for persisting last uploaded font
const DB_NAME = 'pulse-typography'
const STORE = 'kv'
const KEY_LAST_FONT = 'lastFont'
const KEY_LAST_TEXT = 'lastText'
const KEY_PRESETS_PREFIX = 'presets:'

type LastFontRecord = {
	name: string
	type: string
	data: ArrayBuffer
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1)
		req.onupgradeneeded = () => {
			const db = req.result
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE)
			}
		}
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
	})
}

export async function saveLastFont(buf: ArrayBuffer, name: string, type: string): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite')
		const store = tx.objectStore(STORE)
		const rec: LastFontRecord = { name, type, data: buf }
		const req = store.put(rec, KEY_LAST_FONT)
		req.onsuccess = () => resolve()
		req.onerror = () => reject(req.error)
	})
}

export async function loadLastFont(): Promise<LastFontRecord | null> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly')
		const store = tx.objectStore(STORE)
		const req = store.get(KEY_LAST_FONT)
		req.onsuccess = () => resolve((req.result as LastFontRecord) ?? null)
		req.onerror = () => reject(req.error)
	})
}

export async function clearLastFont(): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite')
		const store = tx.objectStore(STORE)
		const req = store.delete(KEY_LAST_FONT)
		req.onsuccess = () => resolve()
		req.onerror = () => reject(req.error)
	})
}

export async function saveLastText(text: string): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite')
		const store = tx.objectStore(STORE)
		const req = store.put(text, KEY_LAST_TEXT)
		req.onsuccess = () => resolve()
		req.onerror = () => reject(req.error)
	})
}

export async function loadLastText(): Promise<string | null> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly')
		const store = tx.objectStore(STORE)
		const req = store.get(KEY_LAST_TEXT)
		req.onsuccess = () => resolve((req.result as string) ?? null)
		req.onerror = () => reject(req.error)
	})
}

export async function clearLastText(): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite')
		const store = tx.objectStore(STORE)
		const req = store.delete(KEY_LAST_TEXT)
		req.onsuccess = () => resolve()
		req.onerror = () => reject(req.error)
	})
}

// Presets per mode
type PresetMap = Record<string, any>

async function readPresetsForMode(mode: string): Promise<PresetMap> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly')
		const store = tx.objectStore(STORE)
		const req = store.get(KEY_PRESETS_PREFIX + mode)
		req.onsuccess = () => resolve((req.result as PresetMap) ?? {})
		req.onerror = () => reject(req.error)
	})
}

async function writePresetsForMode(mode: string, map: PresetMap): Promise<void> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite')
		const store = tx.objectStore(STORE)
		const req = store.put(map, KEY_PRESETS_PREFIX + mode)
		req.onsuccess = () => resolve()
		req.onerror = () => reject(req.error)
	})
}

export async function saveModePreset(mode: string, name: string, data: any): Promise<void> {
	const map = await readPresetsForMode(mode)
	map[name] = data
	await writePresetsForMode(mode, map)
}

export async function listModePresets(mode: string): Promise<string[]> {
	const map = await readPresetsForMode(mode)
	return Object.keys(map).sort()
}

export async function loadModePreset<T = any>(mode: string, name: string): Promise<T | null> {
	const map = await readPresetsForMode(mode)
	return (map[name] as T) ?? null
}

export async function deleteModePreset(mode: string, name: string): Promise<void> {
	const map = await readPresetsForMode(mode)
	if (name in map) {
		delete map[name]
		await writePresetsForMode(mode, map)
	}
}

