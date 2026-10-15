"use client";

import { useState } from "react";
import { DISHES, DISH_GRADES } from "../kitchen";
import { TEST_MODE } from "../testMode";
import { ALL_RAID_ITEMS, ARMORS, ENHANCE, EVOLUTIONS, FLOORS, FOOD_EFFECTS, LIFE_MATS, MAX_HEAL_FOODS, RAID_ITEMS, RAID_MAX_FLOOR, SLOT_NAME, gearOf, weaponStats, type ArmorSlot, type Evolution, type RaidSave } from "./data";
import type { FoodSlot, RaidResult } from "./engine";
import { canPay, nextStep, realDropChance } from "./forge";
import RaidGame from "./RaidGame";

let runSeq = 0;
export type RaidOutcome = { result: RaidResult; lines: string[] };
type Avatar = { src: string; pixelated: boolean };
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

export type ForgeActions = {
  /** 재료 보유량(탑 재료 · 생활 재료 · 사냥 소재 · 특수 키 rare-hunt/goods/good-crop). */
  have: Record<string, number>; money: number;
  /** 생활 재료 만들 때 실제로 쓰일 재료 목록(모자라면 null). */
  lifePlan: (id: string) => string[] | null;
  craftLife: (id: string) => void;
  enhance: (useStabilizer: boolean) => void;
  openStep: () => void;
  evolve: (evolution: Evolution) => void;
  craftArmor: (id: string) => void;
  equip: (slot: ArmorSlot, id: string | null) => void;
};

