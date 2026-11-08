import React, { useMemo, useRef, useState } from 'react';
import type { Candle } from '../../types/trading';

interface InteractiveCandleChartProps {
  candles: Candle[];
  symbol: string;
  height?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  showVolume?: boolean;
  showEma?: boolean;
  /** Price feed source; defaults to SIMULATED so nothing ever claims LIVE falsely. */
  dataSource?: 'LIVE' | 'SIMULATED';
  lastUpdated?: string;
}

function ema(values: number[], period: number): Array<number | null> {
  const k = 2 / (period + 1);
  const out: Array<number | null> = new Array(values.length).fill(null);
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (i < period - 1) return;
    if (i === period - 1) {
      prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else if (prev !== null) {
      prev = v * k + prev * (1 - k);
    }
    out[i] = prev;
  });
  return out;
}

export const InteractiveCandleChart: React.FC<InteractiveCandleChartProps> = ({
  candles,
  symbol,
  height = 380,
  entryPrice,
  stopLoss,
  takeProfit,
  showVolume = true,
  showEma = true,
  dataSource = 'SIMULATED',
  lastUpdated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showVolumeState, setShowVolumeState] = useState(showVolume);
  const [showEmaState, setShowEmaState] = useState(showEma);

  const data = useMemo(() => candles.slice(-90), [candles]);
  const closes = useMemo(() => data.map((c) => c.close), [data]);
  const ema20 = useMemo(() => ema(closes, 20), [closes]);
  const ema50 = useMemo(() => ema(closes, 50), [closes]);

  const W = 720;
  const H = 300;
  const PAD = { top: 12, right: 56, bottom: 22, left: 8 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const allPrices = useMemo(() => {
    const vals: number[] = [];
    data.forEach((c) => vals.push(c.high, c.low));
    if (entryPrice !== undefined) vals.push(entryPrice);
    if (stopLoss !== undefined) vals.push(stopLoss);
    if (takeProfit !== undefined) vals.push(takeProfit);
    return vals;
  }, [data, entryPrice, stopLoss, takeProfit]);

  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const span = max - min || 1;
  const yMin = min - span * 0.06;
  const yMax = max + span * 0.06;

  const x = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * plotW;
  const y = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * plotH;
  const maxVolume = Math.max(...data.map((c) => c.volume), 1);

  const line = (series: Array<number | null>) =>
    series
      .map((v, i) => (v === null ? null : `${i === 0 || series[i - 1] === null ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join(' ');

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.left) / plotW) * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const priceLabel = (v: number) => (v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v.toFixed(2));

  return (
    <div className="bg-[#111A27] border border-[#223044] rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-[#223044]">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-[#F4F7FB] font-mono">{symbol}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
              dataSource === 'LIVE'
                ? 'bg-[#20D99A]/10 border-[#20D99A]/25 text-[#20D99A]'
                : 'bg-[#18D5C0]/10 border-[#18D5C0]/25 text-[#18D5C0]'
            }`}
          >
            {dataSource === 'LIVE'
              ? `● LIVE · BINANCE${lastUpdated ? ` · ${lastUpdated}` : ''}`
              : 'SIMULATED'}
          </span>
          {hovered && (
            <span className="font-mono text-[#91A0B5] tabular-nums hidden sm:inline">
              O {priceLabel(hovered.open)} · H {priceLabel(hovered.high)} · L {priceLabel(hovered.low)} · C{' '}
              <span className={hovered.close >= hovered.open ? 'text-[#20D99A]' : 'text-[#FF5C70]'}>
                {priceLabel(hovered.close)}
              </span>{' '}
              · Vol {hovered.volume.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            onClick={() => setShowEmaState((v) => !v)}
            className={`px-2 py-1 rounded-md border transition-colors ${
              showEmaState ? 'bg-[#18D5C0]/15 border-[#18D5C0]/40 text-[#18D5C0]' : 'bg-[#080D16] border-[#223044] text-[#64748B]'
            }`}
          >
            EMA 20/50
          </button>
          <button
            onClick={() => setShowVolumeState((v) => !v)}
            className={`px-2 py-1 rounded-md border transition-colors ${
              showVolumeState ? 'bg-[#18D5C0]/15 border-[#18D5C0]/40 text-[#18D5C0]' : 'bg-[#080D16] border-[#223044] text-[#64748B]'
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="relative w-full cursor-crosshair"
        style={{ height }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full block">
          {/* Gridlines + price labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const v = yMax - f * (yMax - yMin);
            const yy = y(v);
            return (
              <g key={f}>
                <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="#223044" strokeWidth="0.5" opacity="0.6" />
                <text x={W - PAD.right + 6} y={yy + 3} fill="#64748B" fontSize="9" fontFamily="monospace">
                  {priceLabel(v)}
                </text>
              </g>
            );
          })}

          {/* SL / TP / Entry bands */}
          {takeProfit !== undefined && (
            <g>
              <rect x={PAD.left} y={y(Math.max(takeProfit, entryPrice ?? takeProfit))} width={plotW} height={Math.abs(y(takeProfit) - y(entryPrice ?? takeProfit))} fill="#20D99A" opacity="0.06" />
              <line x1={PAD.left} y1={y(takeProfit)} x2={W - PAD.right} y2={y(takeProfit)} stroke="#20D99A" strokeWidth="1" strokeDasharray="5 3" />
              <text x={PAD.left + 4} y={y(takeProfit) - 4} fill="#20D99A" fontSize="9" fontFamily="monospace" fontWeight="bold">TP ${priceLabel(takeProfit)}</text>
            </g>
          )}
          {stopLoss !== undefined && (
            <g>
              <rect x={PAD.left} y={y(Math.min(stopLoss, entryPrice ?? stopLoss))} width={plotW} height={Math.abs(y(stopLoss) - y(entryPrice ?? stopLoss))} fill="#FF5C70" opacity="0.06" />
              <line x1={PAD.left} y1={y(stopLoss)} x2={W - PAD.right} y2={y(stopLoss)} stroke="#FF5C70" strokeWidth="1" strokeDasharray="5 3" />
              <text x={PAD.left + 4} y={y(stopLoss) + 11} fill="#FF5C70" fontSize="9" fontFamily="monospace" fontWeight="bold">SL ${priceLabel(stopLoss)}</text>
            </g>
          )}
          {entryPrice !== undefined && (
            <g>
              <line x1={PAD.left} y1={y(entryPrice)} x2={W - PAD.right} y2={y(entryPrice)} stroke="#18D5C0" strokeWidth="1" strokeDasharray="2 2" />
              <text x={PAD.left + 4} y={y(entryPrice) - 4} fill="#18D5C0" fontSize="9" fontFamily="monospace" fontWeight="bold">ENTRY ${priceLabel(entryPrice)}</text>
            </g>
          )}

          {/* Volume bars */}
          {showVolumeState &&
            data.map((c, i) => {
              const h = (c.volume / maxVolume) * (plotH * 0.16);
              return (
                <rect
                  key={`v-${i}`}
                  x={x(i) - 2.5}
                  y={PAD.top + plotH - h}
                  width={5}
                  height={h}
                  fill={c.close >= c.open ? '#20D99A' : '#FF5C70'}
                  opacity={0.35}
                />
              );
            })}

          {/* EMA overlays */}
          {showEmaState && (
            <>
              <path d={line(ema20)} fill="none" stroke="#F5B942" strokeWidth="1.2" opacity="0.9" />
              <path d={line(ema50)} fill="none" stroke="#A78BFA" strokeWidth="1.2" opacity="0.9" />
            </>
          )}

          {/* Candles */}
          {data.map((c, i) => {
            const up = c.close >= c.open;
            const color = up ? '#20D99A' : '#FF5C70';
            const bodyTop = y(Math.max(c.open, c.close));
            const bodyH = Math.max(Math.abs(y(c.open) - y(c.close)), 1.2);
            return (
              <g key={i}>
                <line x1={x(i)} y1={y(c.high)} x2={x(i)} y2={y(c.low)} stroke={color} strokeWidth="1" />
                <rect x={x(i) - 3} y={bodyTop} width={6} height={bodyH} fill={color} rx={0.5} />
              </g>
            );
          })}

          {/* Crosshair */}
          {hoverIndex !== null && hovered && (
            <g>
              <line x1={x(hoverIndex)} y1={PAD.top} x2={x(hoverIndex)} y2={PAD.top + plotH} stroke="#91A0B5" strokeWidth="0.7" strokeDasharray="3 3" />
              <line x1={PAD.left} y1={y(hovered.close)} x2={W - PAD.right} y2={y(hovered.close)} stroke="#91A0B5" strokeWidth="0.7" strokeDasharray="3 3" />
              <circle cx={x(hoverIndex)} cy={y(hovered.close)} r={3} fill="#18D5C0" stroke="#080D16" strokeWidth="1.5" />
              <rect x={W - PAD.right + 2} y={y(hovered.close) - 8} width={50} height={16} rx={3} fill="#18D5C0" />
              <text x={W - PAD.right + 6} y={y(hovered.close) + 3.5} fill="#080D16" fontSize="9" fontFamily="monospace" fontWeight="bold">
                {priceLabel(hovered.close)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Footer legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-t border-[#223044] text-[10px] font-mono text-[#64748B]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#F5B942] inline-block" /> EMA 20</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#A78BFA] inline-block" /> EMA 50</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#20D99A] inline-block rounded-[2px]" /> Bullish</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#FF5C70] inline-block rounded-[2px]" /> Bearish</span>
        <span className="ml-auto">Hover to inspect · {data.length} candles · 15m</span>
      </div>
    </div>
  );
};
