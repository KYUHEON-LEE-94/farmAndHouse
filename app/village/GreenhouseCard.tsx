"use client";
/** 텃밭 화면 오른쪽의 온실 카드(생활 2단계): 비계절 작물 2종 고르기 · 재배칸 1/2/4칸 심기·수확. */
import { CROPS, type Crop } from "../farming";
import { GREENHOUSE_PICKS, growProgress, isReady, slotsOf, type GreenhouseState } from "./greenhouse";

type Props = {
  level: number;
  state: GreenhouseState;
  /** 지금 고를 수 있는 비계절 작물 */
  choices: Crop[];
  now: number;
  seedPrice: (crop: Crop) => number;
  seconds: (crop: Crop) => number;
  onPick: (index: number, cropId: string) => void;
  onPlant: (slot: number, cropId: string) => void;
  onHarvest: (slot: number) => void;
};

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export default function GreenhouseCard({ level, state, choices, now, seedPrice, seconds, onPick, onPlant, onHarvest }: Props) {
  const count = slotsOf(level), picks = state.picks.map(id => choices.find(crop => crop.id === id)).filter((crop): crop is Crop => Boolean(crop));
  return <div className="greenhouse-card">
    <h4>🌱 온실 <small>{level}단계 · 재배칸 {count}칸</small></h4>
    <div className="greenhouse-picks">{Array.from({ length: GREENHOUSE_PICKS }, (_, i) => <label key={i}><span>작물 {i + 1}</span>
      <select value={state.picks[i] ?? ""} onChange={event => onPick(i, event.target.value)} aria-label={`온실 작물 ${i + 1}`}>
        <option value="">고르기</option>
        {choices.filter(crop => crop.id === state.picks[i] || !state.picks.includes(crop.id)).map(crop => <option key={crop.id} value={crop.id}>{crop.icon} {crop.name} ({crop.seasons.join("·")})</option>)}
      </select></label>)}</div>
    <ul className="greenhouse-slots">{Array.from({ length: count }, (_, i) => { const slot = state.slots[i] ?? null, crop = slot ? CROPS.find(c => c.id === slot.cropId) : undefined;
      return <li key={i} className={slot ? (isReady(slot, now) ? "ready" : "growing") : "empty"}>
        {slot ? <>
          <span className="greenhouse-plant">{crop?.icon ?? "🌱"}</span>
          {isReady(slot, now) ? <button onClick={() => onHarvest(i)}>수확</button>
            : <span className="greenhouse-grow"><i style={{ width: `${growProgress(slot, now) * 100}%` }} /><small>{clock(Math.ceil((slot.plantedAt + slot.growSeconds * 1000 - now) / 1000))}</small></span>}
        </> : picks.length ? <span className="greenhouse-plant-choices">{picks.map(c => <button key={c.id} onClick={() => onPlant(i, c.id)} title={`${c.name} 심기 · 씨앗 ${seedPrice(c)}원 · ${clock(seconds(c))}`}>{c.icon} {seedPrice(c)}원</button>)}</span>
          : <small>작물을 먼저 골라요</small>}
      </li>; })}</ul>
    <p className="hint">온실은 물·벌레·시듦이 없고 품질은 보통이에요. 재배 시간은 밭보다 25% 길어요.</p>
  </div>;
}