/** 월루탑: 탑(층·음식·입장) · 장비 · 대장간. */
export default function RaidPanel({ raid, dishStock, raidItems, hold, avatar, forge, onResult }: {
  raid: RaidSave; dishStock: Record<string, number>; raidItems: Record<string, number>; hold: boolean; avatar: Avatar; forge: ForgeActions;
  onResult: (result: RaidResult, foods: FoodSlot[]) => string[];
}) {
  const [view, setView] = useState<"tower" | "gear" | "forge">("tower");
  const [floorNo, setFloorNo] = useState(Math.min(raid.unlockedFloor, RAID_MAX_FLOOR));
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [running, setRunning] = useState<{ foods: FoodSlot[]; id: number } | null>(null);
  const [outcome, setOutcome] = useState<RaidOutcome | null>(null);
  const [testSpeed, setTestSpeed] = useState(1);
  const [testEnh, setTestEnh] = useState<number | null>(null);
  const [testEvo, setTestEvo] = useState<Evolution | null>(null);

  const scythe = raid.weapons["raid-scythe"];
  const enh = TEST_MODE && testEnh !== null ? testEnh : scythe.enhancement;
  const evo = TEST_MODE && testEnh !== null ? (testEnh >= 10 ? testEvo ?? "great-scythe" : null) : scythe.evolution;
  const stats = weaponStats(enh, evo);
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
  const finish = (result: RaidResult) => {
    const lines = onResult(result, running?.foods ?? []);
    setOutcome({ result, lines }); setRunning(null); setSlots([null, null, null]);
    if (result.cleared) setFloorNo(n => Math.min(RAID_MAX_FLOOR, n + 1));
  };

  if (running) return <div className="raid-run">
    <RaidGame key={running.id} floor={floor} weapon={stats} evolution={evo} foods={running.foods} gear={gear} avatar={avatar} hold={hold} speed={TEST_MODE ? testSpeed : 1} onFinish={finish} onQuit={finish} />
    <p className="raid-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동 · 🖱 조준 · 클릭(누르고 있기) 공격 · <kbd>Space</kbd> 회피 · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 음식 · <kbd>P</kbd> 일시정지 · <kbd>Esc</kbd> 보스키</p>
  </div>;

  return <div className="raid-wrap">
    <div className="raid-tabs" role="tablist">{([["tower", "🗼 탑"], ["gear", "🎽 장비"], ["forge", "⚒️ 대장간"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} className={view === id ? "on" : ""} onClick={() => setView(id)}>{label}</button>)}</div>

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
          <div><small>{floor.zone}</small><b>{floor.boss.icon} {floor.boss.name}</b><span>5분 버티고 마지막 60초에 보스(체력 {floor.boss.hp.toLocaleString()}) 처치</span></div>
          {raid.firstClears.includes(floor.floor) ? <em>반복 클리어</em> : <em className="first">첫 클리어 보상</em>}
        </div>

        <div className="raid-loadout">
          <div className="raid-me"><img src={avatar.src} alt="" className={avatar.pixelated ? "pixelated" : ""} /><span><b>🌙 토벌 낫 +{enh}{evo ? ` · ${EVOLUTIONS[evo].name}` : ""}</b><small>피해 {stats.damage} · 사거리 {stats.range} · {stats.angle}° · {stats.interval}초</small>
            <small>♥ {100 + gear.hp} · 방어 {gear.defense}{gear.speed ? ` · 이속 +${Math.round(gear.speed * 100)}%` : ""}</small></span></div>
          <div className="raid-gear-mini">{(["head", "body", "legs"] as ArmorSlot[]).map(slot => { const a = ARMORS.find(item => item.id === raid.equipped[slot]); return <span key={slot} className={a ? "on" : ""} title={a ? a.text : `${SLOT_NAME[slot]} 비어 있음`}>{a ? a.icon : "▫️"}<small>{SLOT_NAME[slot]}</small></span>; })}</div>
        </div>

        <div className="raid-foods"><b>🍱 음식 3칸</b>
          <div>{slots.map((key, i) => { const f = slotFood(key);
            return <label key={i} className={`raid-food-slot ${f ? "on" : ""}`}><span className="raid-food-key">{i + 1}</span><span className="raid-food-icon">{f ? f.icon : "＋"}</span>
              <select value={key ?? ""} onChange={event => pickSlot(i, event.target.value || null)} aria-label={`음식 ${i + 1}번 칸`}>
                <option value="">비어 있음</option>
                {foodOptions.filter(o => o.key === key || (!usedIds(i).includes(o.id) && (!o.effect.heal || healCount(i) < MAX_HEAL_FOODS))).map(o => <option key={o.key} value={o.key}>{o.dish.icon} {o.dish.name}{DISH_GRADES[o.grade]?.stars ? ` ${DISH_GRADES[o.grade].stars}` : ""} ×{o.n} — {o.effect.text(o.effect.values[o.grade])}</option>)}
              </select>
              <small>{f ? f.effect.text(f.effect.values[f.grade]) : "음식 고르기"}</small></label>; })}</div>
          <small className="raid-food-rule">같은 음식은 한 칸 · 회복 음식 최대 {MAX_HEAL_FOODS}칸 · 쓴 음식만 사라져요{foodOptions.length === 0 ? " · 🍳 주방에서 요리를 만들어 오세요" : ""}</small>
        </div>

        <button className="raid-start" onClick={start}><span>🗼 {floor.floor}층 도전하기</span><small>5분 · 실패해도 장비와 해금 층은 그대로</small></button>

        <div className="raid-bag"><b>🎒 탑 재료</b>
          {Object.keys(RAID_ITEMS).some(id => raidItems[id]) || raid.towerSeals || raid.stabilizers ? <span>
            {Object.entries(RAID_ITEMS).filter(([id]) => raidItems[id]).map(([id, item]) => <em key={id}>{item.icon} {item.name} ×{raidItems[id]}</em>)}
            {raid.towerSeals > 0 && <em>🔖 탑의 인장 ×{raid.towerSeals}</em>}{raid.stabilizers > 0 && <em>🪨 안정화석 ×{raid.stabilizers}</em>}
          </span> : <small>층을 클리어하면 상자에서 나와요.</small>}
        </div>

        {TEST_MODE && <div className="raid-test"><b>🧪 로컬 테스트</b>
          <label>속도<select value={testSpeed} onChange={event => setTestSpeed(Number(event.target.value))}>{[1, 2, 5, 10].map(v => <option key={v} value={v}>×{v}</option>)}</select></label>
          <label>낫 강화<select value={testEnh ?? ""} onChange={event => setTestEnh(event.target.value === "" ? null : Number(event.target.value))}><option value="">저장값(+{scythe.enhancement})</option>{Array.from({ length: 16 }, (_, i) => <option key={i} value={i}>+{i}</option>)}</select></label>
          {testEnh !== null && testEnh >= 10 && <label>진화<select value={testEvo ?? "great-scythe"} onChange={event => setTestEvo(event.target.value as Evolution)}>{(Object.keys(EVOLUTIONS) as Evolution[]).map(id => <option key={id} value={id}>{EVOLUTIONS[id].name}</option>)}</select></label>}
        </div>}
      </div>
    </div>}

    {view === "gear" && <GearView raid={raid} forge={forge} />}
    {view === "forge" && <ForgeView raid={raid} forge={forge} />}
  </div>;
}

