/** Cosmetic collection and typed slots; raid equipment is reserved for a later release. */
export const EFFECT_PRICE = 1500;
export const EFFECT_SLOTS = ['farm', 'fish', 'hunt'] as const;
export type EffectSlot = typeof EFFECT_SLOTS[number];
export type EquipmentSlot = EffectSlot | 'weapon' | 'armor';
export type Equipment = Record<EquipmentSlot, string | null>;
export type CosmeticEffect = { id: string; slot: EffectSlot; name: string; icon: string; color: string; motion: 'bloom' | 'ring' | 'star' | 'flutter' | 'rise' | 'comet' };
export const SLOT_LABELS: Record<EffectSlot, string> = { farm: '🌱 농사', fish: '🎣 낚시', hunt: '🏹 사냥' };
export const EFFECTS: CosmeticEffect[] = [
  { id: 'farm-petal', slot: 'farm', name: '벚꽃 흩날림', icon: '🌸', color: '#ef8bac', motion: 'bloom' },
  { id: 'farm-leaf', slot: 'farm', name: '초록빛 새싹', icon: '🍃', color: '#62a778', motion: 'ring' },
  { id: 'farm-star', slot: 'farm', name: '황금 수확', icon: '✦', color: '#e2ad35', motion: 'star' },
  { id: 'fish-bubble', slot: 'fish', name: '진주 물방울', icon: '🫧', color: '#58b7d5', motion: 'ring' },
  { id: 'fish-shell', slot: 'fish', name: '바다의 선물', icon: '🐚', color: '#c79ad8', motion: 'bloom' },
  { id: 'fish-star', slot: 'fish', name: '별빛 물결', icon: '✧', color: '#7e9de8', motion: 'star' },
  { id: 'hunt-leaf', slot: 'hunt', name: '숲의 메아리', icon: '🍂', color: '#d29056', motion: 'bloom' },
  { id: 'hunt-flame', slot: 'hunt', name: '불꽃 명중', icon: '🔥', color: '#ee8055', motion: 'star' },
  { id: 'hunt-moon', slot: 'hunt', name: '달빛 충격파', icon: '☾', color: '#a99be8', motion: 'ring' },
  { id: 'farm-butterfly', slot: 'farm', name: '나비의 춤', icon: '🦋', color: '#b88ee0', motion: 'flutter' },
  { id: 'farm-clover', slot: 'farm', name: '행운의 클로버', icon: '🍀', color: '#69bd75', motion: 'rise' },
  { id: 'farm-sun', slot: 'farm', name: '햇살 한 줌', icon: '☀', color: '#edbb4b', motion: 'comet' },
  { id: 'fish-snow', slot: 'fish', name: '서리 물결', icon: '❄', color: '#91cfe9', motion: 'flutter' },
  { id: 'fish-coral', slot: 'fish', name: '산호의 숨결', icon: '🪸', color: '#ef989c', motion: 'rise' },
  { id: 'fish-comet', slot: 'fish', name: '유성 낚시', icon: '🌠', color: '#a3a4ee', motion: 'comet' },
  { id: 'hunt-feather', slot: 'hunt', name: '깃털 바람', icon: '🪶', color: '#c4b8a0', motion: 'flutter' },
  { id: 'hunt-spirit', slot: 'hunt', name: '숲의 혼불', icon: '🔮', color: '#aa8de1', motion: 'rise' },
  { id: 'hunt-thunder', slot: 'hunt', name: '번개 일격', icon: '⚡', color: '#f0cf54', motion: 'comet' },
];
export const emptyEquipment = (): Equipment => ({ farm: null, fish: null, hunt: null, weapon: null, armor: null });
export function effectPool(owned: readonly string[], slot: EffectSlot) { return EFFECTS.filter(effect => effect.slot === slot && !owned.includes(effect.id)); }
export function drawEffect(owned: readonly string[], slot: EffectSlot, random = Math.random) {
  const pool = effectPool(owned, slot);
  return pool.length ? pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))] : null;
}
export function equipEffect(equipment: Equipment, owned: readonly string[], slot: EffectSlot, id: string | null): Equipment {
  if (id !== null && (!owned.includes(id) || !EFFECTS.some(effect => effect.id === id && effect.slot === slot))) return equipment;
  return { ...equipment, [slot]: id };
}
export function restoreEquipment(ownedValue: unknown, equipmentValue: unknown) {
  const owned = Array.isArray(ownedValue) ? EFFECTS.filter(effect => ownedValue.includes(effect.id)).map(effect => effect.id) : [];
  const saved = equipmentValue && typeof equipmentValue === 'object' ? equipmentValue as Record<string, unknown> : {};
  let equipment = emptyEquipment();
  for (const slot of EFFECT_SLOTS) if (typeof saved[slot] === 'string') equipment = equipEffect(equipment, owned, slot, saved[slot]);
  return { owned, equipment };
}

export const EFFECT_CHANCE = 0.25;
export type EffectReward = { kind: 'effect'; effect: CosmeticEffect } | { kind: 'bait' | 'fert'; id: string; name: string; icon: string; count: number };
/** 모두 모은 분야는 판매 중지. 이펙트 당첨 시 미보유 상품 중 균등 추첨. */
export function rollEffectReward(owned: readonly string[], slot: EffectSlot, random = Math.random): EffectReward | null {
  if (!effectPool(owned, slot).length) return null;
  const roll = random();
  if (roll < EFFECT_CHANCE) return { kind: 'effect', effect: drawEffect(owned, slot, random)! };
  return roll < EFFECT_CHANCE + (1 - EFFECT_CHANCE) / 2
    ? { kind: 'bait', id: 'worm', name: '기본 미끼 · 지렁이', icon: '🪱', count: 10 }
    : { kind: 'fert', id: 'compost', name: '기본 비료 · 퇴비', icon: '🍂', count: 10 };
}
