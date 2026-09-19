import { Status } from '@/lib/types';
import { chartColorForStatus } from '@/lib/status';
import { statusLabel } from '@/lib/i18n';
import { Locale } from '@/lib/i18n';

const CX = 100;
const CY = 100;
const R = 90;

function polar(angleDeg: number): { x: number; y: number } {
	const rad = ((angleDeg - 90) * Math.PI) / 180;
	return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

// A full circle can't be drawn as a single SVG arc (start === end), so a
// lone non-zero status renders as a full <circle> instead of a wedge.
function wedgePath(startAngle: number, endAngle: number): string {
	const start = polar(endAngle);
	const end = polar(startAngle);
	const largeArc = endAngle - startAngle > 180 ? 1 : 0;
	return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export default function StatusPieChart({
	counts,
	locale,
}: {
	counts: { status: Status; count: number }[];
	locale: Locale;
}) {
	const nonZero = counts.filter((c) => c.count > 0);
	const total = nonZero.reduce((sum, c) => sum + c.count, 0);

	if (total === 0) return null;

	let angle = 0;
	const wedges = nonZero.map((c) => {
		const sweep = (c.count / total) * 360;
		const startAngle = angle;
		const endAngle = angle + sweep;
		angle = endAngle;
		return { ...c, startAngle, endAngle, pct: Math.round((c.count / total) * 100) };
	});

	return (
		<div className='pie-wrap'>
			<svg viewBox='0 0 200 200' width='176' height='176' className='pie-svg'>
				{wedges.length === 1 ? (
					<circle cx={CX} cy={CY} r={R} fill={chartColorForStatus(wedges[0].status)} stroke='var(--surface)' strokeWidth='2'>
						<title>
							{statusLabel(wedges[0].status, locale)} — {wedges[0].count} ({wedges[0].pct}%)
						</title>
					</circle>
				) : (
					wedges.map((w) => (
						<path key={w.status} d={wedgePath(w.startAngle, w.endAngle)} fill={chartColorForStatus(w.status)} stroke='var(--surface)' strokeWidth='2'>
							<title>
								{statusLabel(w.status, locale)} — {w.count} ({w.pct}%)
							</title>
						</path>
					))
				)}
			</svg>
			<ul className='pie-legend'>
				{wedges.map((w) => (
					<li key={w.status}>
						<span className='pie-swatch' style={{ background: chartColorForStatus(w.status) }} />
						<span className='pie-legend-label'>{statusLabel(w.status, locale)}</span>
						<span className='pie-legend-value font-mono'>
							{w.count} · {w.pct}%
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