// ---------- 장비 ----------
function GearView({ raid, forge }: { raid: RaidSave; forge: ForgeActions }) {
  const gear = gearOf(raid), w = raid.weapons["raid-scythe"], stats = weaponStats(w.enhancement, w.evolution);
  return <div className="raid-gear">
    <div className="raid-slots">
      <div className="raid-slot weapon on"><small>무기</small><b>🌙 토벌 낫 +{w.enhancement}</b><span>{w.evolution ? EVOLUTIONS[w.evolution].name : "진화 전(+10에서 선택)"} · 피해 {stats.damage}</span></div>
      {(["head", "body", "legs"] as ArmorSlot[]).map(slot => { const a = ARMORS.find(item => item.id === raid.equipped[slot]);
        return <div key={slot} className={`raid-slot ${a ? "on" : ""}`}><small>{SLOT_NAME[slot]}</small><b>{a ? `${a.icon} ${a.name}` : "비어 있음"}</b><span>{a ? a.text : "오른쪽에서 만들고 착용하세요"}</span>{a && <button onClick={() => forge.equip(slot, null)}>벗기</button>}</div>; })}
      <div className="raid-slot pet"><small>전투펫</small><b>🔒 준비 중</b><span>전투펫은 다음 단계에서 열려요</span></div>
      <p className="raid-gear-sum">합계 · 체력 +{gear.hp} · 방어 +{gear.defense} · 치명타 +{Math.round(gear.crit * 100)}% · 이속 +{Math.round(gear.speed * 100)}% · 회피 재사용 −{Math.round(gear.dashCd * 100)}%{gear.startShield ? ` · 시작 보호막 ${gear.startShield}` : ""}</p>
    </div>
    <div className="raid-armors">{ARMORS.map(a => { const owned = raid.armorOwned.includes(a.id), worn = raid.equipped[a.slot] === a.id, ok = canPay(a.need, forge.have) && forge.money >= a.gold;
      return <div key={a.id} className={`raid-armor ${worn ? "worn" : owned ? "owned" : ""}`}>
        <span className="raid-armor-icon">{a.icon}</span>
        <div><b>{a.name} <small>{SLOT_NAME[a.slot]} · {a.tier === 1 ? "가죽" : "강화 가죽"}</small></b><span>{a.text}</span>
          {!owned && <span className="raid-cost"><em className={forge.money >= a.gold ? "ok" : "lack"}>💰 {a.gold.toLocaleString()}</em>{Object.entries(a.need).map(([id, n]) => <em key={id} className={(forge.have[id] ?? 0) >= n ? "ok" : "lack"}>{nameOf(id)} {forge.have[id] ?? 0}/{n}</em>)}</span>}</div>
        {worn ? <button disabled>착용 중</button> : owned ? <button onClick={() => forge.equip(a.slot, a.id)}>착용</button> : <button className="make" disabled={!ok} onClick={() => forge.craftArmor(a.id)}>만들기</button>}
      </div>; })}</div>
  </div>;
}

