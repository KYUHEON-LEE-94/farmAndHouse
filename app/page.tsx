"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FURNITURE, FLOORS, GACHA_PRICE, GACHA_RARE_CHANCE, HOUSE_SIZES, PET_BUFFS, rollPet, REMODEL_PRICE, SECOND_FLOOR_PRICE, SHAPES, TINTS, WALLPAPERS, WALL_HEIGHT, YARD_SIZES, FurnitureArt, fitsInRoom, fitsInYard, roomFor, wallInfo, type Furniture, type PlacedItem, type Room, type RoomShape, type ShopGroup, type Theme } from "./house";
import { BAITS, FISH, RODS, STARTER_BAIT, rollFish, type Bait, type Fish, type Rod, type Season } from "./fishing";
import type { FishingResult } from "./fishingGame";
import { BUFF_INFO, EVENT_CHANCE, EVENT_CHECK_SECONDS, EVENT_COOLDOWN_MINUTES, buffMultiplier, pickEvent, resolveChoice, type Buff, type Effect, type StoryEvent } from "./events";
import { BET_PRESETS, CHERRY_PAIR, DICE_FACES, MAX_BET, MIN_BET, PARITY_NAME, PAYOUT, SLOT_SYMBOLS, parityOf, rollDice, slotMultiplier, slotReturnRate, spinReel, type Parity, type Roll } from "./casino";
import { AVATAR_STORAGE_KEY, DEFAULT_AVATAR, PRESET_AVATARS, emojiAvatar, readAvatarFile, type StoredAvatar } from "./avatar";
import { BUG_CHANCE, BUG_CHECK_SECONDS, BUG_PENALTY, BUG_SECONDS, CAN_CAPACITY, CANS, CROPS, canArea, type WateringCan, FERTILIZERS, applyFertilizer, plotStatus, type Crop, type Fertilizer, type Plot } from "./farming";

const House3D = lazy(() => import("./house3d"));
const FishingGame = lazy(() => import("./fishingGame"));
const AVATAR_ID = "avatar";

type HarvestFx = { id: number; plotIndex: number; icon: string; amount: number; stars: string };
type FishState = { phase: "idle" | "waiting" | "bite" | "game" | "result"; fish?: Fish; bait?: Bait; text?: string; perfect?: boolean; price?: number; reward?: string };
type ActiveEvent = { event: StoryEvent; result?: Effect };

const SEASONS: Season[] = ["봄", "여름", "가을", "겨울"];
const SEASON_ICON: Record<Season, string> = { 봄: "🌸", 여름: "☀️", 가을: "🍂", 겨울: "❄️" };
// 3D 집 바깥 풍경 색. 마지막은 운영 시간 밖(밤).
const PALETTES = [
  { sky: "#cfe7f2", grass: "#9cc57a", leaf: "#f4b8c8" },
  { sky: "#a9d8f0", grass: "#86b65e", leaf: "#5f9e4f" },
  { sky: "#f2dcc0", grass: "#b9a35c", leaf: "#e0883e" },
  { sky: "#dce8ef", grass: "#e9f0f2", leaf: "#f4f8fa" },
  { sky: "#1f2a40", grass: "#33443a", leaf: "#2f4538" },
];

const initialPlots: Plot[] = Array(8).fill(null);
const BITE_WINDOW_MS = 1300;

function marketPrice(crop: Crop, bucket: number) {
  const seed = [...crop.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const wave = ((seed * 97 + bucket * 53) % 201) / 1000;
  return Math.round(crop.sell * (0.9 + wave));
}

/** 특정 시각이 속한 계절 구간. 같은 날 같은 계절일 때만 같은 값이 나온다. */
function seasonPeriod(time: number, startHour: number, endHour: number) {
  const date = new Date(time);
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const day = date.toDateString();
  if (hour < startHour || hour >= endHour) return `${day}-rest`;
  return `${day}-${Math.min(3, Math.floor(((hour - startHour) / (endHour - startHour)) * 4))}`;
}

function playCoinSound(notes = [880, 1320]) {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx();
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12 + notes.length * 0.1);
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.08);
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.08);
    oscillator.stop(context.currentTime + 0.12 + notes.length * 0.1);
  });
  window.setTimeout(() => context.close(), 400 + notes.length * 150);
}

function playBuzz() {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx(), gain = context.createGain(), oscillator = context.createOscillator();
  oscillator.type = "sawtooth"; oscillator.frequency.setValueAtTime(190, context.currentTime);
  oscillator.frequency.linearRampToValueAtTime(240, context.currentTime + 0.25); oscillator.frequency.linearRampToValueAtTime(180, context.currentTime + 0.5);
  gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
  oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.6);
  window.setTimeout(() => context.close(), 800);
}

function playSplash() {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx(), length = Math.floor(context.sampleRate * 0.35), buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
  filter.type = "bandpass"; filter.frequency.value = 1800; gain.gain.value = 0.12;
  source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.connect(context.destination); source.start();
  window.setTimeout(() => context.close(), 600);
}

function getYoutubeId(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("?")[0];
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || url.pathname.split("/").pop() || "";
  } catch { return ""; }
  return "";
}

type LegacyItem = { id: string; instanceId: string; x: number; y?: number; z?: number; rot?: number; tint?: string; wall?: number; u?: number; h?: number; story?: number };

/** 저장된 가구를 최신 카탈로그와 합친다. 버전 5 미만의 2D 좌표(%)는 3D 방 좌표(m)로 옮긴다. */
function hydrateItem(raw: LegacyItem, version: number, room: Room): PlacedItem | null {
  const base = FURNITURE.find(item => item.id === raw.id);
  if (!base) return null;
  if (version >= 5) return { ...base, instanceId: raw.instanceId, x: raw.x, z: raw.z ?? 0, rot: raw.rot ?? 0, tint: raw.tint, wall: raw.wall, u: raw.u, h: raw.h, story: raw.story };
  let x = raw.x, y = raw.y ?? 50;
  if (version < 3 && x <= 10) { x = 14 + x * 14; y = 20 + y * 28; }
  if (version < 4) y = ((y - 10) / 81) * 100;
  if (base.kind === "wall") return { ...base, instanceId: raw.instanceId, x: 0, z: 0, rot: 0, tint: raw.tint, wall: 0, u: Math.min(0.9, Math.max(0.1, x / 100)), h: base.fixedMount ? base.mount : Math.min(2.2, Math.max(0.6, WALL_HEIGHT * (1 - y / 100))) };
  return { ...base, instanceId: raw.instanceId, x: (x / 100 - 0.5) * room.width * 0.85, z: (Math.min(100, Math.max(0, y)) / 100 - 0.5) * room.depth * 0.85, rot: 0, tint: raw.tint };
}

/** 방이 줄거나 구조가 바뀌어 밖으로 나간 가구를 안쪽으로 당긴다. 마당 소품은 마당 안으로 옮긴다. */
function fitToRoom(item: PlacedItem, room: Room, yardLevel = 1): PlacedItem {
  if (item.yard) {
    if (fitsInYard(room, yardLevel, item.x, item.z)) return item;
    const front = room.depth / 2 + 1.4;
    for (let step = 0; step < 12; step++) { const x = ((step % 2 ? 1 : -1) * Math.ceil(step / 2)) * 1.2; if (fitsInYard(room, yardLevel, x, front)) return { ...item, x, z: front }; }
    return { ...item, x: 0, z: front };
  }
  if (item.kind === "wall") {
    const wall = (item.wall ?? 0) < room.points.length ? item.wall ?? 0 : 0, length = wallInfo(room.points, wall).length, half = (item.size[0] / 2 + 0.05) / length;
    return { ...item, wall, u: Math.min(1 - half, Math.max(half, item.u ?? 0.5)) };
  }
  for (let t = 1; t >= 0; t -= 0.1) if (fitsInRoom(room.points, item.x * t, item.z * t, 0.25)) return { ...item, x: item.x * t, z: item.z * t };
  return { ...item, x: 0, z: 0 };
}

