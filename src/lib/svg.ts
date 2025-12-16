import type { GlyphLayout, LayoutResult, TransformContext, TransformFn } from './types'

function xmlEscape(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

export type SvgDoc = {
	width: number
	height: number
	viewBox: { minX: number; minY: number; width: number; height: number }
	content: string
}

export function glyphsToSvg(layout: LayoutResult, transform: TransformFn, tctx: TransformContext, fill: string): SvgDoc {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
	let paths: string[] = []
	for (let i = 0; i < layout.glyphs.length; i++) {
		const g = layout.glyphs[i]
		let d = ''
		for (let k = 0; k < g.commands.length; k++) {
			const c = g.commands[k]
			switch (c.type) {
				case 'M': {
					const theta = 0
					const p = transform({
						glyphIndex: g.index,
						originX: g.originX,
						originY: g.originY,
						localMinX: g.localBBox.minX,
						localMaxX: g.localBBox.maxX,
						pointX: c.x, pointY: c.y,
						u: (c.x - g.localBBox.minX) / g.localWidth,
						tangentAngle: theta
					}, tctx)
					d += `M ${p.x} ${p.y} `
					minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
					minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
					break
				}
				case 'L': {
					// Approximate with previous point in command stream
					const prev = k > 0 ? g.commands[k - 1] : null
					const px = prev && 'x' in prev ? (prev as any).x as number : c.x
					const py = prev && 'y' in prev ? (prev as any).y as number : c.y
					const theta = Math.atan2(c.y - py, c.x - px)
					const p = transform({
						glyphIndex: g.index, originX: g.originX, originY: g.originY,
						localMinX: g.localBBox.minX, localMaxX: g.localBBox.maxX,
						pointX: c.x, pointY: c.y,
						u: (c.x - g.localBBox.minX) / g.localWidth,
						tangentAngle: theta
					}, tctx)
					d += `L ${p.x} ${p.y} `
					minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
					minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
					break
				}
				case 'Q': {
					const theta1 = 0 // not used in path string
					const p1 = transform({
						glyphIndex: g.index, originX: g.originX, originY: g.originY,
						localMinX: g.localBBox.minX, localMaxX: g.localBBox.maxX,
						pointX: c.x1, pointY: c.y1,
						u: (c.x1 - g.localBBox.minX) / g.localWidth,
						tangentAngle: theta1
					}, tctx)
					const theta = Math.atan2(c.y - c.y1, c.x - c.x1)
					const p = transform({
						glyphIndex: g.index, originX: g.originX, originY: g.originY,
						localMinX: g.localBBox.minX, localMaxX: g.localBBox.maxX,
						pointX: c.x, pointY: c.y,
						u: (c.x - g.localBBox.minX) / g.localWidth,
						tangentAngle: theta
					}, tctx)
					d += `Q ${p1.x} ${p1.y} ${p.x} ${p.y} `
					minX = Math.min(minX, p1.x, p.x); maxX = Math.max(maxX, p1.x, p.x)
					minY = Math.min(minY, p1.y, p.y); maxY = Math.max(maxY, p1.y, p.y)
					break
				}
				case 'C': {
					const theta1 = 0
					const p1 = transform({
						glyphIndex: g.index, originX: g.originX, originY: g.originY,
						localMinX: g.localBBox.minX, localMaxX: g.localBBox.maxX,
						pointX: c.x1, pointY: c.y1,
						u: (c.x1 - g.localBBox.minX) / g.localWidth,
						tangentAngle: theta1
					}, tctx)
					const p2 = transform({
						glyphIndex: g.index, originX: g.originX, originY: g.originY,
						localMinX: g.localBBox.minX, localMaxX: g.localBBox.maxX,
						pointX: c.x2, pointY: c.y2,
						u: (c.x2 - g.localBBox.minX) / g.localWidth,
						tangentAngle: 0
					}, tctx)
					const theta = Math.atan2(c.y - c.y2, c.x - c.x2)
					const p = transform({
						glyphIndex: g.index, originX: g.originX, originY: g.originY,
						localMinX: g.localBBox.minX, localMaxX: g.localBBox.maxX,
						pointX: c.x, pointY: c.y,
						u: (c.x - g.localBBox.minX) / g.localWidth,
						tangentAngle: theta
					}, tctx)
					d += `C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p.x} ${p.y} `
					minX = Math.min(minX, p1.x, p2.x, p.x); maxX = Math.max(maxX, p1.x, p2.x, p.x)
					minY = Math.min(minY, p1.y, p2.y, p.y); maxY = Math.max(maxY, p1.y, p2.y, p.y)
					break
				}
				case 'Z': {
					d += 'Z '
					break
				}
			}
		}
		if (d) {
			paths.push(`<path d="${d.trim()}" fill="${xmlEscape(fill)}" />`)
		}
	}
	if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1; maxY = 1 }
	const vb = { minX, minY, width: maxX - minX, height: maxY - minY }
	const content = paths.join('\n')
	return { width: vb.width, height: vb.height, viewBox: vb, content }
}

export function particlesToSvg(
	positions: Float32Array,
	count: number,
	radius: number,
	fill: string
): SvgDoc {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
	const parts: string[] = []
	for (let i = 0; i < count; i++) {
		const x = positions[i * 2 + 0]
		const y = positions[i * 2 + 1]
		minX = Math.min(minX, x - radius); maxX = Math.max(maxX, x + radius)
		minY = Math.min(minY, y - radius); maxY = Math.max(maxY, y + radius)
		parts.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="${xmlEscape(fill)}" />`)
	}
	if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1; maxY = 1 }
	const vb = { minX, minY, width: maxX - minX, height: maxY - minY }
	return { width: vb.width, height: vb.height, viewBox: vb, content: parts.join('\n') }
}

export function particlesToSvgWithPalette(
	positions: Float32Array,
	glyphIndices: number[],
	radius: number,
	defaultFill: string,
	palette?: string[]
): SvgDoc {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
	const items: string[] = []
	for (let i = 0; i < glyphIndices.length; i++) {
		const x = positions[i * 2 + 0]
		const y = positions[i * 2 + 1]
		const color = palette?.[glyphIndices[i]] || defaultFill
		minX = Math.min(minX, x - radius); maxX = Math.max(maxX, x + radius)
		minY = Math.min(minY, y - radius); maxY = Math.max(maxY, y + radius)
		items.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="${xmlEscape(color)}" />`)
	}
	if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1; maxY = 1 }
	const vb = { minX, minY, width: maxX - minX, height: maxY - minY }
	return { width: vb.width, height: vb.height, viewBox: vb, content: items.join('\n') }
}

export function wrapSvg(doc: SvgDoc, background?: string): string {
	const bg = background ? `<rect x="${doc.viewBox.minX}" y="${doc.viewBox.minY}" width="${doc.viewBox.width}" height="${doc.viewBox.height}" fill="${xmlEscape(background)}" />\n` : ''
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${doc.viewBox.minX} ${doc.viewBox.minY} ${doc.viewBox.width} ${doc.viewBox.height}">
${bg}${doc.content}
</svg>`
}

export function downloadText(filename: string, text: string, mime: string = 'image/svg+xml') {
	const blob = new Blob([text], { type: mime })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

