import { Dict } from '@/lib/i18n';
import {
	FIT_CATEGORY_ORDER,
	FIT_DECISION_ICON,
	FIT_RESULT_ICON,
	FitTone,
	fitCategoryLabel,
	fitCategoryScore,
	fitCategoryTone,
	fitDecisionLabel,
	fitDecisionTone,
	fitResultLabel,
	fitResultTone,
	fitToneLabel,
} from '@/lib/fit';
import { FitCategory, FitDecision } from '@/lib/types';

export function FitBadge({ score, decision }: { score: number; decision: FitDecision }) {
	return (
		<span className={`fit-badge fit-tone-${fitDecisionTone(decision)}`} title={`${FIT_DECISION_ICON[decision]} ${score}%`}>
			{score}%
		</span>
	);
}

const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ScoreMeter({ score, decision, t }: { score: number; decision: FitDecision; t: Dict }) {
	const tone = fitDecisionTone(decision);
	const offset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, score)) / 100);

	return (
		<div className='fit-meter'>
			<svg viewBox='0 0 96 96' width='96' height='96' className={`fit-ring fit-tone-${tone}`}>
				<circle cx='48' cy='48' r={RING_RADIUS} className='fit-ring-track' strokeWidth='9' fill='none' />
				<circle
					cx='48'
					cy='48'
					r={RING_RADIUS}
					className='fit-ring-fill'
					strokeWidth='9'
					fill='none'
					strokeLinecap='round'
					strokeDasharray={RING_CIRCUMFERENCE}
					strokeDashoffset={offset}
					transform='rotate(-90 48 48)'
				/>
				<text x='48' y='44' textAnchor='middle' className='fit-ring-value'>
					{score}%
				</text>
				<text x='48' y='62' textAnchor='middle' className='fit-ring-label'>
					{t.fit.score}
				</text>
			</svg>
			<div className={`fit-decision fit-tone-${tone}`}>
				<span>{FIT_DECISION_ICON[decision]}</span>
				<span>{fitDecisionLabel(t, decision)}</span>
			</div>
		</div>
	);
}

const RADAR_CENTER = 120;
const RADAR_MAX_RADIUS = 78;
const RADAR_GRID_LEVELS = [0.25, 0.5, 0.75, 1];

function polarPoint(angleDeg: number, radius: number): { x: number; y: number } {
	const rad = ((angleDeg - 90) * Math.PI) / 180;
	return { x: RADAR_CENTER + radius * Math.cos(rad), y: RADAR_CENTER + radius * Math.sin(rad) };
}

function polygonPoints(angleStep: number, n: number, radius: number): string {
	return Array.from({ length: n }, (_, i) => {
		const p = polarPoint(i * angleStep, radius);
		return `${p.x},${p.y}`;
	}).join(' ');
}

// A pentagon-shaped silhouette of the 5 categories — the "at a glance" read
// of which dimensions are strong vs. weak; the bars below carry the exact
// numbers and the individual criteria.
function RadarChart({ categories, tone, t }: { categories: FitCategory[]; tone: FitTone; t: Dict }) {
	const n = categories.length;
	if (n < 3) return null;
	const angleStep = 360 / n;

	const axes = categories.map((cat, i) => {
		const angle = i * angleStep;
		const score = fitCategoryScore(cat.criteria);
		const vertex = polarPoint(angle, (score / 100) * RADAR_MAX_RADIUS);
		const labelPos = polarPoint(angle, RADAR_MAX_RADIUS + 26);
		const spokeEnd = polarPoint(angle, RADAR_MAX_RADIUS);
		return { category: cat.category, vertex, labelPos, spokeEnd };
	});

	return (
		<svg viewBox='0 0 240 240' width='190' height='190' className={`fit-radar fit-tone-${tone}`}>
			{RADAR_GRID_LEVELS.map((level) => (
				<polygon key={level} points={polygonPoints(angleStep, n, level * RADAR_MAX_RADIUS)} className='fit-radar-grid' />
			))}
			{axes.map((a, i) => (
				<line key={i} x1={RADAR_CENTER} y1={RADAR_CENTER} x2={a.spokeEnd.x} y2={a.spokeEnd.y} className='fit-radar-spoke' />
			))}
			<polygon points={axes.map((a) => `${a.vertex.x},${a.vertex.y}`).join(' ')} className='fit-radar-shape' />
			{axes.map((a, i) => (
				<circle key={i} cx={a.vertex.x} cy={a.vertex.y} r={4} className='fit-radar-dot' />
			))}
			{axes.map((a, i) => {
				const dx = a.labelPos.x - RADAR_CENTER;
				const anchor = Math.abs(dx) < 4 ? 'middle' : dx > 0 ? 'start' : 'end';
				return (
					<text key={i} x={a.labelPos.x} y={a.labelPos.y} textAnchor={anchor} dominantBaseline='middle' className='fit-radar-label'>
						{fitCategoryLabel(t, a.category)}
					</text>
				);
			})}
		</svg>
	);
}

function CategoryRow({ category, t }: { category: FitCategory; t: Dict }) {
	const score = fitCategoryScore(category.criteria);
	const tone = fitCategoryTone(category.criteria);

	return (
		<div className='fit-category'>
			<div className='fit-category-head'>
				<span className='fit-category-label'>{fitCategoryLabel(t, category.category)}</span>
				<span className={`fit-category-tone fit-tone-${tone}`}>{fitToneLabel(t, tone)}</span>
			</div>
			<div className={`fit-bar-track fit-tone-${tone}`}>
				<div className='fit-bar-fill' style={{ width: `${score}%` }} />
			</div>
			<div className='fit-chips'>
				{category.criteria.map((crit, i) => (
					<span className={`fit-chip fit-tone-${fitResultTone(crit.result)}`} key={i}>
						<span className='fit-chip-icon'>{FIT_RESULT_ICON[crit.result]}</span>
						{crit.label}
						<span className='fit-chip-result'>{fitResultLabel(t, crit.result)}</span>
					</span>
				))}
			</div>
		</div>
	);
}

export default function FitCard({
	score,
	decision,
	categories,
	reasons,
	t,
}: {
	score: number;
	decision: FitDecision;
	categories: FitCategory[];
	reasons: string[];
	t: Dict;
}) {
	const byKey = new Map(categories.map((c) => [c.category, c]));
	const ordered = FIT_CATEGORY_ORDER.map((key) => byKey.get(key)).filter((c): c is FitCategory => !!c && c.criteria.length > 0);

	const tone = fitDecisionTone(decision);

	return (
		<div className='fit-card'>
			<div className='fit-head'>
				<ScoreMeter score={score} decision={decision} t={t} />
				<RadarChart categories={ordered} tone={tone} t={t} />
			</div>

			<div className='fit-categories'>
				{ordered.map((cat) => (
					<CategoryRow category={cat} t={t} key={cat.category} />
				))}
			</div>

			{reasons.length > 0 && (
				<div className='fit-reasons'>
					<div className='fit-category-label'>{t.fit.reasonsTitle}</div>
					<ul>
						{reasons.map((reason, i) => (
							<li key={i}>{reason}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