function starterItems(room: Room): PlacedItem[] {
  const make = (id: string, extra: Partial<PlacedItem>) => ({ ...FURNITURE.find(item => item.id === id)!, instanceId: `${id}-starter`, x: 0, z: 0, rot: 0, ...extra });
  return [make("window", { wall: 0, u: 0.65, h: 1.45 }), make("door", { wall: room.points.length - 1, u: 0.5, h: 1.05 })];
}

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds % 60)).padStart(2, "0")}`;

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState<"farm" | "fish" | "home" | "casino">("farm");
  const [bet, setBet] = useState(MIN_BET);
  const [rolling, setRolling] = useState<{ pick: Parity; bet: number } | null>(null);
  const [lastRoll, setLastRoll] = useState<Roll | null>(null);
  const [rollHistory, setRollHistory] = useState<Roll[]>([]);
  const [casinoGame, setCasinoGame] = useState<"parity" | "slot">("parity");
  const [slotReels, setSlotReels] = useState(["🍒", "⭐", "7️⃣"]);
  const [slotSpinning, setSlotSpinning] = useState(0);
  const [lastSlot, setLastSlot] = useState<{ bet: number; payout: number; multiplier: number } | null>(null);
  const [casinoStats, setCasinoStats] = useState({ wins: 0, losses: 0, net: 0, streak: 0, best: 0 });
  const [money, setMoney] = useState(1500);
  const [plots, setPlots] = useState<Plot[]>(initialPlots);
  const [selectedCrop, setSelectedCrop] = useState("potato");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [houseLevel, setHouseLevel] = useState(1);
  const [houseShape, setHouseShape] = useState<RoomShape>("rect");
  const [placed, setPlaced] = useState<PlacedItem[]>(() => starterItems(roomFor(1, "rect")));
  const [warehouse, setWarehouse] = useState<PlacedItem[]>([]);
  const [wallpaper, setWallpaper] = useState("stripe");
  const [floor, setFloor] = useState("oak");
  const [ownedThemes, setOwnedThemes] = useState<string[]>(["wall:stripe", "floor:oak"]);
  const [shopTab, setShopTab] = useState<ShopGroup | "interior">("furniture");
  const [ownedPlots, setOwnedPlots] = useState(8);
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [harvestFx, setHarvestFx] = useState<HarvestFx[]>([]);
  // 손에 든 도구: 맨손(심기·수확), 물뿌리개, 또는 거름 id
  const [tool, setTool] = useState("hand");
  const [canWater, setCanWater] = useState(CAN_CAPACITY);
  const [ownedCans, setOwnedCans] = useState<string[]>(["tin"]);
  const [canId, setCanId] = useState("tin");
  const [hoverArea, setHoverArea] = useState<number[]>([]);
  const plotsRef = useRef<HTMLDivElement>(null);
  const [waterFx, setWaterFx] = useState<{ id: number; plotIndex: number }[]>([]);
  const justWatered = useRef(new Map<number, number>());
  const pendingPours = useRef(0);
  const [gachaResult, setGachaResult] = useState<{ item: Furniture; at: number } | null>(null);
  const [cheer, setCheer] = useState<{ id: string; at: number } | undefined>(undefined);
  const [fishState, setFishState] = useState<FishState>({ phase: "idle" });
  const [fishLog, setFishLog] = useState<Record<string, number>>({});
  const [baits, setBaits] = useState<Record<string, number>>(STARTER_BAIT);
  const [selectedBait, setSelectedBait] = useState("worm");
  const [ownedRods, setOwnedRods] = useState<string[]>(["bamboo"]);
  const [rodId, setRodId] = useState("bamboo");
  const [buffs, setBuffs] = useState<Buff[]>([]);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [lastEventAt, setLastEventAt] = useState(0);
  const [avatar, setAvatar] = useState<StoredAvatar>({ src: DEFAULT_AVATAR, pixelated: true });
  const [avatarPos, setAvatarPos] = useState({ x: 0.6, z: 0.6, story: 0 });
  const [stories, setStories] = useState(1);
  const [viewStory, setViewStory] = useState(0);
  const [yardLevel, setYardLevel] = useState(1);
  const [showAvatar, setShowAvatar] = useState(false);
  const [notice, setNotice] = useState("오늘도 월급은 들어오고, 흙은 정직해요. 씨앗을 심어볼까요?");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicId, setMusicId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fishTimer = useRef<number | undefined>(undefined);
  const castBait = useRef<Bait | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const eventGate = useRef({ ready: false, season: "봄" as Season, lastEventAt: 0, busy: false });
  const bugGate = useRef<{ ready: boolean; plots: Plot[]; dog: boolean }>({ ready: false, plots: [], dog: false });

  useEffect(() => {
    const saved = localStorage.getItem("four-seasons-farm");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const version = data.version ?? 1;
        const level = data.houseLevel ?? 1, shape: RoomShape = data.houseShape ?? "rect", room = roomFor(level, shape);
        const hydrate = (list: LegacyItem[]) => (list ?? []).map(item => hydrateItem(item, version, room)).filter((item): item is PlacedItem => Boolean(item));
        setMoney(data.money ?? 1500); setPlots(data.plots ?? initialPlots); setStartHour(data.startHour ?? 9);
        setEndHour(data.endHour ?? 18); setHouseLevel(level); setHouseShape(shape); setOwnedPlots(data.ownedPlots ?? 8);
        const yard = data.yardLevel ?? 1;
        setStories(data.stories ?? 1); setYardLevel(yard); setCanWater(data.canWater ?? CAN_CAPACITY); setOwnedCans(data.ownedCans ?? ["tin"]); setCanId(data.canId ?? "tin"); if (data.casinoStats) setCasinoStats(data.casinoStats);
        setPlaced([...(version < 5 ? starterItems(room) : []), ...hydrate(data.placed)].map(item => fitToRoom(item, room, yard)));
        setWarehouse(hydrate(data.warehouse));
        setWallpaper(data.wallpaper ?? "stripe"); setFloor(data.floor ?? "oak"); setOwnedThemes(data.ownedThemes ?? ["wall:stripe", "floor:oak"]);
        setFishLog(data.fishLog ?? {}); setBaits(data.baits ?? STARTER_BAIT); setSelectedBait(data.selectedBait ?? "worm"); setOwnedRods(data.ownedRods ?? ["bamboo"]); setRodId(data.rodId ?? "bamboo");
        setBuffs((data.buffs ?? []).filter((buff: Buff) => buff.expiresAt > Date.now())); setLastEventAt(data.lastEventAt ?? 0);
        setAvatarPos({ x: 0.6, z: 0.6, story: 0, ...data.avatarPos }); setMusicId(data.musicId ?? "");
      } catch { /* start fresh */ }
    }
    try { const stored = localStorage.getItem(AVATAR_STORAGE_KEY); if (stored) setAvatar(JSON.parse(stored)); } catch { /* keep default */ }
    setLoaded(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(timer); window.clearTimeout(fishTimer.current); };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("four-seasons-farm", JSON.stringify({ version: 5, money, plots, startHour, endHour, houseLevel, houseShape, ownedPlots, placed, warehouse, wallpaper, floor, ownedThemes, fishLog, baits, selectedBait, ownedRods, rodId, buffs, lastEventAt, avatarPos, stories, yardLevel, canWater, ownedCans, canId, casinoStats, musicId }));
  }, [money, plots, startHour, endHour, houseLevel, houseShape, ownedPlots, placed, warehouse, wallpaper, floor, ownedThemes, fishLog, baits, selectedBait, ownedRods, rodId, buffs, lastEventAt, avatarPos, stories, yardLevel, canWater, ownedCans, canId, casinoStats, musicId, loaded]);

  const nowMs = now.getTime();
  const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const isWorkTime = currentHour >= startHour && currentHour < endHour;
  const seasonIndex = isWorkTime ? Math.min(3, Math.floor(((currentHour - startHour) / (endHour - startHour)) * 4)) : -1;
  const season: Season = seasonIndex >= 0 ? SEASONS[seasonIndex] : SEASONS[Math.min(3, Math.floor(((Math.max(startHour, Math.min(endHour - .01, currentHour)) - startHour) / (endHour - startHour)) * 4))] || "봄";
  const seasonStart = seasonIndex >= 0 ? startHour + ((endHour - startHour) / 4) * seasonIndex : startHour;
  const seasonEnd = seasonIndex >= 0 ? seasonStart + (endHour - startHour) / 4 : endHour;
  const seasonProgress = isWorkTime ? Math.max(0, Math.min(100, ((currentHour - seasonStart) / (seasonEnd - seasonStart)) * 100)) : 0;
  const seasonSecondsLeft = isWorkTime ? Math.floor((seasonEnd - currentHour) * 3600) : 0;
  const currentPeriod = seasonPeriod(nowMs, startHour, endHour);
  const available = CROPS.filter(c => c.seasons.includes(season));
  const plotCount = ownedPlots;
  const marketBucket = Math.floor(nowMs / 300000);
  const marketSecondsLeft = 300 - Math.floor((nowMs / 1000) % 300);
  const activeBuffs = buffs.filter(buff => buff.expiresAt > nowMs);
  const growthMul = buffMultiplier(buffs, "growth", nowMs), priceMul = buffMultiplier(buffs, "price", nowMs), seedMul = buffMultiplier(buffs, "seed", nowMs), fishMul = buffMultiplier(buffs, "fish", nowMs);
  useEffect(() => { pendingPours.current = 0; }, [canWater]);

  // 키우는 펫의 고유 효과
  const pets = new Set(placed.filter(item => item.pet && item.rare).map(item => item.id));
  const currentCan = CANS.find(item => item.id === canId) ?? CANS[0];
  const canMax = currentCan.capacity + (pets.has("duck") ? 2 : 0);
  const bugPenalty = pets.has("weasel") ? BUG_PENALTY / 2 : BUG_PENALTY;
  const seedPrice = (crop: Crop) => Math.round(crop.seed * seedMul * (pets.has("rabbit") ? 0.95 : 1));
  const salePrice = (crop: Crop) => Math.round(marketPrice(crop, marketBucket) * priceMul);
  const selectedItem = placed.find(item => item.instanceId === selectedFurniture) ?? null;
  const room = useMemo(() => roomFor(houseLevel, houseShape), [houseLevel, houseShape]);
  const houseInfo = HOUSE_SIZES[houseLevel - 1], nextHouse = HOUSE_SIZES[houseLevel];
  const palette = PALETTES[seasonIndex >= 0 ? seasonIndex : 4];

  useEffect(() => {
    if (!available.some(c => c.id === selectedCrop)) setSelectedCrop(available[0]?.id || "potato");
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps

  // 돌발 이벤트: 운영 시간 중 일정 간격으로 확률 검사, 직전 이벤트 이후 쿨다운을 둔다.
  useEffect(() => { eventGate.current = { ready: loaded && isWorkTime, season, lastEventAt, busy: Boolean(activeEvent) || showSettings || showAvatar || Boolean(rolling) || slotSpinning > 0 || fishState.phase === "waiting" || fishState.phase === "bite" || fishState.phase === "game" }; });
  useEffect(() => {
    if (!loaded) return;
    const trigger = () => { setActiveEvent({ event: pickEvent(eventGate.current.season) }); setLastEventAt(Date.now()); };
    if (new URLSearchParams(window.location.search).has("event") && eventGate.current.ready) trigger();
    const timer = setInterval(() => {
      const gate = eventGate.current;
      if (!gate.ready || gate.busy || Date.now() - gate.lastEventAt < EVENT_COOLDOWN_MINUTES * 60000) return;
      if (Math.random() < EVENT_CHANCE) trigger();
    }, EVENT_CHECK_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [loaded]);

  // 벌레: 운영 시간 중 주기적으로 자라는 작물 하나에 날아온다. 제때 못 잡으면 그 작물 판매가가 깎인다.
  useEffect(() => { bugGate.current = { ready: loaded && isWorkTime, plots, dog: pets.has("dog") }; });
  useEffect(() => {
    if (!loaded) return;
    let lastSpawn = Date.now();
    const timer = setInterval(() => {
      const nowTime = Date.now(), current = bugGate.current.plots;
      const missed = current.map((plot, index) => (plot?.bug && nowTime - plot.bug >= BUG_SECONDS * 1000 ? index : -1)).filter(index => index >= 0);
      let target = -1;
      if (bugGate.current.ready && nowTime - lastSpawn >= BUG_CHECK_SECONDS * 1000 && !current.some(plot => plot?.bug && nowTime - plot.bug < BUG_SECONDS * 1000)) {
        lastSpawn = nowTime;
        const growing = current.map((plot, index) => { const crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined; return plot && crop && !plotStatus(plot, crop, nowTime).ready ? index : -1; }).filter(index => index >= 0);
        if (growing.length && Math.random() < BUG_CHANCE) {
          if (bugGate.current.dog && Math.random() < 0.25) { setNotice("🐶 멍멍! 강아지가 날아오던 벌레를 쫓아냈어요."); return; }
          target = growing[Math.floor(Math.random() * growing.length)];
        }
      }
      if (!missed.length && target < 0) return;
      setPlots(plots => plots.map((plot, index) => {
        if (!plot) return plot;
        if (missed.includes(index) && plot.bug) return { ...plot, bug: undefined, bugHits: (plot.bugHits ?? 0) + 1 };
        if (index === target && !plot.bug) return { ...plot, bug: nowTime };
        return plot;
      }));
      if (target >= 0) { playBuzz(); setNotice(`🐛 벌레가 날아왔어요! ${BUG_SECONDS}초 안에 잡아 주세요.`); }
      else setNotice("🐛 벌레를 놓쳐 작물이 상했어요. 해당 작물 판매가가 떨어졌어요.");
    }, 1000);
    return () => clearInterval(timer);
  }, [loaded]);

  // 농사 도구 단축키: 1 맨손, 2 물뿌리개, 3 우물, 4~6 거름 (입력창에 쓰는 중이면 무시)
  useEffect(() => {
    if (tab !== "farm") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || (event.target instanceof Element && event.target.closest("input, textarea, select"))) return;
      if (event.key === "1") setTool("hand");
      else if (event.key === "2") setTool("water");
      else if (event.key === "3") refillCan();
      else if (["4", "5", "6"].includes(event.key)) setTool(FERTILIZERS[Number(event.key) - 4].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function switchTab(next: typeof tab) {
    if (next !== "fish" && (fishState.phase === "waiting" || fishState.phase === "bite" || fishState.phase === "game")) { window.clearTimeout(fishTimer.current); setFishState({ phase: "idle" }); }
    setTab(next);
  }

  const timeLabel = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const nextSeason = seasonIndex >= 0 && seasonIndex < 3 ? SEASONS[seasonIndex + 1] : "휴식";
  const toClock = (hour: number) => `${String(Math.floor(hour)).padStart(2,"0")}:${String(Math.round((hour % 1) * 60)).padStart(2,"0")}`;

  function plant(index: number) {
    if (!isWorkTime) return setNotice(`농장은 ${startHour}:00에 문을 열어요. 시간 설정에서 바꿀 수 있어요.`);
    const crop = CROPS.find(c => c.id === selectedCrop)!;
    if (!crop.seasons.includes(season)) return setNotice(`${crop.name}은 ${crop.seasons.join("·")} 작물이에요.`);
    const growSeconds = Math.round(crop.seconds * growthMul * (pets.has("mole") ? 0.95 : 1));
    if (growSeconds > seasonSecondsLeft) return setNotice(`${season}이 ${formatClock(seasonSecondsLeft)} 뒤 끝나요. ${crop.name}은(는) 그 전에 다 자라지 못해요.`);
    const price = seedPrice(crop);
    if (money < price) return setNotice("씨앗을 살 돈이 부족해요. 익은 작물을 수확해 보세요.");
    const next = [...plots]; next[index] = { cropId: crop.id, plantedAt: Date.now(), growSeconds, water: [] };
    setPlots(next); setMoney(m => m - price); setNotice(`${crop.icon} ${crop.name}을(를) 심었어요. ${growSeconds}초 뒤 수확해요! 중간에 목말라하면 물을 주세요.`);
  }

  /** 밭 격자의 열 수(화면 너비에 따라 4열 또는 2열). */
  function plotColumns() {
    const grid = plotsRef.current;
    return grid ? Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length) : 4;
  }

  /** 물뿌리개 범위 안의 목마른 밭 번호. */
  function thirstyInArea(index: number) {
    const time = Date.now();
    return canArea(index, plotColumns(), plotCount, currentCan).filter(i => {
      const plot = plots[i], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
      return plot && crop && seasonPeriod(plot.plantedAt, startHour, endHour) === currentPeriod && plotStatus(plot, crop, time, bugPenalty).thirsty && time - (justWatered.current.get(i) ?? 0) >= 1500;
    });
  }

  /** 물뿌리개로 한 번 붓는다. 범위 안의 목마른 작물 모두에 물이 들어가고, 물은 1만 쓴다. */
  function waterPlot(index: number) {
    const targets = thirstyInArea(index);
    if (!targets.length) {
      const plot = plots[index], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
      if (crop && plot && currentCan.w * currentCan.h === 1 && !justWatered.current.has(index)) setNotice(plotStatus(plot, crop, Date.now(), bugPenalty).ready ? `${crop.name}은(는) 다 자랐어요. 맨손으로 수확하세요.` : `${crop.name}은(는) 아직 목마르지 않아요.`);
      return;
    }
    if (canWater - pendingPours.current <= 0) return setNotice("🚿 물뿌리개가 비었어요. 🚰 우물에서 물을 채워 주세요.");
    const time = Date.now();
    targets.forEach(i => justWatered.current.set(i, time)); pendingPours.current++;
    setCanWater(value => Math.max(0, value - 1));
    setPlots(current => current.map((item, i) => (targets.includes(i) && item ? { ...item, water: [...(item.water ?? []), time] } : item)));
    setWaterFx(items => [...items, ...targets.map(i => ({ id: time + i, plotIndex: i }))]);
    window.setTimeout(() => setWaterFx(items => items.filter(item => item.id < time || item.id > time + plotCount)), 900);
    playSplash();
    setNotice(`💧 ${targets.length > 1 ? `밭 ${targets.length}칸에 한꺼번에` : "촉촉하게"} 물을 줬어요. (물뿌리개 ${canWater - 1}/${canMax})`);
  }

  function chooseCan(can: WateringCan) {
    if (ownedCans.includes(can.id)) { setCanId(can.id); setTool("water"); setCanWater(value => Math.min(value, can.capacity + (pets.has("duck") ? 2 : 0))); return setNotice(`${can.icon} ${can.name}을(를) 들었어요. (${can.note})`); }
    if (money < can.price) return setNotice(`${can.name}은(는) ${can.price.toLocaleString()}원이에요.`);
    setMoney(value => value - can.price); setOwnedCans(items => [...items, can.id]); setCanId(can.id); setTool("water");
    setCanWater(can.capacity + (pets.has("duck") ? 2 : 0));
    playCoinSound([660, 990, 1320]);
    setNotice(`${can.icon} ${can.name}을(를) 샀어요! 물을 가득 채워 드렸어요. (${can.note})`);
  }

  function refillCan() {
    if (canWater >= canMax) return setNotice("🚿 물뿌리개는 이미 가득 차 있어요.");
    setCanWater(canMax); setTool("water"); playSplash();
    setNotice(`🚰 우물에서 물뿌리개를 가득 채웠어요. (${canMax}번 줄 수 있어요)`);
  }

  function fertilize(index: number, plot: NonNullable<Plot>, crop: Crop, fertilizer: Fertilizer) {
    if (plot.fert) return setNotice(`${crop.name}에는 이미 거름을 줬어요. 한 작물에 한 번만 줄 수 있어요.`);
    if (money < fertilizer.price) return setNotice(`${fertilizer.name}은(는) ${fertilizer.price.toLocaleString()}원이에요.`);
    setMoney(m => m - fertilizer.price);
    setPlots(current => current.map((item, i) => (i === index && item ? applyFertilizer(item, crop, fertilizer, Date.now()) : item)));
    setNotice(`${fertilizer.icon} ${crop.name}에 ${fertilizer.name}을(를) 줬어요. (${fertilizer.note})`);
  }

  function catchBug(event: React.MouseEvent, index: number) {
    event.stopPropagation();
    setPlots(current => current.map((plot, i) => (i === index && plot ? { ...plot, bug: undefined } : plot)));
    playCoinSound([1320, 1760]); setNotice("👏 벌레를 잡았어요! 작물이 무사해요.");
  }

  function clickPlot(index: number) {
    const plot = plots[index], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
    if (!plot || !crop) return plant(index);
    if (seasonPeriod(plot.plantedAt, startHour, endHour) !== currentPeriod) return clearWithered(index, crop);
    const status = plotStatus(plot, crop, Date.now(), bugPenalty);
    if (status.ready) return harvest(index, plot, crop);
    if (tool === "water") return waterPlot(index);
    const fertilizer = FERTILIZERS.find(item => item.id === tool);
    if (fertilizer) return fertilize(index, plot, crop, fertilizer);
    if (status.thirsty) return setNotice("💧 목말라해요! 🚿 물뿌리개를 들고 눌러서 물을 주세요.");
    setNotice(`${crop.icon} ${crop.name} ${Math.floor(status.progress)}% · ${status.remaining}초 남음 · 물 ${status.satisfied}/${status.total}${status.fert ? ` · ${status.fert.name}` : ""}`);
  }

  function clearWithered(index: number, crop: Crop) {
    const next = [...plots]; next[index] = null; setPlots(next);
    setNotice(`🥀 계절이 지나 시든 ${crop.name}을(를) 걷어냈어요. 제철 씨앗을 심어볼까요?`);
  }

  function harvest(index: number, plot: NonNullable<Plot>, crop: Crop) {
    const status = plotStatus(plot, crop, Date.now(), bugPenalty);
    if (!status.ready) return setNotice(`${crop.name}이(가) 아직 자라는 중이에요. 조금만 기다려주세요.`);
    const amount = Math.round(salePrice(crop) * status.quality.multiplier * status.bugMultiplier);
    const fx = { id: Date.now(), plotIndex: index, icon: crop.icon, amount, stars: status.quality.stars };
    const next = [...plots]; next[index] = null; setPlots(next); setMoney(m => m + amount);
    setHarvestFx(items => [...items, fx]); window.setTimeout(() => setHarvestFx(items => items.filter(item => item.id !== fx.id)), 1100);
    playCoinSound();
    setNotice(`짤랑~ ${crop.icon} ${crop.name}(${status.quality.name}${status.bugMultiplier < 1 ? ` · 벌레 피해 -${Math.round((1 - status.bugMultiplier) * 100)}%` : ""})을(를) ${amount.toLocaleString()}원에 팔았어요!`);
  }

  function expandField() {
    const price = 2400 + (ownedPlots - 8) * 700;
    if (ownedPlots >= 16) return setNotice("밭은 이미 최대 크기예요.");
    if (money < price) return setNotice(`밭 두 칸을 넓히려면 ${price.toLocaleString()}원이 필요해요.`);
    setMoney(value => value - price); setOwnedPlots(value => value + 2);
    setPlots(current => [...current, null, null]);
    setNotice(`🌱 밭 두 칸을 새로 샀어요! 이제 ${ownedPlots + 2}칸에서 농사지을 수 있어요.`);
  }

  // ---------- 낚시 ----------
  function buyBait(bait: Bait) {
    if (money < bait.price) return setNotice(`${bait.name} ${bait.pack}개는 ${bait.price.toLocaleString()}원이에요.`);
    setMoney(value => value - bait.price); setBaits(stock => ({ ...stock, [bait.id]: (stock[bait.id] ?? 0) + bait.pack })); setSelectedBait(bait.id);
    setNotice(`${bait.icon} ${bait.name} ${bait.pack}개를 샀어요.`);
  }

  function chooseRod(rod: Rod) {
    if (fishState.phase === "game") return;
    if (ownedRods.includes(rod.id)) { setRodId(rod.id); return setNotice(`${rod.icon} ${rod.name}을(를) 들었어요.`); }
    if (money < rod.price) return setNotice(`${rod.name}은(는) ${rod.price.toLocaleString()}원이에요.`);
    setMoney(value => value - rod.price); setOwnedRods(items => [...items, rod.id]); setRodId(rod.id);
    playCoinSound([660, 990, 1320]);
    setNotice(`${rod.icon} ${rod.name}을(를) 샀어요! ${rod.note}`);
  }

  function castLine() {
    if (!isWorkTime) return setNotice("밤에는 강물이 차가워 낚시터가 쉬어요.");
    const bait = BAITS.find(item => item.id === selectedBait) ?? BAITS[0];
    if (!baits[bait.id]) return setNotice(`${bait.icon} ${bait.name}이(가) 없어요. 미끼 가방에서 사 주세요.`);
    setBaits(stock => ({ ...stock, [bait.id]: stock[bait.id] - 1 })); castBait.current = bait;
    window.clearTimeout(fishTimer.current);
    setFishState({ phase: "waiting" });
    fishTimer.current = window.setTimeout(() => {
      setFishState({ phase: "bite" });
      fishTimer.current = window.setTimeout(() => setFishState({ phase: "result", text: "앗, 물고기가 미끼만 먹고 달아났어요." }), BITE_WINDOW_MS);
    }, 2000 + Math.random() * 3500);
  }

  function reelIn() {
    window.clearTimeout(fishTimer.current);
    if (fishState.phase === "waiting") return setFishState({ phase: "result", text: "너무 일찍 챘어요! 미끼만 날리고 물고기는 도망갔어요." });
    // 입질에 맞춰 챘다면 어떤 물고기인지 정해지고, 스타듀밸리식 미니게임이 시작된다.
    const bait = castBait.current ?? BAITS[0];
    const fish = rollFish(season, { normal: bait.normalBoost, rare: bait.rareBoost * fishMul * (pets.has("cat") ? 1.2 : 1) });
    setFishState({ phase: "game", fish, bait });
    setNotice(`🎣 걸렸다! ${fish.rarity === "전설" ? "엄청난 힘이 느껴져요…!" : "초록 막대 안에 물고기를 가둬요!"}`);
  }

  function finishFishing(result: FishingResult) {
    const { fish, bait } = fishState;
    if (!fish) return;
    let reward: string | undefined;
    if (result.treasure) {
      if (Math.random() < 0.5) {
        const prize = [BAITS[1], BAITS[2], BAITS[3]][Math.random() < 0.6 ? 0 : Math.random() < 0.8 ? 1 : 2], count = prize.id === "golden" ? 1 : 3;
        setBaits(stock => ({ ...stock, [prize.id]: (stock[prize.id] ?? 0) + count })); reward = `${prize.icon} ${prize.name} ${count}개`;
      } else { const coins = 150 + Math.floor(Math.random() * 10) * 50; setMoney(value => value + coins); reward = `💰 ${coins.toLocaleString()}원`; }
    }
    if (!result.caught) {
      setFishState({ phase: "result", text: `줄이 풀려 ${fish.rarity === "전설" ? "전설의 그림자" : `${fish.rarity} 등급 물고기`}가 달아났어요.`, reward });
      return setNotice(`💨 놓쳤어요…${reward ? ` 그래도 보물상자에서 ${reward}을(를) 얻었어요!` : ""}`);
    }
    const price = Math.round(fish.price * (result.perfect ? 1.25 : 1));
    setMoney(value => value + price);
    setFishLog(log => ({ ...log, [fish.id]: (log[fish.id] ?? 0) + 1 }));
    setFishState({ phase: "result", fish, bait, perfect: result.perfect, price, reward });
    playCoinSound(fish.rarity === "전설" ? [660, 880, 1100, 1320, 1760] : fish.rarity === "희귀" || result.perfect ? [880, 1100, 1320] : [880, 1320]);
    setNotice(`${fish.rarity === "전설" ? `✨ 전설의 ${fish.name}을(를) 낚았어요!!` : `🎣 ${fish.name}(${fish.rarity})을(를) 낚았어요.`}${result.perfect ? " 퍼펙트! +25%" : ""} ${price.toLocaleString()}원${reward ? ` · 보물: ${reward}` : ""}`);
  }

  // ---------- 도박장(홀짝) ----------
  function placeBet(pick: Parity) {
    if (rolling) return;
    const amount = Math.min(bet, MAX_BET);
    if (amount < MIN_BET) return setNotice(`최소 ${MIN_BET.toLocaleString()}원부터 걸 수 있어요.`);
    if (money < amount) return setNotice("판돈이 모자라요. 판돈을 줄여 주세요.");
    setMoney(value => value - amount);
    setRolling({ pick, bet: amount });
    window.setTimeout(() => {
      const dice = rollDice(), result = parityOf(dice), win = result === pick, payout = win ? Math.floor(amount * PAYOUT) : 0;
      const roll: Roll = { dice, result, pick, bet: amount, payout, at: Date.now() };
      if (win) setMoney(value => value + payout);
      setLastRoll(roll); setRollHistory(items => [roll, ...items].slice(0, 12)); setRolling(null);
      recordCasino(amount, payout);
      if (win) playCoinSound([880, 1100, 1320]);
      setNotice(`🎲 ${DICE_FACES[dice[0] - 1]} ${DICE_FACES[dice[1] - 1]} 합 ${dice[0] + dice[1]} → ${PARITY_NAME[result]}! ${win ? `적중! ${payout.toLocaleString()}원을 받았어요.` : `${amount.toLocaleString()}원을 잃었어요.`}`);
    }, 1200);
  }

  function recordCasino(amount: number, payout: number) {
    const win = payout > 0;
    setCasinoStats(stats => { const streak = win ? Math.max(1, stats.streak + 1) : Math.min(-1, stats.streak - 1); return { wins: stats.wins + (win ? 1 : 0), losses: stats.losses + (win ? 0 : 1), net: stats.net + payout - amount, streak, best: Math.max(stats.best, streak) }; });
  }

  /** 슬롯머신: 결과를 먼저 정하고, 릴이 왼쪽부터 차례로 멈추는 연출을 보여준다. */
  function pullLever() {
    if (slotSpinning || rolling) return;
    const amount = Math.min(bet, MAX_BET);
    if (money < amount) return setNotice("판돈이 모자라요. 판돈을 줄여 주세요.");
    const final = [spinReel(), spinReel(), spinReel()], multiplier = slotMultiplier(final), payout = Math.floor(amount * multiplier);
    setMoney(value => value - amount); setSlotSpinning(3); setLastSlot(null);
    let stopped = 0;
    const shuffle = window.setInterval(() => setSlotReels(current => current.map((icon, i) => (i < stopped ? final[i] : SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].icon))), 70);
    [700, 1050, 1400].forEach((delay, i) => window.setTimeout(() => {
      stopped = i + 1; setSlotReels(current => current.map((icon, k) => (k <= i ? final[k] : icon))); setSlotSpinning(3 - stopped);
      if (stopped < 3) return;
      window.clearInterval(shuffle);
      if (payout) { setMoney(value => value + payout); playCoinSound(multiplier >= 30 ? [660, 880, 1100, 1320, 1760] : [880, 1100, 1320]); }
      setLastSlot({ bet: amount, payout, multiplier }); recordCasino(amount, payout);
      setNotice(`🎰 ${final.join(" ")} — ${payout ? `${multiplier}배! ${payout.toLocaleString()}원을 받았어요.` : `꽝! ${amount.toLocaleString()}원을 잃었어요.`}`);
    }, delay));
  }

  // ---------- 이벤트 ----------
  function chooseEventOption(index: number) {
    if (!activeEvent) return;
    const result = resolveChoice(activeEvent.event.choices[index]);
    if (result.money) setMoney(value => Math.max(0, value + result.money!));
    const buff = result.buff;
    if (buff) setBuffs(items => [...items.filter(item => item.expiresAt > Date.now() && item.label !== buff.label), { id: `${buff.kind}-${Date.now()}`, kind: buff.kind, label: buff.label, multiplier: buff.multiplier, expiresAt: Date.now() + buff.minutes * 60000 * (pets.has("tiger") && !BUFF_INFO[buff.kind].good(buff.multiplier) ? 0.5 : 1) }]);
    setActiveEvent({ ...activeEvent, result });
    setNotice(`${activeEvent.event.icon} ${result.text}`);
  }

  function choiceCost(index: number) {
    const outcome = activeEvent?.event.choices[index].outcome;
    if (!outcome) return 0;
    const costs = "chance" in outcome ? [outcome.success.money ?? 0, outcome.fail.money ?? 0] : [outcome.money ?? 0];
    return Math.max(0, -Math.min(...costs));
  }

  // ---------- 아바타 ----------
  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    try {
      const { src, transparent } = await readAvatarFile(file);
      const next = { src, pixelated: false };
      setAvatar(next);
      try { localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(next)); } catch { setNotice("이미지가 너무 커서 저장하지 못했어요. 이번 접속에서만 사용돼요."); return; }
      setNotice(transparent ? "🪞 새 아바타로 바꿨어요!" : "🪞 아바타를 바꿨어요. 배경이 투명하지 않아 네모 테두리가 보일 수 있어요.");
    } catch (error) {
      setNotice(`🚫 ${(error as Error).message}`);
    } finally {
      if (avatarInput.current) avatarInput.current.value = "";
    }
  }

  function pickPresetAvatar(preset: typeof PRESET_AVATARS[number]) {
    const next = { src: emojiAvatar(preset.emoji), pixelated: false, preset: preset.id };
    setAvatar(next);
    try { localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(next)); } catch { /* 이번 접속에서만 사용 */ }
    setNotice(`${preset.emoji} ${preset.name} 캐릭터로 바꿨어요!`);
  }

  function resetAvatar() {
    setAvatar({ src: DEFAULT_AVATAR, pixelated: true });
    try { localStorage.removeItem(AVATAR_STORAGE_KEY); } catch { /* ignore */ }
    setNotice("🐱 기본 아바타로 돌아왔어요.");
  }

  // ---------- 집 ----------
  function applyRoom(level: number, shape: RoomShape) {
    const next = roomFor(level, shape);
    setPlaced(items => items.map(item => fitToRoom(item, next, yardLevel)));
    setAvatarPos(pos => (fitsInRoom(next.points, pos.x, pos.z, 0.25) || (pos.story === 0 && fitsInYard(next, yardLevel, pos.x, pos.z, 0.3)) ? pos : { ...pos, x: 0, z: 0 }));
  }

  function upgradeHouse() {
    if (!nextHouse) return setNotice("집은 이미 가장 넓어요!");
    if (money < nextHouse.price) return setNotice(`${nextHouse.pyeong}평으로 증축하려면 ${nextHouse.price.toLocaleString()}원이 필요해요.`);
    setMoney(m => m - nextHouse.price); setHouseLevel(nextHouse.level); applyRoom(nextHouse.level, houseShape);
    setNotice(`🔨 증축 완료! ${nextHouse.name}(${nextHouse.pyeong}평)이 되었어요.`);
  }

  function remodel(shape: RoomShape) {
    if (shape === houseShape) return;
    if (money < REMODEL_PRICE) return setNotice(`구조를 바꾸려면 ${REMODEL_PRICE.toLocaleString()}원이 필요해요.`);
    setMoney(m => m - REMODEL_PRICE); setHouseShape(shape); applyRoom(houseLevel, shape);
    setNotice(`📐 ${SHAPES.find(item => item.id === shape)!.name} 구조로 리모델링했어요. 밖으로 밀려난 가구는 안쪽으로 옮겼어요.`);
  }

  function buildSecondFloor() {
    if (stories >= 2) { setSelectedFurniture(null); return setViewStory(1); }
    if (houseLevel < 3) return setNotice("2층은 18평(햇살 농가) 이상부터 올릴 수 있어요.");
    if (money < SECOND_FLOOR_PRICE) return setNotice(`2층을 올리려면 ${SECOND_FLOOR_PRICE.toLocaleString()}원이 필요해요.`);
    const stairs = FURNITURE.find(item => item.id === "stairs")!;
    const corner = room.points[0], spot = { x: corner[0] + 0.8, z: corner[1] + 1.6 };
    setMoney(m => m - SECOND_FLOOR_PRICE); setStories(2); setViewStory(1); setSelectedFurniture(null);
    setPlaced(items => [...items, fitToRoom({ ...stairs, instanceId: `stairs-${Date.now()}`, ...spot, rot: 0, story: 0 }, room, yardLevel), { ...FURNITURE.find(item => item.id === "window")!, instanceId: `window-up-${Date.now()}`, x: 0, z: 0, rot: 0, wall: 0, u: 0.5, h: 1.45, story: 1 }]);
    setNotice("🏠 2층을 올렸어요! 계단을 놓아 두었고, 지금은 2층을 보고 있어요.");
  }

  function expandYard() {
    const next = YARD_SIZES[yardLevel];
    if (!next) return setNotice("마당은 이미 가장 넓어요!");
    if (money < next.price) return setNotice(`${next.name}(으)로 넓히려면 ${next.price.toLocaleString()}원이 필요해요.`);
    setMoney(m => m - next.price); setYardLevel(next.level);
    setNotice(`🌳 마당을 ${next.name}(으)로 넓혔어요!`);
  }

  function defaultSpot(item: Furniture, count: number): Partial<PlacedItem> {
    if (item.yard) {
      // 앞마당부터 가운데→바깥 순으로 훑어 다른 마당 소품과 겹치지 않는 첫 자리를 고른다.
      const others = placed.filter(other => other.yard), need = Math.max(item.size[0], item.size[2]) / 2 + 0.5;
      for (let z = room.depth / 2 + 1.2; z < room.depth / 2 + 12; z += 1.1) for (let step = 0; step < 16; step++) {
        const x = (step % 2 ? 1 : -1) * Math.ceil(step / 2) * 1.1;
        if (fitsInYard(room, yardLevel, x, z, need * 0.7) && others.every(other => Math.hypot(other.x - x, other.z - z) > need + Math.max(other.size[0], other.size[2]) / 2)) return { x, z, rot: 0 };
      }
      return { x: 0, z: room.depth / 2 + 1.4, rot: 0 };
    }
    if (item.kind === "wall") return { wall: 0, u: 0.25 + ((count * 0.17) % 0.5), h: item.mount ?? 1.5, x: 0, z: 0, rot: 0, story: viewStory };
    // 방 안 격자를 가운데부터 훑어, 같은 층의 다른 가구와 겹치지 않는 첫 자리를 고른다.
    const radius = (entry: Furniture) => Math.max(entry.size[0], entry.size[2]) / 2;
    const others = placed.filter(other => !other.yard && other.kind === "floor" && (other.story ?? 0) === viewStory);
    const spots: [number, number][] = [];
    for (let x = -room.width / 2; x <= room.width / 2; x += 0.5) for (let z = -room.depth / 2; z <= room.depth / 2; z += 0.5) spots.push([x, z]);
    spots.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
    const free = spots.find(([x, z]) => fitsInRoom(room.points, x, z, Math.max(0.25, radius(item) * 0.8)) && (item.kind === "rug" || others.every(other => Math.hypot(other.x - x, other.z - z) > (radius(other) + radius(item)) * 0.85)));
    return { x: free?.[0] ?? 0, z: free?.[1] ?? 0, rot: 0, story: viewStory };
  }

  /** 펫 뽑기: 1,000원. 능력 펫 10%, 일반 펫 90%. 뽑은 펫은 지금 보는 층의 빈자리에 놓인다. */
  function drawPet() {
    if (money < GACHA_PRICE) return setNotice(`펫 뽑기는 ${GACHA_PRICE.toLocaleString()}원이에요.`);
    const pet = rollPet(), instanceId = `${pet.id}-${Date.now()}`;
    setMoney(m => m - GACHA_PRICE);
    setPlaced(items => [...items, fitToRoom({ ...pet, instanceId, x: 0, z: 0, rot: 0, ...defaultSpot(pet, items.length) }, room, yardLevel)]);
    setGachaResult({ item: pet, at: Date.now() });
    playCoinSound(pet.rare ? [660, 880, 1100, 1320, 1760] : [740, 990]);
    setNotice(pet.rare ? `✨ 대박! 능력 펫 ${pet.icon} ${pet.name}이(가) 나왔어요! ${PET_BUFFS[pet.id].title}: ${PET_BUFFS[pet.id].text}` : `${pet.icon} ${pet.name}이(가) 나왔어요. 집 안을 귀엽게 돌아다녀요.`);
  }

  function sellPet(item: PlacedItem) {
    const refund = Math.round(item.price * 0.5);
    setPlaced(items => items.filter(entry => entry.instanceId !== item.instanceId));
    setWarehouse(items => items.filter(entry => entry.instanceId !== item.instanceId));
    if (selectedFurniture === item.instanceId) setSelectedFurniture(null);
    setMoney(value => value + refund);
    setNotice(`${item.icon} ${item.name}을(를) 새 가족에게 보내고 ${refund.toLocaleString()}원을 받았어요.`);
  }

  function buyFurniture(item: Furniture) {
    if (money < item.price) return setNotice(`${item.name}을(를) 사려면 ${item.price.toLocaleString()}원이 필요해요.`);
    const instanceId = `${item.id}-${Date.now()}`;
    setMoney(m => m - item.price); setPlaced(p => [...p, fitToRoom({ ...item, instanceId, x: 0, z: 0, rot: 0, ...defaultSpot(item, placed.length) }, room, yardLevel)]);
    setSelectedFurniture(instanceId);
    setNotice(item.pet ? `${item.icon} ${item.name}이(가) 가족이 되었어요! ${PET_BUFFS[item.id].title}: ${PET_BUFFS[item.id].text}` : `${item.icon} ${item.name}을(를) 집에 들였어요. 끌어서 자리를 잡고 원하는 각도로 돌려 보세요.`);
  }

  function buyTheme(kind: "wall" | "floor", theme: Theme) {
    const key = `${kind}:${theme.id}`, apply = kind === "wall" ? setWallpaper : setFloor;
    if (ownedThemes.includes(key)) { apply(theme.id); return setNotice(`🎨 ${theme.name}(으)로 바꿨어요.`); }
    if (money < theme.price) return setNotice(`${theme.name}은(는) ${theme.price.toLocaleString()}원이에요.`);
    setMoney(value => value - theme.price); setOwnedThemes(items => [...items, key]); apply(theme.id);
    setNotice(`🎨 ${theme.name}을(를) 시공했어요! 이제 언제든 무료로 바꿀 수 있어요.`);
  }

  function updateItem(id: string, patch: Partial<PlacedItem>) {
    setPlaced(items => items.map(item => item.instanceId === id ? { ...item, ...patch } : item));
  }

  function rotateSelected(delta: number | null, absolute?: number) {
    if (!selectedItem || selectedItem.kind === "wall") return;
    updateItem(selectedItem.instanceId, { rot: ((absolute ?? selectedItem.rot + (delta ?? 0)) % 360 + 360) % 360 });
  }

  function houseKeys(event: React.KeyboardEvent) {
    if (!selectedFurniture) return;
    const step = event.shiftKey ? 0.5 : 0.1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === "q" || event.key === "Q") { event.preventDefault(); return rotateSelected(-15); }
    if (event.key === "e" || event.key === "E") { event.preventDefault(); return rotateSelected(15); }
    const move = moves[event.key]; if (!move) return;
    event.preventDefault();
    if (selectedFurniture === AVATAR_ID) {
      const next = { ...avatarPos, x: avatarPos.x + move[0], z: avatarPos.z + move[1] };
      if (fitsInRoom(room.points, next.x, next.z, 0.25) || (next.story === 0 && fitsInYard(room, yardLevel, next.x, next.z, 0.3))) setAvatarPos(next);
      return;
    }
    if (!selectedItem) return;
    if (selectedItem.kind === "wall") {
      const length = wallInfo(room.points, selectedItem.wall ?? 0).length;
      const h = selectedItem.fixedMount ? selectedItem.h : Math.min(WALL_HEIGHT - selectedItem.size[1] / 2 - 0.05, Math.max(selectedItem.size[1] / 2 + 0.1, (selectedItem.h ?? 1.4) - move[1]));
      return updateItem(selectedItem.instanceId, fitToRoom({ ...selectedItem, u: (selectedItem.u ?? 0.5) + move[0] / length, h }, room, yardLevel));
    }
    const next = { x: selectedItem.x + move[0], z: selectedItem.z + move[1] };
    if (selectedItem.yard ? fitsInYard(room, yardLevel, next.x, next.z) : fitsInRoom(room.points, next.x, next.z, 0.25)) updateItem(selectedItem.instanceId, next);
  }

  function sellFurniture() {
    if (!selectedItem) return;
    const refund = Math.round(selectedItem.price * 0.5);
    setPlaced(items => items.filter(item => item.instanceId !== selectedItem.instanceId));
    setMoney(value => value + refund); setSelectedFurniture(null);
    setNotice(`${selectedItem.icon} ${selectedItem.name}을(를) 정리하고 ${refund.toLocaleString()}원을 돌려받았어요.`);
  }

  function storeFurniture() {
    if (!selectedItem) return;
    setPlaced(items => items.filter(furniture => furniture.instanceId !== selectedItem.instanceId));
    setWarehouse(items => [...items, selectedItem]); setSelectedFurniture(null);
    setNotice(`📦 ${selectedItem.name}을(를) 창고에 안전하게 보관했어요.`);
  }

  function restoreFurniture(item: PlacedItem) {
    setWarehouse(items => items.filter(furniture => furniture.instanceId !== item.instanceId));
    setPlaced(items => [...items, fitToRoom({ ...item, ...defaultSpot(item, 2) }, room, yardLevel)]); setSelectedFurniture(item.instanceId);
    setNotice(`${item.icon} ${item.name}을(를) 창고에서 꺼냈어요. 원하는 곳으로 옮겨주세요.`);
  }

  function sellWarehouseFurniture(item: PlacedItem) {
    const refund = Math.round(item.price * 0.5);
    setWarehouse(items => items.filter(furniture => furniture.instanceId !== item.instanceId));
    setMoney(value => value + refund);
    setNotice(`${item.icon} ${item.name}을(를) 창고에서 판매하고 ${refund.toLocaleString()}원을 받았어요.`);
  }

  const cropCards = available.map(crop => {
    const tooLate = isWorkTime && Math.round(crop.seconds * growthMul) > seasonSecondsLeft;
    return <button key={crop.id} className={`crop-card ${selectedCrop === crop.id ? "selected" : ""} ${tooLate ? "too-late" : ""}`} onClick={() => setSelectedCrop(crop.id)} aria-pressed={selectedCrop === crop.id}>
      <span className="crop-icon">{crop.icon}</span><span className="crop-name">{crop.name}</span>
      <span className="crop-meta">{tooLate ? "이번 계절엔 시간 부족" : `씨앗 ${Math.round(crop.seed * seedMul)}원 · ${Math.round(crop.seconds * growthMul)}초`}</span>
      <span className="crop-price"><small>현재 시세</small>{Math.round(marketPrice(crop, marketBucket) * priceMul).toLocaleString()}원</span>
    </button>;
  });

  const shopItems = FURNITURE.filter(item => item.group === shopTab);
  const seasonFish = FISH.filter(fish => fish.season === season);
  const avatarImg = <img src={avatar.src} alt="" className={avatar.pixelated ? "pixelated" : ""} draggable={false} />;
  const currentBait = BAITS.find(item => item.id === selectedBait) ?? BAITS[0];
  const currentRod = RODS.find(item => item.id === rodId) ?? RODS[0];

  return (
    <main className={`app season-${seasonIndex >= 0 ? seasonIndex : 4} ${tab === "farm" ? "has-dock" : ""}`}>
      <header className="topbar">
        <div className="brand"><button className="avatar-button" onClick={() => setShowAvatar(true)} aria-label="내 아바타 바꾸기">{avatarImg}</button><div><h1>월루농가</h1><p>월급은 루팡, 농사는 진심</p></div></div>
        <div className="status-cluster">
          <div className="status-card money"><span>💰 보유 자금</span><strong>{money.toLocaleString()}원</strong></div>
          <div className="status-card clock"><span>🕰 {timeLabel}</span><strong>{isWorkTime ? `${SEASON_ICON[season]} 지금은 ${season}` : "🌙 농장 휴식"}</strong></div>
          <div className="status-card market-status"><span>📈 다음 시세</span><strong>{formatClock(marketSecondsLeft)}</strong></div>
          <button className="icon-button" onClick={() => setShowSettings(true)} aria-label="시간 설정">⚙</button>
        </div>
      </header>

      <section className="season-strip">
        <div className="season-copy"><span className="eyebrow">REAL-TIME SEASON</span><h2>{isWorkTime ? `${season}의 농장` : "오늘의 농사가 끝났어요"}</h2><p>{isWorkTime ? `${toClock(seasonStart)}—${toClock(seasonEnd)} · ${formatClock(seasonSecondsLeft)} 뒤 ${nextSeason}` : `${startHour}:00—${endHour}:00 사이에 농사를 지을 수 있어요`}</p></div>
        <div className="season-track" aria-label="오늘의 계절 진행도">
          {SEASONS.map((s, i) => <div key={s} className={`season-step ${i === seasonIndex ? "active" : ""}`}><span>{SEASON_ICON[s]}</span><b>{s}</b></div>)}
          <div className="season-fill" style={{ width: `${seasonIndex < 0 ? 0 : (seasonIndex * 25) + seasonProgress / 4}%` }} />
        </div>
      </section>

      {(activeBuffs.length > 0 || pets.size > 0) && <section className="buff-bar" aria-label="적용 중인 효과">
        {[...pets].map(id => { const item = FURNITURE.find(entry => entry.id === id)!; return <span key={id} className="buff-chip pet" title={PET_BUFFS[id].text}><b>{item.icon} {PET_BUFFS[id].title}</b>{PET_BUFFS[id].text}</span>; })}
        {activeBuffs.map(buff => { const info = BUFF_INFO[buff.kind], good = info.good(buff.multiplier), percent = Math.round((buff.multiplier - 1) * 100);
          return <span key={buff.id} className={`buff-chip ${good ? "good" : "bad"}`}><b>{good ? "▲" : "▼"} {buff.label}</b>{info.name} {percent > 0 ? "+" : ""}{percent}%<i>{formatClock(Math.ceil((buff.expiresAt - nowMs) / 1000))}</i></span>; })}
      </section>}

      <nav className="tabs" aria-label="게임 공간">
        <button className={tab === "farm" ? "active" : ""} onClick={() => switchTab("farm")}>🌱 텃밭</button>
        <button className={tab === "fish" ? "active" : ""} onClick={() => switchTab("fish")}>🎣 낚시터</button>
        <button className={tab === "home" ? "active" : ""} onClick={() => switchTab("home")}>🏡 나의 집</button>
        <button className={tab === "casino" ? "active" : ""} onClick={() => switchTab("casino")}>🎲 도박장</button>
      </nav>

      {tab === "farm" && <div className="tool-dock" role="toolbar" aria-label="농사 도구 (단축키 1~6)">
        <span className="dock-title">도구</span>
        <button className={tool === "hand" ? "on" : ""} onClick={() => setTool("hand")} aria-pressed={tool === "hand"} title="빈 밭 심기 · 다 자란 작물 수확 (1)"><b>✋</b><span>맨손</span><kbd>1</kbd></button>
        <button className={`can ${tool === "water" ? "on" : ""}`} onClick={() => setTool(current => (current === "water" ? "hand" : "water"))} aria-pressed={tool === "water"} title={`${currentCan.name} · ${currentCan.note}. 누른 채로 쓸고 지나가도 돼요 (2)`}><b>🚿</b><span>{currentCan.w * currentCan.h > 1 ? `${currentCan.w}×${currentCan.h}칸` : "물뿌리개"}</span><small className="can-gauge" aria-label={`물 ${canWater}/${canMax}`}>{Array.from({ length: canMax }).map((_, k) => <i key={k} className={k < canWater ? "full" : ""} />)}</small><kbd>2</kbd></button>
        <button className={`refill ${canWater === 0 ? "empty" : ""}`} onClick={refillCan} disabled={canWater >= canMax} title="물뿌리개 가득 채우기 (3)"><b>🚰</b><span>우물</span><kbd>3</kbd></button>
        <span className="dock-sep" />
        {FERTILIZERS.map((item, index) => <button key={item.id} className={`fert ${tool === item.id ? "on" : ""}`} onClick={() => setTool(current => (current === item.id ? "hand" : item.id))} aria-pressed={tool === item.id} title={`${item.name} ${item.price}원 · ${item.note} (${index + 4})`}><b>{item.icon}</b><span>{item.name}</span><small>{item.price}원</small><kbd>{index + 4}</kbd></button>)}
      </div>}
      {tab === "farm" && <div className="game-grid">
        <section className="farm-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">MY FIELD</span><h3>햇살 텃밭</h3></div><div className="farm-actions"><span className="plot-count">{plots.filter(Boolean).length}/{plotCount} 재배 중</span></div></div>
          <div ref={plotsRef} onPointerLeave={() => setHoverArea([])} className={`plots plots-${plotCount} tool-${FERTILIZERS.some(item => item.id === tool) ? "fert" : tool}`}>
            {Array.from({ length: plotCount }).map((_, index) => {
              const plot = plots[index] || null; const crop = plot ? CROPS.find(c => c.id === plot.cropId)! : null;
              const withered = Boolean(plot && seasonPeriod(plot.plantedAt, startHour, endHour) !== currentPeriod);
              const status = plot && crop ? plotStatus(plot, crop, nowMs, bugPenalty) : null;
              const progress = status?.progress ?? 0, bugLeft = plot?.bug ? Math.max(0, BUG_SECONDS - Math.floor((nowMs - plot.bug) / 1000)) : 0;
              return <div key={index} className={`plot-cell ${tool === "water" && hoverArea.includes(index) ? "can-area" : ""}`}><button className={`plot ${withered ? "withered" : status?.ready ? "ready" : status?.thirsty ? "thirsty" : ""} ${FERTILIZERS.some(item => item.id === tool) && status && !status.ready && !status.fert && !withered ? "fert-target" : ""} ${status?.fert && !withered ? `fert-${status.fert.id}` : ""}`}
                onClick={event => { if (tool === "water" && event.detail > 0) return; clickPlot(index); }}
                onPointerDown={event => { if (tool !== "water") return; event.currentTarget.releasePointerCapture?.(event.pointerId); waterPlot(index); }}
                onPointerEnter={event => { if (tool === "water") setHoverArea(canArea(index, plotColumns(), plotCount, currentCan)); if (tool === "water" && event.buttons & 1) waterPlot(index); }}>
                {status?.fert && !withered && <span className={`fert-tag fert-tag-${status.fert.id}`}>{status.fert.icon} {status.fert.name}</span>}
                {crop && withered ? <><span className="plant">🥀</span><span className="plot-label">시듦 · 치우기</span></> : crop && status ? <>
                  <span className="plant">{progress < 35 ? "🌱" : progress < 75 ? "🌿" : crop.icon}</span>
                  <span className="plot-label">{status.ready ? `수확하기 ${status.quality.stars}` : status.thirsty ? "💧 목말라요" : `${Math.floor(progress)}%`}</span>
                  <span className="grow-bar"><i style={{ width: `${progress}%` }} /></span>
                  <span className="plot-badges">{Array.from({ length: status.total }).map((_, k) => <i key={k} className={k < status.satisfied ? "on" : ""}>💧</i>)}{plot?.bugHits ? <i className="hurt">🐛-{Math.round((1 - status.bugMultiplier) * 100)}%</i> : null}</span>
                </> : <><span className="soil-lines">╱ ╱ ╱</span><span className="plot-label">심기</span></>}
                {waterFx.filter(fx => fx.plotIndex === index).map(fx => <span className="water-fx" key={fx.id}><i>💧</i><i>💧</i><i>💧</i><i>💧</i></span>)}
                {harvestFx.filter(fx => fx.plotIndex === index).map(fx => <span className="harvest-fx" key={fx.id}><b>{fx.icon}</b><i>＋{fx.amount.toLocaleString()}원 {fx.stars}</i><em>✦</em><em>✦</em><em>●</em></span>)}
              </button>{plot?.bug && !withered && <button className="bug" aria-label={`벌레 잡기, ${bugLeft}초 남음`} onClick={event => catchBug(event, index)}>🐛<b>{bugLeft}</b></button>}</div>;
            })}
          </div>
        </section>
        <aside className="seed-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">SEED BOX · 5분 시세</span><h3>{season} 씨앗 상자</h3></div><span className="market-timer">{formatClock(marketSecondsLeft)}</span></div>
          <p className="hint">한국의 노지 재배 시기를 바탕으로 고른 작물이에요.</p>
          <div className="crop-list">{cropCards}</div>
          <div className="field-shop"><div><b>🌾 밭 두 칸 확장</b><small>{ownedPlots >= 16 ? "최대 확장 완료" : `${(2400 + (ownedPlots - 8) * 700).toLocaleString()}원 · 최대 16칸`}</small></div><button onClick={expandField} disabled={ownedPlots >= 16}>구매</button></div>
          <div className="can-shop"><b>🚿 물뿌리개 상점</b><small>좋을수록 물을 많이 담고, 한 번에 여러 칸에 물을 줘요</small><div>{CANS.map(can => { const owned = ownedCans.includes(can.id);
            return <button key={can.id} className={canId === can.id ? "on" : ""} onClick={() => chooseCan(can)} aria-pressed={canId === can.id}><span className="can-grid" style={{ gridTemplateColumns: `repeat(${can.w}, 1fr)` }}>{Array.from({ length: can.w * can.h }).map((_, k) => <i key={k} />)}</span><b>{can.name}</b><small>{can.note}</small><em>{canId === can.id ? "사용 중" : owned ? "들기" : `${can.price.toLocaleString()}원`}</em></button>; })}</div></div>
          <div className="tip">🧰 오른쪽 도구함에서 도구를 고르세요(단축키 1~6). 거름을 들면 자라는 작물을 눌러 줘요(작물당 1번).<br />🚿 자라는 동안 2~3번 목말라해요. 물뿌리개로 제때 물을 주면 품질이 올라 더 비싸게 팔려요(좋음 ×1.25, 최상 ×1.6).<br />🐛 벌레가 날아오면 {BUG_SECONDS}초 안에 눌러 잡으세요. 놓치면 그 작물 판매가 -{Math.round(bugPenalty * 100)}%.<br />🥀 계절이 바뀌면 지난 계절 작물은 시들어요.</div>
        </aside>
      </div>}

      {tab === "fish" && <div className="game-grid">
        <section className="panel fish-panel">
          <div className="panel-heading"><div><span className="eyebrow">RIVERSIDE</span><h3>{season} 강가 낚시터</h3></div><div className="farm-actions"><button className="ghost-button small" onClick={() => setShowAvatar(true)}>🪞 캐릭터 바꾸기</button><span className="plot-count">전설 출현 0.1%</span></div></div>
          <div className={`pond phase-${fishState.phase}`}>
            <div className="pond-bank" />
            <svg className="rod" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="21" y1="58" x2="40" y2="36" />{(fishState.phase === "waiting" || fishState.phase === "bite") && <line className="line" x1="40" y1="36" x2="60" y2={fishState.phase === "bite" ? 70 : 64} />}</svg>
            <div className="angler">{avatarImg}</div>
            <span className="ripple r1" /><span className="ripple r2" /><span className="bobber" />{fishState.phase === "bite" && <span className="bite-mark">!</span>}
            {fishState.phase === "game" && fishState.fish && <Suspense fallback={null}><FishingGame fish={fishState.fish} rod={currentRod} barBonus={fishState.bait?.barBonus ?? 0} onFinish={finishFishing} /></Suspense>}
            {fishState.phase === "result" && <div className={`catch-card ${fishState.fish?.rarity === "전설" ? "legend" : ""}`}>
              {fishState.fish ? <><b>{fishState.fish.icon}</b><strong>{fishState.fish.name}</strong><span className={`rarity rarity-${fishState.fish.rarity}`}>{fishState.fish.rarity}</span>{fishState.perfect && <span className="perfect">✨ 퍼펙트! +25%</span>}<small>{fishState.fish.note}</small><em>＋{(fishState.price ?? fishState.fish.price).toLocaleString()}원</em></> : <><b>💨</b><small>{fishState.text}</small></>}
              {fishState.reward && <span className="treasure">🎁 보물상자: {fishState.reward}</span>}
            </div>}
          </div>
          <div className="fish-controls">
            <p>{fishState.phase === "game" ? "🐟 물고기를 초록 막대 안에! 누르고 있으면 올라가고, 떼면 내려가요. 🎁가 보이면 막대에 함께 담아 보세요." : fishState.phase === "waiting" ? "찌가 흔들리길 기다리는 중… 입질 전에 채면 놓쳐요." : fishState.phase === "bite" ? "입질이 왔어요! 지금 당겨요!" : `${currentRod.icon} ${currentRod.name} · ${currentBait.icon} ${currentBait.name} ${baits[currentBait.id] ?? 0}개 남음 · 던질 때마다 1개씩 써요.`}</p>
            {fishState.phase === "game" ? null : fishState.phase === "waiting" || fishState.phase === "bite" ? <button className={`reel-button ${fishState.phase === "bite" ? "hot" : ""}`} onClick={reelIn}>🎣 당기기!</button> : <button className="reel-button" onClick={castLine} disabled={!isWorkTime || !baits[currentBait.id]}>{fishState.phase === "result" ? "다시 던지기" : "낚싯대 던지기"}</button>}
          </div>
        </section>
        <aside className="panel fish-book">
          <div className="panel-heading"><div><span className="eyebrow">FISHING ROD</span><h3>낚싯대</h3></div></div>
          <div className="rod-list">{RODS.map(rod => { const owned = ownedRods.includes(rod.id);
            return <button key={rod.id} className={rodId === rod.id ? "on" : ""} onClick={() => chooseRod(rod)} disabled={fishState.phase === "game"} aria-pressed={rodId === rod.id}><span>{rod.icon}</span><b>{rod.name}</b><small>{rod.note}</small><em>{rodId === rod.id ? "사용 중" : owned ? "들기" : `${rod.price.toLocaleString()}원`}</em><i className="rod-bar" style={{ width: `${rod.bar * 220}%` }} /></button>; })}</div>
          <div className="panel-heading"><div><span className="eyebrow">BAIT BAG</span><h3>미끼 가방</h3></div></div>
          <div className="bait-list">{BAITS.map(bait => <div key={bait.id} className={`bait ${selectedBait === bait.id ? "on" : ""}`}>
            <button className="bait-pick" onClick={() => setSelectedBait(bait.id)} aria-pressed={selectedBait === bait.id}><span>{bait.icon}</span><b>{bait.name}</b><small>{bait.note}</small><em>{baits[bait.id] ?? 0}개</em></button>
            <button className="bait-buy" onClick={() => buyBait(bait)}>{bait.pack}개 {bait.price.toLocaleString()}원</button>
          </div>)}</div>
          <div className="panel-heading fish-book-heading"><div><span className="eyebrow">FISH BOOK</span><h3>물고기 도감</h3></div><span className="plot-count">{FISH.filter(fish => fishLog[fish.id]).length}/{FISH.length}</span></div>
          <p className="hint">지금 {season}에 잡히는 물고기{fishMul > 1 ? ` · 희귀 확률 ×${fishMul.toFixed(1)}` : ""}</p>
          <div className="fish-list">{seasonFish.map(fish => <div key={fish.id} className={`fish-entry ${fishLog[fish.id] ? "caught" : ""} ${fish.rarity === "전설" ? "legend" : ""}`}><span>{fishLog[fish.id] ? fish.icon : "❔"}</span><b>{fishLog[fish.id] || fish.rarity !== "전설" ? fish.name : "???"}</b><small className={`rarity rarity-${fish.rarity}`}>{fish.rarity}</small><i>{fishLog[fish.id] ? `${fishLog[fish.id]}마리` : `${fish.price.toLocaleString()}원`}</i></div>)}</div>
          <div className="season-book">{SEASONS.map(s => { const total = FISH.filter(fish => fish.season === s).length; return <span key={s}>{SEASON_ICON[s]} {FISH.filter(fish => fish.season === s && fishLog[fish.id]).length}/{total}</span>; })}</div>
        </aside>
      </div>}

      {tab === "casino" && <div className="game-grid">
        <section className="panel casino-panel">
          <div className="panel-heading"><div><span className="eyebrow">BACK ALLEY</span><h3>뒷골목 도박장</h3></div><div className="shop-tabs casino-tabs" role="tablist">{([["parity", "🎲 홀짝"], ["slot", "🎰 슬롯머신"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={casinoGame === id} className={casinoGame === id ? "active" : ""} onClick={() => setCasinoGame(id)} disabled={Boolean(rolling) || slotSpinning > 0}>{label}</button>)}</div></div>
          {casinoGame === "slot" ? <>
          <div className={`slot-machine ${slotSpinning ? "spinning" : lastSlot ? (lastSlot.payout ? "win" : "lose") : ""}`}>
            <div className="slot-top">★ 월루 잭팟 ★</div>
            <div className="slot-reels">{slotReels.map((icon, i) => <b key={i} className={i >= 3 - slotSpinning ? "blur" : ""}>{icon}</b>)}</div>
            <p className="dice-result">{slotSpinning ? "드르르르…" : lastSlot ? (lastSlot.payout ? `${lastSlot.multiplier}배! +${lastSlot.payout.toLocaleString()}원` : `꽝! -${lastSlot.bet.toLocaleString()}원`) : "같은 그림 3개를 맞춰 보세요!"}</p>
          </div>
          </> : <>
          <div className={`dice-table ${rolling ? "rolling" : lastRoll ? (lastRoll.payout ? "win" : "lose") : ""}`}>
            <div className="dice-cup">{rolling ? <><b>🎲</b><b>🎲</b></> : lastRoll ? <><b>{DICE_FACES[lastRoll.dice[0] - 1]}</b><b>{DICE_FACES[lastRoll.dice[1] - 1]}</b></> : <><b>⚀</b><b>⚅</b></>}</div>
            <p className="dice-result">{rolling ? `${PARITY_NAME[rolling.pick]}에 ${rolling.bet.toLocaleString()}원… 데구르르` : lastRoll ? `합 ${lastRoll.dice[0] + lastRoll.dice[1]} · ${PARITY_NAME[lastRoll.result]} — ${lastRoll.payout ? `적중! +${lastRoll.payout.toLocaleString()}원` : `꽝! -${lastRoll.bet.toLocaleString()}원`}` : "주사위 두 개의 합이 홀일까, 짝일까?"}</p>
          </div>
          <div className="bet-row">
            <span>판돈</span>
            {BET_PRESETS.map(amount => <button key={amount} className={bet === amount ? "on" : ""} onClick={() => setBet(amount)} disabled={Boolean(rolling) || slotSpinning > 0}>{amount.toLocaleString()}</button>)}
            <button className={bet === Math.min(MAX_BET, Math.floor(money / 100) * 100) ? "on" : ""} onClick={() => setBet(Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(money / 100) * 100)))} disabled={Boolean(rolling)}>최대</button>
            <input type="number" min={MIN_BET} max={MAX_BET} step={100} value={bet} onChange={event => setBet(Math.max(MIN_BET, Math.min(MAX_BET, Math.round(Number(event.target.value) / 100) * 100 || MIN_BET)))} aria-label="판돈" disabled={Boolean(rolling)} />
          </div>
          <div className="parity-buttons">
            <button className="odd" onClick={() => placeBet("odd")} disabled={Boolean(rolling) || money < bet}><b>홀</b><small>{bet.toLocaleString()}원 → {Math.floor(bet * PAYOUT).toLocaleString()}원</small></button>
            <button className="even" onClick={() => placeBet("even")} disabled={Boolean(rolling) || money < bet}><b>짝</b><small>{bet.toLocaleString()}원 → {Math.floor(bet * PAYOUT).toLocaleString()}원</small></button>
          </div>
          </>}
          {casinoGame === "slot" && <>
            <button className="lever-button" onClick={pullLever} disabled={slotSpinning > 0 || money < bet}>🎰 레버 당기기 · {bet.toLocaleString()}원</button>
            <div className="slot-paytable">{SLOT_SYMBOLS.map(symbol => <span key={symbol.icon}>{symbol.icon}{symbol.icon}{symbol.icon}<b>×{symbol.triple}</b></span>)}<span>🍒🍒 + 아무거나<b>×{CHERRY_PAIR}</b></span></div>
          </>}
          <p className="hint">⚠ 게임 속 돈으로만 하는 놀이예요. {casinoGame === "slot" ? `슬롯의 기대 환수율은 약 ${Math.round(slotReturnRate() * 100)}%라` : `홀짝은 확률이 반반이지만 배당이 ×${PAYOUT}라`} 오래 하면 조금씩 잃게 돼요. 판돈 {MIN_BET.toLocaleString()}~{MAX_BET.toLocaleString()}원.</p>
        </section>
        <aside className="panel casino-side">
          <div className="panel-heading"><div><span className="eyebrow">RECORD</span><h3>전적</h3></div></div>
          <div className="casino-stats">
            <span><small>적중</small><b>{casinoStats.wins}</b></span><span><small>꽝</small><b>{casinoStats.losses}</b></span>
            <span className={casinoStats.net >= 0 ? "plus" : "minus"}><small>누적 손익</small><b>{casinoStats.net >= 0 ? "+" : ""}{casinoStats.net.toLocaleString()}원</b></span>
            <span><small>현재</small><b>{casinoStats.streak > 0 ? `${casinoStats.streak}연승` : casinoStats.streak < 0 ? `${-casinoStats.streak}연패` : "-"}</b></span>
            <span><small>최고 연승</small><b>{casinoStats.best}</b></span>
          </div>
          <b className="history-title">최근 결과</b>
          <div className="roll-history">{rollHistory.length === 0 ? <p>아직 기록이 없어요.</p> : rollHistory.map(roll => <span key={roll.at} className={`${roll.result} ${roll.payout ? "hit" : ""}`} title={`${roll.dice[0]}+${roll.dice[1]} · ${roll.payout ? "적중" : "꽝"}`}>{PARITY_NAME[roll.result]}</span>)}</div>
        </aside>
      </div>}

      {tab === "home" && <div className="home-grid">
        <section className="house-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">MY COTTAGE · {houseInfo.pyeong}평 · {room.width.toFixed(1)}×{room.depth.toFixed(1)}m</span><h3>{houseInfo.name}</h3></div><button className="upgrade" onClick={upgradeHouse} disabled={!nextHouse}>{nextHouse ? `${nextHouse.pyeong}평 증축 ${nextHouse.price.toLocaleString()}원` : "최대 증축"}</button></div>
          <div className="story-bar">
            <div className="story-tabs" role="tablist" aria-label="층 선택">{Array.from({ length: stories }).map((_, story) => <button key={story} role="tab" aria-selected={viewStory === story} className={viewStory === story ? "active" : ""} onClick={() => { setViewStory(story); setSelectedFurniture(null); }}>{story + 1}층</button>)}</div>
            <span>🌳 {YARD_SIZES[yardLevel - 1].name}{stories > 1 ? " · 2층집" : ""}</span>
          </div>
          {/* 3D 캔버스 위에서 방향키·Q/E로 가구를 움직이기 위한 포커스 영역 */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
          <div className="house3d-wrap" role="application" tabIndex={0} onKeyDown={houseKeys} aria-label="3D 집. 가구를 선택한 뒤 방향키로 이동, Q·E로 회전">
            {loaded && <Suspense fallback={<div className="house3d house3d-loading">3D 집을 짓는 중…</div>}>
              <House3D items={placed} room={room} wallpaper={wallpaper} floor={floor} night={seasonIndex < 0} palette={palette} avatar={{ ...avatar, ...avatarPos }} stories={stories} viewStory={viewStory} yardLevel={yardLevel} cheer={cheer} selectedId={selectedFurniture} onSelect={setSelectedFurniture} onMove={updateItem} onAvatarMove={(x, z) => setAvatarPos(pos => ({ ...pos, x, z, story: fitsInRoom(room.points, x, z, 0) ? viewStory : 0 }))} />
            </Suspense>}
          </div>
          <div className="decor-toolbar">
            <select value={selectedFurniture ?? ""} onChange={event => setSelectedFurniture(event.target.value || null)} aria-label="편집할 가구 선택">
              <option value="">가구 선택…</option><option value={AVATAR_ID}>🧍 내 아바타</option>
              {placed.filter(item => item.yard || (item.story ?? 0) === viewStory).map(item => <option key={item.instanceId} value={item.instanceId}>{item.yard ? "🌳" : `${(item.story ?? 0) + 1}층`} {item.icon} {item.name}</option>)}
            </select>
            {selectedItem && selectedItem.kind !== "wall" && <div className="rotate-row" role="group" aria-label="회전">
              <button onClick={() => rotateSelected(-45)}>↺45°</button><button onClick={() => rotateSelected(-15)}>↺15°</button>
              <input type="range" min="0" max="355" step="5" value={Math.round(selectedItem.rot)} onChange={event => rotateSelected(null, Number(event.target.value))} aria-label="회전 각도" />
              <b>{Math.round(selectedItem.rot)}°</b>
              <button onClick={() => rotateSelected(15)}>↻15°</button><button onClick={() => rotateSelected(45)}>↻45°</button>
            </div>}
            {selectedItem && <div className="tint-row" role="group" aria-label="가구 색상">{TINTS.map(color => <button key={color} className={`tint ${(selectedItem.tint ?? selectedItem.color) === color ? "on" : ""}`} style={{ background: color }} onClick={() => updateItem(selectedItem.instanceId, { tint: color })} aria-label={`색상 ${color}`} />)}<button className="tint reset" onClick={() => updateItem(selectedItem.instanceId, { tint: undefined })} aria-label="기본 색상">↺</button></div>}
            {selectedItem?.pet && <>{selectedItem.rare ? <span className="pet-info">{selectedItem.icon} <b>{PET_BUFFS[selectedItem.id].title}</b> {PET_BUFFS[selectedItem.id].text}</span> : <span className="pet-info">{selectedItem.icon} 일반 펫 · 능력 없음</span>}<button onClick={() => { setCheer({ id: selectedItem.instanceId, at: performance.now() }); setNotice(`${selectedItem.icon} ${selectedItem.name}이(가) 기분이 좋아 폴짝 뛰었어요! 💕`); }}>💕 쓰다듬기</button></>}
            {selectedItem && <><button onClick={storeFurniture}>📦 창고 보관</button><button className="sell-button" onClick={sellFurniture}>{selectedItem.pet ? "되팔기" : "판매"} (50%)</button></>}
            {selectedFurniture === AVATAR_ID && <><button onClick={() => setShowAvatar(true)}>🪞 아바타 이미지 바꾸기</button>{stories > 1 && avatarPos.story !== viewStory && <button onClick={() => setAvatarPos({ x: 0, z: 0, story: viewStory })}>🧍 아바타를 {viewStory + 1}층으로</button>}</>}
          </div>
          <p className="room-help">가구 끌기: 이동 · 가구 선택 후 휠: 회전(Shift+휠 5°) · 빈 곳 끌기: 시점 회전 · 선택 없이 휠: 확대/축소 · 방향키: 미세 이동 · Q/E: 15° 회전. 카메라 쪽 벽은 자동으로 낮아져 안이 보여요.</p>
        </section>
        <aside className="shop-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">COUNTRY SHOP</span><h3>시골 가구점</h3></div></div>
          <div className="shop-tabs" role="tablist">{([["furniture", "가구"], ["decor", "벽 장식"], ["structure", "구조"], ["yard", "마당"], ["pet", "펫"], ["interior", "인테리어"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={shopTab === id} className={shopTab === id ? "active" : ""} onClick={() => setShopTab(id)}>{label}</button>)}</div>
          {shopTab === "interior" ? <div className="theme-shop">
            {([["wall", "벽지", WALLPAPERS, wallpaper], ["floor", "바닥재", FLOORS, floor]] as const).map(([kind, title, themes, current]) => <section key={kind}><b>{title}</b><div>{themes.map(theme => { const owned = ownedThemes.includes(`${kind}:${theme.id}`);
              return <button key={theme.id} className={current === theme.id ? "on" : ""} onClick={() => buyTheme(kind, theme)}><i style={{ background: theme.swatch }} /><span>{theme.name}</span><small>{current === theme.id ? "사용 중" : owned ? "보유" : `${theme.price.toLocaleString()}원`}</small></button>; })}</div></section>)}
          </div> : <>
            {shopTab === "yard" && <div className="theme-shop structure-shop"><section><b>마당 넓히기</b><div>{YARD_SIZES.map(size => <button key={size.level} className={yardLevel === size.level ? "on" : ""} onClick={() => size.level === yardLevel + 1 ? expandYard() : undefined} disabled={size.level > yardLevel + 1}><i className="yard-icon" style={{ transform: `scale(${0.55 + size.level * 0.15})` }} /><span>{size.name}</span><small>{size.level <= yardLevel ? "보유" : `${size.price.toLocaleString()}원`}</small></button>)}</div></section><b>마당 소품 · 집 바깥 잔디 위에만 놓여요</b></div>}
            {shopTab === "structure" && <div className="theme-shop structure-shop"><section><b>2층 올리기 · {SECOND_FLOOR_PRICE.toLocaleString()}원</b><div><button className={stories > 1 ? "on" : ""} onClick={buildSecondFloor} disabled={houseLevel < 3 && stories < 2}><i className="shape-icon shape-two" /><span>{stories > 1 ? "2층 보기" : "2층 증축"}</span><small>{stories > 1 ? "완료 · 계단 포함" : houseLevel < 3 ? "18평부터 가능" : "계단·창문 포함"}</small></button></div></section><section><b>방 구조 리모델링 · {REMODEL_PRICE.toLocaleString()}원</b><div>{SHAPES.map(shape => <button key={shape.id} className={houseShape === shape.id ? "on" : ""} onClick={() => remodel(shape.id)}><i className={`shape-icon shape-${shape.id}`} /><span>{shape.name}</span><small>{houseShape === shape.id ? "현재 구조" : shape.note}</small></button>)}</div></section><b>문·창문·가벽</b></div>}
            {shopTab === "pet" ? <div className="gacha">
              <div key={gachaResult?.at ?? 0} className={`gacha-machine ${gachaResult ? (gachaResult.item.rare ? "rare" : "common") : ""}`}>
                {gachaResult ? <><span className="furniture-thumb" style={{ "--c": gachaResult.item.color } as CSSProperties}><FurnitureArt id={gachaResult.item.id} /></span><strong>{gachaResult.item.name}</strong><em>{gachaResult.item.rare ? "✨ 능력 펫!" : "일반 펫"}</em>{gachaResult.item.rare && <small>{PET_BUFFS[gachaResult.item.id].title} · {PET_BUFFS[gachaResult.item.id].text}</small>}</> : <><b>🎰</b><small>어떤 친구가 나올까요?</small></>}
              </div>
              <button className="gacha-button" onClick={drawPet} disabled={money < GACHA_PRICE}>🎰 펫 뽑기 · {GACHA_PRICE.toLocaleString()}원</button>
              <p className="hint">능력 펫 {Math.round(GACHA_RARE_CHANCE * 100)}% · 일반 펫 {100 - Math.round(GACHA_RARE_CHANCE * 100)}% · 중복 가능 · 되팔기는 가치의 50%</p>
              <details className="gacha-odds"><summary>뽑을 수 있는 펫 보기</summary>
                <b>✨ 능력 펫 (각 {(GACHA_RARE_CHANCE * 100 / FURNITURE.filter(item => item.rare).length).toFixed(1)}%)</b>
                <ul>{FURNITURE.filter(item => item.rare).map(item => <li key={item.id}>{item.icon} {item.name} — {PET_BUFFS[item.id].text} <i>되팔기 {Math.round(item.price / 2).toLocaleString()}원</i></li>)}</ul>
                <b>일반 펫 (각 {((1 - GACHA_RARE_CHANCE) * 100 / FURNITURE.filter(item => item.pet && !item.rare).length).toFixed(2)}%)</b>
                <ul className="common">{FURNITURE.filter(item => item.pet && !item.rare).map(item => <li key={item.id}>{item.icon} {item.name}</li>)}</ul>
              </details>
              <b className="my-pets-title">우리 집 펫 <em>{[...placed, ...warehouse].filter(item => item.pet).length}</em></b>
              <div className="my-pets">{[...placed, ...warehouse].filter(item => item.pet).map(item => <div key={item.instanceId} className={item.rare ? "rare" : ""}><span>{item.icon}</span><b>{item.name}</b><small>{warehouse.includes(item) ? "창고" : item.rare ? PET_BUFFS[item.id].title : "일반"}</small><button onClick={() => sellPet(item)}>{Math.round(item.price / 2).toLocaleString()}원에 되팔기</button></div>)}</div>
            </div> :
            <div className="furniture-list">{shopItems.map(item => <button key={item.id} onClick={() => buyFurniture(item)}><span className="furniture-thumb" style={{ "--c": item.color } as CSSProperties}><FurnitureArt id={item.id} /></span><span><b>{item.name}</b><small>{item.price.toLocaleString()}원</small></span><i>＋</i></button>)}</div>}
          </>}
          <section className="warehouse"><div className="warehouse-heading"><span>📦 MY STORAGE</span><b>가구 창고 <em>{warehouse.length}</em></b></div>{warehouse.length === 0 ? <p>보관한 가구가 없어요.</p> : <div className="warehouse-list">{warehouse.map(item => <div key={item.instanceId}><span className="furniture-thumb" style={{ "--c": item.tint ?? item.color } as CSSProperties}><FurnitureArt id={item.id} /></span><b>{item.name}</b><button onClick={() => restoreFurniture(item)}>꺼내기</button><button className="sell-mini" onClick={() => sellWarehouseFurniture(item)}>{Math.round(item.price * 0.5).toLocaleString()}원에 판매</button></div>)}</div>}</section>
        </aside>
      </div>}

      <section className="bottom-dock">
        <div className="message"><span>✦ 농장 소식</span><p>{notice}</p></div>
        <div className="music"><div className="record">♪</div><div><span>FARM RADIO</span><strong>{musicId ? "YouTube BGM 재생 중" : "농장에 음악을 틀어주세요"}</strong></div><input value={musicUrl} onChange={e => setMusicUrl(e.target.value)} placeholder="YouTube 링크 붙여넣기" aria-label="YouTube 링크"/><button onClick={() => { const id = getYoutubeId(musicUrl); if (id) { setMusicId(id); setNotice("🎵 농장 라디오를 켰어요."); } else setNotice("올바른 YouTube 영상 링크를 넣어주세요."); }}>재생</button></div>
      </section>
      {musicId && <iframe className="youtube-player" src={`https://www.youtube.com/embed/${musicId}?autoplay=1&loop=1&playlist=${musicId}`} title="농장 BGM" allow="autoplay; encrypted-media" />}

      {activeEvent && <div className="modal-backdrop"><section className="modal story-modal" role="dialog" aria-labelledby="story-title">
        <span className="eyebrow">VILLAGE STORY</span>
        <div className="story-icon">{activeEvent.event.icon}</div>
        <h3 id="story-title">{activeEvent.event.title}</h3>
        {activeEvent.result ? <>
          <p className="story-text">{activeEvent.result.text}</p>
          <div className="story-effects">
            {activeEvent.result.money ? <span className={activeEvent.result.money > 0 ? "good" : "bad"}>💰 {activeEvent.result.money > 0 ? "+" : ""}{activeEvent.result.money.toLocaleString()}원</span> : null}
            {activeEvent.result.buff && <span className={BUFF_INFO[activeEvent.result.buff.kind].good(activeEvent.result.buff.multiplier) ? "good" : "bad"}>{activeEvent.result.buff.label} · {BUFF_INFO[activeEvent.result.buff.kind].name} {activeEvent.result.buff.multiplier > 1 ? "+" : ""}{Math.round((activeEvent.result.buff.multiplier - 1) * 100)}% · {activeEvent.result.buff.minutes}분</span>}
            {!activeEvent.result.money && !activeEvent.result.buff && <span>별일 없이 지나갔어요.</span>}
          </div>
          <button className="save-button" onClick={() => setActiveEvent(null)}>다시 하루로</button>
        </> : <>
          <p className="story-text">{activeEvent.event.text}</p>
          <div className="story-choices">{activeEvent.event.choices.map((choice, index) => { const cost = choiceCost(index);
            return <button key={choice.label} onClick={() => chooseEventOption(index)} disabled={cost > money}><b>{index + 1}</b>{choice.label}{"chance" in choice.outcome && <small>운에 맡기기</small>}{cost > money && <small>돈이 부족해요</small>}</button>; })}</div>
        </>}
      </section></div>}

      {showAvatar && <div className="modal-backdrop" onClick={() => setShowAvatar(false)}><section className="modal avatar-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setShowAvatar(false)}>×</button>
        <span className="eyebrow">MY AVATAR</span><h3>내 아바타</h3>
        <p>상단 프로필, 낚시터, 3D 집에 나오는 내 캐릭터예요. 아래에서 고르거나, 좋아하는 캐릭터 이미지를 <b>PNG(배경 투명)</b>로 올려 주세요(최대 5MB, 256px로 줄여 저장).</p>
        <div className="avatar-preview">{avatarImg}</div>
        <div className="avatar-presets" role="group" aria-label="기본 캐릭터">
          <button className={avatar.src === DEFAULT_AVATAR ? "on" : ""} onClick={resetAvatar} aria-label="픽셀 고양이"><img src={DEFAULT_AVATAR} alt="" className="pixelated" /></button>
          {PRESET_AVATARS.map(preset => <button key={preset.id} className={avatar.preset === preset.id ? "on" : ""} onClick={() => pickPresetAvatar(preset)} aria-label={preset.name} title={preset.name}>{preset.emoji}</button>)}
        </div>
        <input ref={avatarInput} type="file" accept="image/png,.png" hidden onChange={event => uploadAvatar(event.target.files?.[0])} />
        <div className="avatar-actions"><button className="save-button" onClick={() => avatarInput.current?.click()}>🖼️ 내 캐릭터 PNG 올리기</button><button className="ghost-button" onClick={resetAvatar} disabled={avatar.src === DEFAULT_AVATAR}>기본 고양이로</button></div>
      </section></div>}

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowSettings(false)}>×</button><span className="eyebrow">TIME SETTINGS</span><h3>농장 운영 시간</h3><p>운영 시간을 네 구간으로 나눠 봄·여름·가을·겨울이 흘러가요. 시간을 바꾸면 계절 구간이 달라져 심어 둔 작물이 시들 수 있어요.</p><label>시작 시간 <strong>{startHour}:00</strong><input type="range" min="0" max="20" value={startHour} onChange={e => { const v = Number(e.target.value); setStartHour(v); if (endHour <= v + 4) setEndHour(Math.min(24, v + 4)); }} /></label><label>종료 시간 <strong>{endHour}:00</strong><input type="range" min="4" max="24" value={endHour} onChange={e => setEndHour(Math.max(startHour + 4, Number(e.target.value)))} /></label><div className="time-preview">{SEASONS.map((s, i) => <span key={s}>{SEASON_ICON[s]} {s}<b>{toClock(startHour + (endHour-startHour)/4*i)}—{toClock(startHour + (endHour-startHour)/4*(i+1))}</b></span>)}</div><button className="save-button" onClick={() => setShowSettings(false)}>이 시간으로 농사짓기</button></section></div>}
    </main>
  );
}
