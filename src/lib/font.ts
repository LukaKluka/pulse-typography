import type { LayoutResult, GlyphLayout, GlyphCommand } from './types'

// Minimal typings for opentype to keep our code typed but decoupled
type OpenTypeFont = {
	unitsPerEm: number
	ascender: number
	descender: number
	stringToGlyphs: (s: string) => any[]
	getKerningValue: (leftGlyph: any, rightGlyph: any) => number
}

export async function loadFontFromUrl(url: string): Promise<OpenTypeFont> {
	const res = await fetch(url, { mode: 'cors' })
	const ab = await res.arrayBuffer()
	const { parse } = await import('opentype.js')
	return parse(ab) as unknown as OpenTypeFont
}

export async function loadFontFromFile(file: File): Promise<OpenTypeFont> {
	const ab = await file.arrayBuffer()
	const { parse } = await import('opentype.js')
	return parse(ab) as unknown as OpenTypeFont
}

export async function loadFontFromArrayBuffer(ab: ArrayBuffer): Promise<OpenTypeFont> {
	const { parse } = await import('opentype.js')
	return parse(ab) as unknown as OpenTypeFont
}

export function layoutText(
	font: OpenTypeFont,
	text: string,
	fontSize: number,
	baselineX: number,
	baselineY: number
): LayoutResult {
	const scale = fontSize / font.unitsPerEm
	const glyphs = (font.stringToGlyphs(text) as any[]).filter(Boolean)
	const layouts: GlyphLayout[] = []
	let x = 0
	for (let i = 0; i < glyphs.length; i++) {
		const g = glyphs[i]
		const next = glyphs[i + 1]
		const advance = (g.advanceWidth || 0) * scale
		const kern = next ? font.getKerningValue(g, next) * scale : 0
		const originX = baselineX + x
		const originY = baselineY

		// Build path at (0,0) then keep commands in glyph-local coords
		const path = g.getPath(0, 0, fontSize)
		const commands: GlyphCommand[] = []
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
		for (const c of path.commands) {
			switch (c.type) {
				case 'M':
				case 'L': {
					const x1 = c.x as number, y1 = c.y as number
					minX = Math.min(minX, x1); maxX = Math.max(maxX, x1)
					minY = Math.min(minY, y1); maxY = Math.max(maxY, y1)
					commands.push({ type: c.type, x: x1, y: y1 })
					break
				}
				case 'Q': {
					const x1 = c.x1 as number, y1 = c.y1 as number, x = c.x as number, y = c.y as number
					minX = Math.min(minX, x1, x); maxX = Math.max(maxX, x1, x)
					minY = Math.min(minY, y1, y); maxY = Math.max(maxY, y1, y)
					commands.push({ type: 'Q', x1, y1, x, y })
					break
				}
				case 'C': {
					const x1 = c.x1 as number, y1 = c.y1 as number, x2 = c.x2 as number, y2 = c.y2 as number, x = c.x as number, y = c.y as number
					minX = Math.min(minX, x1, x2, x); maxX = Math.max(maxX, x1, x2, x)
					minY = Math.min(minY, y1, y2, y); maxY = Math.max(maxY, y1, y2, y)
					commands.push({ type: 'C', x1, y1, x2, y2, x, y })
					break
				}
				case 'Z': {
					commands.push({ type: 'Z' })
					break
				}
			}
		}
		// Fallback bbox when glyph has no draw commands
		if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0 }
		layouts.push({
			glyph: g,
			index: i,
			originX,
			originY,
			advance,
			localBBox: { minX, minY, maxX, maxY },
			localWidth: Math.max(1e-6, maxX - minX),
			commands
		})
		x += advance + kern
	}
	const totalAdvance = x
	const ascent = font.ascender * scale
	const descent = Math.abs(font.descender * scale)
	return { glyphs: layouts, totalAdvance, ascent, descent }
}