// ---------- 대장간 ----------
function ForgeView({ raid, forge }: { raid: RaidSave; forge: ForgeActions }) {
  const [useStab, setUseStab] = useState(false);
  const w = raid.weapons["raid-scythe"], step = nextStep(w.enhancement);
  const needsOpen = !!step?.open && !w.unlockedEnhancements.includes(step.to);
  const needEvolution = w.enhancement >= 10 && !w.evolution;
  const cost = step ? (needsOpen ? step.open! : { gold: step.gold, need: step.need }) : null;
  const affordable = !!cost && forge.money >= cost.gold && canPay(cost.need, forge.have);
  const stats = weaponStats(w.enhancement, w.evolution), next = step ? weaponStats(step.to, w.evolution) : null;

  return <div className="raid-forge">
    <div className="raid-anvil">
      <div className="raid-anvil-weapon"><span>🌙</span><b>토벌 낫 <em>+{w.enhancement}</em></b><small>{w.evolution ? EVOLUTIONS[w.evolution].name : "기본"}</small></div>
      <div className="raid-anvil-stats">
        <span>피해<b>{stats.damage}</b>{next && !needEvolution && step!.to <= 10 && <i>→ {next.damage}</i>}</span>
        <span>사거리<b>{stats.range}</b>{next && !needEvolution && step!.to <= 10 && <i>→ {next.range}</i>}</span>
        <span>공격각<b>{stats.angle}°</b>{next && !needEvolution && step!.to <= 10 && <i>→ {next.angle}°</i>}</span>
        <span>간격<b>{stats.interval}초</b>{next && !needEvolution && step!.to <= 10 && <i>→ {next.interval}초</i>}</span>
      </div>
      {needEvolution ? <div className="raid-evolve"><b>⚡ +10 진화 방향을 고르세요 (첫 선택 무료)</b>
        <div>{(Object.keys(EVOLUTIONS) as Evolution[]).map(id => <button key={id} onClick={() => forge.evolve(id)}><strong>{EVOLUTIONS[id].name}</strong><span>{EVOLUTIONS[id].note}</span><small>피해 {EVOLUTIONS[id].stats[0].damage} · 사거리 {EVOLUTIONS[id].stats[0].range} · {EVOLUTIONS[id].stats[0].angle}° · {EVOLUTIONS[id].stats[0].interval}초</small></button>)}</div></div>
        : !step ? <p className="raid-max">최대 강화(+15)에 도달했어요!</p>
        : <>
          <div className="raid-odds">
            <span>목표<b>+{step.to}</b></span><span>성공<b className="ok">{pct(step.chance)}</b></span>
            <span>실패 후 하락<b>{pct(step.drop)}</b></span><span>이번 시도 실제 하락<b className="bad">{pct(realDropChance(step))}</b></span>
          </div>
          {needsOpen && <p className="raid-open-note">🔓 +{step.to} 단계는 처음 한 번 <b>개방</b>해야 해요(보스 재료). 개방한 뒤에는 실패·하락해도 다시 내지 않아요.</p>}
          <div className="raid-cost big"><em className={forge.money >= cost!.gold ? "ok" : "lack"}>💰 {cost!.gold.toLocaleString()}원</em>{Object.entries(cost!.need).map(([id, n]) => <em key={id} className={(forge.have[id] ?? 0) >= n ? "ok" : "lack"}>{nameOf(id)} {forge.have[id] ?? 0}/{n}</em>)}</div>
          {!needsOpen && step.drop > 0 && <label className="raid-stab"><input type="checkbox" checked={useStab} onChange={event => setUseStab(event.target.checked)} disabled={raid.stabilizers < 1} /> 🪨 안정화석 사용 (실제로 하락할 때만 1개 소모 · 보유 {raid.stabilizers})</label>}
          <button className="raid-hammer" disabled={!affordable} onClick={() => (needsOpen ? forge.openStep() : forge.enhance(useStab))}>{needsOpen ? `🔓 +${step.to} 단계 개방` : `🔨 +${step.to} 강화하기`}</button>
          {w.enhancement >= 10 && <small className="raid-floor-note">+10에 한 번 도달하면 +9 아래로는 내려가지 않아요.</small>}
        </>}
    </div>

    <div className="raid-life"><b>🧺 생활 재료 만들기</b><small>값이 낮은 재료부터, 잠금·주문 예약분은 빼고 써요. 실제로 쓰일 재료를 미리 보여 줘요.</small>
      {Object.entries(LIFE_MATS).map(([id, m]) => { const plan = forge.lifePlan(id);
        return <div key={id} className="raid-life-row"><span className="raid-armor-icon">{m.icon}</span><div><b>{m.name} <small>보유 {forge.have[id] ?? 0}</small></b><span>{m.recipe}</span>{plan ? <span className="raid-plan">쓰일 재료: {plan.join(", ")}</span> : <span className="raid-plan lack">재료가 부족해요</span>}</div><button disabled={!plan} onClick={() => forge.craftLife(id)}>만들기</button></div>; })}
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
