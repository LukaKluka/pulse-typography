import type { LayoutResult } from '../../lib/types'
import { buildGlyphMask, isEdge } from './buildMask'
import type { Particle } from './types'

// Simple seeded RNG (mulberry32)
function mulberry32(seed: number) {
	return function() {
		let t = seed += 0x6D2B79F5
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

function hashInt(a: number, b: number, c: number): number {
	let h = 2166136261 >>> 0
	h ^= a + 0x9e3779b9 + (h << 6) + (h >> 2)
	h ^= b + 0x9e3779b9 + (h << 6) + (h >> 2)
	h ^= c + 0x9e3779b9 + (h << 6) + (h >> 2)
	return h >>> 0
}

export function buildParticlesFromLayout(
	layout: LayoutResult,
	fontKey: number,
	fontSize: number,
	spacing: number,
	gridCols: number,
	gridRows: number,
	edgeBias: number,
	maxParticles: number,
	salt: number
): Particle[] {
	const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
	type Candidate = { x: number; y: number; w: number; glyphIndex: number; seed: number }
	const candidates: Candidate[] = []
	let totalWeight = 0
	let maxWeight = 1
	for (let gi = 0; gi < layout.glyphs.length; gi++) {
		const g = layout.glyphs[gi]
		const mask = buildGlyphMask(g, fontKey, fontSize, spacing)
		const minX = g.localBBox.minX
		const minY = g.localBBox.minY
		const maxX = g.localBBox.maxX
		const maxY = g.localBBox.maxY
		const bboxW = maxX - minX
		const bboxH = maxY - minY
		let effX = Math.min(spacing, bboxW / 8)
		let effY = Math.min(spacing, bboxH / 8)
		if (gridCols && gridCols > 0) effX = Math.max(bboxW / gridCols, 1e-3)
		if (gridRows && gridRows > 0) effY = Math.max(bboxH / gridRows, 1e-3)
		if (!(effX > 0 && effY > 0)) continue
		for (let y = minY + effY * 0.5; y <= maxY; y += effY) {
			for (let x = minX + effX * 0.5; x <= maxX; x += effX) {
				// test inside using mask
				const px = (x - minX) * mask.dpr
				const py = (y - minY) * mask.dpr
				const a = alphaAt(mask, px, py)
				if (a <= 0) continue
				const edge = isEdge(mask, px, py) ? 1 : 0
				const edgeBoost = 6
				const weight = Math.pow(1 + edgeBoost * edge, Math.max(0, edgeBias))
				maxWeight = Math.max(maxWeight, weight)
				const seed = hashInt(salt, (g.glyph?.index ?? gi) >>> 0, Math.round(x * 10) ^ Math.round(y * 10))
				candidates.push({
					x: g.originX + x,
					y: g.originY + y,
					w: weight,
					glyphIndex: gi,
					seed
				})
				totalWeight += weight
			}
		}
	}
	if (candidates.length <= maxParticles) {
		return candidates.map(c => ({ homeX: c.x, homeY: c.y, targetX: c.x, targetY: c.y, seed: c.seed, glyphIndex: c.glyphIndex }))
	}
	// Weighted selection without replacement (simple O(N*K))
	const rnd = mulberry32(salt >>> 0)
	const selected: Particle[] = []
	const pool = candidates.slice()
	let remaining = maxParticles
	let weights = pool.map(c => c.w)
	let sum = weights.reduce((a, b) => a + b, 0)
	while (remaining > 0 && pool.length > 0) {
		let r = rnd() * sum
		let idx = 0
		for (; idx < weights.length; idx++) {
			r -= weights[idx]
			if (r <= 0) break
		}
		if (idx >= pool.length) idx = pool.length - 1
		const c = pool[idx]
		selected.push({ homeX: c.x, homeY: c.y, targetX: c.x, targetY: c.y, seed: c.seed, glyphIndex: c.glyphIndex })
		sum -= weights[idx]
		pool.splice(idx, 1)
		weights.splice(idx, 1)
		remaining--
	}
	return selected
}

function alphaAt(mask: { data: Uint8ClampedArray; width: number; height: number }, x: number, y: number): number {
	const xi = Math.max(0, Math.min(mask.width - 1, Math.round(x)))
	const yi = Math.max(0, Math.min(mask.height - 1, Math.round(y)))
	const idx = (yi * mask.width + xi) * 4 + 3
	return mask.data[idx]
}

