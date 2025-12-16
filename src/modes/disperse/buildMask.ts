import type { GlyphLayout } from '../../lib/types'
import type { GlyphMask } from './types'

const maskCache = new Map<string, GlyphMask>()

function keyOf(fontKey: number, glyphId: number, fontSize: number, spacing: number, dpr: number) {
	return `${fontKey}|${glyphId}|${fontSize}|${spacing}|${dpr}`
}

export function buildGlyphMask(layout: GlyphLayout, fontKey: number, fontSize: number, spacing: number): GlyphMask {
	const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
	const glyphId = (layout.glyph && (layout.glyph.index ?? layout.glyph.glyphIndex)) || layout.index
	const k = keyOf(fontKey, glyphId, fontSize, spacing, dpr)
	const cached = maskCache.get(k)
	if (cached) return cached

	const minX = layout.localBBox.minX
	const minY = layout.localBBox.minY
	const width = Math.max(1, Math.ceil((layout.localBBox.maxX - minX) * dpr))
	const height = Math.max(1, Math.ceil((layout.localBBox.maxY - minY) * dpr))

	const off = document.createElement('canvas')
	off.width = width
	off.height = height
	const ctx = off.getContext('2d')!
	ctx.setTransform(dpr, 0, 0, dpr, -minX * dpr, -minY * dpr)
	ctx.beginPath()
	for (const c of layout.commands) {
		switch (c.type) {
			case 'M': ctx.moveTo(c.x, c.y); break
			case 'L': ctx.lineTo(c.x, c.y); break
			case 'Q': ctx.quadraticCurveTo(c.x1, c.y1, c.x, c.y); break
			case 'C': ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y); break
			case 'Z': ctx.closePath(); break
		}
	}
	ctx.fillStyle = '#000'
	ctx.fill()
	const img = ctx.getImageData(0, 0, width, height)
	const mask: GlyphMask = { width, height, dpr, minX, minY, data: img.data }
	maskCache.set(k, mask)
	return mask
}

export function alphaAt(mask: GlyphMask, x: number, y: number): number {
	const xi = Math.max(0, Math.min(mask.width - 1, Math.round(x)))
	const yi = Math.max(0, Math.min(mask.height - 1, Math.round(y)))
	const idx = (yi * mask.width + xi) * 4 + 3
	return mask.data[idx]
}

export function isEdge(mask: GlyphMask, x: number, y: number): boolean {
	const xi = Math.round(x)
	const yi = Math.round(y)
	let filled = false
	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -1; dx <= 1; dx++) {
			const xx = Math.max(0, Math.min(mask.width - 1, xi + dx))
			const yy = Math.max(0, Math.min(mask.height - 1, yi + dy))
			const idx = (yy * mask.width + xx) * 4 + 3
			const a = mask.data[idx]
			if (dx === 0 && dy === 0) filled = a > 0
			else if (a === 0 && filled) return true
		}
	}
	return false
}


