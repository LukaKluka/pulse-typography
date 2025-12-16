import { clamp } from './math'
import type { Direction, TransformFn } from './types'

// Reuse Simple-like params for animation and clamping
export type HzParams = {
	amplitude: number
	speed: number
	intensity: number
	wavelength: number
	minScaleX: number
	maxScaleX: number
	direction: Direction
	verticalHold: number
}

// Horizontal stretch that preserves vertical edge elements:
// - Compute a scaleX like Simple
// - Attenuate the scale effect near vertical edges using a center-weight w in [0,1]
// - w = 1 at center, 0 at edges; use exponent to sharpen edge hold
const EDGE_HOLD_EXPONENT = 2.0

export function hzStretchTransformFactory(params: HzParams): TransformFn {
	return (input, ctx) => {
		const dir = params.direction === 'ltr' ? 1 : -1
		const phase = (input.glyphIndex * params.wavelength) - (ctx.time * params.speed * dir)
		const wave = Math.sin(phase)
		const scaleUnclamped = 1 + wave * params.amplitude * params.intensity
		let scaleX = clamp(scaleUnclamped, params.minScaleX, params.maxScaleX)

		// Non-overlap clamp similar to Simple, but split neighbor gaps to avoid mutual intrusion
		const leftGap = ctx.leftGaps[input.glyphIndex] ?? Number.POSITIVE_INFINITY
		const rightGap = ctx.rightGaps[input.glyphIndex] ?? Number.POSITIVE_INFINITY
		const anchorX = (input.localMinX + input.localMaxX) * 0.5
		if (scaleX > 1 && (Number.isFinite(leftGap) || Number.isFinite(rightGap))) {
			const halfRight = Number.isFinite(rightGap) ? (rightGap * 0.5) : Number.POSITIVE_INFINITY
			const halfLeft = Number.isFinite(leftGap) ? (leftGap * 0.5) : Number.POSITIVE_INFINITY
			const rightRoom = Number.isFinite(halfRight) ? halfRight / Math.max(1e-6, (input.localMaxX - anchorX)) : Number.POSITIVE_INFINITY
			const leftRoom = Number.isFinite(halfLeft) ? halfLeft / Math.max(1e-6, (anchorX - input.localMinX)) : Number.POSITIVE_INFINITY
			const allowed = 1 + Math.min(rightRoom, leftRoom)
			if (isFinite(allowed)) scaleX = Math.min(scaleX, allowed)
		}

		// Orientation-based weight: preserve vertical stems (near vertical tangents)
		// horizontalness = |cos(theta)| where theta is tangent angle; 1 for horizontal, 0 for vertical
		const theta = input.tangentAngle ?? 0
		const horizontalness = Math.abs(Math.cos(theta))
		const exponent = Math.max(0.1, params.verticalHold || EDGE_HOLD_EXPONENT)
		const w = Math.pow(horizontalness, exponent)

		// Apply attenuated scaling
		const effectiveScaleX = 1 + (scaleX - 1) * w
		const px = anchorX + (input.pointX - anchorX) * effectiveScaleX
		const py = input.pointY
		return { x: input.originX + px, y: input.originY + py }
	}
}


