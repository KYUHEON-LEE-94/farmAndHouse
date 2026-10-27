/**
 * 아이템 그림(UI 개편, ITEM_ART_LIST.md). 그림 파일이 준비된 아이템만 ART_READY에 적고, 나머지는 기존 이모지를 그대로 쓴다.
 * 경로: 작물 /images/items/crops/{id}.webp, 가공품 /images/items/goods/{레시피 id}.webp (투명 배경 PNG 256px → webp)
 */
export type ArtKind = "crops" | "goods";

/** 실제로 파일이 있는 그림. 그림을 추가하면 여기에 id를 넣는다(없는 파일을 요청하지 않게). */
const ART_READY: Record<ArtKind, Set<string>> = {
  crops: new Set<string>([]),
  goods: new Set<string>([]),
};

export const artUrl = (kind: ArtKind, id: string) => (ART_READY[kind].has(id) ? `/images/items/${kind}/${id}.webp` : null);

/** 그림이 있으면 그림, 없으면 이모지. size는 px(정사각형). */
export function ItemArt({ kind, id, icon, size = 40, label, className = "" }: { kind: ArtKind; id: string; icon: string; size?: number; label?: string; className?: string }) {
  const url = artUrl(kind, id);
  return url
    ? <span className={`item-art ${className}`} role="img" aria-label={label} style={{ width: size, height: size, backgroundImage: `url("${url}")` }} />
    : <span className={`item-art emoji ${className}`} role="img" aria-label={label} style={{ width: size, height: size, fontSize: Math.round(size * 0.72) }}>{icon}</span>;
}
