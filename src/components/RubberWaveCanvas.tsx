import React from 'react'
import type { LayoutResult, WaveParams } from '../lib/types'
import { drawDeformedGlyph, drawGlyphDebug } from '../lib/deform'

type Props = {
	layout: LayoutResult | null
	params: WaveParams
	textColor: string
	centered: boolean
	debug: boolean
	background?: string
}

export default function RubberWaveCanvas(props: Props) {
	const { layout, params, textColor, centered, debug, background = '#ffffff' } = props
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
	const rafRef = React.useRef<number | null>(null)
	const startRef = React.useRef<number | null>(null)

	React.useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

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
			const t = (ts - startRef.current) / 1000
			const cssW = canvas.clientWidth || 1200
			const cssH = canvas.clientHeight || 600
			// Clear
			ctx.save()
			ctx.fillStyle = background
			ctx.fillRect(0, 0, canvas.width, canvas.height)
			ctx.restore()

			if (layout && layout.glyphs.length > 0) {
				// Optional centering: translate X so text is centered
				let offsetX = 0
				if (centered) {
					offsetX = (cssW - layout.totalAdvance) * 0.5
				}
				ctx.save()
				ctx.translate(offsetX, 0)
				ctx.fillStyle = textColor
				for (let i = 0; i < layout.glyphs.length; i++) {
					drawDeformedGlyph(ctx, layout.glyphs[i], t, params)
				}
				if (debug) {
					for (let i = 0; i < layout.glyphs.length; i++) {
						drawGlyphDebug(ctx, layout.glyphs[i], t, params)
					}
					// HUD
					ctx.save()
					ctx.fillStyle = 'rgba(0,0,0,0.6)'
					ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
					ctx.fillText(`t=${t.toFixed(2)}s`, 8 - offsetX, 16)
					ctx.restore()
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
	}, [layout, params, textColor, centered, debug, background])

	return <canvas ref={canvasRef} />
}

