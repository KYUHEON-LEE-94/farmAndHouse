"use client";
import { useState, type CSSProperties, type ReactNode } from 'react';
import { EFFECTS, EFFECT_PRICE, EFFECT_CHANCE, type EffectReward, EFFECT_SLOTS, SLOT_LABELS, effectPool, type EffectSlot, type Equipment } from './equipment';

export function EffectBurst({ id }: { id: string | null }) {
  const effect = EFFECTS.find(item => item.id === id);
  if (!effect) return null;
  return <span aria-hidden="true" className={`cosmetic-burst motion-${effect.motion}`} style={{ '--effect-color': effect.color } as CSSProperties}>
    <span className="cosmetic-ring" />{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--angle': `${index * 45}deg`, '--delay': `${index % 3 * 35}ms` } as CSSProperties}>{effect.icon}</i>)}
  </span>;
}

export function EffectGacha({ owned, money, onDraw, onEquipment, result }: { owned: string[]; money: number; onDraw: (slot: EffectSlot) => void; onEquipment: () => void; result: EffectReward | null }) {
  const [slot, setSlot] = useState<EffectSlot>('farm');
  const pool = effectPool(owned, slot), effect = result?.kind === 'effect' ? result.effect : null;
  return <section className="panel effect-gacha">
    <div className="panel-heading"><div><span className="eyebrow">EFFECT COLLECTION</span><h3>✨ 이펙트 뽑기</h3></div><span>{owned.length} / {EFFECTS.length}</span></div>
    <p className="hint">이펙트 또는 기본 미끼·비료가 나와요. 이펙트는 능력치 변화 없이 영구 소장해요.</p>
    <div className="equipment-tabs" role="group" aria-label="뽑을 이펙트 분야">{EFFECT_SLOTS.map(key => <button key={key} aria-pressed={slot === key} onClick={() => setSlot(key)}>{SLOT_LABELS[key]}</button>)}</div>
    <div className="effect-stage" role="status">{effect ? <><EffectBurst key={effect.id} id={effect.id} /><b>{effect.icon}</b><strong>{effect.name}</strong><small>{SLOT_LABELS[effect.slot]} 이펙트를 얻었어요!</small></> : result && result.kind !== 'effect' ? <><b>{result.icon}</b><strong>{result.name} {result.count}개</strong><small>보유 수량에 추가했어요. 다음 행운을 기다려 봐요!</small></> : <><b>✨</b><strong>오늘은 어떤 빛이 찾아올까요?</strong><small>분야를 고르고 뽑아 보세요</small></>}</div>
    <button className="gacha-button" disabled={!pool.length || money < EFFECT_PRICE} onClick={() => onDraw(slot)}>{pool.length ? `${SLOT_LABELS[slot]} 뽑기 · ${EFFECT_PRICE.toLocaleString()}원` : '🏆 이 분야를 모두 모았어요'}</button>
    <p className="hint">이펙트 {EFFECT_CHANCE * 100}% · 지렁이 10개 37.5% · 퇴비 10개 37.5%<br />{pool.length ? `미보유 이펙트 ${pool.length}종 중 균등 추첨 (각 ${(EFFECT_CHANCE * 100 / pool.length).toFixed(2)}%) · 이펙트 중복 없음` : '이 분야를 모두 모아 뽑기가 종료됐어요.'}</p>
    <div className="effect-pool">{EFFECTS.filter(item => item.slot === slot).map(item => <span key={item.id}>{item.icon} {item.name} {owned.includes(item.id) ? '✓ 보유' : ''}</span>)}</div>
    <button className="ghost-button" onClick={onEquipment}>🎒 장비창 열기</button>
  </section>;
}

export function EquipmentPanel({ owned, equipment, onEquip, onShop, raid }: { owned: string[]; equipment: Equipment; onEquip: (slot: EffectSlot, id: string | null) => void; onShop: () => void; /** 토벌 장비(무기·방어구·전투펫). 토벌이 열리면 들어간다. */ raid?: ReactNode }) {
  const [slot, setSlot] = useState<EffectSlot>('farm');
  const [preview, setPreview] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  // 장비창 구분: 토벌 장비(기본) | 이펙트. 토벌이 없으면 이펙트만.
  const [view, setView] = useState<'raid' | 'effect'>(raid ? 'raid' : 'effect');
  const shown = raid ? view : 'effect';
  const selected = EFFECTS.find(item => item.id === preview && item.slot === slot) ?? EFFECTS.find(item => item.id === equipment[slot]);
  const triggers = { farm: '작물을 수확할 때', fish: '물고기 포획에 성공할 때', hunt: '동물을 명중했을 때' };
  return <section className="panel equipment-panel">
    <div className="panel-heading"><div><span className="eyebrow">MY EQUIPMENT</span><h3>🎒 장비창</h3></div>
      {raid && <div className="shop-tabs equipment-views" role="tablist">{([['raid', '⚔️ 토벌 장비'], ['effect', '✨ 이펙트']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={shown === id} className={shown === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>)}</div>}</div>
    {shown === 'raid' && <div className="equipment-raid"><p className="hint">토벌탑에 들고 갈 무기·방어구·전투펫이에요. 강화와 진화는 토벌탑의 ⚒️ 대장간에서 해요.</p>{raid}</div>}
    {shown === 'effect' && <>
    <p className="hint">농사·낚시·사냥 분야마다 이펙트를 하나씩 장착해요. 소모되지 않고 능력치는 바뀌지 않아요. <button className="ghost-button small" onClick={onShop}>✨ 이펙트 뽑으러 가기</button></p>
    <div className="equipment-layout"><aside className="equipment-slots">
      {EFFECT_SLOTS.map(key => <button key={key} aria-pressed={slot === key} onClick={() => { setSlot(key); setPreview(null); }}><b>{SLOT_LABELS[key]} 이펙트</b><span>{EFFECTS.find(item => item.id === equipment[key])?.name ?? '기본 연출'}</span></button>)}
      {!raid && <><div className="equipment-reserved"><b>⚔️ 토벌 무기</b><span>토벌 업데이트에서 열려요</span></div><div className="equipment-reserved"><b>🛡️ 토벌 방어구</b><span>토벌 업데이트에서 열려요</span></div></>}
    </aside><div>
      <div className="effect-stage"><EffectBurst key={`${selected?.id}-${replay}`} id={selected?.id ?? null} /><b>{selected?.icon ?? '🌿'}</b><strong>{selected?.name ?? '기본 연출'}</strong><small>{triggers[slot]}</small></div>
      <div className="equipment-actions"><button className="ghost-button" onClick={() => setReplay(n => n + 1)} disabled={!selected}>↻ 미리보기</button><button className="ghost-button" disabled={!equipment[slot]} onClick={() => { onEquip(slot, null); setPreview(null); }}>장착 해제</button></div>
      <div className="effect-cards">{EFFECTS.filter(item => item.slot === slot).map(item => { const has = owned.includes(item.id), active = equipment[slot] === item.id; return <article key={item.id} className={active ? 'equipped' : ''}><span>{item.icon}</span><b>{item.name}</b><small>{active ? '✓ 장착 중' : has ? '보유' : '미보유'}</small><button className="ghost-button" onClick={() => { setPreview(item.id); setReplay(n => n + 1); }}>미리보기</button><button className="save-button" disabled={!has || active} onClick={() => { onEquip(slot, item.id); setPreview(item.id); }}>{active ? '장착 중' : has ? '장착' : '가챠로 획득'}</button></article>; })}</div>
    </div></div></>}
  </section>;
}
