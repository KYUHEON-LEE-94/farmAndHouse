/**
 * 상단 메뉴(LIFE_CONTENT_EXPANSION_SPEC 2.2): 탭을 생활 / 전투 / 집·마을 3개 그룹으로 묶는다.
 * PC는 2단 메뉴: 위에는 그룹 3개만, 아래 줄에는 지금 그룹의 탭만 보인다. 그룹을 누르면 그 그룹에서 마지막으로 보던 탭으로 간다.
 * 모바일은 그룹 버튼 3개만 보여 주고 누르면 하단 시트로 탭을 고른다.
 */
import { useEffect, useRef, useState } from "react";

export type MenuGroup = "life" | "battle" | "home";
export type MenuEntry<T extends string> = { id: T; label: string; group: MenuGroup; badge?: string };

export const MENU_GROUPS: { id: MenuGroup; label: string; icon: string }[] = [
  { id: "life", label: "생활", icon: "🌾" },
  { id: "battle", label: "전투", icon: "⚔️" },
  { id: "home", label: "집·마을", icon: "🏡" },
];

export function MainMenu<T extends string>({ entries, active, onSelect }: { entries: MenuEntry<T>[]; active: T; onSelect: (id: T) => void }) {
  const [sheet, setSheet] = useState<MenuGroup | null>(null);
  const groups = MENU_GROUPS.filter(group => entries.some(entry => entry.group === group.id));
  const current = entries.find(entry => entry.id === active);
  // 시트가 열려 있으면 Esc로 닫는다.
  useEffect(() => {
    if (!sheet) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSheet(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);
  // 그룹별로 마지막에 본 탭(그룹 버튼을 누르면 여기로 간다)
  const lastInGroup = useRef<Partial<Record<MenuGroup, T>>>({});
  useEffect(() => { if (current) lastInGroup.current[current.group] = current.id; }, [current]);
  const pick = (id: T) => { setSheet(null); onSelect(id); };
  const goGroup = (group: MenuGroup) => {
    const members = entries.filter(entry => entry.group === group), last = lastInGroup.current[group];
    const target = members.find(entry => entry.id === last) ?? members[0];
    if (target) pick(target.id);
  };
  const label = (entry: MenuEntry<T>) => <>{entry.label}{entry.badge ? ` ${entry.badge}` : ""}</>;
  return <div className="main-menu">
    <nav className="tabs two-level" aria-label="게임 공간">
      <div className="tab-groups">{groups.map(group => { const members = entries.filter(entry => entry.group === group.id), here = current?.group === group.id, badge = members.some(entry => entry.badge);
        return <button key={group.id} className={here ? "active" : ""} aria-current={here ? "true" : undefined} onClick={() => goGroup(group.id)}>
          <b>{group.icon} {group.label}{badge && <i className="tab-dot" aria-label="새 소식" />}</b>
          <small>{members.map(entry => entry.label.replace(/^\S+\s/, "")).join(" · ")}</small>
        </button>; })}</div>
      {groups.map(group => <div key={group.id} className="tab-row" role="group" aria-label={`${group.label} 메뉴`} hidden={current?.group !== group.id}>
        {entries.filter(entry => entry.group === group.id).map(entry => <button key={entry.id} className={active === entry.id ? "active" : ""} aria-current={active === entry.id ? "page" : undefined} onClick={() => pick(entry.id)}>{label(entry)}</button>)}
      </div>)}
    </nav>
    <nav className="tabs-mobile" aria-label="게임 공간">
      {groups.map(group => { const here = current?.group === group.id, badge = entries.some(entry => entry.group === group.id && entry.badge);
        return <button key={group.id} className={here ? "active" : ""} aria-haspopup="dialog" aria-expanded={sheet === group.id} onClick={() => setSheet(open => (open === group.id ? null : group.id))}>
          <b>{group.icon} {group.label}{badge && <i className="tab-dot" aria-label="새 소식" />}</b><small>{here && current ? current.label : "열기"}</small></button>; })}
    </nav>
    {sheet && <div className="menu-sheet-layer">
      <button className="menu-sheet-backdrop" aria-label="메뉴 닫기" onClick={() => setSheet(null)} />
      <section className="menu-sheet" role="dialog" aria-modal="true" aria-label={`${MENU_GROUPS.find(group => group.id === sheet)?.label} 메뉴`}>
        <div className="menu-sheet-handle" aria-hidden="true" />
        <b className="menu-sheet-title">{MENU_GROUPS.find(group => group.id === sheet)?.icon} {MENU_GROUPS.find(group => group.id === sheet)?.label}</b>
        <div className="menu-sheet-grid">{entries.filter(entry => entry.group === sheet).map(entry => <button key={entry.id} className={active === entry.id ? "active" : ""} aria-current={active === entry.id ? "page" : undefined} onClick={() => pick(entry.id)}>{label(entry)}</button>)}</div>
        <button className="menu-sheet-close" onClick={() => setSheet(null)}>닫기</button>
      </section>
    </div>}
  </div>;
}
