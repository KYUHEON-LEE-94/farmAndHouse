"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FURNITURE, FLOORS, TINTS, WALLPAPERS, FurnitureArt, RoomShell, artAspect, itemLayout, pointToItem, type Furniture, type PlacedItem, type Theme } from "./house";
import { FISH, rollFish, type Fish, type Season } from "./fishing";
import { BUFF_INFO, EVENT_CHANCE, EVENT_CHECK_SECONDS, EVENT_COOLDOWN_MINUTES, buffMultiplier, pickEvent, resolveChoice, type Buff, type Effect, type StoryEvent } from "./events";

type Crop = { id: string; name: string; icon: string; seasons: Season[]; seed: number; sell: number; seconds: number; difficulty: string };
type Plot = { cropId: string; plantedAt: number; growSeconds?: number } | null;
type HarvestFx = { id: number; plotIndex: number; icon: string; amount: number };
type FishState = { phase: "idle" | "waiting" | "bite" | "result"; fish?: Fish; text?: string };
type ActiveEvent = { event: StoryEvent; result?: Effect };

const SEASONS: Season[] = ["봄", "여름", "가을", "겨울"];
const SEASON_ICON: Record<Season, string> = { 봄: "🌸", 여름: "☀️", 가을: "🍂", 겨울: "❄️" };
const CROPS: Crop[] = [
  { id: "strawberry", name: "딸기", icon: "🍓", seasons: ["봄"], seed: 120, sell: 310, seconds: 55, difficulty: "보통" },
  { id: "potato", name: "감자", icon: "🥔", seasons: ["봄"], seed: 70, sell: 165, seconds: 35, difficulty: "쉬움" },
  { id: "cabbage", name: "양배추", icon: "🥬", seasons: ["봄", "가을"], seed: 95, sell: 230, seconds: 50, difficulty: "보통" },
  { id: "tomato", name: "토마토", icon: "🍅", seasons: ["여름"], seed: 110, sell: 280, seconds: 50, difficulty: "보통" },
  { id: "corn", name: "옥수수", icon: "🌽", seasons: ["여름"], seed: 145, sell: 390, seconds: 75, difficulty: "어려움" },
  { id: "watermelon", name: "수박", icon: "🍉", seasons: ["여름"], seed: 220, sell: 620, seconds: 110, difficulty: "어려움" },
  { id: "sweetpotato", name: "고구마", icon: "🍠", seasons: ["가을"], seed: 130, sell: 350, seconds: 70, difficulty: "보통" },
  { id: "pumpkin", name: "호박", icon: "🎃", seasons: ["가을"], seed: 190, sell: 540, seconds: 100, difficulty: "어려움" },
  { id: "radish", name: "무", icon: "🥕", seasons: ["가을", "겨울"], seed: 80, sell: 185, seconds: 40, difficulty: "쉬움" },
  { id: "spinach", name: "시금치", icon: "🌿", seasons: ["겨울"], seed: 65, sell: 155, seconds: 32, difficulty: "쉬움" },
  { id: "greenonion", name: "대파", icon: "🧅", seasons: ["겨울"], seed: 100, sell: 255, seconds: 58, difficulty: "보통" },
  { id: "tangerine", name: "감귤", icon: "🍊", seasons: ["겨울"], seed: 240, sell: 690, seconds: 120, difficulty: "어려움" },
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

function getYoutubeId(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("?")[0];
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || url.pathname.split("/").pop() || "";
  } catch { return ""; }
  return "";
}

