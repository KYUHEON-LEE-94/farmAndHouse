export const DEFAULT_AVATAR = "avatar-cat.png";
export const AVATAR_STORAGE_KEY = "wolru-farm-avatar";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 256;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type StoredAvatar = { src: string; pixelated: boolean };

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
