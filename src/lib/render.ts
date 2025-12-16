import type { GlyphLayout, LayoutResult, TransformContext, TransformFn } from './types'

export type RenderOptions = {
	fillStyle?: string
	debug?: boolean
	drawBBox?: boolean
	drawWaveFrontX?: number | null
	hudText?: string | null
}

export function renderGlyphs(
	ctx: CanvasRenderingContext2D,
	layout: LayoutResult,
	transform: TransformFn,
	tctx: TransformContext,
	opts: RenderOptions = {}
) {
	const { glyphs } = layout
	const fillStyle = opts.fillStyle ?? '#111'
	ctx.save()
	ctx.fillStyle = fillStyle
	for (let i = 0; i < glyphs.length; i++) {
		const g = glyphs[i]
		drawGlyph(ctx, g, transform, tctx)
	}
	ctx.restore()

	if (opts.debug) {
		ctx.save()
		ctx.strokeStyle = 'rgba(255,0,0,0.35)'
		for (let i = 0; i < glyphs.length; i++) {
			const g = glyphs[i]
			const x = g.originX + g.localBBox.minX
			const y = g.originY + g.localBBox.minY
			ctx.strokeRect(x, y, g.localWidth, g.localBBox.maxY - g.localBBox.minY)
		}
		if (opts.drawWaveFrontX != null) {
			const x = opts.drawWaveFrontX
			const yTop = Math.min(...glyphs.map(g => g.originY + g.localBBox.minY)) - 12
			const yBot = Math.max(...glyphs.map(g => g.originY + g.localBBox.maxY)) + 12
			ctx.strokeStyle = 'rgba(0,120,255,0.6)'
			ctx.beginPath()
			ctx.moveTo(x, yTop)
			ctx.lineTo(x, yBot)
			ctx.stroke()
		}
		if (opts.hudText) {
			ctx.fillStyle = 'rgba(0,0,0,0.6)'
			ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
			ctx.fillText(opts.hudText, 8, 16)
		}
		ctx.restore()
	}
}

function drawGlyph(
	ctx: CanvasRenderingContext2D,
	layout: GlyphLayout,
	transform: TransformFn,
	tctx: TransformContext
) {
	const { originX, originY, localBBox, localWidth, commands, index } = layout
	const minX = localBBox.minX
	const maxX = localBBox.maxX
	let prevX: number | null = null
	let prevY: number | null = null
	ctx.beginPath()
	for (let k = 0; k < commands.length; k++) {
		const c = commands[k]
		switch (c.type) {
			case 'M': {
				const u = (c.x - minX) / localWidth
				const theta = 0
				const p = transform({
					glyphIndex: index, originX, originY,
					localMinX: minX, localMaxX: maxX,
					pointX: c.x, pointY: c.y, u, tangentAngle: theta
				}, tctx)
				ctx.moveTo(p.x, p.y)
				prevX = c.x; prevY = c.y
				break
			}
			case 'L': {
				const u = (c.x - minX) / localWidth
				const theta = (prevX != null && prevY != null) ? Math.atan2(c.y - prevY, c.x - prevX) : 0
				const p = transform({
					glyphIndex: index, originX, originY,
					localMinX: minX, localMaxX: maxX,
					pointX: c.x, pointY: c.y, u, tangentAngle: theta
				}, tctx)
				ctx.lineTo(p.x, p.y)
				prevX = c.x; prevY = c.y
				break
			}
			case 'Q': {
				const u1 = (c.x1 - minX) / localWidth
				const theta1 = (prevX != null && prevY != null) ? Math.atan2(c.y1 - prevY, c.x1 - prevX) : 0
				const p1 = transform({
					glyphIndex: index, originX, originY,
					localMinX: minX, localMaxX: maxX,
					pointX: c.x1, pointY: c.y1, u: u1, tangentAngle: theta1
				}, tctx)
				const u = (c.x - minX) / localWidth
				// derivative at t=1 for quadratic: endpoint - control
				const theta = Math.atan2(c.y - c.y1, c.x - c.x1)
				const p = transform({
					glyphIndex: index, originX, originY,
					localMinX: minX, localMaxX: maxX,
					pointX: c.x, pointY: c.y, u, tangentAngle: theta
				}, tctx)
				ctx.quadraticCurveTo(p1.x, p1.y, p.x, p.y)
				prevX = c.x; prevY = c.y
				break
			}
			case 'C': {
				const u1 = (c.x1 - minX) / localWidth
				const theta1 = (prevX != null && prevY != null) ? Math.atan2(c.y1 - prevY, c.x1 - prevX) : 0
				const p1 = transform({
					glyphIndex: index, originX, originY,
					localMinX: minX, localMaxX: maxX,
					pointX: c.x1, pointY: c.y1, u: u1, tangentAngle: theta1
				}, tctx)
				const u2 = (c.x2 - minX) / localWidth
				const theta2 = Math.atan2(c.y2 - c.y1, c.x2 - c.x1)
				const p2 = transform({
					glyphIndex: index, originX, originY,
					localMinX: minX, localMaxX: maxX,
					pointX: c.x2, pointY: c.y2, u: u2, tangentAngle: theta2
				}, tctx)
				const u = (c.x - minX) / localWidth
				// derivative at t=1 for cubic: endpoint - control2
				const theta = Math.atan2(c.y - c.y2, c.x - c.x2)
				const p = transform({
					glyphIndex: index, originX, originY,
					localMinX: minX, localMaxX: maxX,
					pointX: c.x, pointY: c.y, u, tangentAngle: theta
				}, tctx)
				ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p.x, p.y)
				prevX = c.x; prevY = c.y
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


