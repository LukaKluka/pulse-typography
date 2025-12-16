import type { Particle } from './types'

// Deterministic PRNG
function mulberry32(seed: number) {
	return function() {
		let t = seed += 0x6D2B79F5
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export function computeTargets(
	particles: Particle[],
	textCenterX: number,
	textCenterY: number,
	glyphCenters: Array<{ x: number; y: number }>,
	distance: number,
	randomness: number
) {
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i]
		const rnd = mulberry32(p.seed)
		const gx = glyphCenters[p.glyphIndex]?.x ?? textCenterX
		const gy = glyphCenters[p.glyphIndex]?.y ?? textCenterY
		const radialDx = p.homeX - gx
		const radialDy = p.homeY - gy
		let len = Math.hypot(radialDx, radialDy)
		const rx = Math.cos(rnd() * Math.PI * 2)
		const ry = Math.sin(rnd() * Math.PI * 2)
		let dirX = radialDx
		let dirY = radialDy
		if (len < 1e-6) { dirX = 1; dirY = 0; len = 1 }
		dirX = (dirX / len) * (1 - randomness) + rx * randomness
		dirY = (dirY / len) * (1 - randomness) + ry * randomness
		const dirLen = Math.hypot(dirX, dirY) || 1
		dirX /= dirLen
		dirY /= dirLen
		const radius = distance * Math.sqrt(rnd())
		p.targetX = p.homeX + dirX * radius
		p.targetY = p.homeY + dirY * radius
	}
}


