import { clamp } from './math'
import type { Direction, TransformFn } from './types'

export type SimpleParams = {
	amplitude: number
	speed: number
	intensity: number
	wavelength: number
	minScaleX: number
	maxScaleX: number
	direction: Direction
}

export function simpleScaleTransformFactory(params: SimpleParams): TransformFn {
	return (input, ctx) => {
		const dir = params.direction === 'ltr' ? 1 : -1
		const phase = (input.glyphIndex * params.wavelength) - (ctx.time * params.speed * dir)
		const wave = Math.sin(phase)
		const scaleUnclamped = 1 + wave * params.amplitude * params.intensity
		let scaleX = clamp(scaleUnclamped, params.minScaleX, params.maxScaleX)
		// Non-overlap clamp: ensure edges stay within neighbor gaps
		const leftGap = ctx.leftGaps[input.glyphIndex] ?? Number.POSITIVE_INFINITY
		const rightGap = ctx.rightGaps[input.glyphIndex] ?? Number.POSITIVE_INFINITY
		const anchorX = (input.localMinX + input.localMaxX) * 0.5
		if (scaleX > 1 && (Number.isFinite(leftGap) || Number.isFinite(rightGap))) {
			// Split the available gap with the neighbor to avoid mutual overlap
			const halfRight = Number.isFinite(rightGap) ? (rightGap * 0.5) : Number.POSITIVE_INFINITY
			const halfLeft = Number.isFinite(leftGap) ? (leftGap * 0.5) : Number.POSITIVE_INFINITY
			const rightRoom = Number.isFinite(halfRight) ? halfRight / Math.max(1e-6, (input.localMaxX - anchorX)) : Number.POSITIVE_INFINITY
			const leftRoom = Number.isFinite(halfLeft) ? halfLeft / Math.max(1e-6, (anchorX - input.localMinX)) : Number.POSITIVE_INFINITY
			const allowed = 1 + Math.min(rightRoom, leftRoom)
			if (isFinite(allowed)) scaleX = Math.min(scaleX, allowed)
		}
		const px = anchorX + (input.pointX - anchorX) * scaleX
		const py = input.pointY
		return { x: input.originX + px, y: input.originY + py }
	}
}

