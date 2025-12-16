export type DisperseParams = {
	spacing: number
	particleSize: number
	edgeBias: number
	maxParticles: number
	gridCols: number
	gridRows: number
	speedPx: number
	sigma: number
	intensity: number
	distance: number
	randomness: number
	swirlFactor: number
	swirlSpeed: number
	showHeadLine: boolean
	debugBounds: boolean
	direction: 'ltr' | 'rtl'
}

export type Particle = {
	homeX: number
	homeY: number
	targetX: number
	targetY: number
	seed: number
	// For debugging/overlays
	glyphIndex: number
}

export type GlyphMask = {
	width: number
	height: number
	dpr: number
	minX: number
	minY: number
	data: Uint8ClampedArray
}

export type ParticleBuildDeps = {
	fontKey: number
	text: string
	fontSize: number
	spacing: number
	edgeBias: number
	maxParticles: number
	distance: number
	randomness: number
	salt: number
}

