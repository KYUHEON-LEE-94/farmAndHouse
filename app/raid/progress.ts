/**
 * 성장 후 같은 층 돌파(RAID_FLOOR_30_EXPANSION_AUDIT 3.4절): 층별 기록, 패배 진단, 성장 돌파 판정.
 * 모두 순수 함수라 테스트할 수 있다. 저장은 raid.progress[층] 하나(최고 실패·마지막 실패·첫 클리어)만 둔다.
 */
import type { RaidResult } from "./engine";

export type FloorRecord = {
  cleared: boolean;
  /** 보스 남은 체력 비율(보스 전 사망이면 1), 웨이브 진행(초), 보스 처치 시간 */
  bossHpRatio: number; waveTime: number; bossTime: number | null;
  damageTaken: number; topCause: string | null;
  weaponId: string; evo: string | null; enh: number; armor: [string | null, string | null, string | null];
  at: number;
};
export type FloorProgress = { best?: FloorRecord; lastFail?: FloorRecord; clear?: FloorRecord };

/** 결과 + 장비로 기록 한 줄 */
export function recordOf(result: RaidResult, gear: { weaponId: string; evo: string | null; enh: number; armor: [string | null, string | null, string | null] }, at = Date.now()): FloorRecord {
  const taken = result.log?.taken ?? {}, top = Object.entries(taken).sort((a, b) => b[1] - a[1])[0];
  return {
    cleared: result.cleared, bossHpRatio: result.cleared ? 0 : result.bossHpLeft, waveTime: Math.min(120, result.log?.time ?? 0), bossTime: result.log?.bossTime ?? null,
    damageTaken: Object.values(taken).reduce((t, v) => t + v, 0), topCause: top ? top[0] : null, ...gear, at,
  };
}
/** 실패 기록끼리 더 좋은 쪽(보스를 더 깎았거나, 같으면 웨이브를 더 버팀) */
export const betterFail = (a: FloorRecord | undefined, b: FloorRecord) => !a || b.bossHpRatio < a.bossHpRatio - 0.001 || (Math.abs(b.bossHpRatio - a.bossHpRatio) <= 0.001 && b.waveTime > a.waveTime);

/** 기록을 반영한 새 진행. 클리어는 첫 클리어만 남긴다. */
export function updateProgress(prev: FloorProgress | undefined, rec: FloorRecord): FloorProgress {
  const p = { ...(prev ?? {}) };
  if (rec.cleared) { if (!p.clear) p.clear = rec; }
  else { p.lastFail = rec; if (betterFail(p.best, rec)) p.best = rec; }
  return p;
}

const sameGear = (a: FloorRecord, b: FloorRecord) => a.weaponId === b.weaponId && a.enh === b.enh && a.evo === b.evo && a.armor.join() === b.armor.join();
/** 장비 변화(무기 강화·진화·방어구 부위) 설명. 바뀐 것만. */
export function gearChanges(before: FloorRecord, after: FloorRecord, armorName: (id: string) => string, weaponName: (id: string) => string): string[] {
  const out: string[] = [];
  if (before.weaponId !== after.weaponId) out.push(`무기 ${weaponName(before.weaponId)} → ${weaponName(after.weaponId)} +${after.enh}`);
  else if (before.enh !== after.enh || before.evo !== after.evo) out.push(`무기 +${before.enh} → +${after.enh}`);
  after.armor.forEach((id, i) => { if (id && id !== before.armor[i]) out.push(`${armorName(id)} 착용`); });
  return out;
}
/**
 * 성장 돌파: 이 층에서 실패한 적이 있고(마지막 실패), 그때와 장비가 달라진 상태로 첫 클리어. 장비가 같으면 일반 클리어(조작으로 돌파).
 */
export function breakthrough(prev: FloorProgress | undefined, rec: FloorRecord) {
  if (!rec.cleared || prev?.clear || !prev?.lastFail) return null;
  if (sameGear(prev.lastFail, rec)) return null;
  return { before: prev.best ?? prev.lastFail, now: rec };
}

