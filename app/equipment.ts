/** Cosmetic collection and typed slots; raid equipment is reserved for a later release. */
export const EFFECT_PRICE = 1500;
export const EFFECT_SLOTS = ['farm', 'fish', 'hunt'] as const;
export type EffectSlot = typeof EFFECT_SLOTS[number];
export type EquipmentSlot = EffectSlot | 'weapon' | 'armor';
export type Equipment = Record<EquipmentSlot, string | null>;
export type CosmeticEffect = { id: string; slot: EffectSlot; name: string; icon: string; color: string; motion: 'bloom' | 'ring' | 'star' };
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
