import { clamp, lerp, smoothstep, sign } from './math'
import type { GlyphCommand, GlyphLayout, WaveParams } from './types'

export function computeDx(
	u: number,
	glyphIndex: number,
	time: number,
	params: WaveParams
): number {
	const dir = params.direction === 'ltr' ? 1 : -1
	let phase = (glyphIndex * params.letterPhase) + (u * params.intraGlyphPhase) - (time * params.speed * dir)
	let w = Math.sin(phase)
	if (params.sharpness !== 1) {
		const a = Math.abs(w)
		w = sign(w) * Math.pow(a, clamp(params.sharpness, 0.1, 8))
	}
	const base = w * params.amplitude * params.intensity
	let falloff = smoothstep(0, 1, u)
	falloff = lerp(1, falloff, clamp(params.pin, 0, 1))
	const dx = clamp(base * falloff, -params.maxDx, params.maxDx)
	return dx
}

export function drawDeformedGlyph(
	ctx: CanvasRenderingContext2D,
	layout: GlyphLayout,
	time: number,
	params: WaveParams
) {
	const { originX, originY, localBBox, localWidth, commands, index } = layout
	const minX = localBBox.minX
	const width = localWidth
	ctx.beginPath()
	for (let k = 0; k < commands.length; k++) {
		const c = commands[k]
		switch (c.type) {
			case 'M': {
				const u = (c.x - minX) / width
				const dx = computeDx(u, index, time, params)
				ctx.moveTo(originX + c.x + dx, originY - c.y)
				break
			}
			case 'L': {
				const u = (c.x - minX) / width
				const dx = computeDx(u, index, time, params)
				ctx.lineTo(originX + c.x + dx, originY - c.y)
				break
			}
			case 'Q': {
				const u1 = (c.x1 - minX) / width
				const u = (c.x - minX) / width
				const dx1 = computeDx(u1, index, time, params)
				const dx = computeDx(u, index, time, params)
				ctx.quadraticCurveTo(
					originX + c.x1 + dx1, originY - c.y1,
					originX + c.x + dx, originY - c.y
				)
				break
			}
			case 'C': {
				const u1 = (c.x1 - minX) / width
				const u2 = (c.x2 - minX) / width
				const u = (c.x - minX) / width
				const dx1 = computeDx(u1, index, time, params)
				const dx2 = computeDx(u2, index, time, params)
				const dx = computeDx(u, index, time, params)
				ctx.bezierCurveTo(
					originX + c.x1 + dx1, originY - c.y1,
					originX + c.x2 + dx2, originY - c.y2,
					originX + c.x + dx, originY - c.y
				)
				break
			}
			case 'Z': {
				ctx.closePath()
				break
			}
		}
	}
	ctx.fill()
}

export function drawGlyphDebug(
	ctx: CanvasRenderingContext2D,
	layout: GlyphLayout,
	time: number,
	params: WaveParams
) {
	const { originX, originY, localBBox, localWidth, index } = layout
	// Bounding box
	ctx.save()
	ctx.strokeStyle = 'rgba(255,0,0,0.35)'
	ctx.lineWidth = 1
	const x = originX + localBBox.minX
	const yTop = originY - localBBox.maxY
	ctx.strokeRect(x, yTop, localWidth, localBBox.maxY - localBBox.minY)

	// Wavefront: where phase == 0 => u_front = (t*speed*dir - i*letterPhase) / intraGlyphPhase (wrapped to 0..1)
	const dir = params.direction === 'ltr' ? 1 : -1
	let uFront = (time * params.speed * dir - index * params.letterPhase) / Math.max(1e-6, params.intraGlyphPhase)
	uFront = ((uFront % 1) + 1) % 1
	const xFront = originX + localBBox.minX + uFront * localWidth
	ctx.strokeStyle = 'rgba(0,120,255,0.6)'
	ctx.beginPath()
	ctx.moveTo(xFront, yTop - 8)
	ctx.lineTo(xFront, yTop + (localBBox.maxY - localBBox.minY) + 8)
	ctx.stroke()
	ctx.restore()
}

