import { clamp, lerp, smoothstep, sign } from './math'
import type { Direction, TransformFn } from './types'

export type RubberParams = {
	amplitude: number
	speed: number
	intensity: number
	letterPhase: number
	intraGlyphPhase: number
	pin: number
	direction: Direction
	sharpness: number
	maxDx: number
}

export function rubberWaveTransformFactory(params: RubberParams): TransformFn {
	return (input, ctx) => {
		const dir = params.direction === 'ltr' ? 1 : -1
		let phase = (input.glyphIndex * params.letterPhase) + (input.u * params.intraGlyphPhase) - (ctx.time * params.speed * dir)
		let w = Math.sin(phase)
		if (params.sharpness !== 1) {
			const a = Math.abs(w)
			w = sign(w) * Math.pow(a, clamp(params.sharpness, 0.1, 8))
		}
		const base = w * params.amplitude * params.intensity
		let falloff = smoothstep(0, 1, input.u)
		falloff = lerp(1, falloff, clamp(params.pin, 0, 1))
		let dx = clamp(base * falloff, -params.maxDx, params.maxDx)
		// Non-overlap clamp using neighbor gaps (split gap to prevent mutual overlap)
		const leftGap = ctx.leftGaps[input.glyphIndex] ?? Number.POSITIVE_INFINITY
		const rightGap = ctx.rightGaps[input.glyphIndex] ?? Number.POSITIVE_INFINITY
		dx = clamp(dx, -(Number.isFinite(leftGap) ? leftGap * 0.5 : leftGap), (Number.isFinite(rightGap) ? rightGap * 0.5 : rightGap))
		return { x: input.originX + input.pointX + dx, y: input.originY + input.pointY }
	}
}

