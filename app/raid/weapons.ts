/**
 * 토벌 무기 9종(HUNTING_RAID.md 23·48·49절). 사냥터 무기와는 별개 데이터.
 * 표에는 +0 · +5 · +10(진화 전)과 진화 +10 · +15만 있고, 사이 단계는 고르게 나눈다(토벌 낫은 23절 표를 그대로).
 */
export type AttackMode = "arc" | "slam" | "channel" | "beam" | "lob" | "thrust" | "hook" | "arrow" | "spread" | "bullet" | "bolt";
/** 무기 고유 효과(진화별). */
export type WeaponFx = {
  boss?: number; elite?: number; stagger?: number; quake?: boolean; fragments?: number;
  slow?: number; freeze?: boolean; selfSlow?: number; knockTick?: number;
  poison?: boolean; seeds?: number; tip?: boolean; pullSplash?: boolean; pull?: number; chain?: boolean; net?: boolean;
  pierce?: number; far?: boolean; eliteCrit?: number; triple?: boolean; explode?: number; dashBonus?: boolean; double?: boolean; crit?: number; guard?: number; spinKill?: boolean;
};
export type WeaponStats = {
  mode: AttackMode; damage: number; range: number; angle: number; interval: number; knockback: number;
  /** slam·lob·폭발 반지름, thrust·beam·hook 폭, 투사체 속도, 산탄 수 */
  radius?: number; width?: number; speed?: number; pellets?: number;
  fx?: WeaponFx;
  /** 화면에 그릴 무기 아이콘(raidWeaponStats가 채운다), art: 그림 id(진화했으면 진화 id) */
  icon?: string; art?: string;
};
export type EvoDef = { id: string; name: string; note: string; s10: WeaponStats; s15: WeaponStats };
export type RaidWeaponDef = { id: string; name: string; icon: string; difficulty: "쉬움" | "보통" | "어려움"; style: string; s0: WeaponStats; s5: WeaponStats; s10: WeaponStats; table?: WeaponStats[]; evos: [EvoDef, EvoDef]; craft?: { lifeMat: string } };

const S = (mode: AttackMode, damage: number, range: number, angle: number, interval: number, extra: Partial<WeaponStats> = {}): WeaponStats => ({ mode, damage, range, angle, interval, knockback: 25, ...extra });

const SCYTHE_TABLE: [number, number, number, number][] = [[12, 90, 100, 0.65], [13, 90, 100, 0.65], [14, 90, 100, 0.65], [15, 94, 100, 0.65], [16, 94, 105, 0.65], [18, 98, 105, 0.62], [19, 98, 105, 0.62], [20, 102, 110, 0.62], [22, 102, 110, 0.6], [24, 106, 110, 0.6], [27, 110, 115, 0.58]];

