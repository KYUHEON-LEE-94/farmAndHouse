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
      { id: "water-cannon", name: "고압 물대포", note: "직선 관통, 밀어내기, 보스 피해 +15%", s10: S("beam", 8.5, 260, 0, 0.15, { width: 22, knockback: 0, fx: { knockTick: 15, boss: 0.15, selfSlow: 0.25 } }), s15: S("beam", 13, 300, 0, 0.15, { width: 26, knockback: 0, fx: { knockTick: 15, boss: 0.15, selfSlow: 0.25 } }) },
      { id: "frost-sprayer", name: "빙결 분사기", note: "같은 적을 2초 맞히면 1초 빙결, 빙결된 적 받는 피해 +20%", s10: S("channel", 5, 130, 60, 0.15, { knockback: 0, fx: { slow: 0.15, freeze: true, selfSlow: 0.25 } }), s15: S("channel", 7.5, 140, 70, 0.15, { knockback: 0, fx: { slow: 0.15, freeze: true, selfSlow: 0.25 } }) },
    ] },
  { id: "raid-spreader", name: "비료 살포기", icon: "🧴", difficulty: "보통", style: "커서 위치로 비료 폭탄 투척", craft: { lifeMat: "farm-fiber" },
    s0: S("lob", 15, 230, 0, 0.95, { radius: 45, knockback: 20 }), s5: S("lob", 22, 240, 0, 0.92, { radius: 48, knockback: 20 }), s10: S("lob", 34, 250, 0, 0.85, { radius: 52, knockback: 20 }),
    evos: [
      { id: "toxic-sprayer", name: "독성 분사기", note: "폭발 자리에 3초 독 장판(초당 30%)", s10: S("lob", 26, 250, 0, 0.85, { radius: 52, knockback: 20, fx: { poison: true } }), s15: S("lob", 40, 270, 0, 0.78, { radius: 58, knockback: 20, fx: { poison: true } }) },
      { id: "seed-launcher", name: "폭발 씨앗 발사기", note: "씨앗 3개가 퍼져 각각 폭발", s10: S("lob", 20, 240, 0, 1.0, { radius: 38, knockback: 20, fx: { seeds: 3 } }), s15: S("lob", 30, 260, 0, 0.92, { radius: 42, knockback: 20, fx: { seeds: 3 } }) },
    ] },
  { id: "raid-harpoon", name: "낚시 작살", icon: "🔱", difficulty: "어려움", style: "직선 관통 찌르기", craft: { lifeMat: "fish-oil" },
    s0: S("thrust", 14, 130, 0, 0.7, { width: 24, knockback: 20 }), s5: S("thrust", 21, 138, 0, 0.66, { width: 26, knockback: 20 }), s10: S("thrust", 31, 148, 0, 0.62, { width: 28, knockback: 20 }),
    evos: [
      { id: "trident", name: "삼지창", note: "끝 30px 적중 시 치명타 +15%, 보스 피해 +15%", s10: S("thrust", 40, 155, 0, 0.66, { width: 30, knockback: 20, fx: { tip: true, boss: 0.15 } }), s15: S("thrust", 64, 170, 0, 0.6, { width: 34, knockback: 20, fx: { tip: true, boss: 0.15 } }) },
      { id: "chain-harpoon", name: "사슬 작살", note: "처음 맞은 일반 적을 끌어오고 주변 40px에 50%", s10: S("thrust", 24, 220, 0, 0.7, { width: 22, knockback: 0, fx: { pullSplash: true } }), s15: S("thrust", 38, 250, 0, 0.62, { width: 24, knockback: 0, fx: { pullSplash: true } }) },
    ] },
  { id: "raid-rod", name: "낚싯대", icon: "🎣", difficulty: "보통", style: "긴 사거리로 던져 끌어오기", craft: { lifeMat: "fish-oil" },
    s0: S("hook", 12, 170, 0, 0.68, { width: 16, knockback: 0, fx: { pull: 30 } }), s5: S("hook", 18, 180, 0, 0.64, { width: 16, knockback: 0, fx: { pull: 30 } }), s10: S("hook", 27, 195, 0, 0.6, { width: 16, knockback: 0, fx: { pull: 30 } }),
    evos: [
      { id: "thunder-rod", name: "번개 낚싯대", note: "2마리에게 번개 연쇄(각 50%), 감전된 보스 받는 피해 +10%", s10: S("hook", 30, 210, 0, 0.62, { width: 16, knockback: 0, fx: { pull: 30, chain: true } }), s15: S("hook", 48, 230, 0, 0.56, { width: 16, knockback: 0, fx: { pull: 30, chain: true } }) },
      { id: "net-launcher", name: "포획 그물 발사기", note: "반지름 70 그물 2초(이속 −50%, 받는 피해 +15%, 보스 +8%)", s10: S("hook", 18, 200, 0, 0.7, { width: 16, knockback: 0, fx: { pull: 30, net: true } }), s15: S("hook", 28, 220, 0, 0.64, { width: 16, knockback: 0, fx: { pull: 30, net: true } }) },
    ] },
  { id: "raid-bow", name: "사냥 활", icon: "🏹", difficulty: "쉬움", style: "원거리 화살", craft: { lifeMat: "tanned-leather" },
    s0: S("arrow", 10, 420, 0, 0.55, { speed: 600, knockback: 10 }), s5: S("arrow", 15, 440, 0, 0.52, { speed: 600, knockback: 10 }), s10: S("arrow", 22, 460, 0, 0.48, { speed: 600, knockback: 10 }),
    evos: [
      { id: "longbow", name: "저격 장궁", note: "2마리 관통, 250px 이상 피해 +25%, 정예·보스 치명타 +20%", s10: S("arrow", 48, 600, 0, 1.0, { speed: 750, knockback: 20, fx: { pierce: 2, far: true, eliteCrit: 0.2 } }), s15: S("arrow", 78, 650, 0, 0.92, { speed: 750, knockback: 20, fx: { pierce: 2, far: true, eliteCrit: 0.2 } }) },
      { id: "rapid-bow", name: "연사궁", note: "세 발마다 3갈래 화살(추가 화살 55%)", s10: S("arrow", 11, 420, 0, 0.24, { speed: 650, knockback: 5, fx: { triple: true } }), s15: S("arrow", 17, 440, 0, 0.21, { speed: 650, knockback: 5, fx: { triple: true } }) },
    ] },
  { id: "raid-shotgun", name: "엽총", icon: "🔫", difficulty: "보통", style: "근거리 산탄 5발", craft: { lifeMat: "tanned-leather" },
    s0: S("spread", 4.2, 200, 20, 1.05, { pellets: 5, speed: 900, knockback: 8 }), s5: S("spread", 6.3, 210, 20, 1.0, { pellets: 5, speed: 900, knockback: 8 }), s10: S("spread", 9.5, 220, 22, 0.95, { pellets: 5, speed: 900, knockback: 8 }),
    evos: [
      { id: "rifle", name: "소총", note: "한 발 직선 관통, 보스 피해 +15%", s10: S("bullet", 40, 400, 0, 0.85, { speed: 1100, knockback: 15, fx: { pierce: 1, boss: 0.15 } }), s15: S("bullet", 64, 450, 0, 0.78, { speed: 1100, knockback: 15, fx: { pierce: 2, boss: 0.15 } }) },
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
/** 무기 수치: 진화했으면 진화 +10~+15, 아니면 +0~+10. */
export function raidWeaponStats(weaponId: string, enhancement: number, evolution: string | null): WeaponStats {
  const w = weaponDef(weaponId), evo = w.evos.find(e => e.id === evolution);
  if (evo && enhancement >= 10) return lerp(evo.s10, evo.s15, Math.min(5, enhancement - 10) / 5);
  const e = Math.max(0, Math.min(10, enhancement));
  if (w.table) return w.table[e];
  return e <= 5 ? lerp(w.s0, w.s5, e / 5) : lerp(w.s5, w.s10, (e - 5) / 5);
}
/** 단일 대상 초당 피해(표시용). */
export function dps(st: WeaponStats) { return Math.round((st.damage * (st.pellets ?? 1) * (st.fx?.double ? 2 : 1)) / st.interval); }
/** 다른 무기 제작(48.3 초안): 5층 첫 클리어 후, 5,000골드 + 생활 장인의 핵 2 + 무기별 생활 재료 3. */
export const WEAPON_CRAFT = { gold: 5000, core: 2, mat: 3, needFloor: 5 };
