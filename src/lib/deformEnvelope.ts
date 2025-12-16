import { clamp } from './math'
import type { Direction, LayoutResult, TransformFn } from './types'

export type EnvelopeParams = {
	amplitude: number
	speedPx: number
	intensity: number
	sigma: number
	sharpness: number
	maxDx: number
	direction: Direction
}

export function envelopeTransformFactory(params: EnvelopeParams, layout: LayoutResult): TransformFn {
	const W = Math.max(1e-6, layout.totalAdvance)
	return (input, ctx) => {
		const dir = params.direction === 'ltr' ? 1 : -1
		let head = (ctx.time * params.speedPx * dir) % W
		if (head < 0) head += W
		const centerX = input.originX + (input.localMinX + input.localMaxX) * 0.5
		const dxToHead = Math.abs(centerX - head)
		const wrapped = Math.min(dxToHead, W - dxToHead)
		const sigma = Math.max(1e-6, params.sigma)
		let env = Math.exp(-(wrapped * wrapped) / (2 * sigma * sigma))
		if (params.sharpness !== 1) env = Math.pow(env, Math.max(1, params.sharpness))
		const base = env * params.amplitude * params.intensity
		const falloff = input.u
		let dx = clamp(base * falloff, -params.maxDx, params.maxDx)
		// Non-overlap clamp using neighbor gaps
		const leftGap = ctx.leftGaps[input.glyphIndex] ?? Number.POSITIVE_INFINITY
		const rightGap = ctx.rightGaps[input.glyphIndex] ?? Number.POSITIVE_INFINITY
		dx = clamp(dx, -leftGap, rightGap)
		return { x: input.originX + input.pointX + dx, y: input.originY + input.pointY }
	}
}

