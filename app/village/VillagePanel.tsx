"use client";
/**
 * 마을 복구 화면(LIFE_CONTENT_EXPANSION_SPEC 5.4~5.6절): 6개 시설 지도 + 시설 상세(현재 단계·다음 변화·필요 재료).
 * 납품·취소·완공은 확인창을 거친 뒤 page가 공용 상태에 한 번에 반영한다. 창고 재료를 자동으로 쓰지 않는다.
 */
import { useState } from "react";
import { ALL_FISH } from "../fishing";
import { CROPS, QUALITIES } from "../farming";
import { FORAGE } from "../explore/data";
import { parseItemKey, type Inventory } from "../items";
import { usableOf, type ConsumeOptions } from "../stock";
import { FACILITIES, MAX_FACILITY_LEVEL, STAGE_EFFECTS, isOpenFacility, type VillageReq } from "./data";
import { canComplete, candidatesFor, completable, levelOf, planDelivery, progressOf, recommendFacility, takeCount } from "./logic";
import type { VillageState } from "./types";

/** 아이템 키 → 화면 이름(농산물은 품질까지). */
export function itemLabel(key: string) {
  const ref = parseItemKey(key);
  if (key.startsWith("crop:")) { const crop = CROPS.find(c => c.id === ref.id); return `${crop?.icon ?? "🌱"} ${crop?.name ?? ref.id} · ${QUALITIES[ref.quality]?.name ?? "보통"}`; }
  if (key.startsWith("forage:")) { const item = FORAGE.find(f => f.id === ref.id); return `${item?.icon ?? "🌿"} ${item?.name ?? ref.id}`; }
  if (key.startsWith("fish:")) { const fish = ALL_FISH.find(f => f.id === ref.id); return `${fish?.icon ?? "🐟"} ${fish?.name ?? ref.id}`; }
  return key;
}
export function reqLabel(req: VillageReq) {
  if (req.category === "fish") return req.id === "any" ? "🐟 아무 물고기(전설·신화 제외)" : itemLabel(`fish:${req.id}`);
  if (req.category === "crop") { const crop = CROPS.find(c => c.id === req.id); return `${crop?.icon ?? "🌱"} ${crop?.name ?? req.id} (품질 무관·황금 제외)`; }
  return itemLabel(`forage:${req.id}`);
}
const SOURCE: Record<VillageReq["category"], string> = { crop: "농사", fish: "낚시", forage: "봄 숲길 탐험" };

/** 지도 그림(public/images/village/map.webp, 1270×824) 위 시설 위치. hit = 누르는 영역, thumb = 상세 카드 그림(중심·너비, 비율 1.75). 단위 px. */
const MAP_W = 1270, MAP_H = 824, THUMB_RATIO = 1.75;
const MAP_SPOTS: Record<string, { hit: [number, number, number, number]; thumb: [number, number, number]; line: string }> = {
  "guide-office": { hit: [142, 30, 270, 195], thumb: [277, 118, 330], line: "길을 아는 사람이 돌아오면, 숲이 한 걸음 더 가까워집니다." },
  "mine-station": { hit: [872, 10, 390, 220], thumb: [1080, 110, 370], line: "멈춰 있던 광차가 다시 서리 동굴로 달립니다." },
  plaza: { hit: [532, 60, 330, 380], thumb: [697, 220, 380], line: "사람들이 모이는 곳, 마을의 심장이 다시 뜁니다." },
  "craft-street": { hit: [12, 350, 430, 260], thumb: [222, 445, 420], line: "장인들의 손끝에서, 마을의 이야기가 다시 시작됩니다." },
  greenhouse: { hit: [492, 500, 380, 230], thumb: [650, 600, 400], line: "계절을 넘어 자라는 작은 정원." },
  pier: { hit: [932, 400, 330, 370], thumb: [1100, 550, 360], line: "물길이 다시 열리면, 먼 바다의 이야기가 들어옵니다." },
};
const pct = (v: number, total: number) => `${(v / total) * 100}%`;
function thumbStyle(id: string) {
  const [cx, cy, tw] = MAP_SPOTS[id].thumb, th = tw / THUMB_RATIO;
  const x = Math.min(Math.max(cx - tw / 2, 0), MAP_W - tw), y = Math.min(Math.max(cy - th / 2, 0), MAP_H - th);
  return { backgroundSize: `${(MAP_W / tw) * 100}% ${(MAP_H / th) * 100}%`, backgroundPosition: `${(x / (MAP_W - tw)) * 100}% ${(y / (MAP_H - th)) * 100}%` };
}
type SpotState = "ready" | "soon" | "open" | "ruin";

type Confirm = { kind: "deliver"; facility: string; take: Record<string, number> } | { kind: "cancel"; facility: string } | { kind: "complete"; facility: string };