/** 저장된 가구를 최신 카탈로그와 합친다. 버전 4 미만은 위에서 본 방 좌표를 원근 바닥 깊이로 바꾼다. */
function hydrateItem(raw: PlacedItem & { rotation?: number }, version: number): PlacedItem | null {
  const base = FURNITURE.find(item => item.id === raw.id);
  if (!base) return null;
  let x = raw.x > 10 || version >= 3 ? raw.x : 14 + raw.x * 14;
  let y = raw.y > 10 || version >= 3 ? raw.y : 20 + raw.y * 28;
  if (version < 4) { x = Math.max(4, Math.min(96, x)); y = Math.max(3, Math.min(100, ((y - 10) / 81) * 100)); }
  return { ...base, instanceId: raw.instanceId, x, y, flip: raw.flip ?? false, tint: raw.tint };
}

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds % 60)).padStart(2, "0")}`;

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState<"farm" | "fish" | "home">("farm");
  const [money, setMoney] = useState(1500);
  const [plots, setPlots] = useState<Plot[]>(initialPlots);
  const [selectedCrop, setSelectedCrop] = useState("potato");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [houseLevel, setHouseLevel] = useState(1);
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [warehouse, setWarehouse] = useState<PlacedItem[]>([]);
  const [wallpaper, setWallpaper] = useState("stripe");
  const [floor, setFloor] = useState("oak");
  const [ownedThemes, setOwnedThemes] = useState<string[]>(["wall:stripe", "floor:oak"]);
  const [shopTab, setShopTab] = useState<"floor" | "wall" | "interior">("floor");
  const [ownedPlots, setOwnedPlots] = useState(8);
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [harvestFx, setHarvestFx] = useState<HarvestFx[]>([]);
  const [fishState, setFishState] = useState<FishState>({ phase: "idle" });
  const [fishLog, setFishLog] = useState<Record<string, number>>({});
  const [buffs, setBuffs] = useState<Buff[]>([]);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [lastEventAt, setLastEventAt] = useState(0);
  const [notice, setNotice] = useState("오늘도 흙은 정직해요. 씨앗을 심어볼까요?");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicId, setMusicId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const fishTimer = useRef<number | undefined>(undefined);
  const eventGate = useRef({ ready: false, season: "봄" as Season, lastEventAt: 0, busy: false });

  useEffect(() => {
    const saved = localStorage.getItem("four-seasons-farm");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const version = data.version ?? 1;
        setMoney(data.money ?? 1500); setPlots(data.plots ?? initialPlots); setStartHour(data.startHour ?? 9);
        setEndHour(data.endHour ?? 18); setHouseLevel(data.houseLevel ?? 1); setOwnedPlots(data.ownedPlots ?? 8);
        setPlaced((data.placed ?? []).map((item: PlacedItem) => hydrateItem(item, version)).filter(Boolean));
        setWarehouse((data.warehouse ?? []).map((item: PlacedItem) => hydrateItem(item, version)).filter(Boolean));
        setWallpaper(data.wallpaper ?? "stripe"); setFloor(data.floor ?? "oak"); setOwnedThemes(data.ownedThemes ?? ["wall:stripe", "floor:oak"]);
        setFishLog(data.fishLog ?? {}); setBuffs((data.buffs ?? []).filter((buff: Buff) => buff.expiresAt > Date.now())); setLastEventAt(data.lastEventAt ?? 0);
        setMusicId(data.musicId ?? "");
      } catch { /* start fresh */ }
    }
    setLoaded(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(timer); window.clearTimeout(fishTimer.current); };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("four-seasons-farm", JSON.stringify({ version: 4, money, plots, startHour, endHour, houseLevel, ownedPlots, placed, warehouse, wallpaper, floor, ownedThemes, fishLog, buffs, lastEventAt, musicId }));
  }, [money, plots, startHour, endHour, houseLevel, ownedPlots, placed, warehouse, wallpaper, floor, ownedThemes, fishLog, buffs, lastEventAt, musicId, loaded]);

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
  const seedPrice = (crop: Crop) => Math.round(crop.seed * seedMul);
  const salePrice = (crop: Crop) => Math.round(marketPrice(crop, marketBucket) * priceMul);
  const selectedItem = placed.find(item => item.instanceId === selectedFurniture) ?? null;

  useEffect(() => {
    if (!available.some(c => c.id === selectedCrop)) setSelectedCrop(available[0]?.id || "potato");
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps

  // 돌발 이벤트: 운영 시간 중 일정 간격으로 확률 검사, 직전 이벤트 이후 쿨다운을 둔다.
  useEffect(() => { eventGate.current = { ready: loaded && isWorkTime, season, lastEventAt, busy: Boolean(activeEvent) || showSettings || fishState.phase === "waiting" || fishState.phase === "bite" }; });
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

  function switchTab(next: typeof tab) {
    if (next !== "fish" && (fishState.phase === "waiting" || fishState.phase === "bite")) { window.clearTimeout(fishTimer.current); setFishState({ phase: "idle" }); }
    setTab(next);
  }

  const timeLabel = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const nextSeason = seasonIndex >= 0 && seasonIndex < 3 ? SEASONS[seasonIndex + 1] : "휴식";
  const toClock = (hour: number) => `${String(Math.floor(hour)).padStart(2,"0")}:${String(Math.round((hour % 1) * 60)).padStart(2,"0")}`;

  function plant(index: number) {
    if (!isWorkTime) return setNotice(`농장은 ${startHour}:00에 문을 열어요. 시간 설정에서 바꿀 수 있어요.`);
    const crop = CROPS.find(c => c.id === selectedCrop)!;
    if (!crop.seasons.includes(season)) return setNotice(`${crop.name}은 ${crop.seasons.join("·")} 작물이에요.`);
    const growSeconds = Math.round(crop.seconds * growthMul);
    if (growSeconds > seasonSecondsLeft) return setNotice(`${season}이 ${formatClock(seasonSecondsLeft)} 뒤 끝나요. ${crop.name}은(는) 그 전에 다 자라지 못해요.`);
    const price = seedPrice(crop);
    if (money < price) return setNotice("씨앗을 살 돈이 부족해요. 익은 작물을 수확해 보세요.");
    const next = [...plots]; next[index] = { cropId: crop.id, plantedAt: Date.now(), growSeconds };
    setPlots(next); setMoney(m => m - price); setNotice(`${crop.icon} ${crop.name}을(를) 심었어요. ${growSeconds}초 뒤 수확해요!`);
  }

  function clearWithered(index: number, crop: Crop) {
    const next = [...plots]; next[index] = null; setPlots(next);
    setNotice(`🥀 계절이 지나 시든 ${crop.name}을(를) 걷어냈어요. 제철 씨앗을 심어볼까요?`);
  }

  function harvest(index: number, plot: NonNullable<Plot>, crop: Crop) {
    const progress = (Date.now() - plot.plantedAt) / 1000 / (plot.growSeconds ?? crop.seconds);
    if (progress < 1) return setNotice(`${crop.name}이(가) 아직 자라는 중이에요. 조금만 기다려주세요.`);
    const amount = salePrice(crop);
    const fx = { id: Date.now(), plotIndex: index, icon: crop.icon, amount };
    const next = [...plots]; next[index] = null; setPlots(next); setMoney(m => m + amount);
    setHarvestFx(items => [...items, fx]); window.setTimeout(() => setHarvestFx(items => items.filter(item => item.id !== fx.id)), 1100);
    playCoinSound();
    setNotice(`짤랑~ ${crop.icon} ${crop.name}을(를) 오늘 시세 ${amount.toLocaleString()}원에 팔았어요!`);
  }

  function expandField() {
    const price = 2400 + (ownedPlots - 8) * 700;
    if (ownedPlots >= 16) return setNotice("밭은 이미 최대 크기예요.");
    if (money < price) return setNotice(`밭 두 칸을 넓히려면 ${price.toLocaleString()}원이 필요해요.`);
    setMoney(value => value - price); setOwnedPlots(value => value + 2);
    setPlots(current => [...current, null, null]);
    setNotice(`🌱 밭 두 칸을 새로 샀어요! 이제 ${ownedPlots + 2}칸에서 농사지을 수 있어요.`);
  }

  function castLine() {
    if (!isWorkTime) return setNotice("밤에는 강물이 차가워 낚시터가 쉬어요.");
    window.clearTimeout(fishTimer.current);
    setFishState({ phase: "waiting" });
    fishTimer.current = window.setTimeout(() => {
      setFishState({ phase: "bite" });
      fishTimer.current = window.setTimeout(() => setFishState({ phase: "result", text: "앗, 물고기가 미끼만 먹고 달아났어요." }), BITE_WINDOW_MS);
    }, 2000 + Math.random() * 3500);
  }

  function reelIn() {
    window.clearTimeout(fishTimer.current);
    if (fishState.phase === "waiting") return setFishState({ phase: "result", text: "너무 일찍 챘어요! 물고기가 놀라 도망갔어요." });
    const fish = rollFish(season, fishMul);
    setMoney(value => value + fish.price);
    setFishLog(log => ({ ...log, [fish.id]: (log[fish.id] ?? 0) + 1 }));
    setFishState({ phase: "result", fish });
    playCoinSound(fish.rarity === "전설" ? [660, 880, 1100, 1320, 1760] : fish.rarity === "희귀" ? [880, 1100, 1320] : [880, 1320]);
    setNotice(fish.rarity === "전설" ? `✨ 전설의 ${fish.name}을(를) 낚았어요!! ${fish.price.toLocaleString()}원에 박물관이 사 갔어요!` : `🎣 ${fish.name}(${fish.rarity})을(를) 낚아 ${fish.price.toLocaleString()}원에 팔았어요.`);
  }

  function chooseEventOption(index: number) {
    if (!activeEvent) return;
    const result = resolveChoice(activeEvent.event.choices[index]);
    if (result.money) setMoney(value => Math.max(0, value + result.money!));
    const buff = result.buff;
    if (buff) setBuffs(items => [...items.filter(item => item.expiresAt > Date.now() && item.label !== buff.label), { id: `${buff.kind}-${Date.now()}`, kind: buff.kind, label: buff.label, multiplier: buff.multiplier, expiresAt: Date.now() + buff.minutes * 60000 }]);
    setActiveEvent({ ...activeEvent, result });
    setNotice(`${activeEvent.event.icon} ${result.text}`);
  }

  function choiceCost(index: number) {
    const outcome = activeEvent?.event.choices[index].outcome;
    if (!outcome) return 0;
    const costs = "chance" in outcome ? [outcome.success.money ?? 0, outcome.fail.money ?? 0] : [outcome.money ?? 0];
    return Math.max(0, -Math.min(...costs));
  }

  function upgradeHouse() {
    const price = houseLevel === 1 ? 4500 : 9000;
    if (houseLevel >= 3) return setNotice("집은 이미 가장 넓어요!");
    if (money < price) return setNotice(`증축하려면 ${price.toLocaleString()}원이 필요해요.`);
    setMoney(m => m - price); setHouseLevel(l => l + 1); setNotice("🔨 증축 완료! 집이 넓어지고 지붕도 새로 올렸어요.");
  }

  function defaultSpot(item: Furniture, count: number) {
    if (item.kind === "wall") return { x: 25 + (count * 17) % 55, y: 35 };
    if (item.kind === "rug") return { x: 50, y: 60 };
    return { x: 22 + (count * 13) % 58, y: 45 + (count % 3) * 18 };
  }

  function buyFurniture(item: Furniture) {
    if (money < item.price) return setNotice(`${item.name}을(를) 사려면 ${item.price.toLocaleString()}원이 필요해요.`);
    const instanceId = `${item.id}-${Date.now()}`;
    setMoney(m => m - item.price); setPlaced(p => [...p, { ...item, instanceId, ...defaultSpot(item, placed.length), flip: false }]);
    setSelectedFurniture(instanceId);
    setNotice(`${item.icon} ${item.name}을(를) 집에 들였어요. 끌어서 자리를 잡아주세요.`);
  }

  function buyTheme(kind: "wall" | "floor", theme: Theme) {
    const key = `${kind}:${theme.id}`, apply = kind === "wall" ? setWallpaper : setFloor;
    if (ownedThemes.includes(key)) { apply(theme.id); return setNotice(`🎨 ${theme.name}(으)로 바꿨어요.`); }
    if (money < theme.price) return setNotice(`${theme.name}은(는) ${theme.price.toLocaleString()}원이에요.`);
    setMoney(value => value - theme.price); setOwnedThemes(items => [...items, key]); apply(theme.id);
    setNotice(`🎨 ${theme.name}을(를) 시공했어요! 이제 언제든 무료로 바꿀 수 있어요.`);
  }

  function roomPoint(event: React.PointerEvent) {
    const rect = roomRef.current!.getBoundingClientRect();
    return { left: ((event.clientX - rect.left) / rect.width) * 100, top: ((event.clientY - rect.top) / rect.height) * 100 };
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, item: PlacedItem) {
    if (!roomRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = roomPoint(event), layout = itemLayout(item);
    dragRef.current = { id: item.instanceId, dx: point.left - layout.left, dy: point.top - layout.top };
    setSelectedFurniture(item.instanceId);
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || !roomRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = roomPoint(event);
    setPlaced(items => items.map(item => item.instanceId === drag.id ? { ...item, ...pointToItem(item.kind, point.left - drag.dx, point.top - drag.dy) } : item));
  }

  function updateSelected(patch: (item: PlacedItem) => Partial<PlacedItem>) {
    if (!selectedFurniture) return;
    setPlaced(items => items.map(item => item.instanceId === selectedFurniture ? { ...item, ...patch(item) } : item));
  }

  function nudge(event: React.KeyboardEvent, item: PlacedItem) {
    const step = event.shiftKey ? 6 : 2;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === "f" || event.key === "F") { setSelectedFurniture(item.instanceId); return setPlaced(items => items.map(it => it.instanceId === item.instanceId ? { ...it, flip: !it.flip } : it)); }
    const move = moves[event.key]; if (!move) return;
    event.preventDefault(); setSelectedFurniture(item.instanceId);
    const layout = itemLayout(item);
    const next = item.kind === "wall" ? pointToItem(item.kind, layout.left + move[0] * 0.72, layout.top + move[1] * 0.5) : pointToItem(item.kind, layout.left + move[0] * 0.8, layout.top + move[1] * 0.4);
    setPlaced(items => items.map(it => it.instanceId === item.instanceId ? { ...it, ...next } : it));
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
    setPlaced(items => [...items, { ...item, ...defaultSpot(item, 2) }]); setSelectedFurniture(item.instanceId);
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

  const lamps = placed.filter(item => item.id === "lamp");
  const shopItems = FURNITURE.filter(item => shopTab === "wall" ? item.kind === "wall" : item.kind !== "wall");
  const seasonFish = FISH.filter(fish => fish.season === season);

  return (
    <main className={`app season-${seasonIndex >= 0 ? seasonIndex : 4}`}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">田</span><div><h1>사계농가</h1><p>오늘 심고, 천천히 사는 집</p></div></div>
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

      {activeBuffs.length > 0 && <section className="buff-bar" aria-label="적용 중인 효과">
        {activeBuffs.map(buff => { const info = BUFF_INFO[buff.kind], good = info.good(buff.multiplier), percent = Math.round((buff.multiplier - 1) * 100);
          return <span key={buff.id} className={`buff-chip ${good ? "good" : "bad"}`}><b>{good ? "▲" : "▼"} {buff.label}</b>{info.name} {percent > 0 ? "+" : ""}{percent}%<i>{formatClock(Math.ceil((buff.expiresAt - nowMs) / 1000))}</i></span>; })}
      </section>}

      <nav className="tabs" aria-label="게임 공간">
        <button className={tab === "farm" ? "active" : ""} onClick={() => switchTab("farm")}>🌱 텃밭</button>
        <button className={tab === "fish" ? "active" : ""} onClick={() => switchTab("fish")}>🎣 낚시터</button>
        <button className={tab === "home" ? "active" : ""} onClick={() => switchTab("home")}>🏡 나의 집</button>
      </nav>

      {tab === "farm" && <div className="game-grid">
        <section className="farm-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">MY FIELD</span><h3>햇살 텃밭</h3></div><span className="plot-count">{plots.filter(Boolean).length}/{plotCount} 재배 중</span></div>
          <div className={`plots plots-${plotCount}`}>
            {Array.from({ length: plotCount }).map((_, index) => {
              const plot = plots[index] || null; const crop = plot ? CROPS.find(c => c.id === plot.cropId)! : null;
              const withered = Boolean(plot && seasonPeriod(plot.plantedAt, startHour, endHour) !== currentPeriod);
              const progress = plot && crop ? Math.min(100, ((nowMs - plot.plantedAt) / 1000 / (plot.growSeconds ?? crop.seconds)) * 100) : 0;
              return <button key={index} className={`plot ${withered ? "withered" : progress >= 100 ? "ready" : ""}`} onClick={() => plot && crop ? (withered ? clearWithered(index, crop) : harvest(index, plot, crop)) : plant(index)}>
                {crop && withered ? <><span className="plant">🥀</span><span className="plot-label">시듦 · 치우기</span></> : crop ? <><span className="plant">{progress < 35 ? "🌱" : progress < 75 ? "🌿" : crop.icon}</span><span className="plot-label">{progress >= 100 ? "수확하기" : `${Math.floor(progress)}%`}</span><span className="grow-bar"><i style={{ width: `${progress}%` }} /></span></> : <><span className="soil-lines">╱ ╱ ╱</span><span className="plot-label">심기</span></>}
                {harvestFx.filter(fx => fx.plotIndex === index).map(fx => <span className="harvest-fx" key={fx.id}><b>{fx.icon}</b><i>＋{fx.amount.toLocaleString()}원</i><em>✦</em><em>✦</em><em>●</em></span>)}
              </button>;
            })}
          </div>
        </section>
        <aside className="seed-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">SEED BOX · 5분 시세</span><h3>{season} 씨앗 상자</h3></div><span className="market-timer">{formatClock(marketSecondsLeft)}</span></div>
          <p className="hint">한국의 노지 재배 시기를 바탕으로 고른 작물이에요.</p>
          <div className="crop-list">{cropCards}</div>
          <div className="field-shop"><div><b>🌾 밭 두 칸 확장</b><small>{ownedPlots >= 16 ? "최대 확장 완료" : `${(2400 + (ownedPlots - 8) * 700).toLocaleString()}원 · 최대 16칸`}</small></div><button onClick={expandField} disabled={ownedPlots >= 16}>구매</button></div>
          <div className="tip">🥀 계절이 바뀌면 지난 계절에 심은 작물은 모두 시들어요. 남은 시간을 확인하고 심으세요.</div>
        </aside>
      </div>}

      {tab === "fish" && <div className="game-grid">
        <section className="panel fish-panel">
          <div className="panel-heading"><div><span className="eyebrow">RIVERSIDE</span><h3>{season} 강가 낚시터</h3></div><span className="plot-count">전설 출현 0.1%</span></div>
          <div className={`pond phase-${fishState.phase}`}>
            <div className="pond-bank"><span className="angler">🧑‍🌾</span></div>
            <div className="pond-water"><span className="ripple r1" /><span className="ripple r2" /><span className="bobber" />{fishState.phase === "bite" && <span className="bite-mark">!</span>}</div>
            {fishState.phase === "result" && <div className={`catch-card ${fishState.fish?.rarity === "전설" ? "legend" : ""}`}>
              {fishState.fish ? <><b>{fishState.fish.icon}</b><strong>{fishState.fish.name}</strong><span className={`rarity rarity-${fishState.fish.rarity}`}>{fishState.fish.rarity}</span><small>{fishState.fish.note}</small><em>＋{fishState.fish.price.toLocaleString()}원</em></> : <><b>💨</b><small>{fishState.text}</small></>}
            </div>}
          </div>
          <div className="fish-controls">
            <p>{fishState.phase === "waiting" ? "찌가 흔들리길 기다리는 중… 입질 전에 채면 놓쳐요." : fishState.phase === "bite" ? "입질이 왔어요! 지금 당겨요!" : "낚싯대를 던지고, 찌가 쑥 들어가면 재빨리 당기세요."}</p>
            {fishState.phase === "waiting" || fishState.phase === "bite" ? <button className={`reel-button ${fishState.phase === "bite" ? "hot" : ""}`} onClick={reelIn}>🎣 당기기!</button> : <button className="reel-button" onClick={castLine} disabled={!isWorkTime}>{fishState.phase === "result" ? "다시 던지기" : "낚싯대 던지기"}</button>}
          </div>
        </section>
        <aside className="panel fish-book">
          <div className="panel-heading"><div><span className="eyebrow">FISH BOOK</span><h3>물고기 도감</h3></div><span className="plot-count">{FISH.filter(fish => fishLog[fish.id]).length}/{FISH.length}</span></div>
          <p className="hint">지금 {season}에 잡히는 물고기{fishMul > 1 ? ` · 희귀 확률 ×${fishMul.toFixed(1)}` : ""}</p>
          <div className="fish-list">{seasonFish.map(fish => <div key={fish.id} className={`fish-entry ${fishLog[fish.id] ? "caught" : ""} ${fish.rarity === "전설" ? "legend" : ""}`}><span>{fishLog[fish.id] ? fish.icon : "❔"}</span><b>{fishLog[fish.id] || fish.rarity !== "전설" ? fish.name : "???"}</b><small className={`rarity rarity-${fish.rarity}`}>{fish.rarity}</small><i>{fishLog[fish.id] ? `${fishLog[fish.id]}마리` : `${fish.price.toLocaleString()}원`}</i></div>)}</div>
          <div className="season-book">{SEASONS.map(s => <span key={s}>{SEASON_ICON[s]} {FISH.filter(fish => fish.season === s && fishLog[fish.id]).length}/4</span>)}</div>
        </aside>
      </div>}

      {tab === "home" && <div className="home-grid">
        <section className="house-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">MY COTTAGE</span><h3>{["", "작은 농가", "햇살 가득 농가", "꿈의 전원주택"][houseLevel]}</h3></div><button className="upgrade" onClick={upgradeHouse}>{houseLevel >= 3 ? "최대 증축" : `증축 ${houseLevel === 1 ? "4,500" : "9,000"}원`}</button></div>
          <div className={`house-scene level-${houseLevel}`}>
            <span className="sky-sun" /><span className="cloud c1" /><span className="cloud c2" />
            <div className="house">
              <div className="roof"><i className="chimney"><b /><b /><b /></i>{houseLevel >= 2 && <i className="roof-window" />}{houseLevel >= 3 && <i className="roof-window second" />}</div>
              <div className="house-body">
                <div ref={roomRef} className="room" onPointerDown={event => { if (event.target === event.currentTarget || (event.target as Element).closest(".room-shell")) setSelectedFurniture(null); }}>
                  <RoomShell wallpaper={wallpaper} floor={floor} />
                  {placed.map(item => { const layout = itemLayout(item);
                    return <button key={item.instanceId} className={`placed-item kind-${item.kind} ${selectedFurniture === item.instanceId ? "selected" : ""}`} style={{ left: `${layout.left}%`, top: `${layout.top}%`, width: `${layout.width}%`, zIndex: layout.z, "--c": item.tint ?? item.color } as CSSProperties} onPointerDown={event => startDrag(event, item)} onPointerMove={moveDrag} onPointerUp={() => { dragRef.current = null; }} onKeyDown={event => nudge(event, item)} aria-label={`${item.name} — 끌거나 방향키로 이동, F로 뒤집기`}><FurnitureArt id={item.id} flip={item.flip} /></button>; })}
                  <div className="room-dim" />
                  <span className="pendant-glow" />
                  {lamps.map(item => { const layout = itemLayout(item); const height = layout.width * artAspect(item.id) * 1.6;
                    return <span key={`glow-${item.instanceId}`} className="lamp-glow" style={{ left: `${layout.left}%`, top: `${layout.top - height * 0.86}%`, width: `${layout.width * 5}%` }} />; })}
                </div>
              </div>
              <div className="foundation" />
            </div>
            <div className="ground"><span>🌼</span><span>🌿</span><span>🌷</span><span>🌿</span></div>
          </div>
          <div className="decor-toolbar">
            <span>{selectedItem ? `${selectedItem.name} 편집 중` : "가구를 눌러 선택하세요"}</span>
            <button onClick={() => updateSelected(item => ({ flip: !item.flip }))} disabled={!selectedItem}>⇋ 좌우 반전</button>
            <div className="tint-row" role="group" aria-label="가구 색상">{TINTS.map(color => <button key={color} className={`tint ${(selectedItem?.tint ?? selectedItem?.color) === color ? "on" : ""}`} style={{ background: color }} onClick={() => updateSelected(() => ({ tint: color }))} disabled={!selectedItem} aria-label={`색상 ${color}`} />)}<button className="tint reset" onClick={() => updateSelected(() => ({ tint: undefined }))} disabled={!selectedItem} aria-label="기본 색상">↺</button></div>
            <button onClick={storeFurniture} disabled={!selectedItem}>📦 창고 보관</button>
            <button className="sell-button" onClick={sellFurniture} disabled={!selectedItem}>판매 (50%)</button>
          </div>
          <p className="room-help">가구는 바닥 깊이에 따라 크기가 바뀌고, 앞에 둔 가구가 뒤의 가구를 가려요. 벽 장식은 벽에만 걸 수 있어요. 방향키로 미세 이동, F로 좌우 반전.</p>
        </section>
        <aside className="shop-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">COUNTRY SHOP</span><h3>시골 가구점</h3></div></div>
          <div className="shop-tabs" role="tablist">{([["floor", "가구"], ["wall", "벽 장식"], ["interior", "인테리어"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={shopTab === id} className={shopTab === id ? "active" : ""} onClick={() => setShopTab(id)}>{label}</button>)}</div>
          {shopTab === "interior" ? <div className="theme-shop">
            {([["wall", "벽지", WALLPAPERS, wallpaper], ["floor", "바닥재", FLOORS, floor]] as const).map(([kind, title, themes, current]) => <section key={kind}><b>{title}</b><div>{themes.map(theme => { const owned = ownedThemes.includes(`${kind}:${theme.id}`);
              return <button key={theme.id} className={current === theme.id ? "on" : ""} onClick={() => buyTheme(kind, theme)}><i style={{ background: theme.swatch }} /><span>{theme.name}</span><small>{current === theme.id ? "사용 중" : owned ? "보유" : `${theme.price.toLocaleString()}원`}</small></button>; })}</div></section>)}
          </div> : <div className="furniture-list">{shopItems.map(item => <button key={item.id} onClick={() => buyFurniture(item)}><span className="furniture-thumb" style={{ "--c": item.color } as CSSProperties}><FurnitureArt id={item.id} /></span><span><b>{item.name}</b><small>{item.price.toLocaleString()}원</small></span><i>＋</i></button>)}</div>}
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

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowSettings(false)}>×</button><span className="eyebrow">TIME SETTINGS</span><h3>농장 운영 시간</h3><p>운영 시간을 네 구간으로 나눠 봄·여름·가을·겨울이 흘러가요. 시간을 바꾸면 계절 구간이 달라져 심어 둔 작물이 시들 수 있어요.</p><label>시작 시간 <strong>{startHour}:00</strong><input type="range" min="0" max="20" value={startHour} onChange={e => { const v = Number(e.target.value); setStartHour(v); if (endHour <= v + 4) setEndHour(Math.min(24, v + 4)); }} /></label><label>종료 시간 <strong>{endHour}:00</strong><input type="range" min="4" max="24" value={endHour} onChange={e => setEndHour(Math.max(startHour + 4, Number(e.target.value)))} /></label><div className="time-preview">{SEASONS.map((s, i) => <span key={s}>{SEASON_ICON[s]} {s}<b>{toClock(startHour + (endHour-startHour)/4*i)}—{toClock(startHour + (endHour-startHour)/4*(i+1))}</b></span>)}</div><button className="save-button" onClick={() => setShowSettings(false)}>이 시간으로 농사짓기</button></section></div>}
    </main>
  );
}
