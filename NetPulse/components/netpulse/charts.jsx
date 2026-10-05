'use client';
import { useId, useState } from 'react';
import { aggregateChart } from '@/lib/netpulse/model';

export function LatencyChart({ services, window, now, compact = false }) {
  const id = useId().replaceAll(':', '');
  const points = aggregateChart(services, window, now, compact ? 24 : 40);
  const measured = points.filter(p => p.latency !== null);
  const [hover, setHover] = useState(null);
  const ceiling = Math.max(200, Math.ceil(Math.max(...measured.map(p => p.latency), 0) / 100) * 100);
  const width = 760, height = compact ? 150 : 190, left = 42, right = 12, top = 14, bottom = 32;
  const plotW = width - left - right, plotH = height - top - bottom;
  const x = i => left + i / Math.max(points.length - 1, 1) * plotW;
  const y = value => top + plotH - value / ceiling * plotH;
  // Split at missing buckets: a gap means no measurements, not zero latency.
  const segments = [];
  let segment = [];
  points.forEach((p, i) => { if (p.latency === null) { if (segment.length) segments.push(segment); segment = []; } else segment.push([x(i), y(p.latency)]); });
  if (segment.length) segments.push(segment);
  const tooltip = hover !== null ? points[hover] : null;
  const time = at => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return <div className="latency-chart">
    {!measured.length && <div className="chart-empty">Run a check to begin collecting response times.</div>}
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Average successful HTTP response time over the last ${window}; milliseconds. Missing intervals are left blank.`}>
      <defs><linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7760ef" stopOpacity=".19"/><stop offset="100%" stopColor="#7760ef" stopOpacity="0"/></linearGradient></defs>
      {[0, 1, 2, 3].map(i => <g key={i}><line x1={left} y1={top + i / 3 * plotH} x2={width - right} y2={top + i / 3 * plotH} stroke="#e9edf3" strokeDasharray="4 4"/><text x={left - 10} y={top + i / 3 * plotH + 4} textAnchor="end" className="chart-axis">{Math.round(ceiling * (1 - i / 3))}</text></g>)}
      {segments.map((seg, i) => { const d = seg.map(([px, py], j) => `${j ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`).join(' '); return <g key={i}>{seg.length > 1 && <path d={`${d} L${seg.at(-1)[0]},${top + plotH} L${seg[0][0]},${top + plotH} Z`} fill={`url(#area-${id})`}/>}<path d={d} fill="none" stroke="#7860ed" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>{seg.length === 1 && <circle cx={seg[0][0]} cy={seg[0][1]} r="3" fill="#7860ed"/>}</g>; })}
      {[0, .25, .5, .75, 1].map(p => <text key={p} x={left + p * plotW} y={height - 8} textAnchor={p === 0 ? 'start' : p === 1 ? 'end' : 'middle'} className="chart-axis">{time(now - ({ '1h': 3600000, '6h': 21600000, '24h': 86400000 }[window]) * (1 - p))}</text>)}
      {points.map((p, i) => <rect key={i} x={x(i) - plotW / points.length / 2} y={top} width={plotW / points.length} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}/>)}
      {tooltip?.latency !== null && tooltip && <g pointerEvents="none"><line x1={x(hover)} y1={top} x2={x(hover)} y2={top + plotH} stroke="#aa9bf1" strokeDasharray="3 3"/><circle cx={x(hover)} cy={y(tooltip.latency)} r="4" fill="#7860ed" stroke="white" strokeWidth="2"/></g>}
    </svg>
    {tooltip && <div className="chart-tooltip">{time(tooltip.at)} UTC · {tooltip.latency === null ? 'No checks' : `${tooltip.latency} ms`} · {tooltip.checks} checks</div>}
    <p className="chart-caption"><span className="legend-swatch"/>Average response time <span>UTC · successful checks only</span></p>
  </div>;
}

export function HealthStrip({ history, window = '24h', now, count = 40, labelled = false }) {
  const bins = aggregateChart([{ history }], window, now, count);
  return <div className={labelled ? 'strip-block' : ''}><div className="health-strip" aria-label={`Check results over ${window}. Gray intervals contain no checks.`}>
    {bins.map((bin, i) => {
      const from = now - ({ '1h': 3600000, '6h': 21600000, '24h': 86400000 }[window]) + i / count * ({ '1h': 3600000, '6h': 21600000, '24h': 86400000 }[window]);
      const to = from + ({ '1h': 3600000, '6h': 21600000, '24h': 86400000 }[window]) / count;
      const samples = history.filter(h => h.at >= from && (i === count - 1 ? h.at <= to : h.at < to));
      const status = !samples.length ? 'unknown' : samples.some(h => !h.ok) ? 'down' : samples.some(h => h.status === 'degraded') ? 'degraded' : 'operational';
      return <span key={i} className={`strip-cell ${status}`} title={`${new Date(bin.at).toISOString()} · ${status} · ${bin.checks} checks`}/>;
    })}
  </div>{labelled && <div className="strip-labels"><span>{window} ago</span><span>Now</span></div>}</div>;
}
