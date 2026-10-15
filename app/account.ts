/**
 * 계정 클라이언트: 아이디·비밀번호로 게임 저장을 서버(Vercel /api/account)에 맡기고 다른 기기에서 불러온다.
 * 개인정보는 받지 않는다. 로그인 정보(아이디·토큰)는 이 기기에만 저장한다.
 */
import { AVATAR_STORAGE_KEY } from "./avatar";

export const SAVE_KEY = "four-seasons-farm";
export const SESSION_KEY = "wolru-farm-account";
/** 로그인 중이면 이 간격(초)마다 바뀐 진행 상황을 계정에 올린다. */
export const CLOUD_SYNC_SECONDS = 60;

export type Session = { id: string; token: string };
type Reply = { id?: string; token?: string; save?: string | null; updatedAt?: number; ok?: boolean; error?: string };

// 배포된 웹에서는 같은 주소의 API를, 위젯(file://)·로컬 개발에서는 배포 주소의 API를 쓴다.
const API = typeof location !== "undefined" && location.hostname.endsWith("vercel.app") ? "/api/account" : "https://farm-and-house.vercel.app/api/account";

export class AccountError extends Error {
  constructor(message: string, public status: number, public reply?: Reply) { super(message); }
}

/** 이 기기가 마지막으로 맞춘 계정 저장 시각(서버 updatedAt). 다른 기기의 더 새 저장을 덮어쓰지 않게 쓴다. */
const CLOUD_BASE_KEY = "wolru-farm-cloud-base";
export function readCloudBase(id: string) {
  try { const raw = JSON.parse(localStorage.getItem(CLOUD_BASE_KEY) ?? "null") as { id: string; at: number } | null; return raw && raw.id === id ? raw.at : 0; } catch { return 0; }
}
export function writeCloudBase(id: string, at: number) {
  try { localStorage.setItem(CLOUD_BASE_KEY, JSON.stringify({ id, at })); } catch { /* 저장 불가 */ }
}

export async function accountCall(body: Record<string, unknown>): Promise<Reply> {
  let response: Response;
  try {
    response = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new AccountError("서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.", 0);
  }
  const data = (await response.json().catch(() => ({}))) as Reply;
  if (!response.ok) throw new AccountError(data.error ?? `서버 오류(${response.status})`, response.status, data);
  return data;
}

export function readSession(): Session | null {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? (JSON.parse(raw) as Session) : null; } catch { return null; }
}
export function writeSession(session: Session | null) {
  try { if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); } catch { /* 저장 불가: 이번 접속에서만 로그인 */ }
}

/** 지금 기기의 게임 저장(농장 + 아바타)을 한 덩어리 문자열로. */
export function packSave() {
  return JSON.stringify({ farm: localStorage.getItem(SAVE_KEY), avatar: localStorage.getItem(AVATAR_STORAGE_KEY) });
}

/** 계정에서 받은 저장을 이 기기에 덮어쓴다. 잘못된 데이터면 false. */
export function unpackSave(save: string) {
  try {
    const data = JSON.parse(save) as { farm?: string | null; avatar?: string | null };
    if (!data.farm) return false;
    JSON.parse(data.farm);
    localStorage.setItem(SAVE_KEY, data.farm);
    if (data.avatar) localStorage.setItem(AVATAR_STORAGE_KEY, data.avatar); else localStorage.removeItem(AVATAR_STORAGE_KEY);
    return true;
  } catch { return false; }
}

/** 저장 데이터에서 보여 줄 요약(보유 자금). */
export function saveSummary(save: string | null | undefined) {
  try { const farm = JSON.parse(JSON.parse(save ?? "").farm); return { money: Number(farm.money) || 0 }; } catch { return null; }
}
