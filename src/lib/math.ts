export function clamp(value: number, min: number, max: number): number {
	if (value < min) return min
	if (value > max) return max
	return value
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
	return t * t * (3 - 2 * t)
}

export function sign(x: number): number {
	if (x === 0) return 0
	return x > 0 ? 1 : -1
}

