import React from 'react'
import { layoutText, loadFontFromArrayBuffer, loadFontFromUrl } from './lib/font'
import type { LayoutResult, Direction } from './lib/types'
import CanvasPreview, { type Mode } from './components/CanvasPreview'
import ControlsPanel from './components/ControlsPanel'
import { simpleScaleTransformFactory, type SimpleParams } from './lib/deformSimple'
import { rubberWaveTransformFactory, type RubberParams } from './lib/deformRubber'
import { envelopeTransformFactory, type EnvelopeParams } from './lib/deformEnvelope'
import { hzStretchTransformFactory, type HzParams } from './lib/deformHzStretch'
import { loadLastFont, saveLastFont, loadLastText, saveLastText } from './lib/storage'
import type { DisperseParams } from './modes/disperse/types'
import { glyphsToSvg, wrapSvg, downloadText, particlesToSvg, particlesToSvgWithPalette } from './lib/svg'
import { buildParticlesFromLayout } from './modes/disperse/particleize'
import { computeTargets } from './modes/disperse/targets'
import { animateParticles } from './modes/disperse/animate'

const DEFAULT_TEXT = 'PULSE'
const DEFAULT_FONT_URL = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxM.ttf'

export default function App() {
	const [text, setText] = React.useState(DEFAULT_TEXT)
	const [fontSize, setFontSize] = React.useState(220)
	const [centered, setCentered] = React.useState(true)
	const [debug, setDebug] = React.useState(false)
	const [trail, setTrail] = React.useState(false)
	const [textColor, setTextColor] = React.useState('#111111')
	const [background, setBackground] = React.useState('#ffffff')
	const [fontStatus, setFontStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
	const [fontName, setFontName] = React.useState<string>('Default')
	const [fontKey, setFontKey] = React.useState<number>(1)
	const fontRef = React.useRef<any | null>(null)
	const [layout, setLayout] = React.useState<LayoutResult | null>(null)

	const [mode, setMode] = React.useState<Mode>('rubber')
	const [playing, setPlaying] = React.useState(true)
	const [direction, setDirection] = React.useState<Direction>('ltr')
	const [time, setTime] = React.useState(0)
	const [minSpacing, setMinSpacing] = React.useState<number>(0)
	const [scrubTime, setScrubTime] = React.useState<number>(0)
	const [frameStep, setFrameStep] = React.useState<number>(1 / 60)

	const defaultSimple: SimpleParams = React.useMemo(() => ({
		amplitude: 0.25,
		speed: 4,
		intensity: 1,
		wavelength: Math.PI / 2,
		minScaleX: 0.6,
		maxScaleX: 1.8,
		direction
	}), [])
	const defaultHz: HzParams = React.useMemo(() => ({
		amplitude: 0.25,
		speed: 4,
		intensity: 1,
		wavelength: Math.PI / 2,
		minScaleX: 0.6,
		maxScaleX: 2.5,
		direction,
		verticalHold: 2.0
	}), [])
	const defaultRubber: RubberParams = React.useMemo(() => ({
		amplitude: 22,
		speed: 4,
		intensity: 1,
		letterPhase: Math.PI / 2,
		intraGlyphPhase: Math.PI * 2,
		pin: 0.8,
		direction,
		sharpness: 1,
		maxDx: 80
	}), [])
	const defaultEnvelope: EnvelopeParams = React.useMemo(() => ({
		amplitude: 30,
		speedPx: 200,
		intensity: 1,
		sigma: 160,
		sharpness: 1.5,
		maxDx: 120,
		direction
	}), [])

	const [simpleParams, setSimpleParams] = React.useState<SimpleParams>(defaultSimple)
	const [rubberParams, setRubberParams] = React.useState<RubberParams>(defaultRubber)
	const [envelopeParams, setEnvelopeParams] = React.useState<EnvelopeParams>(defaultEnvelope)
	const [hzParams, setHzParams] = React.useState<HzParams>(defaultHz)
	const defaultDisperse: DisperseParams = React.useMemo(() => ({
		spacing: 12,
		particleSize: 2,
		edgeBias: 2.0,
		maxParticles: 2800,
		gridCols: 0,
		gridRows: 0,
		speedPx: 220,
		sigma: 90,
		intensity: 1.0,
		distance: 180,
		randomness: 0.85,
		swirlFactor: 0.6,
		swirlSpeed: 2.0,
		showHeadLine: true,
		debugBounds: false,
		direction
	}), [])
	const [disperseParams, setDisperseParams] = React.useState<DisperseParams>(defaultDisperse)
	const [disperseSalt, setDisperseSalt] = React.useState<number>(12345)
	const [dispersePalette, setDispersePalette] = React.useState<string[]>([])
	const [blendEnabled, setBlendEnabled] = React.useState<boolean>(false)
	const [blendSpread, setBlendSpread] = React.useState<number>(0.25)

	React.useEffect(() => {
		setSimpleParams(p => ({ ...p, direction }))
		setHzParams(p => ({ ...p, direction }))
		setRubberParams(p => ({ ...p, direction }))
		setEnvelopeParams(p => ({ ...p, direction }))
	}, [direction])

	React.useEffect(() => {
		let cancelled = false
		async function boot() {
			try {
				setFontStatus('loading')
				// Try last uploaded font from IndexedDB
				const last = await loadLastFont()
				// Load last text if available
				try {
					const savedText = await loadLastText()
					if (savedText && !cancelled) setText(savedText)
				} catch {}
				if (last) {
					const font = await loadFontFromArrayBuffer(last.data)
					if (cancelled) return
					fontRef.current = font
					setFontName(last.name || 'Custom Font')
					setFontKey(k => k + 1)
					setFontStatus('ready')
					return
				}
				// Fallback to default remote
				const fallback = await loadFontFromUrl(DEFAULT_FONT_URL)
				if (cancelled) return
				fontRef.current = fallback
				setFontName('Default (remote)')
				setFontKey(k => k + 1)
				setFontStatus('ready')
			} catch (e) {
				console.warn('Default font load failed, please upload a TTF/OTF.', e)
				if (cancelled) return
				setFontStatus('error')
			}
		}
		boot()
		return () => { cancelled = true }
	}, [])

	// Re-layout when font/text/fontSize changes or on window resize (to keep baseline Y)
	React.useEffect(() => {
		function computeLayout() {
			const font = fontRef.current
			if (!font) {
				setLayout(null)
				setDispersePalette([])
				return
			}
			const width = Math.min(1200, window.innerWidth - 32)
			const height = Math.min(600, window.innerHeight - 160)
			const baselineX = 16
			// Place baseline vertically centered by metrics
			const scale = fontSize / font.unitsPerEm
			const ascent = font.ascender * scale
			const descent = Math.abs(font.descender * scale)
			const totalH = ascent + descent
			const baselineY = Math.max(40 + ascent, Math.floor(height * 0.5 + (ascent - totalH * 0.5)))
			const l = layoutText(font, text, fontSize, baselineX, baselineY)
			setLayout(l)
			// Ensure palette length matches glyph count; default to textColor
			setDispersePalette(prev => {
				const next = prev.slice(0, l.glyphs.length)
				while (next.length < l.glyphs.length) next.push(textColor)
				return next
			})
		}
		computeLayout()
		const onResize = () => computeLayout()
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}, [text, fontSize, fontStatus])

	function onFontFileChange(file: File | null) {
		if (!file) return
		let cancelled = false
		;(async () => {
			try {
				setFontStatus('loading')
				const ab = await file.arrayBuffer()
				const font = await loadFontFromArrayBuffer(ab)
				if (cancelled) return
				fontRef.current = font
				setFontName(file.name || 'Custom Font')
				setFontKey(k => k + 1)
				// Persist as default for next loads
				try {
					await saveLastFont(ab, file.name || 'Custom Font', file.type || 'application/octet-stream')
				} catch (e) {
					console.warn('Failed to persist font to storage', e)
				}
				setFontStatus('ready')
			} catch (e) {
				console.error(e)
				if (cancelled) return
				setFontStatus('error')
			}
		})()
		return () => { cancelled = true }
	}

	function resetCurrentMode() {
		if (mode === 'simple') setSimpleParams({ ...defaultSimple, direction })
		if (mode === 'hz') setHzParams({ ...defaultHz, direction })
		if (mode === 'rubber') setRubberParams({ ...defaultRubber, direction })
		if (mode === 'envelope') setEnvelopeParams({ ...defaultEnvelope, direction })
		if (mode === 'disperse') setDisperseParams({ ...defaultDisperse, direction })
	}
	function randomizeDisperse() { setDisperseSalt(Math.floor(Math.random() * 0xffffffff)) }

	function togglePlay() {
		setPlaying(p => {
			const next = !p
			if (!next) {
				// about to pause: capture current time for scrubbing
				setScrubTime(t => (t || time))
			}
			return next
		})
	}

	function stepBy(delta: number) {
		// ensure paused and nudge scrub time
		setPlaying(false)
		setScrubTime(prev => {
			const base = (Number.isFinite(prev) && prev > 0) ? prev : time
			const next = Math.max(0, base + delta)
			return next
		})
	}

	function exportSvg() {
		if (!layout) return

		// Neighbor gaps (same logic as canvas)
		const leftGaps: number[] = []
		const rightGaps: number[] = []
		const margin = Math.max(0, minSpacing)
		for (let i = 0; i < layout.glyphs.length; i++) {
			const cur = layout.glyphs[i]
			if (i > 0) {
				const prev = layout.glyphs[i - 1]
				const prevRight = prev.originX + prev.localBBox.maxX
				const curLeft = cur.originX + cur.localBBox.minX
				leftGaps[i] = Math.max(0, (curLeft - prevRight) - margin)
			} else {
				leftGaps[i] = Number.POSITIVE_INFINITY
			}
			if (i < layout.glyphs.length - 1) {
				const next = layout.glyphs[i + 1]
				const curRight = cur.originX + cur.localBBox.maxX
				const nextLeft = next.originX + next.localBBox.minX
				rightGaps[i] = Math.max(0, (nextLeft - curRight) - margin)
			} else {
				rightGaps[i] = Number.POSITIVE_INFINITY
			}
		}

		const currentTime = playing ? time : scrubTime
		if (mode !== 'disperse' && mode !== 'disperseColor') {
			const tctx = {
				time: currentTime,
				direction,
				totalAdvance: layout.totalAdvance,
				leftGaps,
				rightGaps
			} as const
			const transform =
				mode === 'simple' ? simpleScaleTransformFactory(simpleParams) :
				mode === 'hz' ? hzStretchTransformFactory(hzParams) :
				mode === 'rubber' ? rubberWaveTransformFactory(rubberParams) :
				envelopeTransformFactory(envelopeParams, layout)
			const doc = glyphsToSvg(layout, transform, tctx, textColor)
			const svg = wrapSvg(doc, background)
			downloadText('pulse.svg', svg)
			return
		}

		// Disperse export
		const glyphCenters = layout.glyphs.map(g => ({
			x: g.originX + (g.localBBox.minX + g.localBBox.maxX) * 0.5,
			y: g.originY + (g.localBBox.minY + g.localBBox.maxY) * 0.5
		}))
		const parts = buildParticlesFromLayout(
			layout,
			fontKey,
			Math.max(1, Math.round((layout.ascent + layout.descent))),
			disperseParams.spacing,
			disperseParams.gridCols,
			disperseParams.gridRows,
			disperseParams.edgeBias,
			disperseParams.maxParticles,
			disperseSalt
		)
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
		const positions = new Float32Array(parts.length * 2)
		animateParticles(
			parts,
			currentTime,
			minX, maxX,
			disperseParams.speedPx,
			disperseParams.sigma,
			disperseParams.intensity,
			disperseParams.direction,
			disperseParams.swirlFactor,
			disperseParams.swirlSpeed,
			centerX, centerY,
			positions
		)
		const doc = (mode === 'disperse')
			? particlesToSvg(positions, parts.length, disperseParams.particleSize, textColor)
			: particlesToSvgWithPalette(
					positions,
					parts.map(p => p.glyphIndex),
					disperseParams.particleSize,
					textColor,
					dispersePalette
			  )
		const svg = wrapSvg(doc, background)
		downloadText('pulse-particles.svg', svg)
	}

	// Persist text whenever it changes
	React.useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				await saveLastText(text)
			} catch {}
		})()
		return () => { cancelled = true }
	}, [text])

	return (
		<div className="app">
			<div className="toolbar">
				<h1>Typography Workspaces</h1>
				<div className="row" style={{ marginBottom: 8 }}>
					<label>Mode
						<select value={mode} onChange={e => setMode(e.currentTarget.value as Mode)}>
							<option value="simple">Simple ScaleX</option>
							<option value="hz">Hz stretch</option>
							<option value="rubber">Rubber Wave</option>
							<option value="envelope">Envelope Pulse</option>
							<option value="disperse">Disperse Style</option>
							<option value="disperseColor">Disperse Color</option>
						</select>
					</label>
					<label>Font file <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={e => onFontFileChange(e.currentTarget.files?.[0] || null)} /></label>
					<span className="small">Font: {fontName} ({fontStatus})</span>
					<input type="text" value={text} onChange={e => setText(e.currentTarget.value)} />
					<label>Font size <input type="number" value={fontSize} min={24} max={420} onChange={e => setFontSize(parseInt(e.currentTarget.value || '0', 10) || 0)} /></label>
					<button onClick={togglePlay}>{playing ? 'Pause' : 'Play'}</button>
					<button onClick={() => stepBy(-frameStep)} disabled={playing}>Prev frame</button>
					<button onClick={() => stepBy(+frameStep)} disabled={playing}>Next frame</button>
					<label>Step (s) <input type="number" min={0.001} step={0.001} value={frameStep} onChange={e => setFrameStep(parseFloat(e.currentTarget.value) || (1/60))} /></label>
					<button onClick={resetCurrentMode}>Reset</button>
					<label><input type="checkbox" checked={debug} onChange={e => setDebug(e.currentTarget.checked)} /> Debug overlay</label>
					<label><input type="checkbox" checked={trail} onChange={e => setTrail(e.currentTarget.checked)} /> Trail</label>
					<label>Text color <input type="color" value={textColor} onChange={e => setTextColor(e.currentTarget.value)} /></label>
					<label>Background <input type="color" value={background} onChange={e => setBackground(e.currentTarget.value)} /></label>
					<button onClick={exportSvg}>Export SVG</button>
				</div>
			</div>
			<div className="main">
				<div className="canvas-wrap">
					<CanvasPreview
						layout={layout}
						mode={mode}
						minSpacingPx={minSpacing}
						timeOverride={playing ? null : scrubTime}
						hzParams={hzParams}
						simpleParams={simpleParams}
						rubberParams={rubberParams}
						envelopeParams={envelopeParams}
						disperseParams={disperseParams}
						dispersePalette={dispersePalette}
						blendEnabled={blendEnabled}
						blendSpread={blendSpread}
						fontKey={fontKey}
						disperseSalt={disperseSalt}
						centered={centered}
						textColor={textColor}
						background={background}
						playing={playing}
						showDebug={debug}
						showTrail={trail}
						onTime={setTime}
					/>
				</div>
				<ControlsPanel
					mode={mode}
					direction={direction}
					centered={centered}
					minSpacingPx={minSpacing}
					onToggleCenter={setCentered}
					onChangeDirection={setDirection}
					onChangeMinSpacing={setMinSpacing}
					simple={simpleParams}
					hz={hzParams}
					rubber={rubberParams}
					envelope={envelopeParams}
					disperse={disperseParams}
					layout={layout}
					text={text}
					dispersePalette={dispersePalette}
					blendEnabled={blendEnabled}
					blendSpread={blendSpread}
					onToggleBlend={setBlendEnabled}
					onChangeBlendSpread={setBlendSpread}
					onChangeDispersePalette={(i, c) => {
						setDispersePalette(prev => {
							const next = prev.slice()
							while (next.length <= i) next.push(textColor)
							next[i] = c
							return next
						})
					}}
					onChangeSimple={p => setSimpleParams(prev => ({ ...prev, ...p }))}
					onChangeHz={p => setHzParams(prev => ({ ...prev, ...p }))}
					onChangeRubber={p => setRubberParams(prev => ({ ...prev, ...p }))}
					onChangeEnvelope={p => setEnvelopeParams(prev => ({ ...prev, ...p }))}
					onChangeDisperse={p => setDisperseParams(prev => ({ ...prev, ...p }))}
					onResetMode={resetCurrentMode}
					onRandomizeDisperse={randomizeDisperse}
				/>
			</div>
		</div>
	)
}