export const RAID_WEAPONS: RaidWeaponDef[] = [
  { id: "raid-scythe", name: "농사용 낫", icon: "🌙", difficulty: "쉬움", style: "전방 부채꼴 베기",
    s0: S("arc", 12, 90, 100, 0.65, { knockback: 35 }), s5: S("arc", 18, 98, 105, 0.62, { knockback: 35 }), s10: S("arc", 27, 110, 115, 0.58, { knockback: 35 }),
    table: SCYTHE_TABLE.map(([d, r, a, i]) => S("arc", d, r, a, i, { knockback: 35 })),
    evos: [
      { id: "great-scythe", name: "전투 대낫", note: "정예·보스 피해 +20%, 강한 밀어내기", s10: S("arc", 34, 125, 120, 0.72, { knockback: 60, fx: { elite: 0.2 } }), s15: S("arc", 60, 140, 130, 0.64, { knockback: 60, fx: { elite: 0.2 } }) },
      { id: "harvest-blade", name: "회전 수확날", note: "주변 전체 공격, 일반 몬스터 처치 시 다음 공격 간격 −10%", s10: S("arc", 22, 105, 360, 0.48, { knockback: 30, fx: { spinKill: true } }), s15: S("arc", 36, 118, 360, 0.38, { knockback: 30, fx: { spinKill: true } }) },
    ] },
  { id: "raid-hoe", name: "괭이", icon: "⛏️", difficulty: "보통", style: "앞쪽 내려찍기(원형 충격·경직)", craft: { lifeMat: "farm-fiber" },
    s0: S("slam", 17, 70, 0, 0.9, { radius: 50, knockback: 50, fx: { stagger: 0.3 } }), s5: S("slam", 25, 74, 0, 0.86, { radius: 54, knockback: 50, fx: { stagger: 0.3 } }), s10: S("slam", 38, 78, 0, 0.8, { radius: 58, knockback: 50, fx: { stagger: 0.3 } }),
    evos: [
      { id: "quake-hammer", name: "지진 망치", note: "세 번째마다 반지름 110 지진(60%), 보스 피해 +15%", s10: S("slam", 52, 84, 0, 1.0, { radius: 66, knockback: 55, fx: { stagger: 0.3, quake: true, boss: 0.15 } }), s15: S("slam", 82, 92, 0, 0.92, { radius: 72, knockback: 55, fx: { stagger: 0.3, quake: true, boss: 0.15 } }) },
      { id: "rock-crusher", name: "암석 분쇄기", note: "충격 지점에서 파편 3개(각 35%)", s10: S("slam", 26, 74, 0, 0.55, { radius: 54, knockback: 40, fx: { stagger: 0.3, fragments: 3 } }), s15: S("slam", 40, 80, 0, 0.48, { radius: 60, knockback: 40, fx: { stagger: 0.3, fragments: 3 } }) },
    ] },
  { id: "raid-can", name: "물뿌리개", icon: "🚿", difficulty: "쉬움", style: "누르고 있는 동안 물줄기(부채꼴·둔화)", craft: { lifeMat: "fish-oil" },
    s0: S("channel", 2.6, 120, 40, 0.15, { knockback: 0, fx: { slow: 0.15, selfSlow: 0.25 } }), s5: S("channel", 3.9, 130, 42, 0.15, { knockback: 0, fx: { slow: 0.15, selfSlow: 0.25 } }), s10: S("channel", 6, 140, 45, 0.15, { knockback: 0, fx: { slow: 0.15, selfSlow: 0.25 } }),
    evos: [
      { id: "water-cannon", name: "고압 물대포", note: "직선 관통, 밀어내기, 보스 피해 +15%", s10: S("beam", 5.5, 260, 0, 0.15, { width: 22, knockback: 0, fx: { knockTick: 15, boss: 0.15, selfSlow: 0.25 } }), s15: S("beam", 8.5, 300, 0, 0.15, { width: 26, knockback: 0, fx: { knockTick: 15, boss: 0.15, selfSlow: 0.25 } }) },
      { id: "frost-sprayer", name: "빙결 분사기", note: "같은 적을 2초 맞히면 1초 빙결, 빙결된 적 받는 피해 +20%", s10: S("channel", 7.7, 145, 60, 0.15, { knockback: 0, fx: { slow: 0.15, freeze: true, selfSlow: 0.15 } }), s15: S("channel", 10.8, 155, 70, 0.15, { knockback: 0, fx: { slow: 0.15, freeze: true, selfSlow: 0.15 } }) },
    ] },
  { id: "raid-spreader", name: "비료 살포기", icon: "🧴", difficulty: "보통", style: "커서 위치로 비료 폭탄 투척", craft: { lifeMat: "farm-fiber" },
    s0: S("lob", 15, 230, 0, 0.95, { radius: 45, knockback: 20 }), s5: S("lob", 22, 240, 0, 0.92, { radius: 48, knockback: 20 }), s10: S("lob", 34, 250, 0, 0.85, { radius: 52, knockback: 20 }),
    evos: [
      { id: "toxic-sprayer", name: "독성 분사기", note: "폭발 자리에 3초 독 장판(초당 30%)", s10: S("lob", 26, 250, 0, 0.85, { radius: 52, knockback: 20, fx: { poison: true } }), s15: S("lob", 40, 270, 0, 0.78, { radius: 58, knockback: 20, fx: { poison: true } }) },
      { id: "seed-launcher", name: "폭발 씨앗 발사기", note: "씨앗 3개가 퍼져 각각 폭발", s10: S("lob", 25, 240, 0, 1.0, { radius: 44, knockback: 20, fx: { seeds: 3 } }), s15: S("lob", 37, 260, 0, 0.92, { radius: 48, knockback: 20, fx: { seeds: 3 } }) },
    ] },
  { id: "raid-harpoon", name: "낚시 작살", icon: "🔱", difficulty: "어려움", style: "직선 관통 찌르기", craft: { lifeMat: "fish-oil" },
    s0: S("thrust", 14, 130, 0, 0.7, { width: 24, knockback: 20 }), s5: S("thrust", 21, 138, 0, 0.66, { width: 26, knockback: 20 }), s10: S("thrust", 31, 148, 0, 0.62, { width: 28, knockback: 20 }),
    evos: [
      { id: "trident", name: "삼지창", note: "끝 30px 적중 시 치명타 +15%, 보스 피해 +15%", s10: S("thrust", 40, 155, 0, 0.66, { width: 30, knockback: 20, fx: { tip: true, boss: 0.15 } }), s15: S("thrust", 64, 170, 0, 0.6, { width: 34, knockback: 20, fx: { tip: true, boss: 0.15 } }) },
      { id: "chain-harpoon", name: "사슬 작살", note: "처음 맞은 일반 적을 끌어오고 주변 40px에 50%", s10: S("thrust", 48, 230, 0, 0.62, { width: 40, knockback: 0, fx: { pullSplash: true } }), s15: S("thrust", 74, 260, 0, 0.56, { width: 42, knockback: 0, fx: { pullSplash: true } }) },
    ] },
  { id: "raid-rod", name: "낚싯대", icon: "🎣", difficulty: "보통", style: "긴 사거리로 던져 끌어오기", craft: { lifeMat: "fish-oil" },
    s0: S("hook", 12, 170, 0, 0.68, { width: 16, knockback: 0, fx: { pull: 30 } }), s5: S("hook", 18, 180, 0, 0.64, { width: 16, knockback: 0, fx: { pull: 30 } }), s10: S("hook", 27, 195, 0, 0.6, { width: 16, knockback: 0, fx: { pull: 30 } }),
    evos: [
      { id: "thunder-rod", name: "번개 낚싯대", note: "2마리에게 번개 연쇄(각 50%), 감전된 보스 받는 피해 +10%", s10: S("hook", 30, 210, 0, 0.62, { width: 16, knockback: 0, fx: { pull: 30, chain: true } }), s15: S("hook", 48, 230, 0, 0.56, { width: 16, knockback: 0, fx: { pull: 30, chain: true } }) },
      { id: "net-launcher", name: "포획 그물 발사기", note: "반지름 70 그물 2초(이속 −50%, 받는 피해 +15%, 보스 +8%)", s10: S("hook", 48, 230, 0, 0.6, { width: 26, knockback: 0, fx: { pull: 15, net: true } }), s15: S("hook", 70, 250, 0, 0.55, { width: 26, knockback: 0, fx: { pull: 15, net: true } }) },
    ] },
  { id: "raid-bow", name: "사냥 활", icon: "🏹", difficulty: "쉬움", style: "원거리 화살", craft: { lifeMat: "tanned-leather" },
    s0: S("arrow", 10, 420, 0, 0.55, { speed: 600, knockback: 10 }), s5: S("arrow", 15, 440, 0, 0.52, { speed: 600, knockback: 10 }), s10: S("arrow", 22, 460, 0, 0.48, { speed: 600, knockback: 10 }),
    evos: [
      { id: "longbow", name: "저격 장궁", note: "3마리 관통, 250px 이상 피해 +25%, 정예·보스 치명타 +20%", s10: S("arrow", 57, 600, 0, 1.0, { speed: 750, knockback: 20, fx: { pierce: 3, far: true, eliteCrit: 0.2 } }), s15: S("arrow", 92, 650, 0, 0.92, { speed: 750, knockback: 20, fx: { pierce: 3, far: true, eliteCrit: 0.2 } }) },
      { id: "rapid-bow", name: "연사궁", note: "세 발마다 3갈래 화살(추가 화살 55%)", s10: S("arrow", 15.5, 420, 0, 0.24, { speed: 650, knockback: 5, fx: { triple: true } }), s15: S("arrow", 23.5, 440, 0, 0.21, { speed: 650, knockback: 5, fx: { triple: true } }) },
    ] },
  { id: "raid-shotgun", name: "엽총", icon: "🔫", difficulty: "보통", style: "근거리 산탄 5발", craft: { lifeMat: "tanned-leather" },
    s0: S("spread", 4.2, 200, 20, 1.05, { pellets: 5, speed: 900, knockback: 8 }), s5: S("spread", 6.3, 210, 20, 1.0, { pellets: 5, speed: 900, knockback: 8 }), s10: S("spread", 9.5, 220, 22, 0.95, { pellets: 5, speed: 900, knockback: 8 }),
    evos: [
      { id: "rifle", name: "소총", note: "한 발 직선 관통, 보스 피해 +15%", s10: S("bullet", 44, 400, 0, 0.85, { speed: 1100, knockback: 15, fx: { pierce: 1, boss: 0.15 } }), s15: S("bullet", 70, 450, 0, 0.78, { speed: 1100, knockback: 15, fx: { pierce: 2, boss: 0.15 } }) },
      { id: "siege-crossbow", name: "대형석궁", note: "맞은 자리 반지름 60 폭발(60%)", s10: S("bolt", 30, 300, 0, 0.95, { speed: 700, knockback: 20, fx: { explode: 60 } }), s15: S("bolt", 48, 320, 0, 0.88, { speed: 700, knockback: 20, fx: { explode: 60 } }) },
    ] },
  { id: "raid-knife", name: "사냥 칼", icon: "🔪", difficulty: "어려움", style: "짧고 빠른 베기(대시 직후 +30%)", craft: { lifeMat: "tanned-leather" },
    s0: S("arc", 7, 62, 80, 0.33, { knockback: 15, fx: { dashBonus: true } }), s5: S("arc", 10, 66, 84, 0.31, { knockback: 15, fx: { dashBonus: true } }), s10: S("arc", 15, 70, 90, 0.29, { knockback: 15, fx: { dashBonus: true } }),
    evos: [
      { id: "twin-blades", name: "쌍검", note: "두 번 베기, 치명타 +10%, 대시 직후 +30%", s10: S("arc", 10, 70, 90, 0.3, { knockback: 15, fx: { dashBonus: true, double: true, crit: 0.1 } }), s15: S("arc", 16, 74, 95, 0.27, { knockback: 15, fx: { dashBonus: true, double: true, crit: 0.1 } }) },
      { id: "greatsword", name: "대검", note: "넓게 베고 밀어내기 60, 받는 피해 −10%", s10: S("arc", 34, 105, 150, 0.72, { knockback: 60, fx: { guard: 0.1 } }), s15: S("arc", 54, 115, 160, 0.66, { knockback: 60, fx: { guard: 0.1 } }) },
    ] },
];
export const weaponDef = (id: string) => RAID_WEAPONS.find(w => w.id === id) ?? RAID_WEAPONS[0];
export const evoDef = (evoId: string | null) => (evoId ? RAID_WEAPONS.flatMap(w => w.evos).find(e => e.id === evoId) ?? null : null);

