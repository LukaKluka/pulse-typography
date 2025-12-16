import type { Particle } from './types'

function wrapDistance(x: number, halfRange: number): number {
	let v = x
	const r = halfRange * 2
	v = ((v + halfRange) % r + r) % r - halfRange
	return v
}

export function animateParticles(
	particles: Particle[],
	time: number,
	minX: number,
	maxX: number,
	speedPx: number,
	sigma: number,
	intensity: number,
	direction: 'ltr' | 'rtl',
	swirlFactor: number,
	swirlSpeed: number,
	swirlCenterX: number,
	swirlCenterY: number,
	outPositions: Float32Array
) {
	const W = Math.max(1e-6, maxX - minX)
	let head = (time * speedPx * (direction === 'ltr' ? 1 : -1)) % W
	if (head < 0) head += W
	head += minX
	const twoSigma2 = 2 * sigma * sigma
	const angle = swirlSpeed * time
	const sBase = Math.sin(angle), cBase = Math.cos(angle)
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i]
		const d = wrapDistance(p.homeX - head, W * 0.5)
		const env = Math.exp(-(d * d) / twoSigma2)
		const amt = Math.max(0, Math.min(1, env * intensity))
		let x = p.homeX + (p.targetX - p.homeX) * amt
		let y = p.homeY + (p.targetY - p.homeY) * amt
		if (swirlFactor > 0) {
			const sAmt = swirlFactor * amt
			const dx = x - swirlCenterX
			const dy = y - swirlCenterY
			const sx = dx * cBase - dy * sBase
			const sy = dx * sBase + dy * cBase
			x = swirlCenterX + (dx + (sx - dx) * sAmt)
			y = swirlCenterY + (dy + (sy - dy) * sAmt)
		}
		outPositions[i * 2 + 0] = x
		outPositions[i * 2 + 1] = y
	}
	return head
}


