"use client";

import { useEffect, useState } from "react";
import { DISHES, DISH_GRADES, KITCHEN_ENABLED } from "../kitchen";
import { TEST_MODE } from "../testMode";
import { ALL_RAID_ITEMS, ARMORS, BATTLE_PETS, DUPLICATE_SHARDS, ENHANCE, EVOLUTIONS, EVOLUTION_CHANGE, FLOORS, TRAINING_FLOOR, TRAINING_SECONDS, FOOD_EFFECTS, LIFE_MATS, MAX_HEAL_FOODS, PET_EXCHANGE, PET_GACHA, PET_LEVELS, PET_TIER_RATE, RAID_ITEMS, RAID_MAX_FLOOR, SLOT_NAME, gearOf, weaponStats, type ArmorSlot, type Evolution, type RaidSave } from "./data";
import type { FoodSlot, RaidResult } from "./engine";
import { canPay, nextStep, realDropChance } from "./forge";
import RaidGame from "./RaidGame";
import { RAID_WEAPONS, SPECIALS, WEAPON_CRAFT, dps, weaponDef, type WeaponStats } from "./weapons";
import { WeaponIcon } from "./weaponArt";
import { ArmorIcon } from "./armorArt";

let runSeq = 0;
export type RaidOutcome = { result: RaidResult; lines: string[] };
type Avatar = { src: string; pixelated: boolean };
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

export type ForgeActions = {
  /** 재료 보유량(탑 재료 · 생활 재료 · 사냥 소재 · 특수 키 rare-hunt/goods/good-crop). */
  have: Record<string, number>; money: number;
  /** 생활 재료 만들 때 실제로 쓰일 재료 목록(모자라면 null). */
  /** pick: 직접 고른 재료 id(비어 있으면 싼 것부터 자동) */
  lifePlan: (id: string, n?: number, pick?: string[]) => string[] | null;
  craftLife: (id: string, n?: number, pick?: string[]) => void;
  /** 강화 가공에 쓸 수 있는 재료 목록(싼 순) */
  craftSources: (id: string) => { id: string; name: string; n: number }[];
  /** 지금 재료로 만들 수 있는 최대 개수 */
  lifeMax: (id: string, pick?: string[]) => number;
  /** 강화 가공 재료 현황: [쓸 수 있는 수, 가진 수(잠금·주문 예약 포함)] */
  craftStock: Record<string, [number, number]>;
  enhance: (useStabilizer: boolean) => void;
  openStep: () => void;
  evolve: (evolution: Evolution) => void;
  craftArmor: (id: string) => void;
  equip: (slot: ArmorSlot, id: string | null) => void;
  /** 전투펫 뽑기(생활펫 뽑기와 같은 방식, 1회) — 결과 펫 id 목록. */
  drawPets: (count: number) => string[];
  /** 진화 변경(30,000골드 + 생활 장인의 핵 3, +13 이상은 미궁 호박 2 추가). */
  changeEvolution: (evolution: Evolution) => void;
  /** 다른 토벌 무기 만들기·바꿔 들기 */
  craftWeapon: (id: string) => void;
  equipWeapon: (id: string) => void;
  equipPet: (id: string | null) => void;
  levelPet: (id: string) => void;
  exchangePet: (id: string) => void;
};

