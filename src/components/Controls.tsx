import React from 'react'
import type { WaveParams } from '../lib/types'

type Props = {
	params: WaveParams
	onChange: (p: Partial<WaveParams>) => void
}

function SliderRow(props: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
	const { label, min, max, step = 0.01, value, onChange } = props
	return (
		<div className="control">
			<label>{label}: <strong>{value.toFixed(2)}</strong></label>
			<input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.currentTarget.value))} />
		</div>
	)
}

export default function Controls({ params, onChange }: Props) {
	return (
		<div className="controls">
			<SliderRow label="Amplitude (px)" min={0} max={100} step={0.5} value={params.amplitude} onChange={v => onChange({ amplitude: v })} />
			<SliderRow label="Speed (rad/s)" min={0} max={20} step={0.05} value={params.speed} onChange={v => onChange({ speed: v })} />
			<SliderRow label="Intensity" min={0} max={2} step={0.01} value={params.intensity} onChange={v => onChange({ intensity: v })} />
			<SliderRow label="Letter Phase (rad)" min={0} max={6.283} step={0.01} value={params.letterPhase} onChange={v => onChange({ letterPhase: v })} />
			<SliderRow label="Intra-glyph Phase (rad)" min={0} max={18.85} step={0.01} value={params.intraGlyphPhase} onChange={v => onChange({ intraGlyphPhase: v })} />
			<SliderRow label="Pinning" min={0} max={1} step={0.01} value={params.pin} onChange={v => onChange({ pin: v })} />
			<SliderRow label="Sharpness" min={0.5} max={4} step={0.01} value={params.sharpness} onChange={v => onChange({ sharpness: v })} />
			<SliderRow label="Clamp max dx (px)" min={5} max={200} step={1} value={params.maxDx} onChange={v => onChange({ maxDx: v })} />
			<div className="control">
				<label>Direction</label>
				<select value={params.direction} onChange={e => onChange({ direction: e.currentTarget.value as 'ltr' | 'rtl' })}>
					<option value="ltr">Left → Right</option>
					<option value="rtl">Right → Left</option>
				</select>
			</div>
		</div>
	)
}

