import React from 'react'
import type { DisperseParams } from './types'

type Props = {
	value: DisperseParams
	onChange: (p: Partial<DisperseParams>) => void
	onRandomize: () => void
	onReset: () => void
}

function SliderRow(props: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
	const { label, min, max, step = 0.01, value, onChange } = props
	return (
		<div className="control">
			<label>{label}: <strong>{Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}</strong></label>
			<input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.currentTarget.value))} />
		</div>
	)
}

export default function ControlsDisperse({ value, onChange, onRandomize, onReset }: Props) {
	return (
		<>
			<SliderRow label="Particle spacing (px)" min={6} max={30} step={0.5} value={value.spacing} onChange={v => onChange({ spacing: v })} />
			<div className="row">
				<label>Grid cols <input type="number" min={0} max={256} value={value.gridCols} onChange={e => onChange({ gridCols: Math.max(0, parseInt(e.currentTarget.value || '0', 10)) })} /></label>
				<label>Grid rows <input type="number" min={0} max={256} value={value.gridRows} onChange={e => onChange({ gridRows: Math.max(0, parseInt(e.currentTarget.value || '0', 10)) })} /></label>
				<span className="small">0 = auto via spacing</span>
			</div>
			<SliderRow label="Particle size (px)" min={1} max={8} step={0.5} value={value.particleSize} onChange={v => onChange({ particleSize: v })} />
			<SliderRow label="Edge bias" min={0} max={5} step={0.05} value={value.edgeBias} onChange={v => onChange({ edgeBias: v })} />
			<SliderRow label="Max particles" min={300} max={8000} step={50} value={value.maxParticles} onChange={v => onChange({ maxParticles: Math.round(v) })} />
			<SliderRow label="Speed (px/s)" min={20} max={700} step={1} value={value.speedPx} onChange={v => onChange({ speedPx: v })} />
			<SliderRow label="Sigma (px)" min={20} max={240} step={1} value={value.sigma} onChange={v => onChange({ sigma: v })} />
			<SliderRow label="Intensity" min={0} max={2} step={0.01} value={value.intensity} onChange={v => onChange({ intensity: v })} />
			<SliderRow label="Distance (px)" min={0} max={420} step={1} value={value.distance} onChange={v => onChange({ distance: v })} />
			<SliderRow label="Randomness" min={0} max={1} step={0.01} value={value.randomness} onChange={v => onChange({ randomness: v })} />
			<SliderRow label="Swirl factor" min={0} max={1} step={0.01} value={value.swirlFactor} onChange={v => onChange({ swirlFactor: v })} />
			<SliderRow label="Swirl speed" min={0} max={6} step={0.05} value={value.swirlSpeed} onChange={v => onChange({ swirlSpeed: v })} />
			<div className="control">
				<label>Head line <input type="checkbox" checked={value.showHeadLine} onChange={e => onChange({ showHeadLine: e.currentTarget.checked })} /></label>
			</div>
			<div className="control">
				<label>Debug bounds <input type="checkbox" checked={value.debugBounds} onChange={e => onChange({ debugBounds: e.currentTarget.checked })} /></label>
			</div>
			<div className="row">
				<button onClick={onRandomize}>Randomize dispersion</button>
				<button onClick={onReset}>Reset Disperse</button>
			</div>
		</>
	)
}

