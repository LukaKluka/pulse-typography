export type WaveParams = {
	amplitude: number
	speed: number
	intensity: number
	letterPhase: number
	intraGlyphPhase: number
	pin: number
	direction: 'ltr' | 'rtl'
	sharpness: number
	maxDx: number
}

export type GlyphCommand =
	| { type: 'M'; x: number; y: number }
	| { type: 'L'; x: number; y: number }
	| { type: 'Q'; x1: number; y1: number; x: number; y: number }
	| { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
	| { type: 'Z' }

export type GlyphLayout = {
	glyph: any
	index: number
	// Baseline origin in canvas coordinates where glyph local (0,0) is placed
	originX: number
	originY: number
	advance: number
	localBBox: { minX: number; minY: number; maxX: number; maxY: number }
	localWidth: number
	commands: GlyphCommand[]
}

export type LayoutResult = {
	glyphs: GlyphLayout[]
	totalAdvance: number
	ascent: number
	descent: number
}

export type Direction = 'ltr' | 'rtl'

export type TransformContext = {
	time: number
	direction: Direction
	totalAdvance: number
	leftGaps: number[]
	rightGaps: number[]
}

export type TransformInput = {
	glyphIndex: number
	originX: number
	originY: number
	localMinX: number
	localMaxX: number
	pointX: number
	pointY: number
	u: number
	// Approximate tangent angle at this point in radians; 0 => horizontal to the right, pi/2 => vertical up
	tangentAngle?: number
}

export type TransformFn = (input: TransformInput, ctx: TransformContext) => { x: number; y: number }
