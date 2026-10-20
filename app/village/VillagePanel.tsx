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
import { FACILITIES, FACILITY_LOOK, MAX_FACILITY_LEVEL, STAGE_EFFECTS, isOpenFacility, type VillageReq } from "./data";
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

  return <section className="panel village-panel">
    <div className="panel-heading"><div><span className="eyebrow">VILLAGE · 복구 {restored}/{FACILITIES.filter(f => isOpenFacility(f.id)).length * MAX_FACILITY_LEVEL}</span><h3>마을 복구{plazaLevel >= 3 ? " · 「마을을 되살린 농부」" : ""}</h3></div>
      <button className="ghost-button small" onClick={onOpenStorage}>📦 창고 (E)</button></div>
    <div className="village-layout">
      <div className={`village-map ${plazaLevel >= 2 ? "decorated" : ""}`} role="group" aria-label="마을 지도">
        {FACILITIES.map(entry => { const lv = levelOf(village, entry.id), live = isOpenFacility(entry.id), here = entry.id === facility.id;
          return <button key={entry.id} className={`village-tile level-${lv} ${here ? "on" : ""} ${live ? "" : "soon"}`} onClick={() => setSelected(entry.id)} aria-pressed={here}>
            <span className="village-look" aria-hidden="true">{FACILITY_LOOK[entry.id][lv]}</span>
            <b>{entry.name}</b>
            <small>{live ? (lv >= MAX_FACILITY_LEVEL ? "완공" : `${"★".repeat(lv)}${"☆".repeat(MAX_FACILITY_LEVEL - lv)}`) : "준비 중"}</small>
            {ready.includes(entry.id) && <i className="village-hammer" title="완공할 수 있어요">🔨</i>}
            {live && recommended === entry.id && !ready.includes(entry.id) && <i className="village-reco">추천</i>}
          </button>; })}
      </div>
      <div className="village-detail">
        <div className="village-detail-head"><span className="village-look big" aria-hidden="true">{FACILITY_LOOK[facility.id][level]}</span><div><b>{facility.icon} {facility.name}</b><small>{open ? `${level}단계 / ${MAX_FACILITY_LEVEL}단계` : "다음 업데이트에서 복구할 수 있어요"}</small></div></div>
        <ol className="village-effects">{STAGE_EFFECTS[facility.id].map((text, i) => <li key={i} className={i < level ? "done" : i === level ? "next" : ""}><span>{i < level ? "✅" : i === level ? "▶" : "·"} {i + 1}단계</span>{text}</li>)}</ol>
        {open && progress && <>
          <ul className="village-needs">{progress.rows.map((row, index) => { const can = candidatesFor(inventory, row.req, options).reduce((sum, key) => sum + usableOf(inventory, key, options), 0), one = planDelivery(inventory, village, facility.id, options, index);
            return <li key={index} className={row.left === 0 ? "full" : ""}>
              <span className="village-need-name">{reqLabel(row.req)}<small>{SOURCE[row.req.category]}</small></span>
              <span className="village-need-bar"><i style={{ width: `${(row.have / row.req.count) * 100}%` }} /></span>
              <span className="village-need-count">{row.have}/{row.req.count}{row.left > 0 && <small> 창고 {can}</small>}</span>
              <button disabled={row.left === 0 || takeCount(one) === 0} onClick={() => setConfirm({ kind: "deliver", facility: facility.id, take: one })}>납품</button>
            </li>; })}</ul>
          <div className="village-actions">
            <button className="ghost-button" disabled={takeCount(allTake) === 0} onClick={() => setConfirm({ kind: "deliver", facility: facility.id, take: allTake })}>📦 부족한 것 빼고 모두 납품 ({takeCount(allTake)}개)</button>
            <button className="save-button" disabled={!canComplete(village, facility.id, money)} onClick={() => setConfirm({ kind: "complete", facility: facility.id })}>🔨 {progress.gold.toLocaleString()}원 내고 {level + 1}단계 완공</button>
            {givenCount > 0 && <button className="ghost-button danger" onClick={() => setConfirm({ kind: "cancel", facility: facility.id })}>복구 취소 · 납품 {givenCount}개 돌려받기</button>}
          </div>
          {!progress.itemsDone ? <p className="hint">납품한 재료는 창고에서 바로 빠지고 이 시설에 보관돼요. 잠금·미션 예약분은 쓰지 않고, 황금 작물과 전설·신화 물고기는 내지 않아요.</p>
            : money < progress.gold ? <p className="hint">재료는 다 모였어요! 골드 {(progress.gold - money).toLocaleString()}원이 더 필요해요.</p> : <p className="hint">재료와 골드가 모두 준비됐어요. 완공하면 바로 효과가 적용돼요.</p>}
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