/** 월루탑: 탑(층·음식·입장) · 장비 · 대장간. */
export default function RaidPanel({ raid, dishStock, raidItems, hold, avatar, forge, onResult, onOpenGear, onOpenWorkshop }: {
  raid: RaidSave; dishStock: Record<string, number>; raidItems: Record<string, number>; hold: boolean; avatar: Avatar; forge: ForgeActions;
  onResult: (result: RaidResult, foods: FoodSlot[]) => string[];
  /** 메인 🎒 장비창으로 이동 */
  onOpenGear: () => void;
  /** 🏭 공방 강화 가공으로 이동 */
  onOpenWorkshop: () => void;
}) {
  const [view, setView] = useState<"tower" | "forge">("tower");
  const [floorNo, setFloorNo] = useState(Math.min(raid.unlockedFloor, RAID_MAX_FLOOR));
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [running, setRunning] = useState<{ foods: FoodSlot[]; id: number; training?: Evolution } | null>(null);
  const [outcome, setOutcome] = useState<RaidOutcome | null>(null);
  const [testSpeed, setTestSpeed] = useState(1);
  const [testEnh, setTestEnh] = useState<number | null>(null);
  const [testEvo, setTestEvo] = useState<Evolution | null>(null);

  const weaponId = raid.equipped.weapon, wDef = weaponDef(weaponId), scythe = raid.weapons[weaponId] ?? { enhancement: 0, evolution: null, unlockedEnhancements: [] };
  const enh = TEST_MODE && testEnh !== null ? testEnh : scythe.enhancement;
  const evo = TEST_MODE && testEnh !== null ? (testEnh >= 10 ? (wDef.evos.some(e => e.id === testEvo) ? testEvo : wDef.evos[0].id) : null) : scythe.evolution;
  const stats = weaponStats(enh, evo, weaponId);
  const gear = gearOf(raid);
  const floor = FLOORS[Math.min(floorNo, raid.unlockedFloor) - 1];

  const foodOptions = Object.entries(dishStock).filter(([key, n]) => n > 0 && FOOD_EFFECTS[key.split("|")[0]]).map(([key, n]) => {
    const [id, grade] = key.split("|"), dish = DISHES.find(d => d.id === id)!, effect = FOOD_EFFECTS[id];
    return { key, id, grade: Number(grade) || 0, n, dish, effect };
  });
  const slotFood = (key: string | null): FoodSlot => { const o = foodOptions.find(f => f.key === key); return o ? { dishId: o.id, grade: o.grade, key: o.key, effect: o.effect, icon: o.dish.icon, name: o.dish.name } : null; };
  const pickSlot = (i: number, key: string | null) => setSlots(all => all.map((v, j) => (j === i ? key : v)));
  const usedIds = (i: number) => slots.filter((k, j) => j !== i && k).map(k => k!.split("|")[0]);
  const healCount = (i: number) => slots.filter((k, j) => j !== i && k && FOOD_EFFECTS[k.split("|")[0]].heal).length;

  const start = () => { setOutcome(null); setRunning({ foods: slots.map(slotFood), id: ++runSeq }); };
  const train = (evolution: Evolution) => { setOutcome(null); setRunning({ foods: [], id: ++runSeq, training: evolution }); };
  const finish = (result: RaidResult) => {
    if (running?.training) { const name = EVOLUTIONS[running.training].name; setRunning(null); setView("forge"); setOutcome({ result: { ...result, floor: 0 }, lines: [`🎯 ${name} 체험 끝 · 처치 ${result.kills}`] }); return; }
    const lines = onResult(result, running?.foods ?? []);
    setOutcome({ result, lines }); setRunning(null); setSlots([null, null, null]);
    if (result.cleared) setFloorNo(n => Math.min(RAID_MAX_FLOOR, n + 1));
  };

  if (running?.training) return <div className="raid-run">
    <RaidGame key={running.id} floor={TRAINING_FLOOR} weapon={weaponStats(Math.max(10, scythe.enhancement), running.training, weaponId)} evolution={running.training} foods={[]} gear={gear} pet={petFor(raid)} avatar={avatar} hold={hold} onFinish={finish} onQuit={finish} />
    <p className="raid-keys">🎯 <b>{EVOLUTIONS[running.training].name}</b> {TRAINING_SECONDS}초 체험 · 쓰러지지 않고 보상도 없어요 · <kbd>P</kbd> 일시정지에서 그만둘 수 있어요</p>
  </div>;
  if (running) return <div className="raid-run">
    <RaidGame key={running.id} floor={floor} weapon={stats} evolution={evo} foods={running.foods} gear={gear} pet={petFor(raid)} avatar={avatar} hold={hold} speed={TEST_MODE ? testSpeed : 1} onFinish={finish} onQuit={finish} />
    <p className="raid-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동 · 🖱 조준 · 공격은 자동 · <kbd>Space</kbd> 회피 · 🖱 우클릭 특수 공격(진화 무기) · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 음식 · <kbd>P</kbd> 일시정지 · <kbd>Esc</kbd> 보스키</p>
  </div>;

  return <div className="raid-wrap">
    <div className="raid-tabs" role="tablist">{([["tower", "🗼 탑"], ["forge", "⚒️ 대장간"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} className={view === id ? "on" : ""} onClick={() => setView(id)}>{label}</button>)}</div>

    {view === "tower" && <div className="raid-lobby">
      {/* 탑: 아래가 1층, 위로 올라간다 */}
      <div className="raid-tower" role="radiogroup" aria-label="층 선택">
        <div className="raid-tower-top">🏯 월루탑</div>
        {[...FLOORS].reverse().map(f => { const locked = f.floor > raid.unlockedFloor, boss = f.floor % 5 === 0, cleared = raid.firstClears.includes(f.floor);
          return <button key={f.floor} role="radio" aria-checked={floor.floor === f.floor} disabled={locked} onClick={() => setFloorNo(f.floor)}
            className={`raid-storey ${floor.floor === f.floor ? "on" : ""} ${boss ? "boss" : ""} ${cleared ? "cleared" : ""} ${f.floor > 5 ? "canal" : "field"}`}>
            <b>{f.floor}F</b><span>{locked ? "🔒 잠김" : boss ? `${f.boss.icon} ${f.boss.name}` : f.zone}</span><i>{cleared ? "✔" : locked ? "" : "▶"}</i>
          </button>; })}
        <div className="raid-tower-base">입구</div>
      </div>

      <div className="raid-side">
        {outcome && <div className={`raid-result ${outcome.result.cleared ? "clear" : "fail"}`}>
          <b>{outcome.result.cleared ? `🎉 ${outcome.result.floor}층 돌파!` : outcome.result.abandoned ? `🏳 ${outcome.result.floor}층 도전 포기` : `💥 ${outcome.result.floor}층 실패`}</b>
          <span>처치 {outcome.result.kills} · 각성 Lv.{outcome.result.level}{!outcome.result.cleared && outcome.result.bossHpLeft < 1 ? ` · 보스 체력 ${Math.round(outcome.result.bossHpLeft * 100)}% 남음` : ""}</span>
          {!outcome.result.cleared && !outcome.result.abandoned && outcome.result.reason.length > 0 && <span className="raid-why">💡 {outcome.result.reason.join(" · ")}</span>}
          {outcome.lines.length > 0 && <ul>{outcome.lines.map(line => <li key={line}>{line}</li>)}</ul>}
        </div>}

        <div className={`raid-floor-card ${floor.floor > 5 ? "canal" : "field"}`}>
          <span className="raid-floor-no">{floor.floor}F</span>
          <div><small>{floor.zone}</small><b>{floor.boss.icon} {floor.boss.name}</b><span>2분 버티면 보스 등장(체력 {floor.boss.hp.toLocaleString()}) · 보스전은 시간 제한 없음</span></div>
          {raid.firstClears.includes(floor.floor) ? <em>반복 클리어</em> : <em className="first">첫 클리어 보상</em>}
        </div>

        <div className="raid-loadout">
          <div className="raid-me"><img src={avatar.src} alt="" className={avatar.pixelated ? "pixelated" : ""} /><span><b>{wDef.icon} {wDef.name} +{enh}{evo ? ` · ${EVOLUTIONS[evo].name}` : ""}</b><small>피해 {stats.damage} · 사거리 {stats.range} · {stats.angle}° · {stats.interval}초</small>
            <small>♥ {100 + gear.hp} · 방어 {gear.defense}{gear.speed ? ` · 이속 +${Math.round(gear.speed * 100)}%` : ""}</small></span></div>
          <button className="raid-gear-link" onClick={onOpenGear}>🎒 장비창에서 바꾸기</button>
          <div className="raid-gear-mini">{(["head", "body", "legs"] as ArmorSlot[]).map(slot => { const a = ARMORS.find(item => item.id === raid.equipped[slot]); return <span key={slot} className={a ? "on" : ""} title={a ? a.text : `${SLOT_NAME[slot]} 비어 있음`}>{a ? <ArmorIcon id={a.id} size={28} /> : "▫️"}<small>{SLOT_NAME[slot]}</small></span>; })}{(() => { const p = BATTLE_PETS.find(x => x.id === raid.equipped.battlePet); return <span className={p ? "on" : ""} title={p ? p.text : "전투펫 없음"}>{p ? p.icon : "▫️"}<small>전투펫</small></span>; })()}</div>
        </div>

        {KITCHEN_ENABLED && <div className="raid-foods"><b>🍱 음식 3칸</b>
          <div>{slots.map((key, i) => { const f = slotFood(key);
            return <label key={i} className={`raid-food-slot ${f ? "on" : ""}`}><span className="raid-food-key">{i + 1}</span><span className="raid-food-icon">{f ? f.icon : "＋"}</span>
              <select value={key ?? ""} onChange={event => pickSlot(i, event.target.value || null)} aria-label={`음식 ${i + 1}번 칸`}>
                <option value="">비어 있음</option>
                {foodOptions.filter(o => o.key === key || (!usedIds(i).includes(o.id) && (!o.effect.heal || healCount(i) < MAX_HEAL_FOODS))).map(o => <option key={o.key} value={o.key}>{o.dish.icon} {o.dish.name}{DISH_GRADES[o.grade]?.stars ? ` ${DISH_GRADES[o.grade].stars}` : ""} ×{o.n} — {o.effect.text(o.effect.values[o.grade])}</option>)}
              </select>
              <small>{f ? f.effect.text(f.effect.values[f.grade]) : "음식 고르기"}</small></label>; })}</div>
          <small className="raid-food-rule">같은 음식은 한 칸 · 회복 음식 최대 {MAX_HEAL_FOODS}칸 · 쓴 음식만 사라져요{foodOptions.length === 0 ? " · 🍳 주방에서 요리를 만들어 오세요" : ""}</small>
        </div>}

        <button className="raid-start" onClick={start}><span>🗼 {floor.floor}층 도전하기</span><small>2분 웨이브 + 보스전 · 실패해도 장비와 해금 층은 그대로</small></button>

        <div className="raid-bag"><b>🎒 탑 재료</b>
          {Object.keys(RAID_ITEMS).some(id => raidItems[id]) || raid.towerSeals || raid.stabilizers ? <span>
            {Object.entries(RAID_ITEMS).filter(([id]) => raidItems[id]).map(([id, item]) => <em key={id}>{item.icon} {item.name} ×{raidItems[id]}</em>)}
            {raid.towerSeals > 0 && <em>🔖 탑의 인장 ×{raid.towerSeals}</em>}{raid.stabilizers > 0 && <em>🪨 안정화석 ×{raid.stabilizers}</em>}
          </span> : <small>층을 클리어하면 상자에서 나와요.</small>}
        </div>

        {TEST_MODE && <div className="raid-test"><b>🧪 로컬 테스트</b>
          <label>속도<select value={testSpeed} onChange={event => setTestSpeed(Number(event.target.value))}>{[1, 2, 5, 10].map(v => <option key={v} value={v}>×{v}</option>)}</select></label>
          <label>무기 강화<select value={testEnh ?? ""} onChange={event => setTestEnh(event.target.value === "" ? null : Number(event.target.value))}><option value="">저장값(+{scythe.enhancement})</option>{Array.from({ length: 16 }, (_, i) => <option key={i} value={i}>+{i}</option>)}</select></label>
          {testEnh !== null && testEnh >= 10 && <label>진화<select value={evo ?? ""} onChange={event => setTestEvo(event.target.value as Evolution)}>{wDef.evos.map(e => e.id).map(id => <option key={id} value={id}>{EVOLUTIONS[id].name}</option>)}</select></label>}
        </div>}
      </div>
    </div>}

    {view === "forge" && <>{outcome && outcome.result.floor === 0 && <div className="raid-result clear"><b>{outcome.lines[0]}</b><span>두 진화를 모두 체험해 보고 골라 보세요.</span></div>}<ForgeView raid={raid} forge={forge} onTrain={train} onOpenWorkshop={onOpenWorkshop} /></>}
  </div>;
}

// ---------- 장비 ----------
/** 토벌 장비(무기·방어구·전투펫). 메인 🎒 장비창 안에 들어간다. */
export function RaidGearView({ raid, forge }: { raid: RaidSave; forge: ForgeActions }) {
  const gear = gearOf(raid), weaponId = raid.equipped.weapon, wDef = weaponDef(weaponId), w = raid.weapons[weaponId] ?? { enhancement: 0, evolution: null, unlockedEnhancements: [] }, stats = weaponStats(w.enhancement, w.evolution, weaponId);
  return <div className="raid-gear">
    <div className="raid-slots">
      <div className="raid-slot weapon on"><small>무기</small><b><WeaponIcon id={w.evolution ?? weaponId} size={22} /> {wDef.name} +{w.enhancement}</b><span>{w.evolution ? EVOLUTIONS[w.evolution].name : "진화 전(+10에서 선택)"} · 피해 {stats.damage}</span></div>
      {(["head", "body", "legs"] as ArmorSlot[]).map(slot => { const a = ARMORS.find(item => item.id === raid.equipped[slot]);
        return <div key={slot} className={`raid-slot ${a ? "on" : ""}`}><small>{SLOT_NAME[slot]}</small><b>{a ? <><ArmorIcon id={a.id} size={24} /> {a.name}</> : "비어 있음"}</b><span>{a ? a.text : "오른쪽에서 만들고 착용하세요"}</span>{a && <button onClick={() => forge.equip(slot, null)}>벗기</button>}</div>; })}
      {(() => { const p = BATTLE_PETS.find(x => x.id === raid.equipped.battlePet), lv = p ? raid.battlePets?.[p.id]?.level ?? 1 : 0; return <div className={`raid-slot ${p ? "on" : ""}`}><small>전투펫</small><b>{p ? `${p.icon} ${p.name} Lv.${lv}` : "비어 있음"}</b><span>{p ? `${p.text} · 능력 ×${PET_LEVELS[lv - 1].mult}` : "아래 전투펫 뽑기에서 얻어요"}</span>{p && <button onClick={() => forge.equipPet(null)}>빼기</button>}</div>; })()}
      <p className="raid-gear-sum">합계 · 체력 +{gear.hp} · 방어 +{gear.defense} · 치명타 +{Math.round(gear.crit * 100)}% · 이속 +{Math.round(gear.speed * 100)}% · 회피 재사용 −{Math.round(gear.dashCd * 100)}%{gear.startShield ? ` · 시작 보호막 ${gear.startShield}` : ""}</p>
    </div>
    <div className="raid-gear-right">
    <div className="raid-weapons"><b>⚔️ 토벌 무기 <small>{`대장간 제작: ${WEAPON_CRAFT.gold.toLocaleString()}원 + 생활 장인의 핵 ${WEAPON_CRAFT.core} + 생활 재료 ${WEAPON_CRAFT.mat}`}</small></b>
      <div>{RAID_WEAPONS.map(def => { const own = TEST_MODE || Boolean(raid.weapons[def.id]), cur = raid.weapons[def.id], st = weaponStats(cur?.enhancement ?? 0, cur?.evolution ?? null, def.id), worn = def.id === weaponId;
        return <div key={def.id} className={`raid-weapon ${worn ? "worn" : own ? "owned" : ""}`}>
          <span className="raid-armor-icon"><WeaponIcon id={cur?.evolution ?? def.id} size={40} /></span>
          <div><b>{def.name}{cur ? ` +${cur.enhancement}` : ""} <small>{def.difficulty} · {def.style}</small></b><span>피해 {st.damage}{st.pellets ? `×${st.pellets}` : ""} · {st.interval}초 · 초당 약 {dps(st)}{cur?.evolution ? ` · ${EVOLUTIONS[cur.evolution].name}` : ` · 진화: ${def.evos.map(e => e.name).join(" / ")}`}</span>
            {!own && def.craft && <span className="raid-cost"><em className={forge.money >= WEAPON_CRAFT.gold ? "ok" : "lack"}>💰 {WEAPON_CRAFT.gold.toLocaleString()}</em><em className={(forge.have["artisan-core"] ?? 0) >= WEAPON_CRAFT.core ? "ok" : "lack"}>{nameOf("artisan-core")} {forge.have["artisan-core"] ?? 0}/{WEAPON_CRAFT.core}</em><em className={(forge.have[def.craft.lifeMat] ?? 0) >= WEAPON_CRAFT.mat ? "ok" : "lack"}>{nameOf(def.craft.lifeMat)} {forge.have[def.craft.lifeMat] ?? 0}/{WEAPON_CRAFT.mat}</em></span>}</div>
          {worn ? <button disabled>사용 중</button> : own ? <button onClick={() => forge.equipWeapon(def.id)}>들기</button> : <button className="make" disabled={forge.money < WEAPON_CRAFT.gold || (forge.have["artisan-core"] ?? 0) < WEAPON_CRAFT.core || (forge.have[def.craft?.lifeMat ?? ""] ?? 0) < WEAPON_CRAFT.mat} onClick={() => forge.craftWeapon(def.id)}>만들기</button>}
        </div>; })}</div>
    </div>
    <p className="hint">🐾 전투펫은 <b>펫</b> 탭에서 데려가기·레벨업하고, <b>상점 › 가챠</b>에서 뽑아요.</p>
    <div className="raid-armors">{ARMORS.map(a => { const owned = raid.armorOwned.includes(a.id), worn = raid.equipped[a.slot] === a.id, ok = canPay(a.need, forge.have) && forge.money >= a.gold;
      return <div key={a.id} className={`raid-armor ${worn ? "worn" : owned ? "owned" : ""}`}>
        <span className="raid-armor-icon"><ArmorIcon id={a.id} size={48} /></span>
        <div><b>{a.name} <small>{SLOT_NAME[a.slot]} · {a.tier === 1 ? "가죽" : "강화 가죽"}</small></b><span>{a.text}</span>
          {!owned && <span className="raid-cost"><em className={forge.money >= a.gold ? "ok" : "lack"}>💰 {a.gold.toLocaleString()}</em>{Object.entries(a.need).map(([id, n]) => <em key={id} className={(forge.have[id] ?? 0) >= n ? "ok" : "lack"}>{nameOf(id)} {forge.have[id] ?? 0}/{n}</em>)}</span>}</div>
        {worn ? <button disabled>착용 중</button> : owned ? <button onClick={() => forge.equip(a.slot, a.id)}>착용</button> : <button className="make" disabled={!ok} onClick={() => forge.craftArmor(a.id)}>만들기</button>}
      </div>; })}</div>
    </div>
  </div>;
}

// ---------- 전투펫 ----------
export function petFor(raid: RaidSave) {
  const p = BATTLE_PETS.find(x => x.id === raid.equipped.battlePet); if (!p) return null;
  const lv = raid.battlePets?.[p.id]?.level ?? 1;
  return { id: p.id, mult: PET_LEVELS[lv - 1].mult, icon: p.icon };
}
/** 전투펫 뽑기(상점 › 🎁 가챠). */
export function BattlePetGacha({ raid, forge }: { raid: RaidSave; forge: ForgeActions }) {
  const [last, setLast] = useState<string[]>([]);
  const shards = raid.contractShards;
  const draw = (count: number) => setLast(forge.drawPets(count));
  return <div className="raid-pets">
    <div className="raid-pet-gacha">
      <b>🥚 전투펫 뽑기</b>
      <small>생활펫 뽑기와 같은 방식 · 보통 {(PET_TIER_RATE.보통 * 100).toFixed(1)}% · 희귀 {PET_TIER_RATE.희귀 * 100}% · 전설 {PET_TIER_RATE.전설 * 100}%</small>
      <div><button onClick={() => draw(1)} disabled={forge.money < PET_GACHA.gold}>💰 {PET_GACHA.gold.toLocaleString()}원 · 1회 뽑기</button></div>
      {last.length > 0 && <div className="raid-pet-last">{last.map((id, i) => { const p = BATTLE_PETS.find(x => x.id === id)!; return <span key={i} className={`tier-${p.tier}`} style={{ animationDelay: `${i * 0.05}s` }}>{p.icon}<small>{p.tier}</small></span>; })}</div>}
      <small>📜 계약 조각 {shards} · 중복은 조각으로(보통 {DUPLICATE_SHARDS.보통} · 희귀 {DUPLICATE_SHARDS.희귀} · 전설 {DUPLICATE_SHARDS.전설}개) · 데려가기·레벨업·교환은 🐾 펫 탭에서</small>
    </div>
    <div className="raid-pet-dex">{BATTLE_PETS.map(p => <span key={p.id} className={`tier-${p.tier} ${raid.battlePets?.[p.id] ? "owned" : ""}`} title={`${p.name} · ${p.tier} · ${p.text}`}>{raid.battlePets?.[p.id] ? p.icon : "❔"}<small>{p.name}</small></span>)}</div>
  </div>;
}
/** 전투펫 보유 현황(🐾 펫 탭): 데려가기·레벨업·조각 교환. */
export function BattlePetRoster({ raid, forge }: { raid: RaidSave; forge: ForgeActions }) {
  const pets = raid.battlePets ?? {}, shards = raid.contractShards;
  return <div className="raid-pets">
    <div className="raid-pet-list">{BATTLE_PETS.map(p => { const own = pets[p.id], lv = own?.level ?? 0, next = PET_LEVELS[lv], worn = raid.equipped.battlePet === p.id, cost = p.tier === "보통" ? 0 : PET_EXCHANGE[p.tier];
      return <div key={p.id} className={`raid-pet ${own ? "owned" : ""} ${worn ? "worn" : ""} tier-${p.tier}`}>
        <span className="raid-armor-icon">{own ? p.icon : "❔"}</span>
        <div><b>{p.name} <small>{p.tier} · {p.role}{own ? ` · Lv.${lv}` : ""}</small></b><span>{p.text}</span></div>
        <div className="raid-pet-actions">
          {own ? <>{worn ? <button disabled>데려가는 중</button> : <button onClick={() => forge.equipPet(p.id)}>데려가기</button>}
            {next ? <button onClick={() => forge.levelPet(p.id)} disabled={shards < next.shards}>Lv.{next.level} (조각 {next.shards})</button> : <button disabled>최대 Lv</button>}</>
            : cost ? <button onClick={() => forge.exchangePet(p.id)} disabled={shards < cost}>조각 {cost}개 교환</button> : <button disabled>뽑기로 얻기</button>}
        </div>
      </div>; })}</div>
  </div>;
}

// ---------- 대장간 ----------
function ForgeView({ raid, forge, onTrain, onOpenWorkshop }: { raid: RaidSave; forge: ForgeActions; onTrain: (evolution: Evolution) => void; onOpenWorkshop: () => void }) {
  const [useStab, setUseStab] = useState(false), [picking, setPicking] = useState(false);
  const weaponId = raid.equipped.weapon, wDef = weaponDef(weaponId), w = raid.weapons[weaponId] ?? { enhancement: 0, evolution: null, unlockedEnhancements: [] }, step = nextStep(w.enhancement);
  const needsOpen = !!step?.open && !w.unlockedEnhancements.includes(step.to);
  const needEvolution = w.enhancement >= 10 && !w.evolution;
  const cost = step ? (needsOpen ? step.open! : { gold: step.gold, need: step.need }) : null;
  const affordable = !!cost && forge.money >= cost.gold && canPay(cost.need, forge.have);
  const stats = weaponStats(w.enhancement, w.evolution, weaponId), next = step ? weaponStats(step.to, w.evolution, weaponId) : null;

  return <div className="raid-forge">
    {picking && needEvolution && <EvolutionPicker weaponId={weaponId} onTrain={id => { setPicking(false); onTrain(id); }} onPick={id => { setPicking(false); forge.evolve(id); }} onClose={() => setPicking(false)} />}
    <div className="raid-anvil">
      <div className="raid-anvil-weapon"><span><WeaponIcon id={w.evolution ?? weaponId} size={52} /></span><b>{wDef.name} <em>+{w.enhancement}</em></b><small>{w.evolution ? EVOLUTIONS[w.evolution].name : "기본"}</small></div>
      <div className="raid-anvil-stats">
        <span>피해<b>{stats.damage}</b>{next && !needEvolution && step!.to <= 10 && <i>→ {next.damage}</i>}</span>
        <span>사거리<b>{stats.range}</b>{next && !needEvolution && step!.to <= 10 && <i>→ {next.range}</i>}</span>
        <span>공격각<b>{stats.angle}°</b>{next && !needEvolution && step!.to <= 10 && <i>→ {next.angle}°</i>}</span>
        <span>간격<b>{stats.interval}초</b>{next && !needEvolution && step!.to <= 10 && <i>→ {next.interval}초</i>}</span>
      </div>
      {needEvolution ? <div className="raid-evolve-banner"><span className="raid-evolve-burst">✨</span><div><b>+10 강화 달성!</b><small>{wDef.icon} {wDef.name}을(를) 전투 무기로 진화시킬 수 있어요 (첫 선택 무료)</small></div><button onClick={() => setPicking(true)}>⚔️ 전투 무기로 진화</button></div>
        : !step ? <p className="raid-max">최대 강화(+15)에 도달했어요!</p>
        : <>
          <div className="raid-odds">
            <span>목표<b>+{step.to}</b></span><span>성공<b className="ok">{pct(step.chance)}</b></span>
            <span>실패 후 하락<b>{pct(step.drop)}</b></span><span>이번 시도 실제 하락<b className="bad">{pct(realDropChance(step))}</b></span>
          </div>
          {needsOpen && <p className="raid-open-note">🔓 +{step.to} 단계는 처음 한 번 <b>개방</b>해야 해요(보스 재료). 개방한 뒤에는 실패·하락해도 다시 내지 않아요.</p>}
          <div className="raid-cost big"><em className={forge.money >= cost!.gold ? "ok" : "lack"}>💰 {cost!.gold.toLocaleString()}원</em>{Object.entries(cost!.need).map(([id, n]) => LIFE_MATS[id] && (forge.have[id] ?? 0) < n ? <button key={id} className="raid-cost-link" onClick={onOpenWorkshop} title="공방에서 만들기">{nameOf(id)} {forge.have[id] ?? 0}/{n} ↗</button> : <em key={id} className={(forge.have[id] ?? 0) >= n ? "ok" : "lack"}>{nameOf(id)} {forge.have[id] ?? 0}/{n}</em>)}</div>
          {!needsOpen && step.drop > 0 && <label className="raid-stab"><input type="checkbox" checked={useStab} onChange={event => setUseStab(event.target.checked)} disabled={raid.stabilizers < 1} /> 🪨 안정화석 사용 (실제로 하락할 때만 1개 소모 · 보유 {raid.stabilizers})</label>}
          <button className="raid-hammer" disabled={!affordable} onClick={() => (needsOpen ? forge.openStep() : forge.enhance(useStab))}>{needsOpen ? `🔓 +${step.to} 단계 개방` : `🔨 +${step.to} 강화하기`}</button>
          {w.enhancement >= 10 && <small className="raid-floor-note">+10에 한 번 도달하면 +9 아래로는 내려가지 않아요.</small>}
        </>}
      {w.evolution && <div className="raid-evo-change"><b>🔁 진화 바꾸기</b><small>강화 단계와 개방한 단계는 그대로예요 · 횟수 제한 없음</small>
        {(() => { const other = wDef.evos.map(e => e.id).find(id => id !== w.evolution)!, need: Record<string, number> = { ...EVOLUTION_CHANGE.need, ...(w.enhancement >= 13 ? EVOLUTION_CHANGE.upper : {}) }, ok = forge.money >= EVOLUTION_CHANGE.gold && canPay(need, forge.have);
          return <><div className="raid-cost big"><em className={forge.money >= EVOLUTION_CHANGE.gold ? "ok" : "lack"}>💰 {EVOLUTION_CHANGE.gold.toLocaleString()}원</em>{Object.entries(need).map(([id, n]) => <em key={id} className={(forge.have[id] ?? 0) >= n ? "ok" : "lack"}>{nameOf(id)} {forge.have[id] ?? 0}/{n}</em>)}</div>
            <div className="raid-evo-change-row"><button className="raid-try" onClick={() => onTrain(other)}>🎯 {EVOLUTIONS[other].name} {TRAINING_SECONDS}초 체험</button><button className="raid-hammer small" disabled={!ok} onClick={() => forge.changeEvolution(other)}>🔁 {EVOLUTIONS[other].name}(으)로 바꾸기</button></div></>; })()}
      </div>}
    </div>

    <div className="raid-life"><b>🧺 강화 소재</b><small>강화 소재는 🏭 공방의 ⚒️ 강화 가공에서 즉시 만들어요.</small>
      {Object.entries(LIFE_MATS).map(([id, m]) => <div key={id} className="raid-life-row"><span className="raid-armor-icon">{m.icon}</span><div><b>{m.name} <small>보유 {forge.have[id] ?? 0}</small></b><span>{m.recipe}</span></div><button onClick={onOpenWorkshop}>공방에서 만들기</button></div>)}
    </div>

    <details className="raid-table"><summary>강화표 전체 보기</summary><table><thead><tr><th>목표</th><th>성공</th><th>하락</th><th>골드</th><th>재료</th></tr></thead><tbody>
      {ENHANCE.map(e => <tr key={e.to} className={e.to === w.enhancement + 1 ? "now" : e.to <= w.enhancement ? "done" : ""}><td>+{e.to}</td><td>{pct(e.chance)}</td><td>{pct(e.drop)}</td><td>{e.gold.toLocaleString()}</td><td>{Object.entries(e.need).map(([id, n]) => `${nameOf(id)} ${n}`).join(", ")}{e.open ? ` · 개방: ${Object.entries(e.open.need).map(([id, n]) => `${nameOf(id)} ${n}`).join(", ")} + ${e.open.gold.toLocaleString()}원` : ""}</td></tr>)}
    </tbody></table></details>
  </div>;
}

const HUNT_NAMES: Record<string, { icon: string; name: string }> = {
  rabbitfur: { icon: "🤍", name: "토끼 털뭉치" }, foxfur: { icon: "🧡", name: "여우 꼬리털" }, antler: { icon: "🦌", name: "떨어진 사슴뿔" }, boarhair: { icon: "🧶", name: "멧돼지 털" },
  bearfur: { icon: "🟫", name: "곰 털뭉치" }, tusk: { icon: "🦷", name: "엄니 조각" }, tigerpelt: { icon: "🐯", name: "호랑이 가죽" },
};
function nameOf(id: string) {
  if (id === "rare-hunt") return "희귀 사냥 소재";
  if (id === "goods") return "가공품";
  if (id === "good-crop") return "좋은 품질↑ 농산물";
  const item = ALL_RAID_ITEMS[id] ?? HUNT_NAMES[id];
  return item ? `${item.icon} ${item.name}` : id;
}

// ---------- 공방: 강화 가공(51.4) ----------
/** 강화 소재 즉시 제작: 1·5·10·최대, 실제로 쓰일 재료를 보여 주고 누르는 즉시 완성. */
export function RaidCraftView({ forge, onForge }: { forge: ForgeActions; onForge: () => void }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  // 재료 직접 고르기(51.5): 고른 재료만 쓴다. 아무것도 안 고르면 싼 것부터 자동.
  const [picks, setPicks] = useState<Record<string, string[]>>({}), [open, setOpen] = useState<string | null>(null);
  return <div className="raid-craft">
    <p className="hint">기본은 싼 재료부터 자동으로 써요. 🎯 재료 고르기로 쓸 재료를 직접 정할 수 있어요. 잠금·주문 예약분은 쓰지 않아요. <button className="raid-gear-link" onClick={onForge}>⚒️ 대장간으로</button></p>
    {Object.entries(LIFE_MATS).map(([id, m]) => { const sources = id === "artisan-core" ? [] : forge.craftSources(id), pick = (picks[id] ?? []).filter(key => sources.some(src => src.id === key)),
      max = forge.lifeMax(id, pick), want = Math.max(1, Math.min(qty[id] ?? 1, Math.max(1, max))), plan = forge.lifePlan(id, want, pick);
      return <div key={id} className="raid-craft-row">
        <span className="raid-armor-icon">{m.icon}</span>
        <div><b>{m.name} <small>보유 {forge.have[id] ?? 0}</small></b>
          <span>{m.recipe}{id !== "artisan-core" && <> · 쓸 수 있는 재료 <em className="raid-stock">{forge.craftStock[id]?.[0] ?? 0}</em>개</>}</span>
          {plan ? <span className="raid-plan">사용: {plan.join(", ")}</span> : <span className="raid-plan lack">재료 부족</span>}
          {sources.length > 0 && <button className="raid-pick-toggle" onClick={() => setOpen(open === id ? null : id)}>🎯 재료 고르기{pick.length ? ` (${pick.length}종 선택)` : " (자동)"} {open === id ? "▴" : "▾"}</button>}
          {open === id && <div className="raid-pick">
            <button className={!pick.length ? "on" : ""} onClick={() => setPicks(all => ({ ...all, [id]: [] }))}>자동(싼 것부터)</button>
            {sources.map(src => <button key={src.id} className={pick.includes(src.id) ? "on" : ""} onClick={() => setPicks(all => ({ ...all, [id]: pick.includes(src.id) ? pick.filter(key => key !== src.id) : [...pick, src.id] }))}>{src.name} <small>{src.n}</small></button>)}
          </div>}</div>
        <div className="raid-craft-qty">{[1, 5, 10].map(n => <button key={n} className={want === n ? "on" : ""} onClick={() => setQty(all => ({ ...all, [id]: n }))} disabled={max < n}>{n}개</button>)}<button className={want === max && max > 10 ? "on" : ""} onClick={() => setQty(all => ({ ...all, [id]: max }))} disabled={max < 1}>최대</button>
          <button className="make" disabled={!plan} onClick={() => forge.craftLife(id, want, pick)}>즉시 완성 ×{want}</button></div>
      </div>; })}
  </div>;
}

// ---------- +10 전투 무기 진화 화면 ----------
/** 진화 하나의 특징 3줄: 피해·범위·템포(다른 진화와 비교해 말로). */
function evoTraits(st: WeaponStats, other: WeaponStats) {
  const area = st.mode === "arc" ? (st.angle >= 360 ? "주변 전체 공격(360°)" : `${st.angle}° 범위 베기`)
    : st.mode === "slam" || st.mode === "lob" ? `반경 ${st.radius ?? 0} 범위 타격` : st.mode === "spread" ? `산탄 ${st.pellets ?? 1}발` : st.mode === "beam" || st.mode === "channel" ? `사거리 ${st.range} 지속 공격` : `사거리 ${st.range}`;
  const hit = dps(st) >= dps(other) ? "더 높은 초당 피해" : st.damage > other.damage ? "강한 한 방 피해" : "가벼운 연속 피해";
  const tempo = st.interval < other.interval ? "빠른 공격 템포" : st.interval > other.interval ? "묵직한 공격 템포" : "같은 공격 템포";
  return [
    { icon: "⚔️", text: `${hit} · 피해 ${st.damage}${st.pellets ? `×${st.pellets}` : ""}` },
    { icon: st.mode === "arc" && st.angle >= 360 ? "🌀" : "🎯", text: area },
    { icon: "⏱", text: `${tempo} · ${st.interval}초` },
  ];
}
function EvolutionPicker({ weaponId, onTrain, onPick, onClose }: { weaponId: string; onTrain: (id: Evolution) => void; onPick: (id: Evolution) => void; onClose: () => void }) {
  const wDef = weaponDef(weaponId), [sel, setSel] = useState<Evolution | null>(null);
  const evos = wDef.evos.map(e => e.id as Evolution);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [onClose]);
  return <div className="evo-pick-backdrop">
    <section className="evo-pick" role="dialog" aria-label="전투 무기로 진화">
      <button className="evo-pick-close" onClick={onClose} aria-label="닫기">✕</button>
      <header className="evo-pick-head"><span className="evo-pick-old"><WeaponIcon id={weaponId} size={50} /></span><div><em>+10 강화 달성</em><h3>전투 무기로 진화</h3></div></header>
      <div className="evo-pick-cards">{evos.map((id, i) => { const ev = EVOLUTIONS[id], st = ev.stats[0], other = EVOLUTIONS[evos[1 - i]].stats[0], sp = SPECIALS[id];
        return <div key={id} className={`evo-card ${i ? "b" : "a"} ${sel === id ? "on" : ""}`} role="button" tabIndex={0} aria-pressed={sel === id} onClick={() => setSel(id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSel(id); } }}>
          {sel === id && <span className="evo-check">✓</span>}
          <div className="evo-card-top"><span className="evo-art"><WeaponIcon id={id} size={80} />{sp && <i>{sp.icon}</i>}</span>
            <div><h4>{ev.name}</h4><p>{ev.note}</p></div></div>
          <ul className="evo-traits">{evoTraits(st, other).map(t => <li key={t.text}><span>{t.icon}</span>{t.text}</li>)}</ul>
          {sp && <div className="evo-special"><small>특수 공격 미리보기 · 🖱 우클릭</small><div><span className="evo-special-icon">{sp.icon}</span><div><b>{sp.name}</b><span>{sp.text}</span><em>재사용 {sp.cooldown}초</em></div></div></div>}
          <button className="evo-try" onClick={event => { event.stopPropagation(); onTrain(id); }}>🎯 훈련장에서 체험 ({TRAINING_SECONDS}초)</button>
        </div>; })}</div>
      <p className="evo-warn">⚠️ 선택한 진화에 따라 이후 전투 스타일이 정해져요. (나중에 대장간에서 재료를 내고 바꿀 수 있어요)</p>
      <button className="evo-confirm" disabled={!sel} onClick={() => sel && onPick(sel)}>{sel ? `${EVOLUTIONS[sel].name}(으)로 진화 확정` : "진화를 골라 주세요"}</button>
    </section>
  </div>;
}

