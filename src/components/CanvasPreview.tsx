import React from 'react'
import type { LayoutResult } from '../lib/types'
import { renderGlyphs } from '../lib/render'
import { simpleScaleTransformFactory, type SimpleParams } from '../lib/deformSimple'
import { hzStretchTransformFactory, type HzParams } from '../lib/deformHzStretch'
import { rubberWaveTransformFactory, type RubberParams } from '../lib/deformRubber'
import { envelopeTransformFactory, type EnvelopeParams } from '../lib/deformEnvelope'
import type { DisperseParams, Particle } from '../modes/disperse/types'
import { buildParticlesFromLayout } from '../modes/disperse/particleize'
import { computeTargets } from '../modes/disperse/targets'
import { animateParticles } from '../modes/disperse/animate'
import { renderParticles, drawDisperseDebug } from '../modes/disperse/render'

export type Mode = 'simple' | 'hz' | 'rubber' | 'envelope' | 'disperse' | 'disperseColor'

type Props = {
	layout: LayoutResult | null
	mode: Mode
	minSpacingPx?: number
	timeOverride?: number | null
	hzParams: HzParams
	simpleParams: SimpleParams
	rubberParams: RubberParams
	envelopeParams: EnvelopeParams
	disperseParams: DisperseParams
	dispersePalette?: string[]
	blendEnabled?: boolean
	blendSpread?: number
	fontKey: number
	disperseSalt: number
	centered: boolean
	textColor: string
	background: string
	playing: boolean
	showDebug: boolean
	showTrail: boolean
	onTime?: (t: number) => void
}