const lerp = (a: WeaponStats, b: WeaponStats, t: number): WeaponStats => ({
  ...b, damage: Math.round((a.damage + (b.damage - a.damage) * t) * 10) / 10, range: Math.round(a.range + (b.range - a.range) * t), angle: Math.round(a.angle + (b.angle - a.angle) * t),
  interval: Math.round((a.interval + (b.interval - a.interval) * t) * 100) / 100, radius: a.radius !== undefined && b.radius !== undefined ? Math.round(a.radius + (b.radius - a.radius) * t) : b.radius,
  width: a.width !== undefined && b.width !== undefined ? Math.round(a.width + (b.width - a.width) * t) : b.width,
});
/**
 * 보통 구간(21층~) 진화별 화력 보정: +15 이상에서만 피해에 곱한다(1~20층 권장 +13~+14 수치는 그대로).
 * 2026-10-16 raid-30 21·25·30층 측정(공격 빌드·표준 방어구)에서 0~100%로 벌어진 무기 간 격차를 줄이기 위한 1차 값.
 */
export const LATE_MUL: Record<string, number> = {
  "water-cannon": 1.7, "frost-sprayer": 1.45, "toxic-sprayer": 1.4, "seed-launcher": 1.5, "rapid-bow": 1.5, "thunder-rod": 1.35, "siege-crossbow": 1.55,
  "twin-blades": 1.15, longbow: 1.3, "net-launcher": 1.05, "chain-harpoon": 1.1, trident: 1.05,
  "great-scythe": 0.88, "harvest-blade": 0.92, "quake-hammer": 0.88, greatsword: 0.9, "rock-crusher": 1.05, rifle: 0.95,
};
/** 무기 수치: 진화했으면 진화 +10~+15, 아니면 +0~+10. */
export function raidWeaponStats(weaponId: string, enhancement: number, evolution: string | null): WeaponStats {
  const w = weaponDef(weaponId), evo = w.evos.find(e => e.id === evolution), e = Math.max(0, Math.min(10, enhancement));
  let st = evo && enhancement >= 10 ? lerp(evo.s10, evo.s15, Math.min(5, enhancement - 10) / 5) : w.table ? w.table[e] : e <= 5 ? lerp(w.s0, w.s5, e / 5) : lerp(w.s5, w.s10, (e - 5) / 5);
  if (evo && enhancement >= 15 && LATE_MUL[evo.id]) st = { ...st, damage: Math.round(st.damage * LATE_MUL[evo.id] * 10) / 10 };
  if (evo && enhancement > 15) {
    // +16~+18(RAID_FLOOR_30_EXPANSION_AUDIT 7.2): +15 수치에서 단계당 피해 ×1.08, 사거리·반경·폭·투사체 속도 ×1.02, 간격 ×0.985
    // +19~+22(RAID_FLOOR_40_EXPANSION_AUDIT 5절): +18 수치에서 단계당 피해 ×1.06, 사거리·반경·폭·투사체 속도 ×1.01, 간격 ×0.99
    // +23~+26(RAID_FLOOR_50_IMPLEMENTATION_PLAN 2절): +22 수치에서 단계당 피해 ×1.05, 간격 ×0.99. 사거리·반경·폭·투사체 속도는 +22 값에서 멈춘다
    const n = Math.min(3, enhancement - 15), m = Math.min(4, Math.max(0, enhancement - 18)), q = Math.max(0, enhancement - 22), g = (v: number | undefined, k: number, j: number) => (v === undefined ? v : Math.round(v * Math.pow(k, n) * Math.pow(j, m)));
    const damage = Math.round(st.damage * Math.pow(1.08, n) * Math.pow(1.06, m) * 10) / 10, interval = m ? Math.round(Math.round(st.interval * Math.pow(0.985, n) * 100) / 100 * Math.pow(0.99, m) * 1000) / 1000 : Math.round(st.interval * Math.pow(0.985, n) * 100) / 100;
    return { ...st, damage: q ? Math.round(damage * Math.pow(1.05, q) * 10) / 10 : damage, range: g(st.range, 1.02, 1.01)!, radius: g(st.radius, 1.02, 1.01), width: g(st.width, 1.02, 1.01), speed: g(st.speed, 1.02, 1.01), interval: q ? Math.round(interval * Math.pow(0.99, q) * 1000) / 1000 : interval, icon: w.icon, art: evo.id };
  }
  return { ...st, icon: w.icon, art: evo && enhancement >= 10 ? evo.id : w.id };
}
/** 단일 대상 초당 피해(표시용). */
export function dps(st: WeaponStats) { return Math.round((st.damage * (st.pellets ?? 1) * (st.fx?.double ? 2 : 1)) / st.interval); }
/** 다른 무기 제작(48.3 초안): 5층 첫 클리어 후, 5,000골드 + 생활 장인의 핵 2 + 무기별 생활 재료 3. */
/** 다른 토벌 무기 제작 비용(층 조건 없음 — 돈과 재료만). */
export const WEAPON_CRAFT = { gold: 5000, core: 2, mat: 3 };

