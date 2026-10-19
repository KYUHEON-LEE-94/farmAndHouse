/**
 * 상단 메뉴(LIFE_CONTENT_EXPANSION_SPEC 2.2): 탭을 생활 / 전투 / 집·마을 3개 그룹으로 묶는다.
 * PC는 그룹 이름 아래에 탭을 한 줄로 늘어놓고, 모바일은 그룹 버튼 3개만 보여 주고 누르면 하단 시트로 탭을 고른다.
 */
import { useEffect, useState } from "react";

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
  const pick = (id: T) => { setSheet(null); onSelect(id); };
  const label = (entry: MenuEntry<T>) => <>{entry.label}{entry.badge ? ` ${entry.badge}` : ""}</>;
  return <div className="main-menu">
    <nav className="tabs grouped" aria-label="게임 공간">
      {groups.map(group => <div key={group.id} className={`tab-group ${current?.group === group.id ? "current" : ""}`} role="group" aria-label={group.label}>
        <span className="tab-group-label">{group.icon} {group.label}</span>
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
