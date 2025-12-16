import type { Particle } from './types'

export function renderParticles(
	ctx: CanvasRenderingContext2D,
	positions: Float32Array,
	count: number,
	size: number,
	color: string
) {
	ctx.save()
	ctx.fillStyle = color
	for (let i = 0; i < count; i++) {
		const x = positions[i * 2 + 0]
		const y = positions[i * 2 + 1]
		ctx.beginPath()
		ctx.arc(x, y, size, 0, Math.PI * 2)
		ctx.fill()
	}
	ctx.restore()
}

export function drawDisperseDebug(
	ctx: CanvasRenderingContext2D,
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
	headX: number | null
) {
	ctx.save()
	ctx.strokeStyle = 'rgba(255,0,0,0.35)'
	ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
	if (headX != null) {
		ctx.strokeStyle = 'rgba(0,120,255,0.6)'
		ctx.beginPath()
		ctx.moveTo(headX, minY - 12)
		ctx.lineTo(headX, maxY + 12)
		ctx.stroke()
	}
	ctx.restore()
}