export default function CanvasPreview(props: Props) {
	const { layout, mode, minSpacingPx = 2, timeOverride = null, hzParams, simpleParams, rubberParams, envelopeParams, disperseParams, dispersePalette, blendEnabled = false, blendSpread = 0.25, fontKey, disperseSalt, centered, textColor, background, playing, showDebug, showTrail, onTime } = props
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
	const rafRef = React.useRef<number | null>(null)
	const startRef = React.useRef<number | null>(null)
	const pausedAccumRef = React.useRef<number>(0)
	const wasPlayingRef = React.useRef<boolean>(playing)
	// Disperse mode data
	const particlesRef = React.useRef<Particle[] | null>(null)
	const positionsRef = React.useRef<Float32Array | null>(null)
	const disperseBoundsRef = React.useRef<{ minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number } | null>(null)
	// For Disperse Color blending cycles
	const prevHeadXRef = React.useRef<number | null>(null)
	const blendLockedRef = React.useRef<boolean>(false)

	React.useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return
		// Precompute neighbor gaps for non-overlap clamps (in layout space)
		const leftGaps: number[] = []
		const rightGaps: number[] = []
		const margin = Math.max(0, minSpacingPx) // px
		if (layout) {
			for (let i = 0; i < layout.glyphs.length; i++) {
				const cur = layout.glyphs[i]
				// Left gap
				if (i > 0) {
					const prev = layout.glyphs[i - 1]
					const prevRight = prev.originX + prev.localBBox.maxX
					const curLeft = cur.originX + cur.localBBox.minX
					leftGaps[i] = Math.max(0, (curLeft - prevRight) - margin)
				} else {
					leftGaps[i] = Number.POSITIVE_INFINITY
				}
				// Right gap
				if (i < layout.glyphs.length - 1) {
					const next = layout.glyphs[i + 1]
					const curRight = cur.originX + cur.localBBox.maxX
					const nextLeft = next.originX + next.localBBox.minX
					rightGaps[i] = Math.max(0, (nextLeft - curRight) - margin)
				} else {
					rightGaps[i] = Number.POSITIVE_INFINITY
				}
			}
		}
		// Build disperse particles if needed
		if (layout && (mode === 'disperse' || mode === 'disperseColor')) {
			// Build once on deps: layout + disperse params that affect build + salt
			const glyphCenters = layout.glyphs.map(g => ({
				x: g.originX + (g.localBBox.minX + g.localBBox.maxX) * 0.5,
				y: g.originY + (g.localBBox.minY + g.localBBox.maxY) * 0.5
			}))
			const parts = buildParticlesFromLayout(
				layout,
				fontKey,
				// fontSize can be approximated via layout metrics range; we pass 0 as unused in key other than spacing
				Math.max(1, Math.round((layout.ascent + layout.descent))),
				disperseParams.spacing,
				disperseParams.gridCols,
				disperseParams.gridRows,
				disperseParams.edgeBias,
				disperseParams.maxParticles,
				disperseSalt
			)
			// Compute text bounds from homes
			let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
			for (const p of parts) {
				if (p.homeX < minX) minX = p.homeX
				if (p.homeX > maxX) maxX = p.homeX
				if (p.homeY < minY) minY = p.homeY
				if (p.homeY > maxY) maxY = p.homeY
			}
			if (!isFinite(minX)) { minX = 0; maxX = 1; minY = 0; maxY = 1 }
			const centerX = (minX + maxX) * 0.5
			const centerY = (minY + maxY) * 0.5
			computeTargets(parts, centerX, centerY, glyphCenters, disperseParams.distance, disperseParams.randomness)
			particlesRef.current = parts
			positionsRef.current = new Float32Array(parts.length * 2)
			disperseBoundsRef.current = { minX, maxX, minY, maxY, centerX, centerY }
		} else if (mode !== 'disperse' && mode !== 'disperseColor') {
			particlesRef.current = null
			positionsRef.current = null
			disperseBoundsRef.current = null
		}

		function resize() {
			const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
			const cssW = canvas.clientWidth || 1200
			const cssH = canvas.clientHeight || 600
			canvas.width = Math.floor(cssW * dpr)
			canvas.height = Math.floor(cssH * dpr)
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}
		resize()
		window.addEventListener('resize', resize)

		function frame(ts: number) {
			if (startRef.current == null) startRef.current = ts
			let t: number
			if (timeOverride != null) {
				t = timeOverride
			} else {
				if (!wasPlayingRef.current && playing) {
					startRef.current = ts - pausedAccumRef.current
				} else if (wasPlayingRef.current && !playing) {
					pausedAccumRef.current = (ts - (startRef.current ?? ts))
				}
				t = playing ? ((ts - (startRef.current ?? ts)) / 1000) : (pausedAccumRef.current / 1000)
			}
			wasPlayingRef.current = playing
			if (onTime) onTime(t)

			if (showTrail) {
				ctx.save()
				ctx.fillStyle = background + 'cc'
				ctx.fillRect(0, 0, canvas.width, canvas.height)
				ctx.restore()
			} else {
				ctx.save()
				ctx.fillStyle = background
				ctx.fillRect(0, 0, canvas.width, canvas.height)
				ctx.restore()
			}
			if (layout && layout.glyphs.length > 0 && mode !== 'disperse' && mode !== 'disperseColor') {
				let offsetX = 0
				const cssW = canvas.clientWidth || 1200
				if (centered) offsetX = (cssW - layout.totalAdvance) * 0.5
				ctx.save()
				ctx.translate(offsetX, 0)
				const tctx = {
					time: t,
					direction: rubberParams.direction,
					totalAdvance: layout.totalAdvance,
					leftGaps,
					rightGaps
				} as const
				const transform = ((): ((...args: any[]) => any) => {
					if (mode === 'simple') return simpleScaleTransformFactory(simpleParams)
					if (mode === 'hz') return hzStretchTransformFactory(hzParams)
					if (mode === 'rubber') return rubberWaveTransformFactory(rubberParams)
					return envelopeTransformFactory(envelopeParams, layout)
				})()
				const waveFrontX = mode === 'envelope'
					? (((t * envelopeParams.speedPx * (envelopeParams.direction === 'ltr' ? 1 : -1)) % layout.totalAdvance + layout.totalAdvance) % layout.totalAdvance) + offsetX
					: null
				renderGlyphs(ctx, layout, transform, tctx, {
					fillStyle: textColor,
					debug: showDebug,
					drawWaveFrontX: waveFrontX,
					hudText: showDebug ? `t=${t.toFixed(2)}s` : null
				})
				ctx.restore()
			} else if (layout && layout.glyphs.length > 0 && (mode === 'disperse' || mode === 'disperseColor') && particlesRef.current && positionsRef.current && disperseBoundsRef.current) {
				let offsetX = 0
				const cssW = canvas.clientWidth || 1200
				if (centered) offsetX = (cssW - layout.totalAdvance) * 0.5
				ctx.save()
				ctx.translate(offsetX, 0)
				const b = disperseBoundsRef.current
				const headX = animateParticles(
					particlesRef.current,
					t,
					b.minX,
					b.maxX,
					disperseParams.speedPx,
					disperseParams.sigma,
					disperseParams.intensity,
					disperseParams.direction,
					disperseParams.swirlFactor,
					disperseParams.swirlSpeed,
					b.centerX,
					b.centerY,
					positionsRef.current
				)
				if (mode === 'disperse') {
					renderParticles(ctx, positionsRef.current, particlesRef.current.length, disperseParams.particleSize, textColor)
				} else {
					// Per-glyph colors with optional cycle-based blending (toggles each wrap)
					ctx.save()
					// helpers
					function rnd(seed: number) {
						let t = seed + 0x6D2B79F5
						t = Math.imul(t ^ (t >>> 15), t | 1)
						t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
						return ((t ^ (t >>> 14)) >>> 0) / 4294967296
					}

					const numGlyphs = layout.glyphs.length
					// Toggle blend lock on wrap (wave head loops)
					if (blendEnabled && numGlyphs > 0) {
						const prev = prevHeadXRef.current
						if (prev != null) {
							if (disperseParams.direction === 'ltr') {
								if (headX < prev - 2) blendLockedRef.current = !blendLockedRef.current
							} else {
								if (headX > prev + 2) blendLockedRef.current = !blendLockedRef.current
							}
						}
						prevHeadXRef.current = headX
					} else {
						blendLockedRef.current = false
						prevHeadXRef.current = headX
					}

					for (let i = 0; i < particlesRef.current.length; i++) {
						const x = positionsRef.current[i * 2 + 0]
						const y = positionsRef.current[i * 2 + 1]
						const gi = particlesRef.current[i].glyphIndex
						const baseHex = dispersePalette?.[gi] || textColor
						let finalHex = baseHex
						if (blendEnabled && (dispersePalette?.length || 0) === numGlyphs && blendLockedRef.current) {
							// Choose a target glyph based on spread and seed; assign that palette color exactly
							const maxOffset = Math.max(1, Math.round(blendSpread * (numGlyphs - 1)))
							const r = rnd(particlesRef.current[i].seed)
							const offset = Math.floor(r * (maxOffset * 2 + 1)) - maxOffset
							let tj = gi + offset
							if (tj < 0) tj = 0
							if (tj >= numGlyphs) tj = numGlyphs - 1
							finalHex = dispersePalette![tj] || baseHex
						}
						ctx.fillStyle = finalHex
						ctx.beginPath()
						ctx.arc(x, y, disperseParams.particleSize, 0, Math.PI * 2)
						ctx.fill()
					}
					ctx.restore()
				}
				if (disperseParams.debugBounds || disperseParams.showHeadLine) {
					drawDisperseDebug(ctx, b.minX, b.maxX, b.minY, b.maxY, disperseParams.showHeadLine ? headX : null)
				}
				ctx.restore()
			}
			rafRef.current = requestAnimationFrame(frame)
		}
		rafRef.current = requestAnimationFrame(frame)
		return () => {
			window.removeEventListener('resize', resize)
			if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
			startRef.current = null
		}
	}, [layout, mode, minSpacingPx, timeOverride, hzParams, simpleParams, rubberParams, envelopeParams, disperseParams, dispersePalette, fontKey, disperseSalt, centered, textColor, background, playing, showDebug, showTrail])

	return <canvas ref={canvasRef} />
}

