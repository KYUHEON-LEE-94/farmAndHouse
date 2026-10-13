"use client";

import { useState } from "react";

type HSV = { h: number; s: number; v: number };

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function hsvToRgb({ h, s, v }: HSV): [number, number, number] {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}

export const rgbToHex = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map(n => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();

export function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsv([r, g, b]: [number, number, number]): HSV {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255], max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb), d = max - min;
  let h = 0;
  if (d) h = max === rr ? ((gg - bb) / d) % 6 : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

function rgbToHsl([r, g, b]: [number, number, number]) {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255], max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb), l = (max + min) / 2, d = max - min;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [Math.round(rgbToHsv([r, g, b]).h), Math.round(s * 100), Math.round(l * 100)];
}

const PRESETS = ["#C78979", "#E2B85A", "#81A96B", "#8BA5BC", "#9A7BB0", "#57514F", "#EFE6D6", "#713B2F", "#E0533A", "#F08A3A", "#F6D16A", "#5FB0DC", "#2F6F90", "#5A4FA8", "#F2899A", "#FFFFFF", "#1D1D1D", "#3F8FBF"];

/**
 * 색 고르기: 채도·명도 사각형 + 세로 색조 막대 + HEX 입력(디자인 툴과 같은 방식).
 * 끌 때마다 onChange가 불린다.
 */
export default function ColorPicker({ value, onChange, onClose }: { value: string; onChange: (hex: string) => void; onClose: () => void }) {
  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(hexToRgb(value) ?? [199, 137, 121]));
  const [hexInput, setHexInput] = useState(value.toUpperCase());
  const rgb = hsvToRgb(hsv), hex = rgbToHex(rgb), hsl = rgbToHsl(rgb);

  const apply = (next: HSV) => { setHsv(next); const nextHex = rgbToHex(hsvToRgb(next)); setHexInput(nextHex); onChange(nextHex); };
  const fromPointer = (event: React.PointerEvent<HTMLDivElement>, kind: "sv" | "hue") => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width), y = clamp((event.clientY - rect.top) / rect.height);
    apply(kind === "sv" ? { ...hsv, s: x, v: 1 - y } : { ...hsv, h: y * 359.9 });
  };
  const drag = (kind: "sv" | "hue") => ({
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => { event.currentTarget.setPointerCapture(event.pointerId); fromPointer(event, kind); },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) fromPointer(event, kind); },
  });
  const nudge = (kind: "sv" | "hue") => (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0.1 : 0.02, moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const move = moves[event.key]; if (!move) return;
    event.preventDefault();
    apply(kind === "sv" ? { ...hsv, s: clamp(hsv.s + move[0]), v: clamp(hsv.v + move[1]) } : { ...hsv, h: (hsv.h - move[1] * 360 + 360) % 360 });
  };

  return (
    <div className="color-picker" role="dialog" aria-label="색 고르기">
      <div className="cp-head">
        <span className="cp-swatch" style={{ background: hex }} />
        <span><small>HEX</small><b>{hex}</b></span><span><small>RGB</small><b>{rgb.join(", ")}</b></span><span><small>HSL</small><b>{hsl[0]}, {hsl[1]}%, {hsl[2]}%</b></span>
        <button className="cp-close" onClick={onClose} aria-label="닫기">✕</button>
      </div>
      <div className="cp-body">
        <div className="cp-sv" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))` }} role="slider" tabIndex={0} aria-label="채도와 명도" aria-valuenow={Math.round(hsv.s * 100)} onKeyDown={nudge("sv")} {...drag("sv")}>
          <i style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
        </div>
        <div className="cp-hue" role="slider" tabIndex={0} aria-label="색조" aria-valuenow={Math.round(hsv.h)} onKeyDown={nudge("hue")} {...drag("hue")}>
          <i style={{ top: `${(hsv.h / 360) * 100}%` }} />
        </div>
        <div className="cp-side">
          <span className="cp-preview" style={{ background: hex }} />
          <label># <input value={hexInput.replace("#", "")} maxLength={6} onChange={event => { const text = `#${event.target.value}`; setHexInput(text); const parsed = hexToRgb(text); if (parsed) { const next = rgbToHsv(parsed); setHsv(next); onChange(rgbToHex(parsed)); } }} aria-label="HEX 색상 코드" /></label>
          <dl><dt>R</dt><dd>{rgb[0]}</dd><dt>G</dt><dd>{rgb[1]}</dd><dt>B</dt><dd>{rgb[2]}</dd><dt>H</dt><dd>{hsl[0]}</dd><dt>S</dt><dd>{hsl[1]}</dd><dt>L</dt><dd>{hsl[2]}</dd></dl>
        </div>
      </div>
      <div className="cp-presets">{PRESETS.map(color => <button key={color} style={{ background: color }} className={hex === color ? "on" : ""} onClick={() => { setHexInput(color); setHsv(rgbToHsv(hexToRgb(color)!)); onChange(color); }} aria-label={`색상 ${color}`} />)}</div>
    </div>
  );
}
