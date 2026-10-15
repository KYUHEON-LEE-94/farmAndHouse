/**
 * 월루농가 계정 API (Vercel Function + Upstash Redis REST).
 * 개인정보는 받지 않는다. 아이디, 비밀번호 해시(PBKDF2), 게임 저장 데이터만 보관한다.
 *
 * POST /api/account
 *   { action: "register", id, password, save? }  → { id, token, updatedAt }
 *   { action: "login", id, password }            → { id, token, save, updatedAt }
 *   { action: "load" | "save" | "logout", token, save? }
 *
 * 저장소: Vercel 대시보드 > Storage에서 Upstash Redis를 연결하면 들어오는
 * KV_REST_API_URL / KV_REST_API_TOKEN(또는 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)을 쓴다.
 */
const env = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const REDIS_URL = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;

const ID_PATTERN = /^[a-z0-9_]{3,20}$/;
const MAX_SAVE = 900_000;
const TOKEN_DAYS = 60;
const ITERATIONS = 100_000;
const MAX_FAILS = 10;

type Account = { salt: string; hash: string; iterations: number; save: string | null; createdAt: number; updatedAt: number };
type Body = { action?: string; id?: unknown; password?: unknown; token?: unknown; save?: unknown; baseAt?: unknown; force?: unknown };

// Windows 위젯(file://)에서도 부를 수 있게 CORS를 연다. 인증은 토큰으로 한다.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });

async function redis<T = unknown>(...command: (string | number)[]): Promise<T> {
  const response = await fetch(REDIS_URL!, { method: "POST", headers: { Authorization: `Bearer ${REDIS_TOKEN}` }, body: JSON.stringify(command) });
  const data = (await response.json()) as { result?: T; error?: string };
  if (!response.ok || data.error) throw new Error(data.error ?? `redis ${response.status}`);
  return data.result as T;
}

const toHex = (buffer: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, "0")).join("");
const randomHex = (bytes: number) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));

async function hashPassword(password: string, salt: string, iterations: number) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return toHex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations }, key, 256));
}

/** 비교 시간이 내용에 따라 달라지지 않는 문자열 비교. */
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function issueToken(id: string) {
  const token = randomHex(24);
  await redis("SET", `wolru:token:${token}`, id, "EX", TOKEN_DAYS * 86400);
  return token;
}

async function loadAccount(id: string) {
  const raw = await redis<string | null>("GET", `wolru:user:${id}`);
  return raw ? (JSON.parse(raw) as Account) : null;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  if (!REDIS_URL || !REDIS_TOKEN) return json({ error: "계정 저장소가 아직 연결되지 않았어요. 조금만 기다려 주세요." }, 503);
  let body: Body;
  try { body = (await request.json()) as Body; } catch { return json({ error: "잘못된 요청이에요." }, 400); }
  const id = String(body.id ?? "").trim().toLowerCase(), password = String(body.password ?? "");
  const save = typeof body.save === "string" ? body.save : null;
  if (save && save.length > MAX_SAVE) return json({ error: "저장 데이터가 너무 커요. 게임을 새로고침한 뒤 다시 저장해 보세요." }, 413);

  try {
    switch (body.action) {
      case "register": {
        if (!ID_PATTERN.test(id)) return json({ error: "아이디는 영어 소문자·숫자·밑줄(_) 3~20자로 지어 주세요." }, 400);
        if (password.length < 4 || password.length > 64) return json({ error: "비밀번호는 4~64자로 정해 주세요." }, 400);
        const salt = randomHex(16), now = Date.now();
        const account: Account = { salt, hash: await hashPassword(password, salt, ITERATIONS), iterations: ITERATIONS, save, createdAt: now, updatedAt: now };
        const created = await redis<string | null>("SET", `wolru:user:${id}`, JSON.stringify(account), "NX");
        if (created !== "OK") return json({ error: "이미 있는 아이디예요. 다른 아이디를 골라 주세요." }, 409);
        return json({ id, token: await issueToken(id), updatedAt: now });
      }
      case "login": {
        if (!ID_PATTERN.test(id)) return json({ error: "아이디나 비밀번호가 맞지 않아요." }, 401);
        const failKey = `wolru:fail:${id}`;
        if (Number((await redis<string | null>("GET", failKey)) ?? 0) >= MAX_FAILS) return json({ error: "비밀번호를 너무 많이 틀렸어요. 10분 뒤 다시 해 주세요." }, 429);
        const account = await loadAccount(id);
        if (!account || !sameText(await hashPassword(password, account.salt, account.iterations), account.hash)) {
          await redis("INCR", failKey);
          await redis("EXPIRE", failKey, 600);
          return json({ error: "아이디나 비밀번호가 맞지 않아요." }, 401);
        }
        await redis("DEL", failKey);
        return json({ id, token: await issueToken(id), save: account.save, updatedAt: account.updatedAt });
      }
      case "load":
      case "save":
      case "logout": {
        const token = String(body.token ?? "");
        const owner = /^[0-9a-f]{48}$/.test(token) ? await redis<string | null>("GET", `wolru:token:${token}`) : null;
        if (!owner) return json({ error: "로그인이 만료됐어요. 다시 로그인해 주세요." }, 401);
        if (body.action === "logout") { await redis("DEL", `wolru:token:${token}`); return json({ ok: true }); }
        const account = await loadAccount(owner);
        if (!account) return json({ error: "계정을 찾을 수 없어요." }, 404);
        if (body.action === "load") return json({ id: owner, save: account.save, updatedAt: account.updatedAt });
        if (!save) return json({ error: "저장할 데이터가 없어요." }, 400);
        // 덮어쓰기 방지: 이 기기가 알고 있는 계정 저장(baseAt)보다 더 새 저장이 있으면(다른 기기에서 진행) 거절하고 그 저장을 돌려준다.
        // baseAt이 없는 예전 클라이언트, force(사용자가 덮어쓰기를 직접 고름)는 검사하지 않는다.
        const baseAt = Number(body.baseAt) || 0;
        if (baseAt && !body.force && account.updatedAt && account.updatedAt > baseAt && account.save !== save)
          return json({ error: "다른 기기에서 더 최근에 저장한 게임이 있어요.", save: account.save, updatedAt: account.updatedAt }, 409);
        account.save = save;
        account.updatedAt = Date.now();
        await redis("SET", `wolru:user:${owner}`, JSON.stringify(account));
        return json({ ok: true, updatedAt: account.updatedAt });
      }
      default:
        return json({ error: "알 수 없는 요청이에요." }, 400);
    }
  } catch {
    return json({ error: "서버 저장소에 문제가 생겼어요. 잠시 뒤 다시 해 주세요." }, 502);
  }
}