/** 층별 권장 강화(3절 표·쉬움 구간은 기존 권장) */
export function recommendedEnh(floor: number) {
  if (floor <= 5) return 3; if (floor <= 10) return 10; if (floor <= 15) return 12; if (floor <= 20) return 13;
  if (floor <= 22) return 14; if (floor <= 25) return 15; if (floor <= 27) return 16; if (floor <= 29) return 17;
  // 31~40층(RAID_FLOOR_40_EXPANSION_AUDIT 7절)
  if (floor <= 32) return 18; if (floor <= 34) return 19; if (floor <= 36) return 20; if (floor <= 38) return 21; return 22;
}

const TERRAIN = ["꽃가루 장판", "감전", "전도성 웅덩이", "낙엽 회오리", "빙판", "핵 방전", "균열 흔적", "포자 구름", "봄 덩굴"];
const RANGED = ["투사체", "보스 탄막"];
export type Diagnosis = { title: string; hint: string };
/**
 * 패배 진단(3.4.1): 실제 기록으로 최대 두 가지만. 권장 강화에 이미 닿았으면 강화보다 패턴·각성·음식부터.
 * monsterNames: 접촉 피해 원인을 구분하기 위한 이 층 몬스터·보스 이름
 */
export function diagnose(result: RaidResult, enh: number, bossTargetSec: number, monsterNames: string[]): { lines: Diagnosis[]; retryFirst: boolean } {
  if (result.cleared || result.abandoned) return { lines: [], retryFirst: false };
  const lines: Diagnosis[] = [], log = result.log, rec = recommendedEnh(result.floor), atRec = enh >= rec;
  const taken = Object.entries(log?.taken ?? {}).sort((a, b) => b[1] - a[1]);
  const total = taken.reduce((t, [, v]) => t + v, 0) || 1;
  const share = (pred: (k: string) => boolean) => taken.filter(([k]) => pred(k)).reduce((t, [, v]) => t + v, 0) / total;
  const near = result.bossHpLeft <= 0.25;
  if (near) lines.push({ title: "거의 다 왔어요", hint: `보스 체력 ${Math.round(result.bossHpLeft * 100)}% 남음. 바로 다시 도전해 보세요${atRec ? "" : " (강화는 선택)"}` });
  const bossSec = log?.bossTime ?? null;
  if (!near && result.bossHpLeft >= 1) lines.push({ title: "화력이 조금 부족해요", hint: atRec ? "공격형 각성 카드·공격 음식을 먼저 써 보세요" : `무기 +${rec}(권장)까지 강화하면 처치 속도가 빨라져요` });
  else if (!near && bossSec !== null && bossSec > bossTargetSec) lines.push({ title: "보스 화력이 부족해요", hint: atRec ? "보스 피해 각성·특수 공격을 보스에 맞춰 써 보세요" : `보스전이 ${bossSec}초 걸렸어요. 무기 +${rec}(권장) 강화가 가장 효과적이에요` });
  const contact = share(k => monsterNames.includes(k)), ranged = share(k => RANGED.includes(k)), terrain = share(k => TERRAIN.includes(k));
  const top = Math.max(contact, ranged, terrain);
  if (lines.length < 2 && top >= 0.35) {
    if (top === contact) lines.push({ title: "근접 공격을 많이 맞았어요", hint: "몸통 방어구(체력·보호막)를 올리거나 돌진 예고선 옆으로 빠져 보세요" });
    else if (top === ranged) lines.push({ title: "원거리 공격 대응이 필요해요", hint: "다리 방어구(이동·회피)로 탄막 사이를 빠져나가고, 원거리 적을 먼저 처리하세요" });
    else lines.push({ title: "지형 피해가 컸어요", hint: "다리 방어구의 바닥 피해 감소, 장판 밖 안전 경로를 이용하세요" });
  }
  if (lines.length < 2 && taken[0] && !monsterNames.includes(taken[0][0]) && !RANGED.includes(taken[0][0]) && !TERRAIN.includes(taken[0][0])) lines.push({ title: `「${taken[0][0]}」에 가장 많이 맞았어요`, hint: "붉은 예고가 차오르는 동안 예고 밖으로 이동하거나 회피(대시)하세요" });
  return { lines: lines.slice(0, 2), retryFirst: near };
}
