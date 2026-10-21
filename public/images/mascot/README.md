# 너굴 이미지 제작 기록

Built-in image_gen 사용. 기존 public/avatar-farmer-cat.png는 그림체 참고용.

## 첫 이미지 — neogul-poses.png
Create one production game character sprite atlas, a perfectly aligned 2 by 2 square grid with FOUR full body poses of the SAME original Korean cozy farm game tanuki/raccoon mascot named Neogul. Use the provided farmer cat image ONLY as reference for art style: warm hand-drawn dark brown outlines, gentle textured shading, charming chibi proportions, cream and earthy brown palette, polished cute 2D game illustration. Do not copy the cat species. Neogul is a plump brown raccoon dog with rounded ears, distinct dark eye mask, cream muzzle and belly, fluffy tail, tiny forest-green vest and ochre neckerchief. Mischievous teasing but secretly kind. Top LEFT: idle dealer, sly friendly smirk, holding two playing cards, little tilted brown dealer hat. Top RIGHT: laughing teasingly with eyes squeezed shut, one paw pointing outward, same hat and outfit. Bottom LEFT: sulking after losing, puffed cheeks and folded arms, same hat and outfit. Bottom RIGHT: reluctantly generous, bashful face looking aside, offering a small coin pouch, same hat and outfit. Exactly four figures, each centered within its own equal square quadrant, fully contained with 12 percent padding on every side of its cell, same scale and baseline across cells. No figure overlaps cells. Transparent background with real alpha, no grid, no text, no labels, no frames, no emoji, no watermarks. Crisp enough to read at 90px. Output square atlas.

## 추가 이미지 — neogul-tease.png
Create ONE separate full-body character sprite on a square transparent canvas. Use the reference atlas to preserve exactly the same Neogul raccoon mascot identity, warm brown hand-drawn outlines and softly textured cozy farm game style, brown fur, black eye patches, cream muzzle/belly, green vest over cream shirt, yellow neckerchief, tilted brown hat with green band and leaf, fluffy striped tail. New pose: playfully sticking his small pink tongue out very clearly (Korean 메롱), winking one eye, pulling the lower eyelid very gently with one paw and other paw on hip. Cheeky lovable teasing expression, not angry. Full body centered with generous 10 percent clear margin all around, feet visible, tail visible. Match scale and silhouette of each single reference pose. Exactly one character, no atlas, no words, no emoji, no labels, no props besides costume, no background. Real transparent alpha.

## 적용
- 도박장 대기: idle
- 플레이어 패배: laugh
- 아깝게 빗나감: tease (별도 이미지)
- 플레이어 승리·잭팟: sulk
- 월루 지원금: help

게임 이미지 경로: public/images/mascot/ (두 PNG).
공통 표시: app/NeogulMascot.tsx, app/neogul.css.
기존 확률, 배당, 지원금 지급 조건은 변경하지 않음.