/** +10 진화 우클릭 특수 공격(52절). 피해 배율은 현재 진화 무기 피해 기준. */
export type WeaponSpecial = { id: string; name: string; icon: string; cooldown: number; text: string };
export const SPECIALS: Record<string, WeaponSpecial> = {
  "great-scythe": { id: "eclipse-cleave", name: "월식 가르기", icon: "🌘", cooldown: 10, text: "320% · 길이 420 폭 70 참격(지형 통과), 정예·보스 +20%" },
  "harvest-blade": { id: "harvest-whirl", name: "수확 회오리", icon: "🌀", cooldown: 11, text: "1.5초간 0.25초마다 주변 165px 70%, 이속 +15%" },
  "quake-hammer": { id: "earth-rift", name: "대지 균열", icon: "⛰️", cooldown: 11, text: "0.3초 뒤 직선 360·폭 120 균열 260%, 일반 적 0.8초 경직" },
  "rock-crusher": { id: "rock-barrage", name: "바위 난타", icon: "🪨", cooldown: 9, text: "커서 주변에 바위 6개(반지름 50, 각 100%), 같은 적 최대 3회" },
  "water-cannon": { id: "tidal-blast", name: "해일 분사", icon: "🌊", cooldown: 12, text: "1.2초 고정 방향 물대포 220%×8, 보스 +15%(대시로 취소)" },
  "frost-sprayer": { id: "glacier-garden", name: "빙하 정원", icon: "❄️", cooldown: 13, text: "커서에 반경 150 냉기 3초(100%×5), 3번 맞은 일반 적 빙결" },
  "toxic-sprayer": { id: "toxic-bloom", name: "독성 개화", icon: "🌺", cooldown: 13, text: "커서에 큰 독꽃 140% + 초당 45%×5초, 보스 받는 피해 +10%" },
  "seed-launcher": { id: "giant-seeds", name: "거대 씨앗 폭격", icon: "🌰", cooldown: 11, text: "커서 주변 씨앗 4개가 0.8초 뒤 폭발(각 85%)" },
  trident: { id: "sea-pierce", name: "해신 관통", icon: "🔱", cooldown: 10, text: "길이 520 관통 300%, 끝 100px은 확정 치명타, 보스 +15%" },
  "chain-harpoon": { id: "anchor-sweep", name: "닻줄 휩쓸기", icon: "⚓", cooldown: 11, text: "닻 180%로 일반 적을 앞으로 모으고 되감기 100%" },
  "thunder-rod": { id: "storm-fishing", name: "폭풍 낚시", icon: "🌩️", cooldown: 10, text: "커서 근처 적에 낙뢰 170% + 연쇄 110%×5" },
  "net-launcher": { id: "great-trawl", name: "대형 저인망", icon: "🕸️", cooldown: 14, text: "커서에 반경 170 그물 4초(일반 −70%·+20%, 보스 −25%·+8%)" },
  longbow: { id: "still-breath", name: "숨결 멈추기", icon: "🎯", cooldown: 12, text: "0.55초 조준 후 무한 관통 380%, 300px 이상 +25%, 정예·보스 방어 50% 무시" },
  "rapid-bow": { id: "arrow-storm", name: "화살비", icon: "🏹", cooldown: 11, text: "커서 반경 135에 2초간 화살 35%×10, 일반 적 둔화" },
  rifle: { id: "ap-shot", name: "철갑 관통탄", icon: "💥", cooldown: 11, text: "340% 6마리 관통(관통마다 −8%), 방어 70% 무시, 보스 +15%" },
  "siege-crossbow": { id: "siege-bolt", name: "공성 폭발촉", icon: "🎆", cooldown: 12, text: "직격 220% + 반경 115 폭발 140%" },
  "twin-blades": { id: "shadow-dance", name: "그림자 난무", icon: "🌑", cooldown: 10, text: "0.9초 무적, 적들을 오가며 160%×6" },
  greatsword: { id: "iron-counter", name: "철벽 반격", icon: "🛡️", cooldown: 12, text: "1.2초 받는 피해 −80%, 맞으면 360° 300% 반격, 안 맞으면 220% 내려치기" },
};

