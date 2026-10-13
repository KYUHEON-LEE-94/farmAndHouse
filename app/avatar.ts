export const DEFAULT_AVATAR = "avatar-blackcat.svg";
/** 예전 기본 아바타(픽셀 고양이). 아바타 고르기에서 계속 선택할 수 있다. */
export const PIXEL_CAT_AVATAR = "avatar-cat.png";
export const AVATAR_STORAGE_KEY = "wolru-farm-avatar";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 256;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type StoredAvatar = { src: string; pixelated: boolean; preset?: string };

/**
 * 업로드한 아바타를 검사하고 저장용 데이터 URL로 만든다.
 * - PNG만 허용(확장자·MIME·파일 서명 모두 확인)
 * - 긴 변 256px로 축소해 저장 용량을 줄인다
 * - 투명 픽셀이 하나도 없으면 transparent=false로 알려준다
 */
export async function readAvatarFile(file: File): Promise<{ src: string; transparent: boolean }> {
  if (file.type !== "image/png" || !file.name.toLowerCase().endsWith(".png")) throw new Error("PNG 파일만 올릴 수 있어요.");
  if (file.size > MAX_BYTES) throw new Error("5MB 이하의 PNG만 올릴 수 있어요.");
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!PNG_SIGNATURE.every((byte, index) => header[index] === byte)) throw new Error("PNG 형식이 아닌 파일이에요.");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("이미지를 읽을 수 없어요.")); img.src = url; });
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = false;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 250) { transparent = true; break; }
    return { src: canvas.toDataURL("image/png"), transparent };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 바로 고를 수 있는 기본 캐릭터. 이모지를 투명 배경 PNG로 그려서 쓴다. */
export const PRESET_AVATARS = [
  { id: "farmer", name: "농부", emoji: "🧑‍🌾" },
  { id: "office", name: "직장인", emoji: "🧑‍💼" },
  { id: "coder", name: "개발자", emoji: "🧑‍💻" },
  { id: "dog", name: "강아지", emoji: "🐶" },
  { id: "rabbit", name: "토끼", emoji: "🐰" },
  { id: "bear", name: "곰", emoji: "🐻" },
  { id: "fox", name: "여우", emoji: "🦊" },
  { id: "panda", name: "판다", emoji: "🐼" },
  { id: "frog", name: "개구리", emoji: "🐸" },
  { id: "penguin", name: "펭귄", emoji: "🐧" },
  { id: "ghost", name: "유령", emoji: "👻" },
  { id: "robot", name: "로봇", emoji: "🤖" },
];

export function emojiAvatar(emoji: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.font = '200px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(emoji, 128, 140);
  return canvas.toDataURL("image/png");
}