type Props = {
  village: VillageState;
  inventory: Inventory;
  money: number;
  options: ConsumeOptions;
  onDeliver: (facility: string, take: Record<string, number>) => void;
  onCancel: (facility: string) => void;
  onComplete: (facility: string) => void;
  onOpenStorage: () => void;
};

export default function VillagePanel({ village, inventory, money, options, onDeliver, onCancel, onComplete, onOpenStorage }: Props) {
  const recommended = recommendFacility(inventory, village, options), ready = completable(village, money);
  const [selected, setSelected] = useState<string>(recommended ?? "guide-office");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const facility = FACILITIES.find(entry => entry.id === selected) ?? FACILITIES[0];
  const level = levelOf(village, facility.id), progress = progressOf(village, facility.id);
  const open = isOpenFacility(facility.id), given = village.contributions[facility.id] ?? {}, givenCount = takeCount(given);
  const allTake = progress ? planDelivery(inventory, village, facility.id, options) : {};
  const restored = FACILITIES.reduce((sum, entry) => sum + levelOf(village, entry.id), 0);
  const plazaLevel = levelOf(village, "plaza");

  const run = () => {
    if (!confirm) return;
    if (confirm.kind === "deliver") onDeliver(confirm.facility, confirm.take);
    else if (confirm.kind === "cancel") onCancel(confirm.facility);
    else onComplete(confirm.facility);
    setConfirm(null);
  };

  const openTotal = FACILITIES.filter(f => isOpenFacility(f.id)).length * MAX_FACILITY_LEVEL;
  const stateOf = (id: string): SpotState => ready.includes(id) ? "ready" : !isOpenFacility(id) ? "soon" : levelOf(village, id) > 0 ? "open" : "ruin";
  const goldShort = progress ? Math.max(0, progress.gold - money) : 0;

  return <section className="panel village-panel">
    <header className="village-head">
      <div className="village-title"><h3>마을 복구{plazaLevel >= 3 ? <small> 「마을을 되살린 농부」</small> : null}</h3><span>다시 숨 쉬는 우리 마을</span></div>
      <div className="village-total" aria-label={`복구 ${restored}/${openTotal}`}><span>🏘️ 복구 <b>{restored} / {openTotal}</b></span><i><em style={{ width: pct(restored, openTotal || 1) }} /></i></div>
      <button className="village-storage" onClick={onOpenStorage}>📦 창고 <kbd>E</kbd></button>
    </header>
    <div className="village-layout">
      <div className="village-map" role="group" aria-label="마을 지도">
        {FACILITIES.map(entry => { const [x, y, w, h] = MAP_SPOTS[entry.id].hit, lv = levelOf(village, entry.id), state = stateOf(entry.id), here = entry.id === facility.id;
          return <button key={entry.id} className={`village-spot ${state} ${here ? "on" : ""}`} style={{ left: pct(x, MAP_W), top: pct(y, MAP_H), width: pct(w, MAP_W), height: pct(h, MAP_H) }}
            onClick={() => setSelected(entry.id)} aria-pressed={here} aria-label={`${entry.name} · ${state === "soon" ? "준비 중" : `${lv}/${MAX_FACILITY_LEVEL}단계`}${state === "ready" ? " · 복구 가능" : ""}`}>
            <span className="village-badge">{state === "ready" ? "🔨" : state === "soon" ? "🔒" : state === "open" ? "🏠" : "🧱"}{state !== "soon" && <small>{"★".repeat(lv)}{"☆".repeat(MAX_FACILITY_LEVEL - lv)}</small>}</span>
            {recommended === entry.id && state === "ruin" && <i className="village-reco">추천</i>}
          </button>; })}
        <div className="village-legend" aria-hidden="true"><span><b>🏠</b>운영 중</span><span><b>🔨</b>복구 가능</span><span><b>🔒</b>준비 중</span></div>
      </div>
      <div className="village-detail">
        <div className="village-detail-head"><span className="village-icon" aria-hidden="true">{facility.icon}</span><div><b>{facility.name}</b><small>{MAP_SPOTS[facility.id].line}</small></div></div>
        <div className={`village-thumb ${open ? "" : "soon"}`} style={thumbStyle(facility.id)} role="img" aria-label={`${facility.name} 그림`}>{!open && <span>🔒 준비 중</span>}</div>
        <div className="village-stage"><b>{open ? `${level}단계` : "준비 중"}</b>{open && <span>/ {MAX_FACILITY_LEVEL}단계</span>}</div>
        <i className="village-stage-bar"><em style={{ width: pct(open ? level : 0, MAX_FACILITY_LEVEL) }} /></i>
        <ol className="village-effects">{STAGE_EFFECTS[facility.id].map((text, i) => <li key={i} className={i < level ? "done" : i === level && open ? "next" : "lock"}>
          <span className="village-step-mark" aria-hidden="true">{i < level ? "✓" : i === level && open ? "" : "🔒"}</span><b>{i + 1}단계</b><span>{text}</span></li>)}</ol>
        {!open && <p className="hint">다음 업데이트에서 복구할 수 있어요.</p>}
        {open && progress && <>
          <h4 className="village-needs-title">필요한 재료</h4>
          <ul className="village-needs">{progress.rows.map((row, index) => { const can = candidatesFor(inventory, row.req, options).reduce((sum, key) => sum + usableOf(inventory, key, options), 0), one = planDelivery(inventory, village, facility.id, options, index);
            return <li key={index} className={row.left === 0 ? "full" : ""}>
              <span className="village-need-name">{reqLabel(row.req)}<small>{SOURCE[row.req.category]}{row.left > 0 ? ` · 창고 ${can}` : ""}</small></span>
              <span className="village-need-bar"><i style={{ width: `${(row.have / row.req.count) * 100}%` }} /></span>
              <span className="village-need-count">{row.have} / {row.req.count}</span>
              <button disabled={row.left === 0 || takeCount(one) === 0} onClick={() => setConfirm({ kind: "deliver", facility: facility.id, take: one })}>납품</button>
            </li>; })}
            <li className={goldShort === 0 ? "full gold" : "gold"}>
              <span className="village-need-name">💰 골드<small>완공할 때 냄</small></span>
              <span className="village-need-bar"><i style={{ width: pct(Math.min(money, progress.gold), progress.gold) }} /></span>
              <span className="village-need-count">{progress.gold.toLocaleString()}원</span><span />
            </li></ul>
          {progress.itemsDone
            ? <button className="village-main" disabled={!canComplete(village, facility.id, money)} onClick={() => setConfirm({ kind: "complete", facility: facility.id })}>{goldShort > 0 ? `골드 ${goldShort.toLocaleString()}원 부족` : `🔨 ${level + 1}단계 복구하기`}</button>
            : <button className="village-main" disabled={takeCount(allTake) === 0} onClick={() => setConfirm({ kind: "deliver", facility: facility.id, take: allTake })}>{takeCount(allTake) ? `복구하기 · 재료 ${takeCount(allTake)}개 납품` : "창고에 낼 재료가 없어요"}</button>}
          {givenCount > 0 && <button className="village-cancel" onClick={() => setConfirm({ kind: "cancel", facility: facility.id })}>복구 취소 · 납품 {givenCount}개 돌려받기</button>}
          <p className="hint">{!progress.itemsDone ? "복구하기를 누르면 부족한 것을 빼고 창고 재료를 모두 내요. 잠금·미션 예약분, 황금 작물, 전설·신화 물고기는 쓰지 않아요." : goldShort > 0 ? "재료는 다 모였어요! 골드를 모으면 완공할 수 있어요." : "재료와 골드가 모두 준비됐어요. 완공하면 바로 효과가 적용돼요."}</p>
        </>}
        {open && !progress && <p className="village-max">🎉 모든 단계를 복구했어요!</p>}
      </div>
    </div>
    {confirm && <div className="modal-backdrop storage-backdrop"><section className="modal village-confirm" role="dialog" aria-modal="true" aria-label="마을 복구 확인">
      {confirm.kind === "deliver" && <><h4>{facility.name}에 납품할까요?</h4><ul>{Object.entries(confirm.take).map(([key, n]) => <li key={key}><span>{itemLabel(key)}</span><b>×{n}</b></li>)}</ul><p className="hint">납품한 재료는 판매·제작에 쓸 수 없어요. 복구를 취소하면 전부 돌려받아요.</p></>}
      {confirm.kind === "cancel" && <><h4>{facility.name} 복구를 취소할까요?</h4><ul>{Object.entries(given).map(([key, n]) => <li key={key}><span>{itemLabel(key)}</span><b>×{n}</b></li>)}</ul><p className="hint">이번 단계에 낸 재료를 모두 창고로 돌려받아요. 이미 완공한 단계는 그대로예요.</p></>}
      {confirm.kind === "complete" && progress && <><h4>{progress.gold.toLocaleString()}원을 내고 {facility.name} {level + 1}단계를 완공할까요?</h4><p>{STAGE_EFFECTS[facility.id][level]}</p></>}
      <div className="village-confirm-actions"><button className="save-button" onClick={run}>{confirm.kind === "deliver" ? "납품하기" : confirm.kind === "cancel" ? "취소하고 돌려받기" : "완공하기"}</button><button className="ghost-button" onClick={() => setConfirm(null)}>닫기</button></div>
    </section></div>}
  </section>;
}
