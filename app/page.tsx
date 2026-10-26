"use client";
import "./neogul.css";
import { hasArmorPrerequisite } from "./raid/armorRequirements";

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FURNITURE, isSellable, FLOORS, FURNITURE_GACHA_PRICE, furnitureGachaOdds, gachaPool, GACHA_LEGEND_CHANCE, GACHA_PRICE, GACHA_RARE_CHANCE, HOUSE_SIZES, PET_BUFFS, TIER_NAME, rollGachaFurniture, rollPet, REMODEL_PRICE, SECOND_FLOOR_PRICE, SHAPES, TINTS, WALLPAPERS, WALL_HEIGHT, YARD_SIZES, FurnitureArt, fitsInRoom, fitsInYard, roomFor, wallInfo, type Furniture, type PlacedItem, type Room, type RoomShape, type ShopGroup, type Theme, isResizable, RUG_SCALE } from "./house";
import { DEFAULT_PLACE, WEATHER_REFRESH_MINUTES, WEATHER_RETRY_SECONDS, fetchWeather, weatherEffect, type WeatherState } from "./weather";
import { ALL_FISH, BAITS, BARE_HAND, FISH, HIDDEN_CHANCE, LEGEND_CHANCE, RARITY_WEIGHT, RODS, SPECIAL_FISH, SPOTS, STARTER_BAIT, rollFish, rollSpecialFish, type Bait, type Fish, type FishingSpot, type Rod, type Season } from "./fishing";
import type { FishingResult } from "./fishingGame";
import { BUFF_INFO, EVENT_CHANCE, EVENT_CHECK_SECONDS, EVENT_COOLDOWN_MINUTES, PRICE_EVENT_COUNT, RECENT_EVENT_LIMIT, buffMultiplier, consumePriceBuffs, pickEvent, priceBuffFactor, resolveChoice, type Buff, type Effect, type EventContext, type StoryEvent } from "./events";
import { BLACKJACK_TAUNTS, DEALER_IDLE, JACKPOT_GRUMBLES, LOSE_TAUNTS, NEAR_MISS_TAUNTS, PARITY_TAUNTS, STREAK_TAUNTS, WIN_GRUMBLES, cardLabel, dealerLine, dealerShouldHit, drawCard, handValue, isBlackjack, settleBlackjack, type BlackjackOutcome, type Card } from "./casino";
import { BET_PRESETS, BLACKJACK_PAYOUT, BLACKJACK_WIN, CHERRY_PAIR, DICE_FACES, MIN_BET, PARITY_NAME, PAYOUT, PARITY_WIN_CHANCE, SLOT_SYMBOLS, BLACKJACK_ODDS, parityOf, rollParity, slotMultiplier, slotOdds, slotReturnRate, spinReel, type Parity, type Roll } from "./casino";
import { GUIDE_DONE_KEY, GUIDE_STEPS } from "./guide";
import { QtyBuy } from "./qtyBuy";
import { MainMenu } from "./MainMenu";
import { NeogulMascot } from "./NeogulMascot";
import { CasinoDealer } from "./CasinoDealer";
import type { CasinoReaction, CasinoReactionKind } from "./casinoPresentation";
import { CookingGame } from "./CookingGame";
import { HuntingGround } from "./HuntingGround";
import RaidPanel, { BattlePetGacha, BattlePetRoster, RaidCraftView, RaidGearView } from "./raid/RaidPanel";
import { ALL_RAID_ITEMS, enhanceLimit, RAID_DATA_FLOOR, gearOf, SPECIAL_MASTERY, RAID_BALANCE_VERSION, ARMORS, BATTLE_PETS, DUPLICATE_SHARDS, EVOLUTION_CHANGE, PET_EXCHANGE, PET_GACHA, PET_LEVELS, rollBattlePet, EMPTY_RAID, FLOOR_REWARDS, HUNT_COMMON_LOOT, HUNT_RARE_LOOT, LIFE_MATS, RAID_ENABLED, RAID_ITEMS, RAID_MAX_FLOOR, zoneCommon, type ArmorSlot, type Drop, type Evolution, type RaidSave } from "./raid/data";
import { applyEnhance, nextStep, rollEnhance, setEvolution, pityChance, rollDrops } from "./raid/forge";
import { WEAPON_CRAFT, weaponDef } from "./raid/weapons";
import { breakthrough, gearChanges, recordOf, updateProgress } from "./raid/progress";
import type { ForgeActions } from "./raid/RaidPanel";
import type { FoodSlot, RaidResult } from "./raid/engine";
import CoinGame from "./CoinGame";
import { COIN_ENABLED, COIN_MIN_QTY, coinBoard, settleCoin, type CoinHoldings } from "./coin";
import { ALL_LOOT, HUNT_ENABLED, HUNT_TEST_UNLOCK_ALL, HUNT_TICKET_MINUTES, HUNT_TICKET_PRICE, WEAPONS, type Weapon } from "./hunting";
import { TEST_MODE, ownsItem } from "./testMode";
import { FARM_V2_ENABLED, FISH_V2_ENABLED } from "./farm/ui";
import { KitchenPanel } from "./KitchenPanel";
import LunchPanel, { LunchBag } from "./cooking/LunchPanel";
import { LUNCHES, lunchRecipe } from "./cooking/recipes";
import { useLunchCooking } from "./cooking/useLunchCooking";
import { DISHES, DISH_GRADES, KITCHEN_ENABLED, dishEffectText, gradeChances, rollGrade, type Dish } from "./kitchen";
import { reservedToItemKeys, categoryLocks, replaceCategoryLocks, restoreItemLocks, type ItemLocks } from "./stock";
import { EXPLORE_ENABLED, FORAGE, forageKey } from "./explore/data";
import ExplorePanel from "./explore/ExplorePanel";
import { nextRareMisses, type RunResult } from "./explore/engine";
import { EMPTY_EXPLORATION, explorationUnlockMet, restoreExploration, villageUnlockMet, type ExplorationCheckpoint, type ExplorationState } from "./explore/types";
import { lunchPower, lunchUnlocked, restoreLunchBuff, type LunchBuff } from "./cooking/lunch";
import { addCookedDish, restoreCookedDishIds, restoreCookingBatch, type CookingBatch } from "./cooking/batch";
import { EMPTY_VILLAGE, restoreVillage, type VillageState } from "./village/types";
import { VILLAGE_ENABLED, FACILITIES } from "./village/data";
import { applyDelivery, cancelDelivery, completable, completeStage, takeCount } from "./village/logic";
import VillagePanel from "./village/VillagePanel";
import { migrateInventory, pickCategory, replaceCategory, type Inventory, type ItemCategory } from "./items";
import { dailyOrders, type Order } from "./orders";
import { EMPTY_WORKSHOP, RECIPES, WORKSHOP_MAX_SLOTS, WORKSHOP_V2_ENABLED, goodsInfo, goodsPrice, jobInfo, processResult, rawValue, workshopSlotPrice, type Recipe, type Stock, type Workshop } from "./workshop";
import WorkshopLifePanel, { type ProcBatch } from "./WorkshopLifePanel";
import { COOP_RATE, EMPTY_MARKET, FREE_PER_CYCLE, OVERFLOW_RATE, demandLeft, freeLeft, nextFactor, normalizeMarket, saturationOf, sellMany, takeOne, type MarketState } from "./market";
import { AFFECTION_MAX, FULL_PER_FEED, FULL_REFUSE, PET_BASE, petBugPenalty, PET_FOODS, PET_MAX_LEVEL, PET_POWER, PLAY_AFFECTION, PLAY_COOLDOWN_MIN, WALK_AFFECTION, WALK_COOLDOWN_MIN, addAffection, friendSaleBonus, whiteTigerBugReduction, fullness, josa, newCare, petAbility, tigerDebuff, type PetCare, type PetFood } from "./pets";
import { AccountError, CLOUD_SYNC_SECONDS, accountCall, packSave, readSession, saveSummary, unpackSave, writeSession, type Session, readCloudBase, writeCloudBase } from "./account";
import { AVATAR_STORAGE_KEY, BLACKCAT_AVATAR, DEFAULT_AVATAR, PIXEL_CAT_AVATAR, PRESET_AVATARS, emojiAvatar, readAvatarFile, type StoredAvatar } from "./avatar";
import { scaleRemaining, cycleCrop, plantingAllowance, reservePlanting, restorePlantingLedger, type PlantingLedger, BUG_CHANCE, BUG_CHECK_SECONDS, BUG_SECONDS, CAN_CAPACITY, CANS, CROPS, HARVEST_TOOLS, PLANT_TOOLS, SPREADERS, STARTER_FERT, QUALITIES, CROP_BOOK_REWARDS, type CropRecord,  STORAGE_MAX, STORAGE_START, STORAGE_STEP, parseProduceKey, produceKey, storagePrice, storedQuality, migrateStorageSlots, SEASON_WARN_SECONDS, seasonOmen, MAX_PLOTS, fieldPrice, fieldColumns, canArea, waterCheckpoints, type HarvestTool, type WateringCan, FERTILIZERS, applyFertilizer, plotStatus, type Crop, type Fertilizer, type Plot } from "./farming";

import { EffectBurst, EffectGacha, EquipmentPanel } from "./EquipmentPanel";
import { EFFECT_PRICE, rollEffectReward, type EffectReward, emptyEquipment, equipEffect, restoreEquipment, type EffectSlot, type Equipment } from "./equipment";

import BossScreen, { BOSS_MODES, type BossMode } from "./bossScreen";
import ColorPicker from "./colorPicker";

const House3D = lazy(() => import("./house3d"));
const FishingGame = lazy(() => import("./fishingGame"));
const AVATAR_ID = "avatar";

type HarvestFx = { id: number; plotIndex: number; icon: string; amount: number; stars: string };
type FishState = { phase: "idle" | "waiting" | "bite" | "game" | "result"; fish?: Fish; bait?: Bait; text?: string; perfect?: boolean; price?: number; stored?: boolean; reward?: string };
type ActiveEvent = { event: StoryEvent; result?: Effect };

const SEASONS: Season[] = ["봄", "여름", "가을", "겨울"];
const SEASON_ICON: Record<Season, string> = { 봄: "🌸", 여름: "☀️", 가을: "🍂", 겨울: "❄️" };
/** 일반 물고기 카드 그림(public/images/fishing/fish-{id}.webp). */
const FISH_ART = new Set(["minnow", "chub", "crucian", "carp", "pondsmelt", "trout"]);
const fishArt = (fish: { id: string; name: string; icon: string }, className = "fish-art") => FISH_ART.has(fish.id) ? <span className={className} style={{ backgroundImage: `url("/images/fishing/fish-${fish.id}.webp")` }} role="img" aria-label={fish.name} /> : null;
const LEGEND_ART: Record<string, string> = {
  "legend-spring": "spring",
  "legend-spring-2": "spring-2",
  "legend-summer": "summer",
  "legend-summer-2": "summer-2",
  "legend-autumn": "autumn",
  "legend-autumn-2": "autumn-2",
  "legend-winter": "winter",
  "legend-winter-2": "winter-2",
};
// 3D 집 바깥 풍경 색. 마지막은 운영 시간 밖(밤).
const PALETTES = [
  { sky: "#cfe7f2", grass: "#9cc57a", leaf: "#f4b8c8" },
  { sky: "#a9d8f0", grass: "#86b65e", leaf: "#5f9e4f" },
  { sky: "#f2dcc0", grass: "#b9a35c", leaf: "#e0883e" },
  { sky: "#dce8ef", grass: "#e9f0f2", leaf: "#f4f8fa" },
  { sky: "#1f2a40", grass: "#33443a", leaf: "#2f4538" },
];

const initialPlots: Plot[] = Array(8).fill(null);
/** 파산했을 때 하루 한 번 받는 월루 지원금. */
const BAILOUT_AMOUNT = 300;
const NO_IDS: string[] = [];
/** 희귀 어획 버프(이벤트·날씨·고양이) 합산 상한. */
const FISH_BOOST_MAX = 1.5;
/** 이 금액 미만이면 파산으로 본다. */
const BAILOUT_THRESHOLD = 50;
const BITE_WINDOW_MS = 1300;
/** 새 낚시터 화면의 장소 분위기 한 줄. */
const FISH_MOOD: Record<string, string> = { river: "물결이 잔잔한 오후", lake: "거울 같은 호수 위로 바람이 불어요", sea: "방파제에 파도 소리가 부서져요", valley: "차가운 물이 바위 사이로 흘러요", reservoir: "안개 속에 감춰진 깊은 물" };

function marketPrice(crop: Crop, bucket: number) {
  return cycleCrop(crop, bucket).price;
}

/** 특정 시각이 속한 계절 구간. 같은 날 같은 계절일 때만 같은 값이 나온다. */
function seasonPeriod(time: number, startHour: number, endHour: number) {
  const date = new Date(time);
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const day = date.toDateString();
  if (hour < startHour || hour >= endHour) return `${day}-rest`;
  return `${day}-${Math.min(3, Math.floor(((hour - startHour) / (endHour - startHour)) * 4))}`;
}

/** 보스 키 화면일 때는 모든 효과음을 끈다. */
let quietMode = false;

/** 계절 예고용 맑은 풍경 소리. */
function playChime() {
  if (quietMode) return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx(), t = context.currentTime;
  [1318, 1568, 1976, 2637].forEach((freq, i) => {
    const voice = context.createOscillator(), gain = context.createGain(), start = t + i * 0.18;
    voice.type = "sine"; voice.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
    voice.connect(gain); gain.connect(context.destination); voice.start(start); voice.stop(start + 1.25);
  });
  window.setTimeout(() => context.close(), 2200);
}

function playCoinSound(notes = [880, 1320]) {
  if (quietMode) return;
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
  if (quietMode) return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx(), gain = context.createGain(), oscillator = context.createOscillator();
  oscillator.type = "sawtooth"; oscillator.frequency.setValueAtTime(190, context.currentTime);
  oscillator.frequency.linearRampToValueAtTime(240, context.currentTime + 0.25); oscillator.frequency.linearRampToValueAtTime(180, context.currentTime + 0.5);
  gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
  oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.6);
  window.setTimeout(() => context.close(), 800);
}

/** 씨앗 심는 "퐁" 소리. */
function playPlop() {
  if (quietMode) return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx(), t = context.currentTime, voice = context.createOscillator(), gain = context.createGain();
  voice.type = "sine"; voice.frequency.setValueAtTime(320, t); voice.frequency.exponentialRampToValueAtTime(140, t + 0.12);
  gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  voice.connect(gain); gain.connect(context.destination); voice.start(t); voice.stop(t + 0.18);
  window.setTimeout(() => context.close(), 400);
}

/** 짧은 킥킥 / 메롱 효과음. 말풍선과 맞춰 시작하고 1초 안에 끝낸다. */
function playLaugh(tease = false) {
  if (quietMode) return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx(), t = context.currentTime + 0.15;
  for (let i = 0; i < (tease ? 3 : 4); i++) {
    const start = t + i * 0.14, voice = context.createOscillator(), gain = context.createGain(), filter = context.createBiquadFilter();
    voice.type = "triangle"; voice.frequency.setValueAtTime(tease ? 600 - i * 100 : 460 - i * 18 + (i % 2) * 60, start); voice.frequency.exponentialRampToValueAtTime(tease ? 240 : 300 - i * 10, start + 0.1);
    filter.type = "bandpass"; filter.frequency.value = 1100; filter.Q.value = 1.4;
    gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(0.045, start + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
    voice.connect(filter); filter.connect(gain); gain.connect(context.destination); voice.start(start); voice.stop(start + 0.12);
  }
  window.setTimeout(() => context.close(), 1000);
}

/** 지면 나오는 "빠밤빠~" 실망 효과음. */
function playSadTrombone() {
  if (quietMode) return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx(), gain = context.createGain(), oscillator = context.createOscillator(), vibrato = context.createOscillator(), depth = context.createGain();
  oscillator.type = "sawtooth"; gain.gain.value = 0.0001; gain.connect(context.destination); oscillator.connect(gain);
  vibrato.frequency.value = 6; depth.gain.value = 0; vibrato.connect(depth); depth.connect(oscillator.frequency);
  const t = context.currentTime;
  [392, 370, 349, 294].forEach((frequency, i) => oscillator.frequency.setValueAtTime(frequency, t + i * 0.32));
  depth.gain.setValueAtTime(8, t + 0.96);
  gain.gain.exponentialRampToValueAtTime(0.08, t + 0.03); gain.gain.setValueAtTime(0.08, t + 1.5); gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
  oscillator.start(t); vibrato.start(t); oscillator.stop(t + 2); vibrato.stop(t + 2);
  window.setTimeout(() => context.close(), 2300);
}

/** 벌레를 잡을 때 "찍" 하는 짧은 소리. */
function playSquish() {
  if (quietMode) return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx(), t = context.currentTime, thud = context.createOscillator(), gain = context.createGain();
  thud.type = "triangle"; thud.frequency.setValueAtTime(220, t); thud.frequency.exponentialRampToValueAtTime(55, t + 0.12);
  gain.gain.setValueAtTime(0.25, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  thud.connect(gain); gain.connect(context.destination); thud.start(t); thud.stop(t + 0.2);
  const length = Math.floor(context.sampleRate * 0.12), buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  const noise = context.createBufferSource(), filter = context.createBiquadFilter(), noiseGain = context.createGain();
  filter.type = "lowpass"; filter.frequency.value = 900; noiseGain.gain.value = 0.2;
  noise.buffer = buffer; noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(context.destination); noise.start(t);
  window.setTimeout(() => context.close(), 500);
}

function playSplash() {
  if (quietMode) return;
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

type LegacyItem = { id: string; instanceId: string; x: number; y?: number; z?: number; rot?: number; tint?: string; wall?: number; u?: number; h?: number; story?: number; host?: string; side?: number; locked?: boolean; nickname?: string; sx?: number; sz?: number };

/** 저장된 가구를 최신 카탈로그와 합친다. 버전 5 미만의 2D 좌표(%)는 3D 방 좌표(m)로 옮긴다. */
/** 저장용으로 줄인 가구: 정의(이름·아이콘 등)는 빼고 id와 놓인 자리만. 불러올 때 hydrateItem이 채운다. */
const slimItem = (item: PlacedItem) => ({ id: item.id, instanceId: item.instanceId, x: Math.round(item.x * 1000) / 1000, z: Math.round(item.z * 1000) / 1000, rot: item.rot, tint: item.tint, wall: item.wall, u: item.u, h: item.h, story: item.story, host: item.host, side: item.side, locked: item.locked, nickname: item.nickname, sx: item.sx, sz: item.sz });

/** 키울 수 있는 펫 수(가챠로 넘치게 뽑으면 넘친 만큼 자동 되팔기). */
const PET_LIMIT = 100;

/** 작물이 이만큼 이상 심겨 있으면 밭 연출을 가볍게(흔들림·반짝임 끔). */
const LITE_FIELD_PLANTS = 16;

/**
 * 탐험 결과 확정(한 번만): 채집물을 통합 창고에, 판 수·희귀 천장·발견 기록을 갱신하고 체크포인트를 지운다.
 * 체크포인트 runId와 결과 runId가 다르면(이미 정산한 판) 창고는 건드리지 않는다.
 */
function settleExploration(inventory: Inventory, exploration: ExplorationState, result: RunResult) {
  if (exploration.checkpoint && exploration.checkpoint.runId !== result.runId) return { inventory, exploration };
  const next = { ...inventory }, finds = { ...exploration.discoveredFinds };
  for (const [id, n] of Object.entries(result.bag)) { if (n <= 0 || !FORAGE.some(item => item.id === id)) continue; next[forageKey(id)] = (next[forageKey(id)] ?? 0) + n; finds[id] = (finds[id] ?? 0) + n; }
  const rareFound = result.rareFound || Object.keys(result.bag).some(id => FORAGE.find(item => item.id === id)?.rare);
  const misses = exploration.rareMissesByRegion[result.regionId] ?? 0;
  return { inventory: next, exploration: { ...exploration, totalRuns: exploration.totalRuns + 1, rareMissesByRegion: { ...exploration.rareMissesByRegion, [result.regionId]: nextRareMisses(misses, rareFound) }, discoveredFinds: finds, checkpoint: undefined } };
}

/** 예전 버전이 기본으로 틀던 BGM. 저장에 이 값만 남아 있으면 꺼진 상태로 불러온다(이용자가 고른 음악은 유지). */
const LEGACY_DEFAULT_BGM = "VRfbFDUybRU";
const UNSELLABLE_NOTICE = "🎖️ 기념품이라 판매할 수 없어요. 창고에 보관하거나 집에 꾸며 주세요.";
function hydrateItem(raw: LegacyItem, version: number, room: Room): PlacedItem | null {
  const base = FURNITURE.find(item => item.id === raw.id);
  if (!base) return null;
  if (version >= 5) return { ...base, instanceId: raw.instanceId, x: raw.x, z: raw.z ?? 0, rot: raw.rot ?? 0, tint: raw.tint, wall: raw.wall, u: raw.u, h: raw.h, story: raw.story, host: raw.host, side: raw.side, locked: raw.locked, nickname: raw.nickname, sx: raw.sx, sz: raw.sz };
  let x = raw.x, y = raw.y ?? 50;
  if (version < 3 && x <= 10) { x = 14 + x * 14; y = 20 + y * 28; }
  if (version < 4) y = ((y - 10) / 81) * 100;
  if (base.kind === "wall") return { ...base, instanceId: raw.instanceId, x: 0, z: 0, rot: 0, tint: raw.tint, wall: 0, u: Math.min(0.9, Math.max(0.1, x / 100)), h: base.fixedMount ? base.mount : Math.min(2.2, Math.max(0.6, WALL_HEIGHT * (1 - y / 100))) };
  return { ...base, instanceId: raw.instanceId, x: (x / 100 - 0.5) * room.width * 0.85, z: (Math.min(100, Math.max(0, y)) / 100 - 0.5) * room.depth * 0.85, rot: 0, tint: raw.tint };
}

/** 방이 줄거나 구조가 바뀌어 밖으로 나간 가구를 안쪽으로 당긴다. 마당 소품은 마당 안으로 옮긴다. */
function fitToRoom(item: PlacedItem, room: Room, yardLevel = 1): PlacedItem {
  if (item.pet && (fitsInRoom(room.points, item.x, item.z, 0.25) || fitsInYard(room, yardLevel, item.x, item.z, 0.3))) return item;
  if (item.yard || item.pet) {
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
  const [tab, setTab] = useState<"farm" | "fish" | "hunt" | "book" | "home" | "pets" | "casino" | "gacha" | "equipment" | "raid" | "workshop" | "explore" | "village">("farm");
  const [bookSeason, setBookSeason] = useState<Season | "special" | null>(null);
  const [bet, setBet] = useState(100);
  const [rolling, setRolling] = useState<{ pick: Parity; bet: number } | null>(null);
  const [lastRoll, setLastRoll] = useState<Roll | null>(null);
  const [rollHistory, setRollHistory] = useState<Roll[]>([]);
  const [casinoGame, setCasinoGame] = useState<"parity" | "slot" | "blackjack" | "coin">("parity");
  // 도박장 코인 보유분("자리:회차" → 개수·들인 돈). 끝난 코인은 다음 시계 틱에 정산한다.
  const [coinHoldings, setCoinHoldings] = useState<CoinHoldings>({});
  const [bj, setBj] = useState<{ phase: "idle" | "player" | "dealer" | "done"; player: Card[]; dealer: Card[]; bet: number; outcome?: BlackjackOutcome; payout?: number }>({ phase: "idle", player: [], dealer: [], bet: 0 });
  const [slotReels, setSlotReels] = useState(["🍒", "⭐", "7️⃣"]);
  const [slotSpinning, setSlotSpinning] = useState(0);
  const [lastSlot, setLastSlot] = useState<{ bet: number; payout: number; multiplier: number } | null>(null);
  const [casinoFx, setCasinoFx] = useState<CasinoReaction | null>(null);
  const [dealerIdle] = useState(DEALER_IDLE[0]);
  const previousDealerLine = useRef("");
  const [slotTension, setSlotTension] = useState(false);
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
  // 도구: seed(심기) · hand(수확) · water(물뿌리개) · 거름 id
  const [tool, setTool] = useState("seed");
  const [canWater, setCanWater] = useState(CAN_CAPACITY);
  const [ownedCans, setOwnedCans] = useState<string[]>(["tin"]);
  const [ownedHands, setOwnedHands] = useState<string[]>(["hand"]);
  const [handId, setHandId] = useState("hand");
  const [ownedPlanters, setOwnedPlanters] = useState<string[]>(["seedhand"]);
  const [planterId, setPlanterId] = useState("seedhand");
  const [ownedSpreaders, setOwnedSpreaders] = useState<string[]>(["pinch"]);
  const [spreaderId, setSpreaderId] = useState("pinch");
  const [fertStock, setFertStock] = useState<Record<string, number>>(STARTER_FERT);
  // 비료는 5번 키 하나: 마지막으로 고른 비료를 기억하고, 도구함 비료 칸을 눌러 메뉴에서 고른다.
  const [fertId, setFertId] = useState(FERTILIZERS[0].id);
  const [fertMenu, setFertMenu] = useState(false);
  // 농산물 창고: 묶음(작물|품질|황금) → 개수
  // 통합 인벤토리(app/items.ts): 농산물·물고기·가공품·요리를 키 하나의 형식으로 저장한다.
  const [inventory, setInventory] = useState<Inventory>({});
  const produce = useMemo(() => pickCategory(inventory, "crop"), [inventory]);
  const fishStock = useMemo(() => pickCategory(inventory, "fish"), [inventory]);
  const goods = useMemo(() => pickCategory(inventory, "goods"), [inventory]);
  /** 분류별 설정 함수: 그 분류만 바꾸고 다른 분류는 그대로 둔다(기존 코드와 같은 모양). */
  const categorySetter = (category: ItemCategory) => (update: Record<string, number> | ((view: Record<string, number>) => Record<string, number>)) =>
    setInventory(current => replaceCategory(current, category, typeof update === "function" ? update(pickCategory(current, category)) : update));
  const setProduce = categorySetter("crop"), setFishStock = categorySetter("fish"), setGoods = categorySetter("goods");
  const dishStock = useMemo(() => pickCategory(inventory, "dish"), [inventory]), setDishStock = categorySetter("dish");
  const huntStock = useMemo(() => pickCategory(inventory, "hunt"), [inventory]), setHuntStock = categorySetter("hunt");
  // 탑 토벌: 진행 저장과 탑 재료(통합 인벤토리 raid 분류)
  const [raid, setRaid] = useState<RaidSave>(EMPTY_RAID);
  // 로컬 테스트 모드: 돈을 무제한으로(1억 원 아래로 내려가면 다시 채운다). 배포 빌드에서는 TEST_MODE가 false라 동작하지 않는다.
  useEffect(() => {
    if (!TEST_MODE) return;
    const timer = window.setInterval(() => setMoney(value => (value < 50_000_000 ? 99_999_999 : value)), 400);
    return () => window.clearInterval(timer);
  }, []);
  const raidItems = useMemo(() => pickCategory(inventory, "raid"), [inventory]), setRaidItems = categorySetter("raid");
  // 사냥 무기: 상점에서 산다(로컬 테스트 중에는 HUNT_TEST_UNLOCK_ALL로 모두 열림).
  const [ownedWeapons, setOwnedWeapons] = useState<string[]>(["hand"]);
  const [weaponId, setWeaponId] = useState("hand");
  // 사냥터 입장권 만료 시각(3,000원에 1분)
  const [huntTicket, setHuntTicket] = useState(0);
  // 주방(사냥 준비물): 지금 하는 요리(미니게임), 방금 나온 결과
  const [kitchenKind, setKitchenKind] = useState<"battle" | "lunch">("battle");
  const [cooking, setCooking] = useState<{ dish: Dish; at: number } | null>(null);
  const [cookResult, setCookResult] = useState<{ dish: Dish; grade: number; score: number } | null>(null);
  const [storageCap, setStorageCap] = useState(STORAGE_START);
  // 창고 잠금: 아이템 키 → 잠금(stock.ts). 예전 produceLocks·fishLocks는 불러올 때 합치고, 화면 코드는 분류별 보기로 쓴다.
  const [itemLocks, setItemLocks] = useState<ItemLocks>({});
  const lockSetter = (category: ItemCategory) => (update: Record<string, boolean> | ((view: Record<string, boolean>) => Record<string, boolean>)) =>
    setItemLocks(locks => replaceCategoryLocks(locks, category, typeof update === "function" ? update(categoryLocks(locks, category)) : update));
  const produceLocks = useMemo(() => categoryLocks(itemLocks, "crop"), [itemLocks]), setProduceLocks = lockSetter("crop");
  // 물고기 잠금(물고기 id → 잠금). 잠근 물고기는 팔거나 요리에 쓰지 않는다.
  const fishLocks = useMemo(() => categoryLocks(itemLocks, "fish"), [itemLocks]), setFishLocks = lockSetter("fish");
  const forageStock = useMemo(() => pickCategory(inventory, "forage"), [inventory]), setForageStock = categorySetter("forage");
  // 신규 생활 콘텐츠 저장(LIFE_CONTENT_EXPANSION_SPEC 6.2): 탐험·도시락·마을·요리 이력·진행 중 일괄 조리
  const [exploration, setExploration] = useState<ExplorationState>(EMPTY_EXPLORATION);
  const [lunchBuff, setLunchBuff] = useState<LunchBuff | null>(null);
  const [village, setVillage] = useState<VillageState>(EMPTY_VILLAGE);
  const [cookedDishIds, setCookedDishIds] = useState<string[]>([]);
  const [cookingBatch, setCookingBatch] = useState<CookingBatch | null>(null);
  const [storageSort, setStorageSort] = useState<"value" | "count" | "name">("value");
  const [storageFilter, setStorageFilter] = useState<"all" | "order" | "calm" | "golden">("all");
  // 통합 창고 이름 검색(작물·물고기·사냥 소재·채집물 공통)
  const [storageQuery, setStorageQuery] = useState("");
  // 가공 공방: 담그는 중인 작업, 만든 가공품
  const [workshop, setWorkshop] = useState<Workshop>(EMPTY_WORKSHOP);
  // 통합 창고는 화면 가운데 큰 팝업으로 띄운다(E 키로 열고 닫기).
  const [showStorage, setShowStorage] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [sellConfirm, setSellConfirm] = useState<{ kind: "market" | "coop"; cropId?: string } | null>(null);
  const [harvestMode, setHarvestMode] = useState<"sell" | "store">("store");
  const [sidePanel, setSidePanel] = useState<"seed" | "storage" | "orders" | "workshop" | "kitchen">("seed");
  // 공방 하위 탭: 생활 가공(시간형·판매) / 강화 가공(즉시·강화 소재)
  const [petKind, setPetKind] = useState<"life" | "battle">("life");
  const [workshopView, setWorkshopView] = useState<"life" | "raid" | "cook">("life");
  // 시장 포화: 작물별로 최근에 판 양(시간이 지나면 회복)
  const [marketState, setMarketState] = useState<MarketState>(EMPTY_MARKET);
  // 오늘의 주문서: 날짜별로 납품한 주문 id
  const [ordersDone, setOrdersDone] = useState<{ date: string; ids: string[]; deposits?: Record<string, Record<string, number>> }>({ date: "", ids: [], deposits: {} });
  // 작물 도감: 작물별 수확 기록, 받은 계절 보상
  const [cropLog, setCropLog] = useState<Record<string, CropRecord>>({});
  const [specialPlantings, setSpecialPlantings] = useState<PlantingLedger>({ date: "", counts: {} });
  const specialPlantingsRef = useRef<PlantingLedger>({ date: "", counts: {} });
  const [cropRewards, setCropRewards] = useState<string[]>([]);
  const [bookKind, setBookKind] = useState<"fish" | "crop">("fish");
  const justFertilized = useRef(new Set<number>());
  const [toolShop, setToolShop] = useState<"seed" | "hand" | "water" | "fert">("seed");
  const justPlanted = useRef(new Set<number>());
  const justHarvested = useRef(new Set<number>());
  const [canId, setCanId] = useState("tin");
  const [hoverArea, setHoverArea] = useState<number[]>([]);
  /** 새 텃밭 화면의 선택 구획(마지막으로 가리킨 도구 범위). */
  const [fieldSel, setFieldSel] = useState<{ cells: number[]; label: string }>({ cells: [], label: "" });
  /** 선택 구획을 마지막으로 계산한 칸·도구(같은 칸 위에서 반복 계산하지 않게). */
  const selKeyRef = useRef("");
  const [fishPicker, setFishPicker] = useState<"rod" | "bait" | null>(null);
  const [seedSort, setSeedSort] = useState<"reco" | "short" | "profit">("reco");
  const plotsRef = useRef<HTMLDivElement>(null);
  const [waterFx, setWaterFx] = useState<{ id: number; plotIndex: number }[]>([]);
  const [squashFx, setSquashFx] = useState<{ id: number; plotIndex: number; x: number; y: number }[]>([]);
  const justWatered = useRef(new Map<number, number>());
  const pendingPours = useRef(0);
  const [gachaResult, setGachaResult] = useState<{ item: Furniture; at: number } | null>(null);
  const [furnitureGachaResult, setFurnitureGachaResult] = useState<{ item: Furniture | null; at: number } | null>(null);
  const [ownedEffects, setOwnedEffects] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<Equipment>(emptyEquipment);
  const [effectResult, setEffectResult] = useState<EffectReward | null>(null);
  const effectDrawLock = useRef(false);
  const [gachaCollected, setGachaCollected] = useState<string[]>([]);
  const [cheer, setCheer] = useState<{ id: string; at: number } | undefined>(undefined);
  const [fishState, setFishState] = useState<FishState>({ phase: "idle" });
  /** 이번 접속에서 최근에 낚은 물고기(결과 팝업 대신 목록으로 이어서 처리) */
  const [recentCatches, setRecentCatches] = useState<{ id: string; fish: Fish; price: number; stored: boolean; perfect: boolean; at: number }[]>([]);
  const [fishLog, setFishLog] = useState<Record<string, number>>({});
  const [fishHarvestMode, setFishHarvestMode] = useState<"sell" | "store">("store");
  const [baits, setBaits] = useState<Record<string, number>>(STARTER_BAIT);
  const [selectedBait, setSelectedBait] = useState("worm");
  const [ownedRods, setOwnedRods] = useState<string[]>(["bamboo"]);
  const [rodId, setRodId] = useState("bamboo");
  const [spotId, setSpotId] = useState("river");
  const [spotConfirm, setSpotConfirm] = useState<FishingSpot | null>(null);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherPlace, setWeatherPlace] = useState(DEFAULT_PLACE);
  const [weatherFailed, setWeatherFailed] = useState(false);
  const [weatherTry, setWeatherTry] = useState(0);
  const [tickets, setTickets] = useState<Record<string, number>>({});
  const [buffs, setBuffs] = useState<Buff[]>([]);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [lastEventAt, setLastEventAt] = useState(0);
  /** 최근 이벤트 id(같은 이벤트 연속 방지, RANDOM_EVENT_AUDIT 10.4) */
  const [recentEvents, setRecentEvents] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<StoredAvatar>({ src: DEFAULT_AVATAR, pixelated: false });
  const [avatarPos, setAvatarPos] = useState({ x: 0.6, z: 0.6, story: 0 });
  const [stories, setStories] = useState(1);
  const [viewStory, setViewStory] = useState(0);
  const [yardLevel, setYardLevel] = useState(1);
  const [showAvatar, setShowAvatar] = useState(false);
  const [notice, setNotice] = useState("오늘도 월급은 들어오고, 흙은 정직해요. 씨앗을 심어볼까요?");
  const [musicUrl, setMusicUrl] = useState("");
  // 농장 라디오: 기본으로 틀어 주는 음악은 없다. 이용자가 링크를 넣었을 때만 재생한다.
  const [musicId, setMusicId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [bossMode, setBossMode] = useState(false);
  const [bossTheme, setBossTheme] = useState<BossMode>("office");
  const [showPicker, setShowPicker] = useState(false);
  const [offWork, setOffWork] = useState<{ earned: number } | null>(null);
  const [notifyOffWork, setNotifyOffWork] = useState(false);
  const [dayStart, setDayStart] = useState<{ date: string; money: number } | null>(null);
  const [lastBailout, setLastBailout] = useState<string | null>(null);
  // 계정: 로그인하면 진행 상황을 서버에 맡기고, 다른 기기에서 같은 아이디로 불러온다.
  const [session, setSession] = useState<Session | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [guideStep, setGuideStep] = useState<number | null>(null);
  // 펫 키우기: 종류별 애정도·레벨·배부름·산책/교감 시각, 먹이 보유량
  const [petCare, setPetCare] = useState<Record<string, PetCare>>({});
  const [petFood, setPetFood] = useState<Record<string, number>>({});
  const [petFx, setPetFx] = useState<{ id: string; text: string; at: number; level?: boolean } | null>(null);
  const [shopMain, setShopMain] = useState<"gacha" | "food">("gacha");
  const [accountMode, setAccountMode] = useState<"login" | "register">("login");
  const [accountForm, setAccountForm] = useState({ id: "", password: "", confirm: "" });
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [cloudAt, setCloudAt] = useState<number | null>(null);
  const [pendingLoad, setPendingLoad] = useState<{ save: string; updatedAt: number; session: Session; conflict?: boolean } | null>(null);
  const suspendSave = useRef(false);
  const lastSynced = useRef("");
  const saveJob = useRef<(() => void) | null>(null);
  /** 미뤄 둔 저장을 지금 쓴다(계정 데이터로 바꾸는 중이면 쓰지 않는다). */
  const flushSave = () => { const job = saveJob.current; saveJob.current = null; if (job && !suspendSave.current) job(); };
  useEffect(() => {
    const flush = () => flushSave();
    window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", flush);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", flush); };
  }, []);
  // 계정 충돌 방지: cloudChecked = 시작할 때 계정 저장과 비교를 마쳤는지, cloudConflict = 다른 기기의 더 새 저장이 있어 자동 저장을 멈췄는지.
  const cloudChecked = useRef(false), cloudConflict = useRef(false);
  const offGate = useRef({ isWorkTime: false, secondsLeft: -1, money: 0, notify: false, dayStart: null as { date: string; money: number } | null, endHour: 18, seasonIndex: -1, seasonLeft: 0 });
  const [loaded, setLoaded] = useState(false);
  const fishTimer = useRef<number | undefined>(undefined);
  const castBait = useRef<Bait | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const eventGate = useRef({ ready: false, season: "봄" as Season, lastEventAt: 0, busy: false, ctx: { growing: 0, empty: 0, fish: 0 } as EventContext, recent: [] as string[] });
  const bugGate = useRef<{ ready: boolean; plots: Plot[]; dog: number; bugChance: number; rain: boolean }>({ ready: false, plots: [], dog: 0, bugChance: 1, rain: false });

  useEffect(() => {
    setSession(readSession());
    const saved = localStorage.getItem("four-seasons-farm");
    // 처음 온 사람(저장이 없고 가이드를 본 적 없음)에게만 기능 소개 가이드를 띄운다.
    try { if (!saved && !localStorage.getItem(GUIDE_DONE_KEY)) setGuideStep(0); } catch { /* 저장소 없음: 가이드 생략 */ }
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const restoredEquipment = restoreEquipment(data.ownedEffects, data.equipment);
        setOwnedEffects(restoredEquipment.owned); setEquipment(restoredEquipment.equipment);
        const restoredPlantings = restorePlantingLedger(data.specialPlantings);
        setSpecialPlantings(restoredPlantings); specialPlantingsRef.current = restoredPlantings;
        const version = data.version ?? 1;
        const level = data.houseLevel ?? 1, shape: RoomShape = data.houseShape ?? "rect", room = roomFor(level, shape);
        const hydrate = (list: LegacyItem[]) => (list ?? []).map(item => hydrateItem(item, version, room)).filter((item): item is PlacedItem => Boolean(item));
        setMoney(data.money ?? 1500); setPlots(data.plots ?? initialPlots); setStartHour(data.startHour ?? 9);
        setEndHour(data.endHour ?? 18); setHouseLevel(level); setHouseShape(shape); setOwnedPlots(data.ownedPlots ?? 8);
        const yard = data.yardLevel ?? 1;
        setStories(data.stories ?? 1); setYardLevel(yard); setCanWater(data.canWater ?? CAN_CAPACITY); setOwnedCans(data.ownedCans ?? ["tin"]); setCanId(data.canId ?? "tin"); setOwnedHands(data.ownedHands ?? ["hand"]); setHandId(data.handId ?? "hand"); setOwnedPlanters(data.ownedPlanters ?? ["seedhand"]); setPlanterId(data.planterId ?? "seedhand"); setOwnedSpreaders(data.ownedSpreaders ?? ["pinch"]); setSpreaderId(data.spreaderId ?? "pinch"); setFertStock(data.fertStock ?? STARTER_FERT); if (data.fertId) setFertId(data.fertId);  setStorageCap(data.storageCap ?? (data.storageSlots ? migrateStorageSlots(data.storageSlots) : STORAGE_START)); setItemLocks(restoreItemLocks(data)); setWorkshop(data.workshop ?? EMPTY_WORKSHOP);  setHarvestMode(data.harvestMode ?? "sell"); setMarketState(data.market ?? EMPTY_MARKET); setOrdersDone(data.ordersDone ?? { date: "", ids: [] }); setCropLog(data.cropLog ?? {}); setCropRewards(data.cropRewards ?? []); if (data.casinoStats) setCasinoStats(data.casinoStats); setNotifyOffWork(data.notifyOffWork ?? false); setBossTheme(data.bossTheme ?? "office"); if (data.weatherPlace) setWeatherPlace(data.weatherPlace); setGachaCollected(data.gachaCollected ?? [...new Set([...(data.placed ?? []), ...(data.warehouse ?? [])].map((item: LegacyItem) => item.id).filter((id: string) => FURNITURE.find(entry => entry.id === id)?.group === "gacha"))]); setDayStart(data.dayStart ?? null); setLastBailout(data.lastBailout ?? null); setPetCare(data.petCare ?? {}); setPetFood(data.petFood ?? {});
        let petIndex = 0;
        const movePetOut = (item: PlacedItem): PlacedItem => (!data.petsInYard && item.pet ? { ...item, story: 0, x: ((petIndex++ % 6) - 2.5) * 0.9, z: room.depth / 2 + 1.3 + Math.floor((petIndex - 1) / 6) * 0.9 } : item);
        setPlaced([...(version < 5 ? starterItems(room) : []), ...hydrate(data.placed)].map(movePetOut).map(item => fitToRoom(item, room, yard)));
        setWarehouse(hydrate(data.warehouse));
        setWallpaper(data.wallpaper ?? "stripe"); setFloor(data.floor ?? "oak"); setOwnedThemes(data.ownedThemes ?? ["wall:stripe", "floor:oak"]);
        const restoredInventory = migrateInventory(data);
        setInventory(restoredInventory); setCookedDishIds(restoreCookedDishIds(data.cookedDishIds, restoredInventory, DISHES.map(dish => dish.id)));
        const restoredExploration = restoreExploration(data.exploration);
        // 탐험 중 창을 닫았으면 마지막 10초 체크포인트의 채집물을 지금 지급하고 그 판을 끝낸다(중복 지급 없음, 3.1·9절).
        // 이어 하기 상태(snap)가 있으면 보상 없이 진행 중 판을 보관하고, 탐험 탭에서 같은 판을 이어 한다(2026-10-21).
        if (restoredExploration.checkpoint?.snap) {
          setExploration(restoredExploration);
          setNotice("🧭 진행 중인 탐험이 있어요. 탐험 탭에서 같은 자리부터 이어 해요.");
        } else if (restoredExploration.checkpoint) {
          const settled = settleExploration(restoredInventory, restoredExploration, { runId: restoredExploration.checkpoint.runId, regionId: restoredExploration.checkpoint.regionId, bag: restoredExploration.checkpoint.bag, bait: 0, rareFound: false, reason: "resume", stuns: 0, seconds: 0 });
          setInventory(settled.inventory); setExploration(settled.exploration);
          if (Object.keys(restoredExploration.checkpoint.bag).length) setNotice("🧭 지난 탐험에서 저장된 채집물을 통합 창고에 넣었어요.");
        } else setExploration(restoredExploration);
        setLunchBuff(restoreLunchBuff(data.lunchBuff)); setVillage(restoreVillage(data.village)); setCookingBatch(restoreCookingBatch(data.cookingBatch, LUNCHES.map(dish => dish.id)));
        setFishLog(data.fishLog ?? {}); setOwnedWeapons(data.ownedWeapons ?? ["hand"]); setWeaponId(data.weaponId ?? "hand"); setHuntTicket(data.huntTicket ?? 0); setRaid({ ...EMPTY_RAID, ...(data.raid ?? {}), unlockedFloor: Math.min(RAID_MAX_FLOOR, Math.max(data.raid?.unlockedFloor ?? 1, ...(data.raid?.firstClears ?? []).map((n: number) => n + 1))), weapons: { ...EMPTY_RAID.weapons, ...(data.raid?.weapons ?? {}) }, equipped: { ...EMPTY_RAID.equipped, ...(data.raid?.equipped ?? {}) }, armorOwned: data.raid?.armorOwned ?? [], battlePets: data.raid?.battlePets ?? {}, petPity: data.raid?.petPity ?? 0 });  setFishHarvestMode(data.fishHarvestMode ?? "sell"); setBaits(data.baits ?? STARTER_BAIT); setSelectedBait(data.selectedBait ?? "worm"); setOwnedRods(data.ownedRods ?? ["bamboo"]); setRodId(data.rodId ?? "bamboo"); setSpotId(data.spotId ?? "river"); setTickets(data.tickets ?? {});
        setBuffs((data.buffs ?? []).filter((buff: Buff) => buff.expiresAt > Date.now())); setLastEventAt(data.lastEventAt ?? 0); setRecentEvents(Array.isArray(data.recentEvents) ? data.recentEvents.slice(-RECENT_EVENT_LIMIT) : []);
        setAvatarPos({ x: 0.6, z: 0.6, story: 0, ...data.avatarPos }); setMusicId(data.musicId && data.musicId !== LEGACY_DEFAULT_BGM ? data.musicId : ""); setCoinHoldings(data.coinHoldings ?? {});
      } catch { /* start fresh */ }
    }
    try { const stored = localStorage.getItem(AVATAR_STORAGE_KEY); if (stored) setAvatar(JSON.parse(stored)); } catch { /* keep default */ }
    setLoaded(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(timer); window.clearTimeout(fishTimer.current); };
  }, []);

  // 신규 생활 콘텐츠 해금(LIFE_CONTENT_EXPANSION_SPEC 2.1): 조건을 한 번 만족하면 저장할 때 unlocked로 남긴다. 이미 조건을 만족한 기존 계정도 접속 시 열린다.
  const explorationOpen = exploration.unlocked || explorationUnlockMet(ownedPlots, fishLog);
  const villageOpen = village.unlocked || villageUnlockMet(exploration);

  // 저장은 0.4초 모아서 한 번 쓴다(드래그로 여러 칸을 심을 때 매번 전체 저장을 직렬화하지 않게). 숨김·종료·계정 저장 직전에는 바로 쓴다.
  useEffect(() => {
    if (!loaded || suspendSave.current) return;
    saveJob.current = () => localStorage.setItem("four-seasons-farm", JSON.stringify({ version: 5, money, plots, startHour, endHour, houseLevel, houseShape, ownedPlots, placed: placed.map(slimItem), warehouse: warehouse.map(slimItem), wallpaper, floor, ownedThemes, fishLog, fishHarvestMode, baits, selectedBait, ownedRods, rodId, spotId, tickets, buffs, lastEventAt, recentEvents, avatarPos, stories, yardLevel, canWater, ownedCans, canId, ownedHands, handId, ownedPlanters, planterId, ownedSpreaders, spreaderId, fertStock, fertId, inventory, storageCap, itemLocks, exploration: { ...exploration, unlocked: explorationOpen }, lunchBuff, village: { ...village, unlocked: villageOpen }, cookedDishIds, cookingBatch, workshop, harvestMode, market: marketState, ordersDone, ownedWeapons, weaponId, huntTicket, raid, cropLog, cropRewards, specialPlantings, casinoStats, notifyOffWork, dayStart, lastBailout, petCare, petFood, ownedEffects, equipment, gachaCollected, petsInYard: true, bossTheme, weatherPlace, musicId, coinHoldings }));
    const timer = window.setTimeout(flushSave, 400);
    return () => window.clearTimeout(timer);
  }, [money, plots, startHour, endHour, houseLevel, houseShape, ownedPlots, placed, warehouse, wallpaper, floor, ownedThemes, fishLog, fishHarvestMode, baits, selectedBait, ownedRods, rodId, spotId, tickets, buffs, lastEventAt, recentEvents, avatarPos, stories, yardLevel, canWater, ownedCans, canId, ownedHands, handId, ownedPlanters, planterId, ownedSpreaders, spreaderId, fertStock, fertId, inventory, storageCap, itemLocks, exploration, explorationOpen, lunchBuff, village, villageOpen, cookedDishIds, cookingBatch, workshop, harvestMode, marketState, ordersDone, ownedWeapons, weaponId, huntTicket, raid, cropLog, cropRewards, specialPlantings, casinoStats, notifyOffWork, dayStart, lastBailout, petCare, petFood, ownedEffects, equipment, gachaCollected, bossTheme, weatherPlace, musicId, coinHoldings, loaded]);

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
  const plantingDate = now.toDateString();
  const available = CROPS.filter(c => c.seasons.includes(season));
  const plotCount = ownedPlots;
  const marketBucket = Math.floor(nowMs / 300000);
  const marketSecondsLeft = 300 - Math.floor((nowMs / 1000) % 300);
  const activeBuffs = buffs.filter(buff => buff.expiresAt > nowMs);
  // 실제 날씨 효과는 버프 배수에 곱해진다.
  const wx = weatherEffect(weather);
  const growthMul = buffMultiplier(buffs, "growth", nowMs) * wx.growth, priceMul = buffMultiplier(buffs, "price", nowMs) * wx.price, seedMul = buffMultiplier(buffs, "seed", nowMs), fishMul = buffMultiplier(buffs, "fish", nowMs) * wx.fishRare;
  useEffect(() => { pendingPours.current = 0; }, [canWater]);

  // 키우는 펫의 고유 효과
  const pets = new Set(placed.filter(item => item.pet && (item.rare || item.legend)).map(item => item.id));
  // 펫 레벨이 오를수록 능력이 강해진다(능력 배수 PET_POWER). 집에 없는 펫은 0.
  const petLevel = (id: string) => Math.min(PET_MAX_LEVEL, petCare[id]?.level ?? 1);
  const pw = (id: string) => (pets.has(id) ? PET_POWER[petLevel(id) - 1] : 0);
  const petCanBonus = (pets.has("duck") ? Math.round(PET_BASE.duck * pw("duck")) : 0) + (pets.has("blacktortoise") ? Math.round(PET_BASE.blacktortoise * pw("blacktortoise")) : 0);
  // 일반 펫은 종류마다 레벨당 판매가 +0.01%p.
  const friendBonus = 1 + [...new Set(placed.filter(item => item.pet && !item.rare && !item.legend).map(item => item.id))].reduce((sum, id) => sum + friendSaleBonus(petLevel(id)), 0);
  const currentCan = CANS.find(item => item.id === canId) ?? CANS[0];
  const currentHand = HARVEST_TOOLS.find(item => item.id === handId) ?? HARVEST_TOOLS[0];
  const currentPlanter = PLANT_TOOLS.find(item => item.id === planterId) ?? PLANT_TOOLS[0];
  const currentSpreader = SPREADERS.find(item => item.id === spreaderId) ?? SPREADERS[0];
  const canMax = currentCan.capacity + petCanBonus;
  const bugPenalty = petBugPenalty(pw("weasel"), pw("whitetiger"));
  const today = now.toDateString();
  // 파산: 보유 자금이 50원 미만이면 너구리가 지원금을 준다(하루 한 번).
  const broke = loaded && money < BAILOUT_THRESHOLD;
  const showBailout = broke && isWorkTime && lastBailout !== today && !activeEvent && !offWork && !spotConfirm && !bossMode && !showSettings && !showAvatar && !showAccount && !showStorage && !showMissions && guideStep === null && (fishState.phase === "idle" || fishState.phase === "result");
  function takeBailout() {
    setMoney(value => value + BAILOUT_AMOUNT); setLastBailout(today); playCoinSound([523, 659, 784]);
    setNotice(`🦝 "옛다 ${BAILOUT_AMOUNT}원~ 모자라면 낚시터 가서 맨손으로 잡아 와 ㅋㅋ" (지원금은 하루 한 번)`);
  }
  function goBareFishing() {
    if (currentSpot.price > 0) setSpotId("river");
    switchTab("fish");
  }
  /** 이번 5분 씨앗값(시세 거래가에 연동) × 버프·토끼. */
  const seedPrice = (crop: Crop) => Math.round(cycleCrop(crop, marketBucket).seed * seedMul * (1 - PET_BASE.rabbit * pw("rabbit")));
  /** 포화 전 판매가(시세 × 버프·펫 효과). */
  const basePrice = (crop: Crop) => marketPrice(crop, marketBucket) * priceMul * (1 + PET_BASE.gumiho * pw("gumiho")) * friendBonus;
  // 시장 포화 슬롯: 지난 시세 주기만큼 정리한 지금 상태
  const market = normalizeMarket(marketState, marketBucket);
  /** 지금 1개 팔 때 값(시장 포화 반영). */
  const salePrice = (crop: Crop) => Math.round(basePrice(crop) * nextFactor(market, crop.id));
  /** 판 만큼 시장 압력을 올린다. */
  /** 같은 작물 여러 개를 차례로 팔 때: 개당 배수를 매기고 시장 상태를 넘겨준다. */
  const priceRun = <T extends { crop: Crop; unitBase: number; mult: number }>(list: T[], start: MarketState = market) => {
    let state = start;
    const priced = list.map(item => { const step = takeOne(state, item.crop.id); state = step.state; return { ...item, factor: step.factor, amount: Math.round(item.unitBase * step.factor * item.mult) }; });
    return { priced, state };
  };
  const selectedItem = placed.find(item => item.instanceId === selectedFurniture) ?? null;
  const room = useMemo(() => roomFor(houseLevel, houseShape), [houseLevel, houseShape]);
  const houseInfo = HOUSE_SIZES[houseLevel - 1], nextHouse = HOUSE_SIZES[houseLevel];
  const palette = PALETTES[seasonIndex >= 0 ? seasonIndex : 4];

  useEffect(() => {
    if (!available.some(c => c.id === selectedCrop)) setSelectedCrop(available[0]?.id || "potato");
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps

  // 돌발 이벤트: 운영 시간 중 일정 간격으로 확률 검사, 직전 이벤트 이후 쿨다운을 둔다.
  useEffect(() => {
    // 돌발 이벤트 등장 조건(RANDOM_EVENT_AUDIT 10.4): 자라는 작물·빈 밭·창고 물고기
    const now = Date.now(), growing = plots.filter(plot => { if (!plot) return false; const crop = CROPS.find(c => c.id === plot.cropId); return Boolean(crop) && (now - plot.plantedAt) / 1000 < (plot.growSeconds ?? crop!.seconds); }).length;
    const empty = plots.slice(0, plotCount).filter(plot => !plot).length, fish = Object.values(fishStock).reduce((t, n) => t + n, 0);
    eventGate.current = { ready: loaded && isWorkTime, season, lastEventAt, busy: Boolean(activeEvent) || Boolean(spotConfirm) || showBailout || showAccount || showStorage || showMissions || tab === "hunt" || tab === "raid" || Boolean(cooking) || Boolean(cookingBatch) || Boolean(cookResult) || guideStep !== null || showSettings || showAvatar || Boolean(offWork) || bossMode || Boolean(rolling) || slotSpinning > 0 || bj.phase === "player" || bj.phase === "dealer" || fishState.phase === "waiting" || fishState.phase === "bite" || fishState.phase === "game", ctx: { growing, empty, fish }, recent: recentEvents };
  });
  useEffect(() => {
    if (!loaded) return;
    const trigger = () => {
      const gate = eventGate.current, event = pickEvent(gate.season, gate.ctx, gate.recent);
      if (!event) return; // 지금 상태에 맞는 이벤트가 없으면 이번 검사는 건너뛴다
      setActiveEvent({ event }); setLastEventAt(Date.now()); setRecentEvents(list => [...list, event.id].slice(-RECENT_EVENT_LIMIT));
    };
    if (new URLSearchParams(window.location.search).has("event") && eventGate.current.ready) trigger();
    const timer = setInterval(() => {
      const gate = eventGate.current;
      if (!gate.ready || gate.busy || Date.now() - gate.lastEventAt < EVENT_COOLDOWN_MINUTES * 60000) return;
      if (Math.random() < EVENT_CHANCE) trigger();
    }, EVENT_CHECK_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [loaded]);

  // 벌레: 운영 시간 중 주기적으로 자라는 작물 하나에 날아온다. 제때 못 잡으면 그 작물 판매가가 깎인다.
  useEffect(() => { bugGate.current = { ready: loaded && isWorkTime, plots, dog: PET_BASE.dog * pw("dog"), bugChance: wx.bugChance * (pets.has("whitetiger") ? 1 - whiteTigerBugReduction(petLevel("whitetiger")) : 1), rain: wx.autoWater }; });
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
        if (growing.length && Math.random() < BUG_CHANCE * bugGate.current.bugChance) {
          if (Math.random() < bugGate.current.dog) { setNotice("🐶 멍멍! 강아지가 날아오던 벌레를 쫓아냈어요."); return; }
          target = growing[Math.floor(Math.random() * growing.length)];
        }
      }
      // 비 오는 날: 목마른 작물에 빗물이 자동으로 들어간다.
      if (bugGate.current.rain && Math.floor(nowTime / 1000) % 3 === 0) {
        const thirsty = current.map((plot, index) => { const crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined; return plot && crop && plotStatus(plot, crop, nowTime).thirsty ? index : -1; }).filter(index => index >= 0);
        if (thirsty.length) {
          setPlots(plots => plots.map((plot, index) => (plot && thirsty.includes(index) ? { ...plot, water: [...(plot.water ?? []), nowTime] } : plot)));
          // 빗물이 들어간 것을 보여 줘야 "물을 안 줬는데 채워졌다"고 헷갈리지 않는다.
          setWaterFx(items => [...items, ...thirsty.map(i => ({ id: nowTime + i, plotIndex: i }))]);
          window.setTimeout(() => setWaterFx(items => items.filter(item => item.id < nowTime || item.id > nowTime + 100)), 900);
          setNotice(`🌧️ 비가 와서 목마른 밭 ${thirsty.length}칸에 빗물이 들어갔어요. (실제 날씨 효과)`);
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

  // 농사 도구 단축키: 1 심기, 2 수확, 3 물뿌리개, 4 우물, 5 비료(고른 비료) (입력창에 쓰는 중이면 무시)
  useEffect(() => {
    if (tab !== "farm") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || (event.target instanceof Element && event.target.closest("input, textarea, select"))) return;
      if (event.key === "1") setTool("seed");
      else if (event.key === "2") setTool("hand");
      else if (event.key === "3") setTool("water");
      else if (event.key === "4") refillCan();
      else if (event.key === "5") holdFert();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 퇴근 알림: 운영 시간이 끝나는 순간 "월루~~" 팝업, 10분 전 예고. 하루 시작 자금을 기억해 오늘 번 돈을 보여준다.
  useEffect(() => { offGate.current = { isWorkTime, secondsLeft: isWorkTime ? Math.floor((endHour - currentHour) * 3600) : -1, money, notify: notifyOffWork, dayStart, endHour, seasonIndex, seasonLeft: seasonSecondsLeft }; });
  useEffect(() => {
    if (!loaded) return;
    let wasWorking: boolean | null = null, warnedDay = "", warnedSeason = "";
    const notify = (title: string, body: string) => {
      if (!offGate.current.notify || typeof Notification === "undefined" || Notification.permission !== "granted") return;
      try { new Notification(title, { body, icon: DEFAULT_AVATAR }); } catch { /* 일부 환경에서는 알림 생성 불가 */ }
    };
    const showOffWork = () => {
      const gate = offGate.current, earned = gate.dayStart ? gate.money - gate.dayStart.money : 0;
      setOffWork({ earned });
      playCoinSound([523, 659, 784, 1047, 784, 1047, 1319]);
      notify("월루~~! 퇴근 시간이에요 🎉", `오늘 ${earned >= 0 ? "번" : "쓴"} 돈 ${Math.abs(earned).toLocaleString()}원. 얼른 퇴근하세요!`);
    };
    if (new URLSearchParams(window.location.search).has("offwork")) showOffWork();
    const timer = setInterval(() => {
      const gate = offGate.current, today = new Date().toDateString();
      if (gate.isWorkTime && gate.dayStart?.date !== today) setDayStart({ date: today, money: gate.money });
      if (gate.isWorkTime && gate.secondsLeft > 0 && gate.secondsLeft <= 600 && warnedDay !== today) {
        warnedDay = today;
        setNotice("⏰ 퇴근 10분 전! 수확할 작물은 지금 거둬 두세요. 계절이 끝나면 시들어요.");
        notify("⏰ 퇴근 10분 전!", "수확할 작물은 지금 거둬 두세요.");
      }
      // 계절이 바뀌기 5분 전: "곧 여름" 대신 비유적인 문구로 한 번 알려 준다(마지막 계절은 퇴근 알림이 대신함).
      const seasonKey = `${today}-${gate.seasonIndex}`;
      if (gate.isWorkTime && gate.seasonIndex >= 0 && gate.seasonIndex < 3 && gate.seasonLeft > 0 && gate.seasonLeft <= SEASON_WARN_SECONDS && warnedSeason !== seasonKey) {
        warnedSeason = seasonKey;
        const omen = seasonOmen((["여름", "가을", "겨울"] as const)[gate.seasonIndex]);
        setNotice(`🍃 ${omen} 남은 작물은 서둘러 거둬 주세요.`); playChime();
        notify("🍃 계절의 기운이 바뀌어요", omen);
      }
      if (wasWorking && !gate.isWorkTime && new Date().getHours() >= gate.endHour - 1) showOffWork();
      wasWorking = gate.isWorkTime;
    }, 1000);
    return () => clearInterval(timer);
  }, [loaded]);

  async function toggleOffWorkNotify(on: boolean) {
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    const granted = typeof Notification !== "undefined" && Notification.permission === "granted";
    setNotifyOffWork(on && granted);
    setNotice(on ? (granted ? "🔔 퇴근 알림을 켰어요. 다른 창에서 일하고 있어도 알려 드릴게요." : "🔕 브라우저 알림이 차단되어 있어요. 브라우저 설정에서 알림을 허용해 주세요. (화면 안 팝업은 항상 떠요)") : "🔕 브라우저 퇴근 알림을 껐어요. 화면 안 팝업은 계속 떠요.");
  }

  // 보스 키: ESC로 엑셀 위장 화면을 켜고 끈다. 위장 중에는 소리와 BGM을 멈추고 탭 제목도 바꾼다.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setFertMenu(false); setBossMode(on => !on); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === "m" || event.key === "M") && !(event.target instanceof Element && event.target.closest("input, textarea, select, .house3d-wrap"))) { event.preventDefault(); setShowStorage(false); setShowMissions(open => !open); return; }
      if ((event.key === "e" || event.key === "E") && !(event.target instanceof Element && event.target.closest("input, textarea, select, .house3d-wrap"))) {
        event.preventDefault(); setShowMissions(false); setShowStorage(open => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    quietMode = bossMode;
    const original = document.title;
    if (bossMode) document.title = (BOSS_MODES.find(mode => mode.id === bossTheme) ?? BOSS_MODES[0]).title;
    return () => { document.title = original; };
  }, [bossMode, bossTheme]);

  // 실제 날씨: 처음과 30분마다 가져온다. 실패하면(오프라인·응답 없음) 1분 뒤 다시 시도하고, 그동안은 날씨 효과 없이 진행한다.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false, timer = 0;
    const load = () => fetchWeather(weatherPlace.lat, weatherPlace.lon, weatherPlace.name)
      .then(state => { if (cancelled) return; setWeather(state); setWeatherFailed(false); timer = window.setTimeout(load, WEATHER_REFRESH_MINUTES * 60000); })
      .catch(() => { if (cancelled) return; setWeatherFailed(true); timer = window.setTimeout(load, WEATHER_RETRY_SECONDS * 1000); });
    load();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [loaded, weatherPlace, weatherTry]);

  function useMyLocation() {
    if (!navigator.geolocation) return setNotice("이 기기에서는 위치를 쓸 수 없어요. 서울 날씨로 계속할게요.");
    navigator.geolocation.getCurrentPosition(
      position => { setWeatherPlace({ name: "내 위치", lat: position.coords.latitude, lon: position.coords.longitude }); setNotice("📍 내 위치의 날씨로 바꿨어요."); },
      () => setNotice("위치 권한이 없어 서울 날씨를 계속 쓸게요."),
      { timeout: 8000, maximumAge: 3600000 },
    );
  }

  // ---------- 계정 ----------
  /** 바뀐 진행 상황이 있으면 계정에 올린다. */
  async function syncCloud(force = false) {
    if (!session || suspendSave.current || TEST_MODE) return; // 로컬 테스트 상태가 실제 계정에 올라가지 않게
    // 시작 비교 전이거나 다른 기기 저장과 충돌 중이면 자동 저장하지 않는다(수동 저장은 서버가 다시 비교해 충돌 창을 띄운다).
    if (!force && (!cloudChecked.current || cloudConflict.current)) return;
    flushSave();
    const save = packSave();
    if (!force && save === lastSynced.current) return;
    try {
      const reply = await accountCall({ action: "save", token: session.token, save, baseAt: readCloudBase(session.id) });
      lastSynced.current = save; setCloudAt(reply.updatedAt ?? Date.now()); writeCloudBase(session.id, reply.updatedAt ?? Date.now());
      cloudChecked.current = true; cloudConflict.current = false;
      if (force) setNotice("☁️ 계정에 지금 진행 상황을 저장했어요.");
    } catch (error) {
      if (error instanceof AccountError && error.status === 409 && error.reply?.save) showCloudConflict(error.reply.save, error.reply.updatedAt ?? 0);
      else if (error instanceof AccountError && error.status === 401) { writeSession(null); setSession(null); setNotice("☁️ 로그인이 만료됐어요. 👤 계정에서 다시 로그인해 주세요."); }
      else if (force) setNotice(`☁️ 저장하지 못했어요: ${(error as Error).message}`);
    }
  }
  /** 다른 기기에서 더 최근에 저장한 게임이 있다: 자동 저장을 멈추고 불러올지 덮어쓸지 고르게 한다. */
  function showCloudConflict(save: string, updatedAt: number) {
    if (!session) return;
    cloudConflict.current = true;
    setPendingLoad({ save, updatedAt, session, conflict: true }); setShowAccount(true);
    setNotice("☁️ 다른 기기에서 더 최근에 저장한 게임이 있어요. 덮어쓰지 않도록 자동 저장을 멈췄어요.");
  }
  const syncRef = useRef(syncCloud);
  useEffect(() => { syncRef.current = syncCloud; });
  const showCloudConflictRef = useRef(showCloudConflict);
  useEffect(() => { showCloudConflictRef.current = showCloudConflict; });
  // 로그인 상태로 시작하면 먼저 계정 저장과 비교한다. 이 기기가 모르는 더 새 저장이 있으면 덮어쓰지 않고 물어본다.
  useEffect(() => {
    if (!session || TEST_MODE) return;
    cloudChecked.current = false; cloudConflict.current = false;
    let alive = true;
    accountCall({ action: "load", token: session.token }).then(reply => {
      if (!alive) return;
      const base = readCloudBase(session.id), at = reply.updatedAt ?? 0, local = packSave();
      cloudChecked.current = true;
      if (reply.save && reply.save === local) { lastSynced.current = local; writeCloudBase(session.id, at); return; }
      if (reply.save && at > base) showCloudConflictRef.current(reply.save, at);
    }).catch(error => { if (alive && error instanceof AccountError && error.status === 401) { writeSession(null); setSession(null); setNotice("☁️ 로그인이 만료됐어요. 👤 계정에서 다시 로그인해 주세요."); } });
    return () => { alive = false; };
  }, [session]);
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => syncRef.current(), CLOUD_SYNC_SECONDS * 1000);
    const onHide = () => { if (document.visibilityState === "hidden") syncRef.current(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onHide); };
  }, [session]);

  /** 계정의 저장을 이 기기에 덮어쓰고 새로 시작한다. */
  function applyCloudSave(save: string, next: Session, updatedAt: number) {
    suspendSave.current = true;
    writeCloudBase(next.id, updatedAt);
    // 덮어쓰기 전에 이 기기의 게임을 따로 백업해 둔다(혹시 모를 실수 대비).
    try { localStorage.setItem("four-seasons-farm-before-cloud", packSave()); } catch { /* 공간 부족: 백업 없이 진행 */ }
    if (!unpackSave(save)) { suspendSave.current = false; return setAccountError("저장 데이터를 읽지 못했어요."); }
    lastSynced.current = save; writeSession(next);
    window.location.reload();
  }

  async function submitAccount(event: React.FormEvent) {
    event.preventDefault();
    const id = accountForm.id.trim().toLowerCase();
    if (accountMode === "register" && accountForm.password !== accountForm.confirm) return setAccountError("비밀번호 확인이 맞지 않아요.");
    setAccountBusy(true); setAccountError("");
    try {
      if (accountMode === "register") {
        const save = packSave();
        const reply = await accountCall({ action: "register", id, password: accountForm.password, save });
        const next = { id, token: reply.token! }; writeCloudBase(id, reply.updatedAt ?? Date.now()); writeSession(next); setSession(next);
        lastSynced.current = save; setCloudAt(reply.updatedAt ?? Date.now());
        setAccountForm({ id: "", password: "", confirm: "" }); setShowAccount(false);
        setNotice(`👤 ${id} 계정을 만들었어요! 지금 진행 상황을 계정에 저장했어요. 다른 기기에서 같은 아이디로 불러올 수 있어요.`);
      } else {
        const reply = await accountCall({ action: "login", id, password: accountForm.password });
        const next = { id, token: reply.token! };
        setAccountForm({ id: "", password: "", confirm: "" });
        // 계정에 게임이 있으면, 불러올지 덮어쓸지 고르기 전까지는 로그인(자동 저장)을 시작하지 않는다.
        // 그래야 새 기기의 빈 게임이 계정의 게임을 덮어쓰는 일이 없다.
        if (reply.save) setPendingLoad({ save: reply.save, updatedAt: reply.updatedAt ?? 0, session: next });
        else { writeSession(next); setSession(next); setShowAccount(false); setNotice(`👤 ${id}(으)로 로그인했어요.`); window.setTimeout(() => syncRef.current(true), 0); }
      }
    } catch (error) {
      setAccountError((error as Error).message);
    } finally { setAccountBusy(false); }
  }

  async function reloadFromCloud() {
    if (!session) return;
    setAccountBusy(true); setAccountError("");
    try { const reply = await accountCall({ action: "load", token: session.token }); if (reply.save) setPendingLoad({ save: reply.save, updatedAt: reply.updatedAt ?? 0, session }); else setAccountError("계정에 저장된 게임이 아직 없어요."); }
    catch (error) { setAccountError((error as Error).message); }
    finally { setAccountBusy(false); }
  }

  async function logout() {
    if (session) { await syncRef.current(); accountCall({ action: "logout", token: session.token }).catch(() => undefined); }
    writeSession(null); setSession(null); setCloudAt(null); setPendingLoad(null); lastSynced.current = "";
    setNotice("👤 로그아웃했어요. 이 기기의 게임은 그대로 남아 있어요.");
  }

  // ---------- 펫 키우기 ----------
  /** 애정도를 올리고(가득 차면 레벨업) 효과를 띄운다. extra는 함께 바꿀 돌봄 기록. */
  function giveAffection(id: string, amount: number, extra: Partial<PetCare>, message: string) {
    const item = FURNITURE.find(entry => entry.id === id)!;
    const { care, leveled } = addAffection({ ...(petCare[id] ?? newCare(Date.now())), ...extra }, amount);
    setPetCare(all => ({ ...all, [id]: care }));
    const at = Date.now();
    if (leveled) {
      setPetFx({ id, text: `🎉 Lv${care.level}!`, at, level: true }); playCoinSound([523, 659, 784, 1047, 1319]);
      setNotice(`🎉 ${item.icon} ${josa(item.name, "와과")} 더 친해져서 Lv${care.level}이 됐어요! 능력: ${petAbility(id, care.level, Boolean(item.rare || item.legend))}`);
    } else {
      setPetFx({ id, text: `+${amount} 💕`, at }); setNotice(message);
    }
    window.setTimeout(() => setPetFx(fx => (fx?.at === at ? null : fx)), 1400);
  }
  const maxedPet = (id: string) => { const care = petCare[id]; return Boolean(care && care.level >= PET_MAX_LEVEL && care.affection >= AFFECTION_MAX); };

  function feedPet(id: string, food: PetFood) {
    const item = FURNITURE.find(entry => entry.id === id)!, now = Date.now(), care = petCare[id] ?? newCare(now);
    if (!petFood[food.id]) return setNotice(`${food.icon} ${josa(food.name, "이가")} 없어요. 🛍️ 상점에서 사 오세요.`);
    if (maxedPet(id)) return setNotice(`${item.icon} ${josa(item.name, "은는")} 이미 최고 레벨이에요. 이미 최고로 친해요! 💕`);
    const full = fullness(care, now);
    if (full >= FULL_REFUSE) return setNotice(`${item.icon} ${josa(item.name, "이가")} 배불러서 고개를 돌려요. (배부름 ${Math.round(full)}) 조금 뒤에 주세요.`);
    setPetFood(stock => ({ ...stock, [food.id]: (stock[food.id] ?? 0) - 1 }));
    giveAffection(id, food.affection, { full: Math.min(100, full + FULL_PER_FEED), fullAt: now }, `${item.icon} ${josa(item.name, "이가")} ${food.icon} ${josa(food.name, "을를")} 냠냠 먹었어요! 애정도 +${food.affection}`);
  }

  function walkPet(id: string) {
    const item = FURNITURE.find(entry => entry.id === id)!, now = Date.now(), care = petCare[id] ?? newCare(now);
    if (maxedPet(id)) return setNotice(`${item.icon} ${josa(item.name, "은는")} 이미 최고 레벨이에요!`);
    const left = care.walkAt + WALK_COOLDOWN_MIN * 60000 - now;
    if (left > 0) return setNotice(`${item.icon} ${josa(item.name, "은는")} 산책하고 와서 쉬는 중이에요. ${formatClock(Math.ceil(left / 1000))} 뒤에 다시 나가요.`);
    giveAffection(id, WALK_AFFECTION, { walkAt: now }, `🦮 ${item.icon} ${josa(item.name, "와과")} 동네 한 바퀴 산책했어요! 애정도 +${WALK_AFFECTION}`);
  }

  function playPet(id: string) {
    const item = FURNITURE.find(entry => entry.id === id)!, now = Date.now(), care = petCare[id] ?? newCare(now);
    if (maxedPet(id)) return setNotice(`${item.icon} ${josa(item.name, "은는")} 이미 최고 레벨이에요!`);
    const left = care.playAt + PLAY_COOLDOWN_MIN * 60000 - now;
    if (left > 0) return setNotice(`${item.icon} ${josa(item.name, "이가")} 아직 신나서 헥헥거려요. ${formatClock(Math.ceil(left / 1000))} 뒤에 또 놀아 줘요.`);
    giveAffection(id, PLAY_AFFECTION, { playAt: now }, `🤗 ${item.icon} ${josa(item.name, "을를")} 쓰다듬고 놀아 줬어요! 애정도 +${PLAY_AFFECTION}`);
  }

  function buyFood(food: PetFood, count: number) {
    const price = food.price * count;
    if (money < price) return setNotice(`${food.name} ${count}개는 ${price.toLocaleString()}원이에요.`);
    setMoney(value => value - price); setPetFood(stock => ({ ...stock, [food.id]: (stock[food.id] ?? 0) + count }));
    playCoinSound([660, 880]);
    setNotice(`${food.icon} ${food.name} ${count}개를 샀어요! 🐾 펫 탭에서 먹여 주세요.`);
  }

  // ---------- 가이드 ----------
  function goGuide(index: number) {
    const step = GUIDE_STEPS[index];
    if (!step) return closeGuide();
    if (step.tab && step.tab !== tab) switchTab(step.tab);
    if (step.panel) setSidePanel(step.panel);
    setShowStorage(step.overlay === "storage");
    setShowMissions(step.overlay === "missions");
    setGuideStep(index);
  }
  function closeGuide() {
    setGuideStep(null); setShowStorage(false); setShowMissions(false);
    try { localStorage.setItem(GUIDE_DONE_KEY, "done"); } catch { /* 다음에 또 뜰 수 있음 */ }
  }
  // 지금 단계의 화면 요소를 반짝이게 강조하고 화면 안으로 스크롤한다.
  useEffect(() => {
    const target = guideStep === null ? undefined : GUIDE_STEPS[guideStep]?.target;
    const element = target ? document.querySelector(target) : null;
    if (!element) return;
    element.classList.add("guide-focus");
    if (!element.closest(".tool-dock, .topbar")) element.scrollIntoView({ block: "center", behavior: "smooth" });
    return () => element.classList.remove("guide-focus");
  }, [guideStep, tab]);

  // 새 낚시터: Space로 던지기·당기기(미니게임 중에는 미니게임이 Space를 쓴다). 버튼에 초점이 있으면 브라우저 기본 클릭에 맡긴다.
  useEffect(() => {
    if (!FISH_V2_ENABLED || tab !== "fish") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, button, [contenteditable=true], .modal")) return;
      const main = document.querySelector<HTMLButtonElement>("button.fish2-main");
      if (!main || main.disabled) return;
      event.preventDefault(); main.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  function switchTab(next: typeof tab) {
    if (next !== "fish" && (fishState.phase === "waiting" || fishState.phase === "bite" || fishState.phase === "game")) { window.clearTimeout(fishTimer.current); setFishState({ phase: "idle" }); }
    setTab(next);
  }

  const timeLabel = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const nextSeason = seasonIndex >= 0 && seasonIndex < 3 ? SEASONS[seasonIndex + 1] : "휴식";
  const toClock = (hour: number) => `${String(Math.floor(hour)).padStart(2,"0")}:${String(Math.round((hour % 1) * 60)).padStart(2,"0")}`;

  /** 심기: 심기 도구 범위 안의 빈 밭에 고른 씨앗을 한꺼번에 심는다. 돈이 모자라면 살 수 있는 만큼만. */
  function plant(index: number, quiet = false) {
    if (!isWorkTime) return setNotice(`농장은 ${startHour}:00에 문을 열어요. 시간 설정에서 바꿀 수 있어요.`);
    const crop = CROPS.find(c => c.id === selectedCrop)!;
    if (!crop.seasons.includes(season)) return setNotice(`${crop.name}은 ${crop.seasons.join("·")} 작물이에요.`);
    const growSeconds = Math.round(cycleCrop(crop, marketBucket).seconds * growthMul * (1 - PET_BASE.mole * pw("mole")) * (1 - PET_BASE.dragon * pw("dragon")));
    if (growSeconds > seasonSecondsLeft) return setNotice(`${season}이 ${formatClock(seasonSecondsLeft)} 뒤 끝나요. ${josa(crop.name, "은는")} 그 전에 다 자라지 못해요.`);
    const price = seedPrice(crop);
    const empty = canArea(index, plotColumns(), plotCount, currentPlanter).filter(i => !plots[i] && !justPlanted.current.has(i));
    if (!empty.length) { if (!quiet) describePlot(index); return; }
    const allowance = plantingAllowance(crop, specialPlantingsRef.current, plantingDate);
    if (allowance <= 0) return setNotice(`${crop.name}은 이번 ${season}의 30개를 모두 심었어요. 다음 ${season}에 다시 심을 수 있어요.`);
    const reservation = reservePlanting(crop, specialPlantingsRef.current, plantingDate, Math.min(empty.length, Math.floor(money / price)));
    const targets = empty.slice(0, reservation.count);
    if (!targets.length) return setNotice("씨앗을 살 돈이 부족해요. 익은 작물을 수확해 보세요.");
    if (crop.seasonalLimit) { specialPlantingsRef.current = reservation.ledger; setSpecialPlantings(reservation.ledger); }
    targets.forEach(i => justPlanted.current.add(i)); window.setTimeout(() => targets.forEach(i => justPlanted.current.delete(i)), 600);
    const time = Date.now();
    setPlots(current => current.map((plot, i) => (targets.includes(i) && !plot ? { cropId: crop.id, plantedAt: time, growSeconds, waterTotal: waterCheckpoints(growSeconds), water: [] } : plot)));
    setMoney(m => m - price * targets.length); playPlop();
    const short = `${targets.length < empty.length ? ` (자금·파종 한도에 맞춰 ${empty.length}칸 중 ${targets.length}칸만)` : ""}${crop.seasonalLimit ? ` · 이번 ${season} 남은 파종 ${allowance - targets.length}/30개` : ""}`;
    setNotice(targets.length > 1 ? `${currentPlanter.icon} ${crop.icon} ${josa(crop.name, "을를")} ${targets.length}칸에 한꺼번에 심었어요! 씨앗 ${(price * targets.length).toLocaleString()}원 · ${growSeconds}초 뒤 수확${short}` : `${crop.icon} ${josa(crop.name, "을를")} 심었어요. ${growSeconds}초 뒤 수확해요! 중간에 목말라하면 물을 주세요.${short}`);
  }

  /** 밭 한 칸의 상태를 알려 준다. */
  function describePlot(index: number) {
    const plot = plots[index], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
    if (!plot || !crop) return setNotice("빈 밭이에요. 🌱 심기 도구(1)를 들고 눌러 씨앗을 심어요.");
    const status = plotStatus(plot, crop, Date.now(), bugPenalty);
    if (status.ready) return setNotice(`${crop.icon} ${josa(crop.name, "이가")} 다 자랐어요! 🧺 수확 도구(2)로 거둬요.`);
    if (status.thirsty) return setNotice("💧 목말라해요! 🚿 물뿌리개(3)를 들고 눌러서 물을 주세요.");
    setNotice(`${crop.icon} ${crop.name} ${Math.floor(status.progress)}% · ${status.remaining}초 남음 · 물 ${status.satisfied}/${status.total}${status.fert ? ` · ${status.fert.name}` : ""}`);
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
      if (crop && plot && currentCan.w * currentCan.h === 1 && !justWatered.current.has(index)) setNotice(plotStatus(plot, crop, Date.now(), bugPenalty).ready ? `${josa(crop.name, "은는")} 다 자랐어요. 🧺 수확 도구(2)로 거둬요.` : `${josa(crop.name, "은는")} 아직 목마르지 않아요.`);
      return;
    }
    if (canWater - pendingPours.current <= 0) return setNotice("🚿 물뿌리개가 비었어요. 🚰 우물에서 물을 채워 주세요.");
    const time = Date.now();
    const freePour = Math.random() < lunchPower(lunchBuff, "farm", time);
    targets.forEach(i => justWatered.current.set(i, time));
    if (!freePour) { pendingPours.current++; setCanWater(value => Math.max(0, value - 1)); }
    setPlots(current => current.map((item, i) => (targets.includes(i) && item ? { ...item, water: [...(item.water ?? []), time] } : item)));
    setWaterFx(items => [...items, ...targets.map(i => ({ id: time + i, plotIndex: i }))]);
    window.setTimeout(() => setWaterFx(items => items.filter(item => item.id < time || item.id > time + plotCount)), 900);
    playSplash();
    setNotice(`💧 ${targets.length > 1 ? `밭 ${targets.length}칸에 한꺼번에` : "촉촉하게"} 물을 줬어요. (물뿌리개 ${canWater - (freePour ? 0 : 1)}/${canMax}${freePour ? " · 🍱 물 절약!" : ""})`);
  }

  function chooseCan(can: WateringCan) {
    if (ownsItem(ownedCans, can.id)) { setCanId(can.id); setTool("water"); setCanWater(value => Math.min(value, can.capacity + petCanBonus)); return setNotice(`${can.icon} ${josa(can.name, "을를")} 들었어요. (${can.note})`); }
    if (money < can.price) return setNotice(`${josa(can.name, "은는")} ${can.price.toLocaleString()}원이에요.`);
    setMoney(value => value - can.price); setOwnedCans(items => [...items, can.id]); setCanId(can.id); setTool("water");
    setCanWater(can.capacity + petCanBonus);
    playCoinSound([660, 990, 1320]);
    setNotice(`${can.icon} ${josa(can.name, "을를")} 샀어요! 물을 가득 채워 드렸어요. (${can.note})`);
  }

  /** 선택 구획 전체 물주기: 목마른 칸에만 주고, 물뿌리개 범위(칸 수)마다 물 1을 쓴다. */
  function waterArea(cells: number[]) {
    const time = Date.now();
    const targets = cells.filter(i => { const plot = plots[i], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
      return plot && crop && seasonPeriod(plot.plantedAt, startHour, endHour) === currentPeriod && plotStatus(plot, crop, time, bugPenalty).thirsty; });
    if (!targets.length) return setNotice("💧 선택한 구획에 목마른 작물이 없어요.");
    const cost = Math.ceil(targets.length / (currentCan.w * currentCan.h));
    if (canWater - pendingPours.current < cost) return setNotice(`🚿 물이 모자라요. 이 구획엔 물 ${cost}이 필요해요(남은 ${Math.max(0, canWater)}). 🚰 우물(4)에서 채워 주세요.`);
    targets.forEach(i => justWatered.current.set(i, time));
    pendingPours.current += cost; setCanWater(value => Math.max(0, value - cost));
    setPlots(current => current.map((item, i) => (targets.includes(i) && item ? { ...item, water: [...(item.water ?? []), time] } : item)));
    setWaterFx(items => [...items, ...targets.map(i => ({ id: time + i, plotIndex: i }))]);
    window.setTimeout(() => setWaterFx(items => items.filter(item => item.id < time || item.id > time + plotCount)), 900);
    playSplash();
    setNotice(`💧 선택 구획 ${targets.length}칸에 물을 줬어요. (물 ${cost} 사용 · 남은 ${Math.max(0, canWater - cost)}/${canMax})`);
  }
  function refillCan() {
    if (canWater >= canMax) return setNotice("🚿 물뿌리개는 이미 가득 차 있어요.");
    setCanWater(canMax); setTool("water"); playSplash();
    setNotice(`🚰 우물에서 물뿌리개를 가득 채웠어요. (${canMax}번 줄 수 있어요)`);
  }

  // 비료 메뉴: 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!fertMenu) return;
    const onDown = (event: PointerEvent) => { if (!(event.target instanceof Element && event.target.closest(".fert-slot"))) setFertMenu(false); };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [fertMenu]);
  /** 5번 비료: 고른 비료가 없으면 남아 있는 다른 비료를 든다. */
  function holdFert(id = fertId) {
    const pick = (fertStock[id] ?? 0) > 0 ? id : FERTILIZERS.find(item => (fertStock[item.id] ?? 0) > 0)?.id ?? id;
    setFertId(pick); setTool(pick); setFertMenu(false);
    if (pick !== id) { const from = FERTILIZERS.find(item => item.id === id)!, to = FERTILIZERS.find(item => item.id === pick)!; setNotice(`${from.icon} ${josa(from.name, "이가")} 없어서 ${to.icon} ${josa(to.name, "을를")} 들었어요.`); }
  }
  /** 거름: 뿌리개 범위 안의 자라는 작물(거름 안 준 것)에 한꺼번에 준다. 돈이 모자라면 살 수 있는 만큼만. */
  function fertilize(index: number, fertilizer: Fertilizer, quiet = false) {
    const time = Date.now();
    const targets = canArea(index, plotColumns(), plotCount, currentSpreader).filter(i => {
      const plot = plots[i], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
      return plot && crop && !plot.fert && !justFertilized.current.has(i) && seasonPeriod(plot.plantedAt, startHour, endHour) === currentPeriod && !plotStatus(plot, crop, time, bugPenalty).ready;
    });
    if (!targets.length) {
      if (quiet) return;
      const plot = plots[index], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
      if (plot?.fert && crop) return setNotice(`${crop.name}에는 이미 거름을 줬어요. 한 작물에 한 번만 줄 수 있어요.`);
      return describePlot(index);
    }
    const affordable = targets.slice(0, fertStock[fertilizer.id] ?? 0);
    if (!affordable.length) {
      const other = FERTILIZERS.find(item => item.id !== fertilizer.id && (fertStock[item.id] ?? 0) > 0);
      if (other) { setFertId(other.id); setTool(other.id); return setNotice(`${fertilizer.icon} ${josa(fertilizer.name, "이가")} 없어서 ${other.icon} ${josa(other.name, "을를")} 들었어요. 다시 눌러 뿌려 주세요.`); }
      return setNotice(`${fertilizer.icon} ${josa(fertilizer.name, "이가")} 없어요. 🌿 거름 상점(오른쪽 도구 상점)에서 사 두세요.`);
    }
    affordable.forEach(i => justFertilized.current.add(i)); window.setTimeout(() => affordable.forEach(i => justFertilized.current.delete(i)), 600);
    setFertStock(stock => ({ ...stock, [fertilizer.id]: Math.max(0, (stock[fertilizer.id] ?? 0) - affordable.length) }));
    // 쓰던 비료가 떨어지면 남아 있는 다른 비료로 바꿔 든다.
    if ((fertStock[fertilizer.id] ?? 0) - affordable.length <= 0) {
      const next = FERTILIZERS.find(item => item.id !== fertilizer.id && (fertStock[item.id] ?? 0) > 0);
      if (next) { setFertId(next.id); setTool(next.id); window.setTimeout(() => setNotice(`${fertilizer.icon} ${josa(fertilizer.name, "이가")} 다 떨어져서 ${next.icon} ${josa(next.name, "을를")} 이어서 들었어요. (${fertStock[next.id]}개)`), 0); }
    }
    const savedSeconds = affordable.reduce((sum, i) => { const item = plots[i], crop = item ? CROPS.find(c => c.id === item.cropId) : undefined; if (!item || !crop) return sum; return sum + plotStatus(item, crop, time, bugPenalty).remaining - plotStatus(applyFertilizer(item, crop, fertilizer, time), crop, time, bugPenalty).remaining; }, 0);
    setPlots(current => current.map((item, i) => { const crop = item ? CROPS.find(c => c.id === item.cropId) : undefined; return affordable.includes(i) && item && crop && !item.fert ? applyFertilizer(item, crop, fertilizer, time) : item; }));
    playPlop();
    const short = affordable.length < targets.length ? ` (거름이 모자라 ${targets.length}칸 중 ${affordable.length}칸만)` : "", left = (fertStock[fertilizer.id] ?? 0) - affordable.length;
    if (affordable.length > 1) return setNotice(`${currentSpreader.icon} ${fertilizer.icon} ${josa(fertilizer.name, "을를")} ${affordable.length}칸에 뿌려 총 ${savedSeconds}초 단축! 물 주기 시점도 빨라졌어요. · 남은 ${left}개${short}`);
    const crop = CROPS.find(c => c.id === plots[affordable[0]]?.cropId);
    setNotice(`${fertilizer.icon} ${crop?.name ?? "작물"}에 ${josa(fertilizer.name, "을를")} 줘 ${savedSeconds}초 단축! 물 주기 시점도 빨라졌어요. · 남은 ${left}개${short}`);
  }

  /** 거름을 원하는 개수만큼 산다. */
  function buyFert(fertilizer: Fertilizer, count: number) {
    const price = fertilizer.price * count;
    if (money < price) return setNotice(`${fertilizer.name} ${count}개는 ${price.toLocaleString()}원이에요.`);
    setMoney(value => value - price); setFertStock(stock => ({ ...stock, [fertilizer.id]: (stock[fertilizer.id] ?? 0) + count })); setTool(fertilizer.id);
    playCoinSound([660, 880]);
    setNotice(`${fertilizer.icon} ${josa(fertilizer.name, "을를")} ${count}개 샀어요! 들고 자라는 작물을 누르면 칸마다 1개씩 써요.`);
  }


  function chooseSpreader(spreader: HarvestTool) {
    const fert = FERTILIZERS.some(item => item.id === tool) ? tool : FERTILIZERS[0].id;
    if (ownsItem(ownedSpreaders, spreader.id)) { setSpreaderId(spreader.id); setTool(fert); return setNotice(`${spreader.icon} ${josa(spreader.name, "을를")} 들었어요. (${spreader.note} 거름 주기)`); }
    if (money < spreader.price) return setNotice(`${josa(spreader.name, "은는")} ${spreader.price.toLocaleString()}원이에요.`);
    setMoney(value => value - spreader.price); setOwnedSpreaders(items => [...items, spreader.id]); setSpreaderId(spreader.id); setTool(fert);
    playCoinSound([660, 990, 1320]);
    setNotice(`${spreader.icon} ${josa(spreader.name, "을를")} 샀어요! 자라는 작물 ${spreader.note}에 거름을 한꺼번에 뿌려요.`);
  }


  /** 벌레 잡기: 어떤 도구를 들고 있어도 벌레나 벌레 있는 밭을 누르면 잡힌다. */
  function catchBug(index: number, bugEl?: Element | null) {
    const el = bugEl ?? plotsRef.current?.children[index]?.querySelector(".bug");
    if (!el || !plots[index]?.bug) return;
    // 벌레가 지금 있는 자리(돌아다니는 중이라 매번 다름)에서 짜부되는 효과를 띄운다.
    const bugRect = el.getBoundingClientRect(), cellRect = el.parentElement!.getBoundingClientRect();
    const fx = { id: Date.now() + index, plotIndex: index, x: bugRect.left + bugRect.width / 2 - cellRect.left, y: bugRect.top + bugRect.height / 2 - cellRect.top };
    setSquashFx(items => [...items, fx]); window.setTimeout(() => setSquashFx(items => items.filter(item => item.id !== fx.id)), 1300);
    setPlots(current => current.map((plot, i) => (i === index && plot ? { ...plot, bug: undefined } : plot)));
    playSquish(); setNotice(["👏 찍! 벌레를 잡았어요! 작물이 무사해요.", "💥 짜부! 벌레 퇴치 완료!", "🫳 탁! 정확히 잡았어요!"][Math.floor(Math.random() * 3)]);
  }

  /** 밭을 눌렀을 때: 벌레가 있으면 무조건 잡고, 아니면 든 도구의 일을 한다. */
  function clickPlot(index: number) {
    const plot = plots[index], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
    if (plot?.bug) return catchBug(index);
    if (plot && crop && seasonPeriod(plot.plantedAt, startHour, endHour) !== currentPeriod) return clearWithered(index, crop);
    if (tool === "seed") return plant(index);
    if (tool === "hand") return harvest(index);
    if (tool === "water") return waterPlot(index);
    const fertilizer = FERTILIZERS.find(item => item.id === tool);
    if (fertilizer) return fertilize(index, fertilizer);
    describePlot(index);
  }

  function clearWithered(index: number, crop: Crop) {
    const next = [...plots]; next[index] = null; setPlots(next);
    setNotice(`🥀 계절이 지나 시든 ${josa(crop.name, "을를")} 걷어냈어요. 제철 씨앗을 심어볼까요?`);
  }

  /** 수확: 수확 도구 범위 안의 다 자란 작물을 한꺼번에 팔아요. 자라는 중·시든 작물은 건드리지 않아요. */
  function harvest(index: number, quiet = false) {
    const time = Date.now();
    const area = canArea(index, plotColumns(), plotCount, currentHand).filter(i => !justHarvested.current.has(i));
    const ready = area.map(i => { const plot = plots[i], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
      if (!plot || !crop || seasonPeriod(plot.plantedAt, startHour, endHour) !== currentPeriod) return null;
      const status = plotStatus(plot, crop, time, bugPenalty);
      return status.ready ? { i, crop, status } : null; }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    if (!ready.length) { if (!quiet && !justHarvested.current.has(index)) describePlot(index); return; }
    ready.forEach(({ i }) => justHarvested.current.add(i)); window.setTimeout(() => ready.forEach(({ i }) => justHarvested.current.delete(i)), 800);
    // 날씨에 따라 가끔 황금 작물(판매가 ×3)이 나온다. 맑은 날에 더 자주.
    const raw = ready.map(({ i, crop, status }) => { const golden = Math.random() < wx.goldenChance;
      return { i, crop, status, golden, base: marketPrice(crop, marketBucket), unitBase: basePrice(crop), mult: status.quality.multiplier * status.bugMultiplier * (golden ? 3 : 1) }; });
    // 모두 판다고 했을 때의 값(바로 판매 모드·도감 기록용). 시장 포화 슬롯은 1개씩 차례로 계산한다.
    const run = priceRun(raw), sales = run.priced.map(sale => ({ ...sale, boosted: Math.round(sale.unitBase * sale.factor) }));
    setPlots(current => current.map((plot, i) => (sales.some(sale => sale.i === i) ? null : plot)));
    // 작물 도감 기록: 수확 수·최고 품질·황금·최고 판매가(1개 값)
    setCropLog(log => { const next = { ...log }; sales.forEach(sale => { const old = next[sale.crop.id] ?? { n: 0, best: 0, golden: 0, top: 0 }, quality = storedQuality(sale.status.quality.id, 1);
      next[sale.crop.id] = { n: old.n + 1, best: Math.max(old.best, quality), golden: old.golden + (sale.golden ? 1 : 0), top: Math.max(old.top, sale.amount) }; }); return next; });
    // 창고 보관 모드: 묶음(작물|품질|황금)으로 쌓는다. 새 묶음 자리가 없으면 그 작물만 바로 판다.
    if (harvestMode === "store") {
      // 용량은 총 수량. 넘치는 만큼만 바로 판다.
      let room = Math.max(0, storageCap - Object.values(produce).reduce((sum, n) => sum + n, 0));
      const stored: Record<string, number> = {};
      const sold = sales.filter(sale => { if (room <= 0) return true;
        const key = produceKey(sale.crop.id, storedQuality(sale.status.quality.id, sale.status.bugMultiplier), sale.golden);
        room--; stored[key] = (stored[key] ?? 0) + 1; return false; });
      const soldMul = priceBuffFactor(buffs, sold.length, time), soldRun = priceRun(sold), soldTotal = Math.round(soldRun.priced.reduce((sum, sale) => sum + sale.amount, 0) * soldMul), storedCount = sales.length - sold.length;
      if (soldMul !== 1) setBuffs(list => consumePriceBuffs(list, sold.length));
      setProduce(stock => { const next = { ...stock }; Object.entries(stored).forEach(([key, count]) => { next[key] = (next[key] ?? 0) + count; }); return next; });
      if (soldTotal) { setMoney(m => m + soldTotal); setMarketState(soldRun.state); }
      const fxs = sales.map(sale => ({ id: time + sale.i, plotIndex: sale.i, icon: sale.golden ? `✨${sale.crop.icon}` : sale.crop.icon, amount: sold.includes(sale) ? soldRun.priced[sold.indexOf(sale)].amount : 0, stars: sold.includes(sale) ? sale.status.quality.stars : "📦 창고로" }));
      setHarvestFx(items => [...items, ...fxs]); window.setTimeout(() => setHarvestFx(items => items.filter(item => !fxs.some(fx => fx.id === item.id))), 1100);
      playPlop();
      return setNotice(`📦 ${currentHand.icon} ${storedCount}개를 창고에 넣었어요! (${sales.filter(sale => !sold.includes(sale)).map(sale => sale.crop.icon).join("")})${sold.length ? ` 창고가 꽉 차서 ${sold.length}개는 ${soldTotal.toLocaleString()}원에 바로 팔았어요.` : ""} 시세 좋을 때 창고에서 파세요.`);
    }
    const eventMul = priceBuffFactor(buffs, sales.length, time), total = Math.round(sales.reduce((sum, sale) => sum + sale.amount, 0) * eventMul);
    if (eventMul !== 1) setBuffs(list => consumePriceBuffs(list, sales.length));
    setMoney(m => m + total); setMarketState(run.state);
    const fxs = sales.map(sale => ({ id: time + sale.i, plotIndex: sale.i, icon: sale.golden ? `✨${sale.crop.icon}` : sale.crop.icon, amount: sale.amount, stars: `${sale.status.quality.stars}${sale.golden ? " 황금!" : ""}` }));
    const goldens = sales.filter(sale => sale.golden);
    setHarvestFx(items => [...items, ...fxs]); window.setTimeout(() => setHarvestFx(items => items.filter(item => !fxs.some(fx => fx.id === item.id))), 1100);
    playCoinSound(sales.length > 1 ? [880, 1100, 1320, 1760] : [880, 1320]);
    if (goldens.length) playCoinSound([660, 880, 1100, 1320, 1760]);
    if (sales.length > 1) return setNotice(`짤랑짤랑~ ${currentHand.icon} ${sales.length}칸을 한꺼번에 수확해서 ${total.toLocaleString()}원에 팔았어요! (${sales.map(sale => sale.crop.icon).join("")})${goldens.length ? ` ✨ 황금 작물 ${goldens.length}개!` : ""}`);
    const { crop, status, base, boosted, amount, golden } = sales[0];
    const parts = [`시세 ${base.toLocaleString()}원`, boosted !== base ? `판매가 효과·포화 ${boosted > base ? "+" : ""}${Math.round((boosted / base - 1) * 100)}%` : "", status.quality.multiplier !== 1 ? `품질 ${status.quality.name} ×${status.quality.multiplier}` : "", status.bugMultiplier < 1 ? `벌레 피해 -${Math.round((1 - status.bugMultiplier) * 100)}%` : "", golden ? "✨ 황금 작물 ×3" : ""].filter(Boolean);
    setNotice(`${golden ? "✨ 황금 " : ""}짤랑~ ${crop.icon} ${josa(crop.name, "을를")} ${amount.toLocaleString()}원에 팔았어요! (${parts.join(" × ")})`);
  }

  // ---------- 농산물 창고 ----------
  /** 창고 묶음 1개 값: 지금 판매가 × 품질 × 황금. */
  function produceUnitPrice(key: string) {
    const { cropId, quality, golden } = parseProduceKey(key), crop = CROPS.find(c => c.id === cropId);
    return crop ? Math.round(salePrice(crop) * QUALITIES[quality].multiplier * (golden ? 3 : 1)) : 0;
  }

  function sellProduce(key: string, count: number) {
    const n = Math.min(sellableOf(key), count);
    if (n <= 0) return;
    const { cropId, quality, golden } = parseProduceKey(key), crop = CROPS.find(c => c.id === cropId);
    const eventMul = priceBuffFactor(buffs, n, Date.now()), result = sellMany(market, cropId, (crop ? basePrice(crop) : 0) * QUALITIES[quality].multiplier * (golden ? 3 : 1), n), amount = Math.round(result.total * eventMul);
    if (eventMul !== 1) setBuffs(list => consumePriceBuffs(list, n));
    setProduce(stock => { const next = { ...stock }; next[key] = (next[key] ?? 0) - n; if (next[key] <= 0) delete next[key]; return next; });
    setMarketState(result.state);
    setMoney(m => m + amount); playCoinSound(n > 1 ? [880, 1100, 1320] : [880, 1320]);
    setNotice(`짤랑~ 창고에서 ${golden ? "✨황금 " : ""}${crop?.icon ?? ""} ${crop?.name ?? "작물"}${QUALITIES[quality].stars ? ` ${QUALITIES[quality].stars}` : ""} ${n}개를 ${amount.toLocaleString()}원에 팔았어요!`);
  }
  /** 창고에서 팔 수 있는 묶음과 개수(잠금·주문 예약분 제외). cropId를 주면 그 작물만. */
  function sellPlan(cropId?: string) {
    return Object.keys(produce).filter(key => produce[key] > 0 && (!cropId || parseProduceKey(key).cropId === cropId)).map(key => ({ key, n: sellableOf(key) })).filter(entry => entry.n > 0);
  }
  /** 시장에 판다(포화 슬롯 적용). */
  function marketSellPlan(plan: { key: string; n: number }[]) {
    let amount = 0, state = market;
    plan.forEach(({ key, n }) => { const { cropId, quality, golden } = parseProduceKey(key), crop = CROPS.find(c => c.id === cropId); if (!crop) return;
      const result = sellMany(state, cropId, basePrice(crop) * QUALITIES[quality].multiplier * (golden ? 3 : 1), n); amount += result.total; state = result.state; });
    // 수량제 판매가 효과(다음 농작물 N개): 묶음 전체 수량 기준으로 남은 만큼만
    const count = plan.reduce((sum, entry) => sum + entry.n, 0), eventMul = priceBuffFactor(buffs, count, Date.now());
    return { amount: Math.round(amount * eventMul), state };
  }
  function takeFromProduce(plan: { key: string; n: number }[]) {
    setProduce(stock => { const next = { ...stock }; plan.forEach(({ key, n }) => { next[key] = (next[key] ?? 0) - n; if (next[key] <= 0) delete next[key]; }); return next; });
  }
  function confirmSell() {
    if (!sellConfirm) return;
    const plan = sellPlan(sellConfirm.cropId), count = plan.reduce((sum, entry) => sum + entry.n, 0);
    setSellConfirm(null);
    if (!count) return;
    if (sellConfirm.kind === "market") {
      const { amount, state } = marketSellPlan(plan);
      if (priceBuffFactor(buffs, count, Date.now()) !== 1) setBuffs(list => consumePriceBuffs(list, count));
      takeFromProduce(plan); setMoney(m => m + amount); setMarketState(state); playCoinSound([880, 1100, 1320, 1760]);
      return setNotice(`짤랑짤랑~ 창고 작물 ${count}개를 ${amount.toLocaleString()}원에 팔았어요! (잠금·주문 예약분은 남겨 뒀어요)`);
    }
    const amount = plan.reduce((sum, { key, n }) => sum + coopUnit(key) * n, 0);
    takeFromProduce(plan); setMoney(m => m + amount); playCoinSound([660, 880, 1100]);
    setNotice(`🏦 농협에 ${count}개를 일괄 출하했어요. 시세의 ${Math.round(COOP_RATE * 100)}%로 ${amount.toLocaleString()}원! (잠금·주문 예약분은 남겨 뒀어요)`);
  }
  function toggleLock(key: string) {
    const locked = isLocked(key);
    setProduceLocks(all => ({ ...all, [key]: !locked }));
  }

  /** 농협 일괄 출하: 지금 시세(버프 없음)의 70%, 포화·수요 한도 없이 창고 전부를 판다. 급할 때 쓰는 안전장치. */
  const coopUnit = (key: string) => { const { cropId, quality, golden } = parseProduceKey(key), crop = CROPS.find(c => c.id === cropId); return crop ? Math.round(marketPrice(crop, marketBucket) * COOP_RATE * QUALITIES[quality].multiplier * (golden ? 3 : 1)) : 0; };


  function expandStorage() {
    if (storageCap >= STORAGE_MAX) return setNotice("창고는 이미 최대 크기예요.");
    const price = storagePrice(storageCap);
    if (money < price) return setNotice(`창고를 넓히려면 ${price.toLocaleString()}원이 필요해요.`);
    setMoney(value => value - price); setStorageCap(value => value + STORAGE_STEP); playCoinSound([660, 990, 1320]);
    setNotice(`📦 창고를 ${(storageCap + STORAGE_STEP).toLocaleString()}개까지 넣을 수 있게 넓혔어요!`);
  }

  // ---------- 작물 도감 ----------
  function claimCropReward(target: Season) {
    const id = CROP_BOOK_REWARDS[target], item = FURNITURE.find(entry => entry.id === id);
    if (!item || cropRewards.includes(target)) return;
    if (!CROPS.filter(crop => crop.seasons.includes(target)).every(crop => cropLog[crop.id]?.n)) return setNotice(`${target} 작물을 아직 다 수확하지 못했어요.`);
    setCropRewards(list => [...list, target]);
    setWarehouse(items => [...items, { ...item, instanceId: `${id}-${Date.now()}`, x: 0, z: 0, rot: 0 }]);
    playCoinSound([523, 659, 784, 1047, 1319]);
    setNotice(`🎉 ${target} 작물 도감 완성! ${item.icon} ${josa(item.name, "을를")} 받았어요. 🏡 나의 집 › 창고에서 마당에 꺼내 놓을 수 있어요.`);
  }

  // ---------- 가공 공방 ----------
  /** 가공에 쓸 수 있는 개수(잠금·주문 예약분 제외). */
  const usableOf = (cropId: string) => Object.keys(produce).filter(key => parseProduceKey(key).cropId === cropId).reduce((sum, key) => sum + sellableOf(key), 0);
  function startRecipe(recipe: Recipe) {
    if (workshop.jobs.length >= workshop.slots) return setNotice("🏺 항아리가 모두 담그는 중이에요. 다 되면 꺼내거나 항아리를 늘려 주세요.");
    const missing = recipe.inputs.find(input => usableOf(input.cropId) < input.count);
    if (missing) { const crop = CROPS.find(c => c.id === missing.cropId); return setNotice(`🏺 ${crop?.icon ?? ""} ${josa(crop?.name ?? "재료", "이가")} 모자라요. 창고 보관으로 모아 주세요(잠금·주문 예약분은 쓰지 않아요).`); }
    // 낮은 품질·황금 아닌 것부터, 팔 수 있는 만큼에서만 꺼낸다.
    const next = { ...produce };
    recipe.inputs.forEach(input => {
      let need = input.count;
      Object.keys(next).filter(key => parseProduceKey(key).cropId === input.cropId)
        .sort((a, b) => { const x = parseProduceKey(a), y = parseProduceKey(b); return Number(x.golden) - Number(y.golden) || x.quality - y.quality; })
        .forEach(key => { const take = Math.min(need, sellableOf(key)); if (take <= 0) return; next[key] -= take; need -= take; if (next[key] <= 0) delete next[key]; });
    });
    setProduce(next);
    setWorkshop(shop => ({ ...shop, jobs: [...shop.jobs, { recipeId: recipe.id, doneAt: Date.now() + recipe.minutes * 60000 }] }));
    playPlop();
    setNotice(`🏺 ${recipe.icon} ${josa(recipe.name, "을를")} 담그기 시작했어요! ${recipe.minutes}분 뒤에 꺼낼 수 있어요.`);
  }
  /** 개편 가공: 고른 재료로 여러 항아리를 한 번에 담근다. 담글 때 완성품 이름·가격을 확정해 작업에 저장한다. */
  function startProcessing(batches: ProcBatch[]) {
    const room = workshop.slots - workshop.jobs.length;
    if (room <= 0) return setNotice("🏺 항아리가 모두 담그는 중이에요. 다 되면 꺼내거나 항아리를 늘려 주세요.");
    const list = batches.slice(0, room), next = { ...produce }, now = Date.now(), jobs: Workshop["jobs"] = [];
    for (const batch of list) for (const input of batch.inputs) {
      const key = produceKey(input.cropId, input.quality, input.golden), usable = isLocked(key) ? 0 : (next[key] ?? 0) - (reserved[key] ?? 0);
      if (usable < input.count) return setNotice("🏺 재료가 모자라요. 창고를 다시 확인해 주세요(잠금·주문 예약분은 쓰지 않아요).");
      next[key] -= input.count; if (next[key] <= 0) delete next[key];
    }
    for (const batch of list) { const product = processResult(batch.recipe, batch.inputs); jobs.push({ recipeId: batch.recipe.id, doneAt: now + batch.recipe.minutes * 60000, key: product.key, name: product.name, icon: product.icon, price: product.price, minutes: batch.recipe.minutes }); }
    setProduce(next);
    setWorkshop(shop => ({ ...shop, jobs: [...shop.jobs, ...jobs] }));
    playPlop();
    setNotice(jobs.length > 1 ? `🏺 항아리 ${jobs.length}개에 담그기 시작했어요! (완성품 합계 ${jobs.reduce((t, j) => t + (j.price ?? 0), 0).toLocaleString()}원)` : `🏺 ${jobs[0].icon} ${josa(jobs[0].name ?? "가공품", "을를")} 담그기 시작했어요! ${list[0].recipe.minutes}분 뒤에 꺼낼 수 있어요.`);
  }
  function collectJob(index: number) {
    const job = workshop.jobs[index], info = job && jobInfo(job);
    if (!job || !info || job.doneAt > Date.now()) return;
    setWorkshop(shop => ({ ...shop, jobs: shop.jobs.filter((_, i) => i !== index) }));
    setGoods(stock => ({ ...stock, [info.key]: (stock[info.key] ?? 0) + 1 }));
    playCoinSound([660, 880]);
    setNotice(`🏺 ${info.icon} ${josa(info.name, "이가")} 잘 익었어요! 가공품 칸에서 팔 수 있어요.`);
  }
  /** 가공품 판매(키 단위). 시장 포화·수요를 쓰지 않는 고정가. */
  function sellGoods(key: string, count: number) {
    const n = Math.min(goods[key] ?? 0, count), info = goodsInfo(key);
    if (n <= 0) return;
    const amount = info.price * n;
    setGoods(stock => { const next = { ...stock, [key]: (stock[key] ?? 0) - n }; if (next[key] <= 0) delete next[key]; return next; });
    setMoney(m => m + amount); playCoinSound([880, 1100, 1320]);
    setNotice(`짤랑~ ${info.icon} ${info.name} ${n}개를 ${amount.toLocaleString()}원에 팔았어요! (가공품은 시세·포화와 상관없는 고정가)`);
  }
  function buyWorkshopSlot() {
    if (workshop.slots >= WORKSHOP_MAX_SLOTS) return setNotice("항아리는 최대 개수예요.");
    const price = workshopSlotPrice(workshop.slots);
    if (money < price) return setNotice(`항아리를 하나 더 들이려면 ${price.toLocaleString()}원이 필요해요.`);
    setMoney(value => value - price); setWorkshop(shop => ({ ...shop, slots: shop.slots + 1 })); playCoinSound([660, 990, 1320]);
    setNotice(`🏺 항아리를 하나 더 들였어요! 이제 ${workshop.slots + 1}개를 동시에 담글 수 있어요.`);
  }

  // ---------- 사냥 무기 ----------
  const hasWeapon = (id: string) => HUNT_TEST_UNLOCK_ALL || ownsItem(ownedWeapons, id);
  function chooseWeapon(item: Weapon) {
    if (hasWeapon(item.id)) { setWeaponId(item.id); return setNotice(`${item.icon} ${josa(item.name, "을를")} 들었어요. (데미지 ${item.damage})`); }
    if (money < item.price) return setNotice(`${item.name}은(는) ${item.price.toLocaleString()}원이에요.`);
    setMoney(value => value - item.price); setOwnedWeapons(list => [...list, item.id]); setWeaponId(item.id); playCoinSound([660, 990, 1320]);
    setNotice(`${item.icon} ${josa(item.name, "을를")} 샀어요! 데미지 ${item.damage}`);
  }

  function buyHuntTicket() {
    if (huntTicket > Date.now()) return;
    if (!TEST_MODE && money < HUNT_TICKET_PRICE) return setNotice(`사냥터 입장권은 ${HUNT_TICKET_PRICE.toLocaleString()}원이에요.`);
    if (!TEST_MODE) setMoney(value => value - HUNT_TICKET_PRICE);
    setHuntTicket(Date.now() + HUNT_TICKET_MINUTES * 60000); playCoinSound([660, 880, 1100]);
    setNotice(`🎫 사냥터에 들어왔어요! ${HUNT_TICKET_MINUTES}분 동안 사냥할 수 있어요.${TEST_MODE ? " (테스트 모드: 무료)" : ""}`);
  }

  /** 탑 토벌 결과 반영: 쓴 음식 소모, 클리어 상자(첫/반복), 실패 시 처치 수 보상. 받은 것 목록을 돌려준다. */
  function applyRaidResult(result: RaidResult, foods: FoodSlot[]) {
    const lines: string[] = [];
    const used = result.usedFoods.map(i => foods[i]).filter((f): f is NonNullable<FoodSlot> => Boolean(f));
    if (used.length) {
      setDishStock(stock => { const next = { ...stock }; used.forEach(f => { next[f.key] = (next[f.key] ?? 0) - 1; if (next[f.key] <= 0) delete next[f.key]; }); return next; });
      lines.push(`🍱 사용한 음식: ${used.map(f => `${f.icon} ${f.name}`).join(", ")}`);
    }
    // 판 기록(최근 30판, 밸런스 확인용): 무기·장비·펫·음식을 더해 토벌 저장에 남긴다
    if (result.log) {
      const w = raid.weapons[raid.equipped.weapon], log = result.log;
      setRaid(r => ({ ...r, log: [...(r.log ?? []), { ...log, v: RAID_BALANCE_VERSION, at: Date.now(), weapon: r.equipped.weapon, evo: w?.evolution ?? null, enh: w?.enhancement ?? 0, armor: [r.equipped.head, r.equipped.body, r.equipped.legs], pet: r.equipped.battlePet ? `${r.equipped.battlePet}:${r.battlePets?.[r.equipped.battlePet]?.level ?? 1}` : null, foods: used.map(f => f.key) }].slice(-30) }));
    }
    // 성장 돌파(3.4절): 층별 기록 갱신, 장비가 달라진 뒤 처음 깨면 돌파 결과
    if (!result.abandoned && result.floor > 0) {
      const w = raid.weapons[raid.equipped.weapon], rec = recordOf(result, { weaponId: raid.equipped.weapon, evo: w?.evolution ?? null, enh: w?.enhancement ?? 0, armor: [raid.equipped.head, raid.equipped.body, raid.equipped.legs] });
      const bt = breakthrough(raid.progress?.[result.floor], rec);
      if (bt) {
        lines.push(`🚀 ${result.floor}층 성장 돌파!`);
        lines.push(`이전 최고: ${bt.before.bossHpRatio < 1 ? `보스 HP ${Math.round(bt.before.bossHpRatio * 100)}% 남음` : `웨이브 ${bt.before.waveTime}초에서 쓰러짐`} → 이번: ${rec.bossTime !== null ? `보스 ${rec.bossTime}초 만에 처치` : "클리어"}`);
        const ch = gearChanges(bt.before, rec, id => ARMORS.find(a => a.id === id)?.name ?? id, id => weaponDef(id).name);
        if (ch.length) lines.push(`그사이 성장: ${ch.join(" · ")}`);
        const dmgBefore = bt.before.damageTaken, dmgNow = rec.damageTaken;
        if (dmgBefore > 0) lines.push(`받은 피해 ${dmgNow < dmgBefore ? "−" : "+"}${Math.abs(Math.round((dmgNow / dmgBefore - 1) * 100))}%`);
      }
      setRaid(r => ({ ...r, progress: { ...(r.progress ?? {}), [result.floor]: updateProgress(r.progress?.[result.floor], rec) } }));
    }
    if (result.abandoned) return lines;
    const gain: Record<string, number> = {};
    const roll = (drops: Drop[]) => drops.forEach(([id, min, max, chance]) => { if (Math.random() < (chance ?? 1)) gain[id] = (gain[id] ?? 0) + min + Math.floor(Math.random() * (max - min + 1)); });
    let gold = 0, seals = 0, stabilizer = 0;
    if (result.cleared) {
      const reward = FLOOR_REWARDS[result.floor], first = !raid.firstClears.includes(result.floor);
      if (first) { gold = reward.firstGold; roll(reward.first); seals = 2 + (result.floor % 5 === 0 ? 5 : 0); }
      else {
        // 반복: 보스 재료 연속 미획득 천장(15·20층)
        const box = rollDrops(reward.repeat, result.floor, true, raid.bossMiss ?? {});
        Object.entries(box.gain).forEach(([id, n]) => { gain[id] = (gain[id] ?? 0) + n; }); seals = 1;
        if (box.forced) lines.push("🎯 보스 재료 천장! 이번 상자에 확정으로 들어 있어요.");
        setRaid(r => ({ ...r, bossMiss: box.bossMiss }));
      }
      if (Math.random() < reward.stabilizer) stabilizer = 1;
      lines.push(first ? "🎁 첫 클리어 상자를 열었어요!" : "📦 반복 클리어 상자");
      setRaid(r => ({ ...r, firstClears: first ? [...r.firstClears, result.floor] : r.firstClears, highestFloor: Math.max(r.highestFloor, result.floor), unlockedFloor: Math.max(r.unlockedFloor, Math.min(RAID_MAX_FLOOR, result.floor + 1)), towerSeals: r.towerSeals + seals, stabilizers: r.stabilizers + stabilizer }));
    } else {
      const n = Math.min(3, Math.floor(result.kills / 20));
      if (n) gain[zoneCommon(result.floor)] = n;
    }
    if (gold) { setMoney(value => value + gold); lines.push(`💰 ${gold.toLocaleString()}원`); }
    if (Object.keys(gain).length) {
      setRaidItems(stock => { const next = { ...stock }; Object.entries(gain).forEach(([id, n]) => { next[id] = (next[id] ?? 0) + n; }); return next; });
      Object.entries(gain).forEach(([id, n]) => lines.push(`${RAID_ITEMS[id].icon} ${RAID_ITEMS[id].name} ×${n}`));
    }
    if (seals) lines.push(`🔖 탑의 인장 ×${seals}`);
    if (stabilizer) lines.push("🪨 안정화석 ×1 (행운!)");
    if (result.cleared) playCoinSound([660, 880, 1100, 1320]);
    return lines;
  }

  /** 사냥 소재 판매. */
  function sellLoot(id: string, count: number) {
    const loot = ALL_LOOT.find(item => item.id === id), n = Math.min(count, huntStock[id] ?? 0);
    if (!loot || n <= 0) return;
    setHuntStock(stock => { const next = { ...stock }; next[id] = (next[id] ?? 0) - n; if (next[id] <= 0) delete next[id]; return next; });
    setMoney(value => value + loot.price * n); playCoinSound([880, 1320]);
    setNotice(`${loot.icon} ${loot.name} ${n}개를 ${(loot.price * n).toLocaleString()}원에 팔았어요.`);
  }

  /** 아이템 키 하나의 잠금을 바꾼다(채집물처럼 분류별 화면이 따로 없는 품목). */
  function toggleItemLock(key: string) { setItemLocks(locks => { const next = { ...locks }; if (next[key]) delete next[key]; else next[key] = true; return next; }); }
  // ---------- 마을 복구(LIFE_CONTENT_EXPANSION_SPEC 5절) ----------
  const facilityName = (id: string) => FACILITIES.find(entry => entry.id === id)?.name ?? id;
  /** 납품: 창고에서 빼고 시설에 보관(확인창을 거친 뒤 호출). 창고 차감과 납품 기록을 같은 저장에 반영한다. */
  function deliverVillage(facility: string, take: Record<string, number>) {
    const result = applyDelivery(inventory, village, facility, take);
    const moved = takeCount(result.village.contributions[facility] ?? {}) - takeCount(village.contributions[facility] ?? {});
    if (moved <= 0) return setNotice("🏘️ 납품할 수 있는 재료가 없어요.");
    setInventory(result.inventory); setVillage(result.village);
    setNotice(`🏘️ ${facilityName(facility)}에 재료 ${moved}개를 납품했어요.`); playPlop();
  }
  /** 복구 취소: 이번 단계 납품분 전부 반환(창고 용량을 넘어도 잃지 않음). */
  function cancelVillage(facility: string) {
    const result = cancelDelivery(inventory, village, facility);
    setInventory(result.inventory); setVillage(result.village);
    setNotice(`🏘️ ${facilityName(facility)} 복구를 취소하고 재료 ${result.refunded}개를 돌려받았어요.`);
  }
  /** 완공: 골드 지불 → 즉시 완공. 광장 보상은 단계당 한 번만 지급한다. */
  function completeVillage(facility: string) {
    const result = completeStage(inventory, village, facility, money);
    if (!result) return setNotice("🏘️ 아직 재료나 골드가 모자라요.");
    setMoney(value => value - result.gold); setInventory(result.inventory); setVillage(result.village);
    const gift = result.reward?.furniture ? FURNITURE.find(entry => entry.id === result.reward!.furniture) : undefined;
    if (gift) setWarehouse(items => [...items, { ...gift, instanceId: `${gift.id}-${Date.now()}`, x: 0, z: 0, rot: 0 }]);
    playCoinSound([523, 659, 784, 1047, 1319]);
    setNotice(`🔨 ${facilityName(facility)} ${result.level}단계 복구 완료!${gift ? ` ${gift.icon} ${josa(gift.name, "을를")} 받았어요(🏡 나의 집 › 창고).` : ""}${result.reward?.title ? ` 칭호 「${result.reward.title}」` : ""}`);
  }

  // ---------- 채집·탐험 ----------
  /** 이미 정산한 판(같은 접속 안에서 중복 호출 방지) */
  const settledRuns = useRef(new Set<string>());
  /** 10초 체크포인트: 확정 채집 품목만 저장(창고에는 아직 넣지 않음). 이미 끝난 판이면 무시. */
  function saveExploreCheckpoint(checkpoint: ExplorationCheckpoint) {
    if (settledRuns.current.has(checkpoint.runId)) return;
    setExploration(state => ({ ...state, checkpoint }));
  }
  /** 귀환·시간 종료: 창고 지급·판 수·희귀 천장·체크포인트 삭제를 한 번에(같은 판은 한 번만). */
  function finishExploration(result: RunResult) {
    if (settledRuns.current.has(result.runId)) return;
    settledRuns.current.add(result.runId);
    // 최신 상태 위에서 계산한다(그 사이 공방 완료 등 다른 변경을 덮어쓰지 않게)
    setInventory(stock => settleExploration(stock, EMPTY_EXPLORATION, result).inventory);
    setExploration(state => settleExploration({}, { ...state, checkpoint: undefined }, result).exploration);
    if (result.bait > 0) setBaits(stock => ({ ...stock, worm: (stock.worm ?? 0) + result.bait }));
    const total = Object.values(result.bag).reduce((sum, n) => sum + n, 0);
    const message = total > 0 ? `🧭 탐험에서 채집물 ${total}개를 가져와 통합 창고에 넣었어요.` : "🧭 빈손으로 돌아왔어요. 다음엔 반짝이는 곳을 노려 봐요!";
    // 이번 탐험으로 마을 조건(3회)을 처음 채우면 바로 알려 준다
    const opensVillage = VILLAGE_ENABLED && !villageOpen && villageUnlockMet(settleExploration({}, { ...exploration, checkpoint: undefined }, result).exploration);
    setNotice(opensVillage ? `🏘️ 마을이 열렸어요! 집·마을 → 마을에서 무너진 마을을 복구해 보세요. ${message}` : message);
    playCoinSound(opensVillage ? [660, 880, 1100] : [660, 880]);
  }
  /** 채집물 판매: 고정 저가, 잠금은 팔지 않는다(7.1절). */
  function sellForage(id: string, count: number) {
    const item = FORAGE.find(entry => entry.id === id);
    if (!item) return;
    if (itemLocks[forageKey(id)]) return setNotice("🔒 잠근 채집물이에요. 팔려면 먼저 잠금을 풀어 주세요.");
    const n = Math.min(count, forageStock[id] ?? 0);
    if (n <= 0) return;
    setForageStock(stock => { const next = { ...stock }; next[id] = (next[id] ?? 0) - n; if (next[id] <= 0) delete next[id]; return next; });
    setMoney(value => value + item.price * n); playCoinSound([880, 1320]);
    setNotice(`${item.icon} ${item.name} ${n}개를 ${(item.price * n).toLocaleString()}원에 팔았어요.`);
  }

  // ---------- 주방(사냥 준비물) ----------
  /** 요리에 쓸 수 있는 물고기(전설 제외, 미션 예약분 제외). 싼 것부터. */
  const cookFishList = () => Object.entries(fishStock).filter(([id]) => !fishLocks[id]).map(([id, count]) => ({ id, fish: ALL_FISH.find(item => item.id === id), free: count - (fishReserved[id] ?? 0) }))
    .filter(entry => entry.fish && entry.fish.rarity !== "전설" && entry.fish.rarity !== "신화" && entry.free > 0).sort((a, b) => a.fish!.price - b.fish!.price);
  const cookFishCount = () => cookFishList().reduce((sum, entry) => sum + entry.free, 0);
  function startCooking(dish: Dish) {
    const missing = dish.ingredients.find(ing => (ing.kind === "crop" ? usableOf(ing.id) : ing.kind === "hunt" ? huntStock[ing.id] ?? 0 : cookFishCount()) < ing.count);
    if (missing) return setNotice("🍳 재료가 모자라요. 창고 보관으로 모아 주세요(잠금·미션 예약분은 쓰지 않아요).");
    // 재료는 요리를 시작할 때 꺼낸다: 작물은 낮은 품질·황금 아닌 것부터, 물고기는 싼 것부터.
    const nextCrops = { ...produce }, nextFish = { ...fishStock }, nextHunt = { ...huntStock };
    dish.ingredients.forEach(ing => {
      let need = ing.count;
      if (ing.kind === "hunt") { nextHunt[ing.id] = (nextHunt[ing.id] ?? 0) - need; if (nextHunt[ing.id] <= 0) delete nextHunt[ing.id]; return; }
      if (ing.kind === "crop") Object.keys(nextCrops).filter(key => parseProduceKey(key).cropId === ing.id)
        .sort((a, b) => { const x = parseProduceKey(a), y = parseProduceKey(b); return Number(x.golden) - Number(y.golden) || x.quality - y.quality; })
        .forEach(key => { const take = Math.min(need, sellableOf(key)); if (take <= 0) return; nextCrops[key] -= take; need -= take; if (nextCrops[key] <= 0) delete nextCrops[key]; });
      else cookFishList().forEach(entry => { const take = Math.min(need, entry.free, nextFish[entry.id] ?? 0); if (take <= 0) return; nextFish[entry.id] -= take; need -= take; if (nextFish[entry.id] <= 0) delete nextFish[entry.id]; });
    });
    setProduce(nextCrops); setFishStock(nextFish); if (dish.ingredients.some(ing => ing.kind === "hunt")) setHuntStock(nextHunt); setCookResult(null); setCooking({ dish, at: Date.now() }); playPlop();
  }
  function finishCooking(score: number) {
    const dish = cooking?.dish; if (!dish) return;
    const grade = rollGrade(score), key = `${dish.id}|${grade}|0`;
    setDishStock(stock => ({ ...stock, [key]: (stock[key] ?? 0) + 1 })); setCookedDishIds(ids => addCookedDish(ids, dish.id));
    setCooking(null); setCookResult({ dish, grade, score });
    playCoinSound(grade === 2 ? [523, 659, 784, 1047, 1319] : grade === 1 ? [660, 880, 1100] : [660, 880]);
  }

  // ---------- 오늘의 주문서 ----------
  /** 통합 창고에서 미션 품목으로 낼 수 있는 개수. */
  function orderHave(item: Order["items"][number]) {
    if (item.kind === "fish") return fishStock[item.fishId] ?? 0;
    return Object.entries(produce).reduce((sum, [key, count]) => { const info = parseProduceKey(key); return info.cropId === item.cropId && info.quality >= item.minQuality ? sum + count : sum; }, 0);
  }
  const orderItemKey = (item: Order["items"][number]) => item.kind === "fish" ? `fish:${item.fishId}` : `crop:${item.cropId}:${item.minQuality}`;
  const depositedFor = (order: Order, item: Order["items"][number]) => ordersDone.date === today ? ordersDone.deposits?.[order.id]?.[orderItemKey(item)] ?? 0 : 0;
  /** 창고에 있는 만큼만 미리 납품한다. 마지막 품목까지 채우면 즉시 완료 보상을 준다. */
  function depositOrder(order: Order) {
    if (doneToday.includes(order.id)) return;
    const next = { ...produce }, nextFish = { ...fishStock }, current = ordersDone.date === today ? { ...(ordersDone.deposits?.[order.id] ?? {}) } : {};
    let moved = 0;
    order.items.forEach(item => {
      const key = orderItemKey(item), need = Math.max(0, item.count - (current[key] ?? 0));
      if (item.kind === "fish") { const take = Math.min(need, nextFish[item.fishId] ?? 0); nextFish[item.fishId] = (nextFish[item.fishId] ?? 0) - take; if (!nextFish[item.fishId]) delete nextFish[item.fishId]; current[key] = (current[key] ?? 0) + take; moved += take; return; }
      let left = need;
      Object.keys(next).filter(stockKey => { const info = parseProduceKey(stockKey); return info.cropId === item.cropId && info.quality >= item.minQuality; })
        .sort((a, b) => { const x = parseProduceKey(a), y = parseProduceKey(b); return Number(x.golden) - Number(y.golden) || x.quality - y.quality; })
        .forEach(stockKey => { const take = Math.min(left, next[stockKey]); next[stockKey] -= take; left -= take; moved += take; current[key] = (current[key] ?? 0) + take; if (next[stockKey] <= 0) delete next[stockKey]; });
    });
    if (!moved) return setNotice("📜 지금 창고에서 미리 납품할 수 있는 미션 재료가 없어요.");
    setProduce(next); setFishStock(nextFish);
    const complete = order.items.every(item => (current[orderItemKey(item)] ?? 0) >= item.count);
    const allDeposits = { ...(ordersDone.date === today ? ordersDone.deposits ?? {} : {}), [order.id]: current };
    if (!complete) { setOrdersDone({ date: today, ids: doneToday, deposits: allDeposits }); playPlop(); return setNotice(`📜 ${moved}개를 미리 납품했어요. 남은 재료만 창고에서 자동 예약해 둘게요.`); }
    setMoney(m => m + order.reward);
    if (order.bonus?.kind === "fert") setFertStock(stock => ({ ...stock, [order.bonus!.id]: (stock[order.bonus!.id] ?? 0) + order.bonus!.count }));
    if (order.bonus?.kind === "food") setPetFood(stock => ({ ...stock, [order.bonus!.id]: (stock[order.bonus!.id] ?? 0) + order.bonus!.count }));
    setOrdersDone({ date: today, ids: [...doneToday, order.id], deposits: allDeposits }); playCoinSound([660, 880, 1100, 1320]);
    setNotice(`📜 미션 납품 완료! +${order.reward.toLocaleString()}원${order.bonus ? ` · 보너스 ${bonusLabel(order)}` : ""}`);
  }
  function bonusLabel(order: Order) {
    const bonus = order.bonus; if (!bonus) return "";
    const item = bonus.kind === "fert" ? FERTILIZERS.find(f => f.id === bonus.id) : PET_FOODS.find(f => f.id === bonus.id);
    return item ? `${item.icon} ${item.name} ${bonus.count}개` : "";
  }

  function toggleHarvestMode() {
    const next = harvestMode === "sell" ? "store" : "sell";
    setHarvestMode(next);
    setNotice(next === "store" ? "📦 이제 수확한 작물을 창고에 넣어요. 시세 좋을 때 창고에서 파세요." : "💰 이제 수확하면 바로 팔아요.");
  }
  function sellStoredFish(fishId: string, count: number) {
    const fish = ALL_FISH.find(item => item.id === fishId), reservedCount = fishReserved[fishId] ?? 0;
    if (fishLocks[fishId]) return setNotice("🔒 잠근 물고기예요. 팔려면 먼저 잠금을 풀어 주세요.");
    const n = Math.min(count, Math.max(0, (fishStock[fishId] ?? 0) - reservedCount));
    if (!fish || n <= 0) return setNotice("📜 미션 예약분은 판매할 수 없어요.");
    const amount = fish.price * n;
    setFishStock(stock => { const next = { ...stock, [fishId]: (stock[fishId] ?? 0) - n }; if (next[fishId] <= 0) delete next[fishId]; return next; });
    setMoney(value => value + amount); playCoinSound([880, 1100, 1320]);
    setNotice(`짤랑~ ${fish.icon} ${fish.name} ${n}마리를 ${amount.toLocaleString()}원에 팔았어요!`);
  }

  function chooseHand(hand: HarvestTool) {
    if (ownsItem(ownedHands, hand.id)) { setHandId(hand.id); setTool("hand"); return setNotice(`${hand.icon} ${josa(hand.name, "을를")} 들었어요. (${hand.note} 수확)`); }
    if (money < hand.price) return setNotice(`${josa(hand.name, "은는")} ${hand.price.toLocaleString()}원이에요.`);
    setMoney(value => value - hand.price); setOwnedHands(items => [...items, hand.id]); setHandId(hand.id); setTool("hand");
    playCoinSound([660, 990, 1320]);
    setNotice(`${hand.icon} ${josa(hand.name, "을를")} 샀어요! 다 자란 작물을 ${hand.note} 범위로 한꺼번에 수확해요.`);
  }

  function choosePlanter(planter: HarvestTool) {
    if (ownsItem(ownedPlanters, planter.id)) { setPlanterId(planter.id); setTool("seed"); return setNotice(`${planter.icon} ${josa(planter.name, "을를")} 들었어요. (${planter.note} 심기)`); }
    if (money < planter.price) return setNotice(`${josa(planter.name, "은는")} ${planter.price.toLocaleString()}원이에요.`);
    setMoney(value => value - planter.price); setOwnedPlanters(items => [...items, planter.id]); setPlanterId(planter.id); setTool("seed");
    playCoinSound([660, 990, 1320]);
    setNotice(`${planter.icon} ${josa(planter.name, "을를")} 샀어요! 빈 밭 ${planter.note}에 씨앗을 한꺼번에 심어요.`);
  }

  function expandField() {
    const price = fieldPrice(ownedPlots);
    if (ownedPlots >= MAX_PLOTS) return setNotice("밭은 이미 최대 크기예요.");
    if (money < price) return setNotice(`밭 두 칸을 넓히려면 ${price.toLocaleString()}원이 필요해요.`);
    setMoney(value => value - price); setOwnedPlots(value => value + 2);
    setPlots(current => [...current, null, null]);
    setNotice(`🌱 밭 두 칸을 새로 샀어요! 이제 ${ownedPlots + 2}칸에서 농사지을 수 있어요.`);
  }

  // ---------- 낚시 ----------
  /** 미끼를 원하는 개수만큼 산다(개당 값 = 묶음 값 ÷ 묶음 개수). */
  function buyBait(bait: Bait, count: number) {
    const price = Math.round((bait.price / bait.pack) * count);
    if (money < price) return setNotice(`${bait.name} ${count}개는 ${price.toLocaleString()}원이에요.`);
    setMoney(value => value - price); setBaits(stock => ({ ...stock, [bait.id]: (stock[bait.id] ?? 0) + count })); setSelectedBait(bait.id);
    setNotice(`${bait.icon} ${josa(bait.name, "을를")} ${count}개 샀어요. (${price.toLocaleString()}원)`);
  }


  function chooseRod(rod: Rod) {
    if (fishState.phase === "game") return;
    if (ownsItem(ownedRods, rod.id)) { setRodId(rod.id); return setNotice(`${rod.icon} ${josa(rod.name, "을를")} 들었어요.`); }
    if (money < rod.price) return setNotice(`${josa(rod.name, "은는")} ${rod.price.toLocaleString()}원이에요.`);
    setMoney(value => value - rod.price); setOwnedRods(items => [...items, rod.id]); setRodId(rod.id);
    playCoinSound([660, 990, 1320]);
    setNotice(`${rod.icon} ${josa(rod.name, "을를")} 샀어요! ${rod.note}`);
  }

  /** 낚시 장소 이동. 유료 장소는 입장권이 없거나 만료됐으면 새로 산다. */
  function chooseSpot(spot: FishingSpot) {
    if (fishState.phase === "waiting" || fishState.phase === "bite" || fishState.phase === "game") return setNotice("낚시가 끝난 뒤에 이동할 수 있어요.");
    const valid = spot.price === 0 || (tickets[spot.id] ?? 0) > Date.now();
    if (!valid && spotConfirm?.id !== spot.id) return setSpotConfirm(spot);
    setSpotConfirm(null);
    if (!valid) {
      if (money < spot.price) return setNotice(`${spot.name} 입장권은 ${spot.price.toLocaleString()}원(${spot.minutes}분)이에요.`);
      setMoney(value => value - spot.price); setTickets(items => ({ ...items, [spot.id]: Date.now() + spot.minutes * 60000 }));
      playCoinSound([740, 990]);
      setNotice(`🎫 ${spot.icon} ${spot.name} 입장권을 샀어요! ${spot.minutes}분 동안 낚시할 수 있어요. (${spot.note})`);
    } else setNotice(`${spot.icon} ${spot.name}(으)로 이동했어요. ${spot.note}`);
    setSpotId(spot.id); setFishState({ phase: "idle" });
  }

  function castLine() {
    if (!isWorkTime) return setNotice("밤에는 강물이 차가워 낚시터가 쉬어요.");
    if (currentSpot.price > 0 && (tickets[currentSpot.id] ?? 0) <= Date.now()) return setNotice(`🎫 ${currentSpot.name} 입장권이 만료됐어요. 다시 사거나 무료 낚시터로 이동하세요.`);
    const bait = BAITS.find(item => item.id === selectedBait) ?? BAITS[0];
    // 미끼가 하나도 없으면 무료 낚시터에서는 맨손 낚시로 던질 수 있다(돈이 바닥나도 다시 벌 수 있게).
    const wantBare = selectedBait === BARE_HAND.id || !baits[bait.id];
    const bare = wantBare && currentSpot.price === 0;
    if (wantBare && !bare) return setNotice(selectedBait === BARE_HAND.id ? "🫳 유료 낚시터에서는 맨손 낚시를 할 수 없어요. 미끼를 고르거나 강가·호숫가로 가요." : `${bait.icon} ${josa(bait.name, "이가")} 없어요. 미끼를 사거나 🫳 맨손 낚시를 골라요(강가·호숫가).`);
    if (bare) castBait.current = BARE_HAND;
    else { setBaits(stock => ({ ...stock, [bait.id]: stock[bait.id] - 1 })); castBait.current = bait; }
    window.clearTimeout(fishTimer.current);
    setFishState({ phase: "waiting" });
    if (bare) setNotice("🫳 미끼 없이 맨손으로 기다려요… 입질이 느리고 흔한 물고기만 와요.");
    fishTimer.current = window.setTimeout(() => {
      setFishState({ phase: "bite" });
      fishTimer.current = window.setTimeout(() => setFishState({ phase: "result", text: "앗, 물고기가 미끼만 먹고 달아났어요." }), BITE_WINDOW_MS);
    }, (bare ? 6000 + Math.random() * 6000 : 2000 + Math.random() * 3500) * (1 - lunchPower(lunchBuff, "fish")));
  }

  function reelIn() {
    window.clearTimeout(fishTimer.current);
    if (fishState.phase === "waiting") return setFishState({ phase: "result", text: "너무 일찍 챘어요! 미끼만 날리고 물고기는 도망갔어요." });
    // 입질에 맞춰 챘다면 어떤 물고기인지 정해지고, 스타듀밸리식 미니게임이 시작된다.
    const bait = castBait.current ?? BAITS[0];
    const bare = bait.id === BARE_HAND.id;
    // 희귀 어획: 버프·날씨·고양이를 합쳐 최대 ×1.5. 전설은 미끼·낚싯대만 영향을 준다(버프로 전설이 쏟아지던 사고 방지).
    const rareBoost = Math.min(FISH_BOOST_MAX, fishMul * (1 + PET_BASE.cat * pw("cat")));
    let rolled = rollFish(season, { normal: bait.normalBoost * currentSpot.normalBoost, rare: bait.rareBoost * currentSpot.rareBoost * rareBoost, legend: bait.legendBoost * currentRod.legendBoost });
    // 맨손 낚시는 전설도 걸리지 않는다(희귀는 rareBoost 0으로 이미 빠짐).
    while (bare && (rolled.rarity === "전설" || rolled.rarity === "신화")) rolled = rollFish(season, { normal: currentSpot.normalBoost, rare: 0, legend: 0 });
    // 전설이 아니면, 날씨·장소 조건에 맞는 특별 물고기가 대신 걸릴 수 있다(맨손 제외).
    const fish = rolled.rarity === "전설" || rolled.rarity === "신화" || bare ? rolled : rollSpecialFish(weather?.kind, currentSpot.id) ?? rolled;
    setFishState({ phase: "game", fish, bait });
    setNotice(`🎣 걸렸다! ${fish.rarity === "신화" ? "물속이 금빛으로 일렁여요…!! 이건 뭐지?!" : fish.rarity === "전설" ? "엄청난 힘이 느껴져요…!" : "초록 막대 안에 물고기를 가둬요!"}`);
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
      setFishState({ phase: "result", text: `줄이 풀려 ${fish.rarity === "신화" ? "정체 모를 금빛 그림자" : fish.rarity === "전설" ? "전설의 그림자" : `${fish.rarity} 등급 물고기`}가 달아났어요.`, reward });
      return setNotice(`💨 놓쳤어요…${reward ? ` 그래도 보물상자에서 ${josa(reward, "을를")} 얻었어요!` : ""}`);
    }
    const price = Math.round(fish.price * (result.perfect ? 1.25 : 1));
    // 신화(숨겨진 물고기)는 도감에 기록하지 않는다.
    if (fish.rarity !== "신화") setFishLog(log => ({ ...log, [fish.id]: (log[fish.id] ?? 0) + 1 }));
    const used = Object.values(produce).reduce((sum, count) => sum + count, 0) + Object.values(fishStock).reduce((sum, count) => sum + count, 0);
    const stored = fishHarvestMode === "store" && used < storageCap;
    if (stored) setFishStock(stock => ({ ...stock, [fish.id]: (stock[fish.id] ?? 0) + 1 }));
    else setMoney(value => value + price);
    setFishState({ phase: "result", fish, bait, perfect: result.perfect, price, stored, reward });
    setRecentCatches(list => [{ id: fish.id, fish, price, stored, perfect: Boolean(result.perfect), at: Date.now() }, ...list].slice(0, 6));
    playCoinSound(fish.rarity === "신화" ? [523, 660, 880, 1100, 1320, 1760, 2093] : fish.rarity === "전설" ? [660, 880, 1100, 1320, 1760] : fish.rarity === "희귀" || result.perfect ? [880, 1100, 1320] : [880, 1320]);
    setNotice(`${fish.rarity === "신화" ? `🐲🌈 도감에도 없는 신화의 물고기, ${josa(fish.name, "을를")} 낚았어요!!!` : fish.rarity === "전설" ? `✨ 전설의 ${josa(fish.name, "을를")} 낚았어요!!` : `🎣 ${fish.name}(${fish.rarity})을(를) 낚았어요.`} ${stored ? "📦 통합 창고에 보관했어요." : `${price.toLocaleString()}원에 바로 팔았어요.`}${fishHarvestMode === "store" && !stored ? " 창고가 가득 찼어요." : ""}${reward ? ` · 보물: ${reward}` : ""}`);
  }

  // ---------- 도박장(홀짝) ----------
  function placeBet(pick: Parity) {
    if (rolling) return;
    const amount = Math.max(MIN_BET, Math.floor(bet));
    if (amount < MIN_BET) return setNotice(`최소 ${MIN_BET.toLocaleString()}원부터 걸 수 있어요.`);
    if (money < amount) return setNotice("판돈이 모자라요. 판돈을 줄여 주세요.");
    setMoney(value => value - amount); setCasinoFx(null);
    setRolling({ pick, bet: amount });
    window.setTimeout(() => {
      const dice = rollParity(pick), result = parityOf(dice), win = result === pick, payout = win ? Math.floor(amount * PAYOUT) : 0;
      const roll: Roll = { dice, result, pick, bet: amount, payout, at: Date.now() };
      if (win) setMoney(value => value + payout);
      setLastRoll(roll); setRollHistory(items => [roll, ...items].slice(0, 12)); setRolling(null);
      recordCasino(amount, payout);
      if (win) { playCoinSound([880, 1100, 1320]); casinoReact("win", payout, pickDealerLine(WIN_GRUMBLES)); }
      else casinoReact("lose", amount, loseLine(Math.random() < 0.5 ? pickDealerLine(PARITY_TAUNTS, { result: PARITY_NAME[result], pick: PARITY_NAME[pick] }) : undefined));
      setNotice(`🎲 ${DICE_FACES[dice[0] - 1]} ${DICE_FACES[dice[1] - 1]} 합 ${dice[0] + dice[1]} → ${PARITY_NAME[result]}! ${win ? `적중! ${payout.toLocaleString()}원을 받았어요.` : `${amount.toLocaleString()}원을 잃었어요.`}`);
    }, 1200);
  }

  // ---------- 도박장 코인 ----------
  useEffect(() => {
    const done = Object.entries(coinHoldings).map(([key, own]) => ({ key, own, result: settleCoin(key, own.units, nowMs) })).filter(entry => entry.result);
    if (!done.length) return;
    const timer = window.setTimeout(() => {
      const payout = done.reduce((sum, entry) => sum + entry.result!.payout, 0);
      setCoinHoldings(all => { const next = { ...all }; done.forEach(entry => delete next[entry.key]); return next; });
      if (payout > 0) { setMoney(value => value + payout); playCoinSound([880, 1100, 1320]); }
      setNotice(done.map(({ own, result }) => result!.coin ? (result!.coin.delisted ? `💀 ${result!.coin.icon} ${result!.coin.name} 상장 폐지… ${own.spent.toLocaleString()}원어치가 휴지조각` : `🎉 ${result!.coin.icon} ${result!.coin.name} 만기 정산 ${result!.payout.toLocaleString()}원`) : "").filter(Boolean).join(" · "));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [coinHoldings, nowMs]);
  /** 코인 사기: 지금 시세로 정수 개수만 산다(주식처럼). */
  function buyCoin(key: string, qty: number) {
    const quote = coinBoard(Date.now()).quotes.find(item => item.key === key);
    if (!quote) return setNotice("방금 시세가 바뀌었어요. 다시 골라 주세요.");
    const count = Math.max(COIN_MIN_QTY, Math.floor(qty)), cost = count * quote.price;
    if (quote.price <= 0) return;
    if (money < cost) return setNotice(`돈이 모자라요. ${count.toLocaleString()}개는 ${cost.toLocaleString()}원이에요.`);
    setMoney(value => value - cost); playCoinSound([660, 880]);
    setCoinHoldings(all => ({ ...all, [key]: { units: (all[key]?.units ?? 0) + count, spent: (all[key]?.spent ?? 0) + cost } }));
    setNotice(`${quote.coin.icon} ${quote.coin.name} ${count.toLocaleString()}개를 개당 ${quote.price.toLocaleString()}원, 총 ${cost.toLocaleString()}원에 샀어요.`);
  }
  /** 코인 팔기: 정수 개수만큼(Infinity면 전부) 지금 시세로 판다. */
  function sellCoin(key: string, qty: number) {
    const quote = coinBoard(Date.now()).quotes.find(item => item.key === key), own = coinHoldings[key];
    if (!quote || !own) return;
    const all = !Number.isFinite(qty) || qty >= own.units - 1e-9;
    const units = all ? own.units : Math.max(1, Math.floor(qty));
    const payout = Math.floor(units * quote.price), spent = Math.round(own.spent * (units / own.units));
    setMoney(value => value + payout); playCoinSound(payout >= spent ? [880, 1100, 1320] : [440, 330]);
    setCoinHoldings(holdings => { const next = { ...holdings }; if (all) delete next[key]; else next[key] = { units: own.units - units, spent: own.spent - spent }; return next; });
    setNotice(`${quote.coin.icon} ${quote.coin.name} ${all ? "전부" : `${units.toLocaleString()}개`}를 ${payout.toLocaleString()}원에 팔았어요. (${payout >= spent ? "+" : ""}${(payout - spent).toLocaleString()}원)`);
  }

  function recordCasino(amount: number, payout: number) {
    const win = payout > 0;
    setCasinoStats(stats => { const streak = win ? Math.max(1, stats.streak + 1) : Math.min(-1, stats.streak - 1); return { wins: stats.wins + (win ? 1 : 0), losses: stats.losses + (win ? 0 : 1), net: stats.net + payout - amount, streak, best: Math.max(stats.best, streak) }; });
  }

  /** 딜러 반응과 화면 효과. 지면 약 올리고, 연패가 쌓이면 더 놀린다. */
  function casinoReact(kind: CasinoReactionKind, amount: number, line: string) {
    previousDealerLine.current = line;
    setCasinoFx({ id: Date.now(), kind, amount, line });
    if (kind === "lose" || kind === "near") playLaugh(kind === "near");
  }

  function pickDealerLine(lines: readonly string[], vars: Record<string, string | number> = {}) {
    return dealerLine(lines, vars, previousDealerLine.current);
  }

  function loseLine(extra?: string) {
    const streak = casinoStats.streak < 0 ? -casinoStats.streak + 1 : 1;
    if (streak >= 3 && streak % 3 === 0) return pickDealerLine(STREAK_TAUNTS, { n: streak });
    return extra ?? pickDealerLine(LOSE_TAUNTS);
  }

  /** 슬롯머신: 결과를 먼저 정하고, 릴이 왼쪽부터 차례로 멈추는 연출을 보여준다. */
  function pullLever() {
    if (slotSpinning || rolling) return;
    const amount = Math.max(MIN_BET, Math.floor(bet));
    if (money < amount) return setNotice("판돈이 모자라요. 판돈을 줄여 주세요.");
    const final = [spinReel(), spinReel(), spinReel()], multiplier = slotMultiplier(final), payout = Math.floor(amount * multiplier);
    setMoney(value => value - amount); setSlotSpinning(3); setLastSlot(null); setCasinoFx(null);
    // 앞 두 릴이 같으면 마지막 릴을 오래 돌려 애를 태운다.
    const tease = final[0] === final[1];
    let stopped = 0;
    const shuffle = window.setInterval(() => setSlotReels(current => current.map((icon, i) => (i < stopped ? final[i] : SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].icon))), 70);
    [700, 1050, tease ? 2700 : 1400].forEach((delay, i) => window.setTimeout(() => {
      stopped = i + 1; setSlotReels(current => current.map((icon, k) => (k <= i ? final[k] : icon))); setSlotSpinning(3 - stopped);
      if (stopped === 2 && tease) setSlotTension(true);
      if (stopped < 3) return;
      window.clearInterval(shuffle); setSlotTension(false);
      if (payout) { setMoney(value => value + payout); playCoinSound(multiplier >= 30 ? [660, 880, 1100, 1320, 1760] : [880, 1100, 1320]); }
      setLastSlot({ bet: amount, payout, multiplier }); recordCasino(amount, payout);
      const pairSymbol = SLOT_SYMBOLS.find(symbol => symbol.icon === final[0]);
      if (multiplier >= 30) casinoReact("jackpot", payout, pickDealerLine(JACKPOT_GRUMBLES));
      else if (payout > amount) casinoReact("win", payout, pickDealerLine(WIN_GRUMBLES));
      else if (payout) casinoReact("lose", amount - payout, "체리 두 개? 본전도 겨우네~ ㅋㅋ");
      else if (tease && pairSymbol) casinoReact("near", amount, pickDealerLine(NEAR_MISS_TAUNTS, { x: pairSymbol.triple, icon: pairSymbol.icon }));
      else casinoReact("lose", amount, loseLine());
      setNotice(`🎰 ${final.join(" ")} — ${payout ? `${multiplier}배! ${payout.toLocaleString()}원을 받았어요.` : `꽝! ${amount.toLocaleString()}원을 잃었어요.`}`);
    }, delay));
  }

  // ---------- 블랙잭 ----------
  function dealBlackjack() {
    if (bj.phase === "player" || bj.phase === "dealer") return;
    const amount = Math.max(MIN_BET, Math.floor(bet));
    if (money < amount) return setNotice("판돈이 모자라요. 판돈을 줄여 주세요.");
    const player = [drawCard(), drawCard()], dealer = [drawCard(), drawCard()];
    setMoney(value => value - amount); setCasinoFx(null);
    if (isBlackjack(player) || isBlackjack(dealer)) return finishBlackjack(player, dealer, amount);
    setBj({ phase: "player", player, dealer, bet: amount });
  }

  function hitBlackjack() {
    if (bj.phase !== "player") return;
    const player = [...bj.player, drawCard()];
    if (handValue(player).total > 21) return finishBlackjack(player, bj.dealer, bj.bet);
    setBj({ ...bj, player });
    if (handValue(player).total === 21) runDealer(player, bj.dealer, bj.bet);
  }

  function doubleBlackjack() {
    if (bj.phase !== "player" || bj.player.length !== 2) return;
    if (money < bj.bet) return setNotice("더블다운할 돈이 모자라요.");
    setMoney(value => value - bj.bet);
    const player = [...bj.player, drawCard()], amount = bj.bet * 2;
    if (handValue(player).total > 21) return finishBlackjack(player, bj.dealer, amount);
    runDealer(player, bj.dealer, amount);
  }

  /** 딜러 차례: 숨긴 카드를 뒤집고, 17 이상이 될 때까지 0.6초마다 한 장씩 받는다. */
  function runDealer(player: Card[], start: Card[], amount: number) {
    let dealer = start;
    setBj({ phase: "dealer", player, dealer, bet: amount });
    const step = () => {
      if (!dealerShouldHit(dealer)) return finishBlackjack(player, dealer, amount);
      dealer = [...dealer, drawCard()];
      setBj({ phase: "dealer", player, dealer, bet: amount });
      window.setTimeout(step, 600);
    };
    window.setTimeout(step, 700);
  }

  function finishBlackjack(player: Card[], dealer: Card[], amount: number) {
    const { outcome, payout } = settleBlackjack(player, dealer, amount);
    setBj({ phase: "done", player, dealer, bet: amount, outcome, payout });
    if (payout) setMoney(value => value + payout);
    if (outcome !== "push") recordCasino(amount, payout);
    const p = handValue(player).total, d = handValue(dealer).total;
    if (outcome === "blackjack") { playCoinSound([660, 880, 1100, 1320, 1760]); casinoReact("jackpot", payout, pickDealerLine(JACKPOT_GRUMBLES)); }
    else if (outcome === "win") { playCoinSound([880, 1100, 1320]); casinoReact("win", payout, pickDealerLine(WIN_GRUMBLES)); }
    else if (outcome === "push") casinoReact("push", payout, pickDealerLine(BLACKJACK_TAUNTS.push));
    else casinoReact("lose", amount, loseLine(outcome === "bust" ? pickDealerLine(BLACKJACK_TAUNTS.bust, { n: p }) : isBlackjack(dealer) ? pickDealerLine(BLACKJACK_TAUNTS.dealerBlackjack) : pickDealerLine(BLACKJACK_TAUNTS.lose, { n: p })));
    setNotice(`🃏 나 ${p} : 딜러 ${d} — ${{ blackjack: `블랙잭! ${payout.toLocaleString()}원`, win: `승리! ${payout.toLocaleString()}원`, push: "무승부, 판돈을 돌려받았어요", lose: `패배… ${amount.toLocaleString()}원을 잃었어요`, bust: `버스트! ${amount.toLocaleString()}원을 잃었어요` }[outcome]}`);
  }

  // ---------- 이벤트 ----------
  function chooseEventOption(index: number) {
    if (!activeEvent) return;
    const result = resolveChoice(activeEvent.event.choices[index]);
    if (result.money) setMoney(value => Math.max(0, value + result.money!));
    setActiveEvent({ ...activeEvent, result });
    setNotice(`${activeEvent.event.icon} ${result.text}`);
  }
  /** 호랑이 펫: 나쁜 효과의 크기(성장·판매가)와 지속시간(씨앗·어획)을 줄인다 */
  const tigerScale = (kind: Buff["kind"], mul: number) => (pets.has("tiger") && !BUFF_INFO[kind].good(mul) ? tigerDebuff(petLevel("tiger")) : 1);
  /** 결과 창 확인: 이때부터 효과 시작(RANDOM_EVENT_AUDIT 10.4) */
  function closeEvent() {
    const buff = activeEvent?.result?.buff;
    setActiveEvent(null);
    if (!buff) return;
    const now = Date.now(), soften = tigerScale(buff.kind, buff.multiplier);
    if (buff.kind === "growth") {
      // 성장: 지금 자라는 작물의 남은 시간에 바로(나쁜 효과는 호랑이가 크기를 줄인다)
      const mul = 1 + (buff.multiplier - 1) * soften; let n = 0;
      setPlots(current => current.map(plot => { if (!plot) return plot; const crop = CROPS.find(c => c.id === plot.cropId); if (!crop) return plot; const next = scaleRemaining(plot, crop, mul, now); if (next !== plot) n++; return next; }));
      setNotice(`${buff.label}: 자라는 작물 남은 시간 ${mul < 1 ? "−" : "+"}${Math.round(Math.abs(mul - 1) * 100)}%${soften < 1 ? " (호랑이가 줄여 줬어요)" : ""}`); void n;
      return;
    }
    if (buff.kind === "price") {
      // 판매가: 다음 농작물 40개(수량제)
      const mul = 1 + (buff.multiplier - 1) * soften;
      setBuffs(items => [...items.filter(item => item.expiresAt > now && item.label !== buff.label), { id: `price-${now}`, kind: "price", label: buff.label, multiplier: mul, expiresAt: now + 6 * 3600000, left: PRICE_EVENT_COUNT }]);
      return;
    }
    setBuffs(items => [...items.filter(item => item.expiresAt > now && item.label !== buff.label), { id: `${buff.kind}-${now}`, kind: buff.kind, label: buff.label, multiplier: buff.multiplier, expiresAt: now + buff.minutes * 60000 * soften }]);
  }
  /** 결과 창에 보여 줄 효과 설명 */
  function effectText(buff: NonNullable<Effect["buff"]>) {
    const pct = Math.round(Math.abs(buff.multiplier - 1) * 100), up = buff.multiplier > 1;
    if (buff.kind === "growth") { const g = eventGate.current.ctx.growing; return `${buff.label} · 자라는 작물 ${g}개 남은 시간 ${up ? "+" : "−"}${pct}%`; }
    if (buff.kind === "price") return `${buff.label} · 다음 농작물 ${PRICE_EVENT_COUNT}개 판매가 ${up ? "+" : "−"}${pct}%`;
    return `${buff.label} · ${BUFF_INFO[buff.kind].name} ${up ? "+" : "−"}${pct}% · ${buff.minutes}분`;
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
    setAvatar({ src: DEFAULT_AVATAR, pixelated: false });
    try { localStorage.removeItem(AVATAR_STORAGE_KEY); } catch { /* ignore */ }
    setNotice("🐈‍⬛ 기본 농부 고양이로 돌아왔어요.");
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
    if (item.yard || item.pet) {
      // 앞마당부터 가운데→바깥 순으로 훑어 다른 마당 소품·펫과 겹치지 않는 첫 자리를 고른다. 펫은 기본적으로 마당에서 지낸다.
      const others = placed.filter(other => other.yard || (other.pet && !fitsInRoom(room.points, other.x, other.z, 0))), need = Math.max(item.size[0], item.size[2]) / 2 + 0.5;
      for (let z = room.depth / 2 + 1.2; z < room.depth / 2 + 12; z += 1.1) for (let step = 0; step < 16; step++) {
        const x = (step % 2 ? 1 : -1) * Math.ceil(step / 2) * 1.1;
        if (fitsInYard(room, yardLevel, x, z, need * 0.7) && others.every(other => Math.hypot(other.x - x, other.z - z) > need + Math.max(other.size[0], other.size[2]) / 2)) return { x, z, rot: 0 };
      }
      return { x: 0, z: room.depth / 2 + 1.4, rot: 0, story: 0 };
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
  function drawCosmetic(slot: EffectSlot) {
    if (effectDrawLock.current || money < EFFECT_PRICE) return;
    const reward = rollEffectReward(ownedEffects, slot);
    if (!reward) return;
    effectDrawLock.current = true;
    setMoney(value => value - EFFECT_PRICE);
    setEffectResult(reward);
    if (reward.kind === 'effect') {
      setOwnedEffects(ids => [...ids, reward.effect.id]);
      playCoinSound([660, 990, 1320]);
      setNotice(`✨ ${reward.effect.name} 획득! 장비창에서 장착해 주세요.`);
    } else {
      const setStock = reward.kind === 'bait' ? setBaits : setFertStock;
      setStock(stock => ({ ...stock, [reward.id]: (stock[reward.id] ?? 0) + reward.count }));
      playCoinSound([440, 550]);
      setNotice(`${reward.icon} ${reward.name} ${reward.count}개 획득! 보유 수량에 추가했어요.`);
    }
  }
  useEffect(() => { effectDrawLock.current = false; }, [effectResult]);

  function drawPet(count = 1) {
    if (money < GACHA_PRICE * count) return setNotice(`펫 뽑기 ${count}회는 ${(GACHA_PRICE * count).toLocaleString()}원이에요.`);
    // 펫은 최대 PET_LIMIT마리. 넘치는 만큼은 뽑자마자 자동으로 되판다(저장 용량 보호).
    const owned = [...placed, ...warehouse].filter(item => item.pet).length, room0 = Math.max(0, PET_LIMIT - owned);
    if (room0 < count && !window.confirm(`펫은 최대 ${PET_LIMIT}마리까지 키울 수 있어요(지금 ${owned}마리).\n${room0 ? `이번에 뽑는 펫 중 ${count - room0}마리는` : "이번에 뽑는 펫은 모두"} 뽑자마자 자동으로 되팔려요(가치의 50%).\n계속 뽑을까요?`)) return;
    const now = Date.now(), pets = Array.from({ length: count }, rollPet), kept = pets.slice(0, room0), sold = pets.slice(room0), refund = sold.reduce((total, pet) => total + Math.round(pet.price * 0.5), 0);
    setMoney(m => m - GACHA_PRICE * count + refund);
    setPlaced(items => [...items, ...kept.map((pet, i) => fitToRoom({ ...pet, instanceId: `${pet.id}-${now}-${i}`, x: 0, z: 0, rot: 0, ...defaultSpot(pet, items.length + i) }, room, yardLevel))]);
    if (sold.length) {
      const best = pets.find(pet => pet.legend) ?? pets.find(pet => pet.rare) ?? pets[0];
      setGachaResult({ item: best, at: now });
      return setNotice(`🎰 ${pets.map(pet => pet.icon).join("")} · 펫 ${PET_LIMIT}마리가 넘어 ${sold.length}마리(${sold.map(pet => pet.icon).join("")})는 자동으로 ${refund.toLocaleString()}원에 되팔았어요.`);
    }
    if (count > 1) {
      // 10회 뽑기: 가장 좋은 펫을 결과 창에 보여 주고 나머지는 알림으로 요약한다.
      const best = pets.find(pet => pet.legend) ?? pets.find(pet => pet.rare) ?? pets[0];
      setGachaResult({ item: best, at: now });
      const legend = pets.filter(pet => pet.legend).length, rare = pets.filter(pet => pet.rare).length;
      playCoinSound(legend ? [523, 659, 784, 1047, 1319, 1568, 2093] : rare ? [660, 880, 1100, 1320, 1760] : [740, 990]);
      return setNotice(`🎰 ${count}회 뽑기: ${pets.map(pet => pet.icon).join("")}${legend ? ` · 🌈 전설 ${legend}` : ""}${rare ? ` · ✨ 능력 ${rare}` : ""}`);
    }
    const pet = pets[0];
    setGachaResult({ item: pet, at: now });
    playCoinSound(pet.legend ? [523, 659, 784, 1047, 1319, 1568, 2093] : pet.rare ? [660, 880, 1100, 1320, 1760] : [740, 990]);
    if (pet.legend) return setNotice(`🌈🌈 전설!!! 0.1%의 기적, ${pet.icon} ${josa(pet.name, "이가")} 나타났어요!! ${PET_BUFFS[pet.id].title}: ${PET_BUFFS[pet.id].text}`);
    setNotice(pet.rare ? `✨ 대박! 능력 펫 ${pet.icon} ${josa(pet.name, "이가")} 나왔어요! ${PET_BUFFS[pet.id].title}: ${PET_BUFFS[pet.id].text}` : `${pet.icon} ${josa(pet.name, "이가")} 나왔어요. 집 안을 귀엽게 돌아다녀요.`);
  }

  /** 가구 뽑기: 2,000원. 가챠샵 전용 가구가 일반 60% · 희귀 35% · 전설 5%로 나온다. */
  function drawFurniture() {
    if (money < FURNITURE_GACHA_PRICE) return setNotice(`가구 뽑기는 ${FURNITURE_GACHA_PRICE.toLocaleString()}원이에요.`);
    const item = rollGachaFurniture(gachaCollected);
    if (item === undefined) return setNotice("🏆 가챠 가구를 모두 모았어요! 더 뽑을 상품이 없어요.");
    setMoney(m => m - FURNITURE_GACHA_PRICE);
    setFurnitureGachaResult({ item, at: Date.now() });
    if (!item) { playSadTrombone(); return setNotice(dealerLine(["📭 꽝! 빈 상자예요… 상자 안에 먼지만 가득 ㅋㅋ", "📭 꽝! 상자를 열었더니 \"다음 기회에\" 쪽지만…", "📭 꽝!! 2,000원짜리 공기를 샀어요 ㅋㅋㅋ"])); }
    const instanceId = `${item.id}-${Date.now()}`;
    setGachaCollected(ids => [...ids, item.id]);
    setPlaced(items => [...items, fitToRoom({ ...item, instanceId, x: 0, z: 0, rot: 0, ...defaultSpot(item, items.length) }, room, yardLevel)]);
    if (item.tier === "junk") { playSadTrombone(); return setNotice(`🗑️ ${item.icon} ${item.name}… 쓸데없는 상품이에요. 일단 집에 놓아 두었어요. (되팔기 ${Math.round(item.price / 2)}원)`); }
    playCoinSound(item.tier === "legend" ? [523, 659, 784, 1047, 1319, 1568] : item.tier === "rare" ? [660, 880, 1100, 1320] : [740, 990]);
    setNotice(`${item.tier === "legend" ? "🌈 전설 가구!!" : item.tier === "rare" ? "✨ 희귀 가구!" : "🎁"} ${item.icon} ${josa(item.name, "이가")} 나왔어요. 나의 집에 놓아 두었어요.`);
  }

  function sellPet(item: PlacedItem) {
    if (!isSellable(item)) return setNotice(UNSELLABLE_NOTICE);
    if (item.locked) return setNotice("🔒 잠긴 펫이에요. 창고에서 잠금을 풀고 판매해 주세요.");
    const refund = Math.round(item.price * 0.5);
    setPlaced(items => items.filter(entry => entry.instanceId !== item.instanceId));
    setWarehouse(items => items.filter(entry => entry.instanceId !== item.instanceId));
    if (selectedFurniture === item.instanceId) setSelectedFurniture(null);
    setMoney(value => value + refund);
    setNotice(`${item.icon} ${josa(item.name, "을를")} 새 가족에게 보내고 ${refund.toLocaleString()}원을 받았어요.`);
  }
  /** 펫 한꺼번에 되팔기(잠금 제외). "common"은 일반 펫 전부, "dupes"는 종류마다 1마리(레벨 높은 순으로 남김)만 남긴다. */
  function sellPetsBulk(mode: "common" | "dupes") {
    const all = [...placed, ...warehouse].filter(item => item.pet && !item.locked && isSellable(item)), keep = new Set<string>();
    if (mode === "dupes") {
      const owned = [...placed, ...warehouse].filter(item => item.pet);
      for (const id of new Set(owned.map(item => item.id))) { const locked = owned.find(item => item.id === id && item.locked); keep.add((locked ?? owned.find(item => item.id === id && placed.includes(item)) ?? owned.find(item => item.id === id))!.instanceId); }
    }
    const sell = all.filter(item => !keep.has(item.instanceId) && (mode === "dupes" || (!item.rare && !item.legend)));
    if (!sell.length) return setNotice(mode === "dupes" ? "되팔 중복 펫이 없어요." : "되팔 일반 펫이 없어요(잠긴 펫 제외).");
    const refund = sell.reduce((total, item) => total + Math.round(item.price * 0.5), 0);
    if (!window.confirm(`${mode === "dupes" ? "중복 펫" : "일반 펫"} ${sell.length.toLocaleString()}마리를 ${refund.toLocaleString()}원에 되팔까요? 잠긴 펫은 팔지 않아요.`)) return;
    const gone = new Set(sell.map(item => item.instanceId));
    setPlaced(items => items.filter(entry => !gone.has(entry.instanceId)));
    setWarehouse(items => items.filter(entry => !gone.has(entry.instanceId)));
    if (selectedFurniture && gone.has(selectedFurniture)) setSelectedFurniture(null);
    setMoney(value => value + refund);
    setNotice(`🐾 펫 ${sell.length.toLocaleString()}마리를 새 가족에게 보내고 ${refund.toLocaleString()}원을 받았어요.`);
  }

  function buyFurniture(item: Furniture) {
    if (money < item.price) return setNotice(`${josa(item.name, "을를")} 사려면 ${item.price.toLocaleString()}원이 필요해요.`);
    const instanceId = `${item.id}-${Date.now()}`;
    setMoney(m => m - item.price); setPlaced(p => [...p, fitToRoom({ ...item, instanceId, x: 0, z: 0, rot: 0, ...defaultSpot(item, placed.length) }, room, yardLevel)]);
    setSelectedFurniture(instanceId);
    setNotice(item.pet ? `${item.icon} ${josa(item.name, "이가")} 가족이 되었어요! ${PET_BUFFS[item.id].title}: ${PET_BUFFS[item.id].text}` : `${item.icon} ${josa(item.name, "을를")} 집에 들였어요. 끌어서 자리를 잡고 원하는 각도로 돌려 보세요.`);
  }

  function buyTheme(kind: "wall" | "floor", theme: Theme) {
    const key = `${kind}:${theme.id}`, apply = kind === "wall" ? setWallpaper : setFloor;
    if (ownsItem(ownedThemes, key)) { apply(theme.id); return setNotice(`🎨 ${theme.name}(으)로 바꿨어요.`); }
    if (money < theme.price) return setNotice(`${josa(theme.name, "은는")} ${theme.price.toLocaleString()}원이에요.`);
    setMoney(value => value - theme.price); setOwnedThemes(items => [...items, key]); apply(theme.id);
    setNotice(`🎨 ${josa(theme.name, "을를")} 시공했어요! 이제 언제든 무료로 바꿀 수 있어요.`);
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
      const hostItem = selectedItem.host ? placed.find(item => item.instanceId === selectedItem.host) : undefined;
      const length = hostItem ? hostItem.size[0] : wallInfo(room.points, selectedItem.wall ?? 0).length;
      if (hostItem) { const half = (selectedItem.size[0] / 2 + 0.05) / length; return updateItem(selectedItem.instanceId, { u: Math.min(1 - half, Math.max(half, (selectedItem.u ?? 0.5) + move[0] / length)), h: selectedItem.fixedMount ? selectedItem.h : Math.min(hostItem.size[1] - selectedItem.size[1] / 2 - 0.05, Math.max(selectedItem.size[1] / 2 + 0.1, (selectedItem.h ?? 1.4) - move[1])) }); }
      const h = selectedItem.fixedMount ? selectedItem.h : Math.min(WALL_HEIGHT - selectedItem.size[1] / 2 - 0.05, Math.max(selectedItem.size[1] / 2 + 0.1, (selectedItem.h ?? 1.4) - move[1]));
      return updateItem(selectedItem.instanceId, fitToRoom({ ...selectedItem, u: (selectedItem.u ?? 0.5) + move[0] / length, h }, room, yardLevel));
    }
    const next = { x: selectedItem.x + move[0], z: selectedItem.z + move[1] };
    if (selectedItem.yard ? fitsInYard(room, yardLevel, next.x, next.z) : fitsInRoom(room.points, next.x, next.z, 0.25)) updateItem(selectedItem.instanceId, next);
  }

  /** 가벽을 집에서 치우면 거기에 붙어 있던 벽 장식은 뒷벽으로 옮긴다. */
  const detachFrom = (hostId: string) => (items: PlacedItem[]) => items.filter(item => item.instanceId !== hostId).map(item => (item.host === hostId ? { ...item, host: undefined, side: undefined, wall: 0, u: 0.5 } : item));

  function sellFurniture() {
    if (!selectedItem) return;
    if (!isSellable(selectedItem)) return setNotice(UNSELLABLE_NOTICE);
    const refund = Math.round(selectedItem.price * 0.5);
    setPlaced(detachFrom(selectedItem.instanceId));
    setMoney(value => value + refund); setSelectedFurniture(null);
    setNotice(`${selectedItem.icon} ${josa(selectedItem.name, "을를")} 정리하고 ${refund.toLocaleString()}원을 돌려받았어요.`);
  }

  function storeFurniture() {
    if (!selectedItem) return;
    setPlaced(detachFrom(selectedItem.instanceId));
    setWarehouse(items => [...items, { ...selectedItem, host: undefined, side: undefined }]); setSelectedFurniture(null);
    setNotice(`📦 ${josa(selectedItem.name, "을를")} 창고에 안전하게 보관했어요.`);
  }

  /** 내 펫 관리: 집에 있는 펫은 보관함으로, 보관 중인 펫은 집으로. */
  function storePet(item: PlacedItem) {
    setPlaced(items => items.filter(entry => entry.instanceId !== item.instanceId));
    setWarehouse(items => [...items, item]);
    if (selectedFurniture === item.instanceId) setSelectedFurniture(null);
    setNotice(`${item.icon} ${josa(item.name, "을를")} 펫 보관함으로 옮겼어요.${item.rare || item.legend ? " 보관 중에는 능력 효과가 꺼져요." : ""}`);
  }

  function restoreFurniture(item: PlacedItem) {
    setWarehouse(items => items.filter(furniture => furniture.instanceId !== item.instanceId));
    setPlaced(items => [...items, fitToRoom({ ...item, ...defaultSpot(item, 2) }, room, yardLevel)]); setSelectedFurniture(item.instanceId);
    setNotice(`${item.icon} ${josa(item.name, "을를")} 창고에서 꺼냈어요. 원하는 곳으로 옮겨주세요.`);
  }

  function sellWarehouseFurniture(item: PlacedItem) {
    if (!isSellable(item)) return setNotice(UNSELLABLE_NOTICE);
    if (item.locked) return setNotice("🔒 잠긴 가구나 펫은 판매할 수 없어요. 먼저 잠금을 풀어 주세요.");
    const refund = Math.round(item.price * 0.5);
    setWarehouse(items => items.filter(furniture => furniture.instanceId !== item.instanceId));
    setMoney(value => value + refund);
    setNotice(`${item.icon} ${josa(item.name, "을를")} 창고에서 판매하고 ${refund.toLocaleString()}원을 받았어요.`);
  }

  function toggleWarehouseLock(item: PlacedItem) {
    const update = (items: PlacedItem[]) => items.map(entry => entry.instanceId === item.instanceId ? { ...entry, locked: !entry.locked } : entry);
    setPlaced(update); setWarehouse(update);
    setNotice(`${item.locked ? "🔓 잠금을 풀었어요." : "🔒 판매하지 않도록 잠갔어요."} ${item.nickname || item.name}`);
  }

  function renamePet(item: PlacedItem) {
    const nickname = window.prompt("펫 닉네임을 입력하세요. 비우면 원래 이름으로 돌아가요.", item.nickname ?? "")?.trim().slice(0, 16);
    if (nickname === undefined) return;
    const update = (items: PlacedItem[]) => items.map(entry => entry.instanceId === item.instanceId ? { ...entry, nickname: nickname || undefined } : entry);
    setPlaced(update); setWarehouse(update);
    setNotice(`${item.icon} 이제 ${nickname || item.name}(이)라고 부를게요!`);
  }

  const selectedCropInfo = CROPS.find(c => c.id === selectedCrop) ?? available[0] ?? CROPS[0];
  const storageUsed = Object.values(produce).reduce((sum, count) => sum + Math.max(0, count), 0) + Object.values(fishStock).reduce((sum, count) => sum + Math.max(0, count), 0) + Object.values(forageStock).reduce((sum, count) => sum + Math.max(0, count), 0);
  const doneJobs = workshop.jobs.filter(job => job.doneAt <= nowMs).length;
  // 황금 여부와 관계없이 잠금은 오직 사용자가 직접 선택한 경우에만 적용한다.
  const isLocked = (key: string) => produceLocks[key] === true;
  const orderDate = now.toDateString(), orders = useMemo(() => dailyOrders(orderDate), [orderDate]);
  const doneToday = ordersDone.date === orderDate ? ordersDone.ids : NO_IDS;
  // 오늘 못 끝낸 주문에 필요한 수량을 창고에서 예약해 둔다(낮은 품질·황금 아닌 것부터, 납품 규칙과 같게).
  const reserved = useMemo(() => {
    const left = { ...produce }, out: Record<string, number> = {};
    orders.filter(order => !doneToday.includes(order.id)).forEach(order => order.items.filter(item => item.kind === "crop").forEach(item => {
      let need = Math.max(0, item.count - (ordersDone.date === orderDate ? ordersDone.deposits?.[order.id]?.[orderItemKey(item)] ?? 0 : 0));
      Object.keys(left).filter(key => { const info = parseProduceKey(key); return info.cropId === item.cropId && info.quality >= item.minQuality && left[key] > 0; })
        .sort((a, b) => { const x = parseProduceKey(a), y = parseProduceKey(b); return Number(x.golden) - Number(y.golden) || x.quality - y.quality; })
        .forEach(key => { const take = Math.min(need, left[key]); left[key] -= take; need -= take; if (take) out[key] = (out[key] ?? 0) + take; });
    }));
    return out;
  }, [produce, orders, doneToday, ordersDone, orderDate]);
  const fishReserved = useMemo(() => {
    const left = { ...fishStock }, out: Record<string, number> = {};
    orders.filter(order => !doneToday.includes(order.id)).forEach(order => order.items.filter(item => item.kind === "fish").forEach(item => {
      const need = Math.max(0, item.count - (ordersDone.date === orderDate ? ordersDone.deposits?.[order.id]?.[orderItemKey(item)] ?? 0 : 0));
      const take = Math.min(need, left[item.fishId] ?? 0); left[item.fishId] = (left[item.fishId] ?? 0) - take; if (take) out[item.fishId] = (out[item.fishId] ?? 0) + take;
    }));
    return out;
  }, [fishStock, orders, doneToday, ordersDone, orderDate]);
  const sellableOf = (key: string) => (isLocked(key) ? 0 : Math.max(0, (produce[key] ?? 0) - (reserved[key] ?? 0)));
  /** 가공에 쓸 수 있는 창고 묶음(잠금·주문 예약분 제외) */
  const procStock: Stock[] = Object.keys(produce).map(key => { const { cropId, quality, golden } = parseProduceKey(key); return { cropId, quality, golden, n: sellableOf(key) }; }).filter(s => s.n > 0);

  const lunchOptions = { locks: itemLocks, reserved: { ...reservedToItemKeys("crop", reserved), ...reservedToItemKeys("fish", fishReserved) } };
  const lunchCooking = useLunchCooking({ inventory, setInventory, options: lunchOptions, batch: cookingBatch, setBatch: setCookingBatch, buff: lunchBuff, setBuff: setLunchBuff, ids: cookedDishIds, setIds: setCookedDishIds, level: village.facilityLevels["craft-street"] ?? 0, save: flushSave, notice: setNotice });
  const activeLunch = restoreLunchBuff(lunchBuff, nowMs);
  const activeLunchRecipe = activeLunch && lunchRecipe(activeLunch.dishId);

  // ---------- 토벌 장비·대장간 ----------
  /** 대장간에 쓸 수 있는 재료(잠금·주문 예약분 제외). value가 낮은 것부터 쓴다. */
  type Source = { kind: "crop" | "fish" | "hunt" | "goods"; id: string; n: number; value: number; name: string; tag: string };
  const forgeSources = (): Source[] => {
    const list: Source[] = [];
    for (const key of Object.keys(produce)) {
      const { cropId, quality, golden } = parseProduceKey(key), crop = CROPS.find(c => c.id === cropId), n = sellableOf(key);
      if (!crop || n <= 0 || golden) continue;
      list.push({ kind: "crop", id: key, n, value: crop.sell * QUALITIES[quality].multiplier, name: `${crop.icon} ${crop.name}${QUALITIES[quality].stars}`, tag: quality === 0 ? "crop0" : "goodcrop" });
    }
    for (const [id, count] of Object.entries(fishStock)) {
      const fish = ALL_FISH.find(f => f.id === id), n = fishLocks[id] ? 0 : Math.max(0, count - (fishReserved[id] ?? 0));
      if (fish && n > 0 && fish.rarity !== "전설" && fish.rarity !== "신화") list.push({ kind: "fish", id, n, value: fish.price, name: `${fish.icon} ${fish.name}`, tag: "fish" });
    }
    for (const [id, n] of Object.entries(huntStock)) {
      const loot = ALL_LOOT.find(l => l.id === id);
      if (loot && n > 0) list.push({ kind: "hunt", id, n, value: loot.price, name: `${loot.icon} ${loot.name}`, tag: HUNT_COMMON_LOOT.includes(id) ? "hunt" : HUNT_RARE_LOOT.includes(id) ? "rarehunt" : "other" });
    }
    for (const [id, n] of Object.entries(goods)) {
      const info = goodsInfo(id);
      if (n > 0) list.push({ kind: "goods", id, n, value: info.price, name: `${info.icon} ${info.name}`, tag: "goods" });
    }
    return list.sort((a, b) => a.value - b.value);
  };
  type Plan = { take: { src: Source; n: number }[]; mats: Record<string, number>; gold: number };
  /** need(재료 id·특수 키 → 개수)를 실제로 쓸 목록으로 바꾼다. 모자라면 null. */
  const planFor = (need: Record<string, number>, gold = 0): Plan | null => {
    const sources = forgeSources(), take: Plan["take"] = [], mats: Record<string, number> = {};
    const grab = (tag: string, count: number) => {
      let left = count;
      for (const src of sources.filter(x => x.tag === tag)) { const used = take.filter(t => t.src === src).reduce((sum, t) => sum + t.n, 0); const n = Math.min(left, src.n - used); if (n > 0) { take.push({ src, n }); left -= n; } if (!left) break; }
      return left === 0;
    };
    for (const [id, n] of Object.entries(need)) {
      if (id === "good-crop") { if (!grab("goodcrop", n)) return null; }
      else if (id === "rare-hunt") { if (!grab("rarehunt", n)) return null; }
      else if (id === "goods") { if (!grab("goods", n)) return null; }
      else if (huntStock[id] !== undefined || ALL_LOOT.some(l => l.id === id)) { if ((huntStock[id] ?? 0) < n) return null; const src = sources.find(x => x.kind === "hunt" && x.id === id)!; take.push({ src, n }); }
      else { if ((raidItems[id] ?? 0) < n) return null; mats[id] = n; }
    }
    if (money < gold) return null;
    return { take, mats, gold };
  };
  /** 강화 가공(51.4): n개를 만들 때 실제로 쓸 재료. 모자라면 null. */
  const takeTag = (tag: string, count: number, pick?: string[]): Plan | null => { const tags = tag.split("|"), sources = forgeSources().filter(x => tags.includes(x.tag) && (!pick?.length || pick.includes(x.id))).sort((a, b) => a.value - b.value); let left = count; const take: Plan["take"] = []; for (const src of sources) { const k = Math.min(left, src.n); if (k) { take.push({ src, n: k }); left -= k; } if (!left) break; } return left ? null : { take, mats: {}, gold: 0 }; };
  /** 강화 가공 재료 분류(51.5 재료 직접 고르기에서도 씀). */
  const LIFE_TAGS: Record<string, string> = { "farm-fiber": "crop0|goodcrop", "fish-oil": "fish", "tanned-leather": "hunt" };
  const LIFE_NEED: Record<string, (n: number, pick?: string[]) => Plan | null> = {
    "farm-fiber": (n, pick) => takeTag(LIFE_TAGS["farm-fiber"], 5 * n, pick),
    "fish-oil": (n, pick) => takeTag(LIFE_TAGS["fish-oil"], 3 * n, pick),
    "tanned-leather": (n, pick) => takeTag(LIFE_TAGS["tanned-leather"], 3 * n, pick),
    "artisan-core": n => planFor({ "farm-fiber": n, "fish-oil": n, "tanned-leather": n }),
  };
  const lifeMax = (id: string, pick?: string[]) => { let n = 0; while (n < 999 && LIFE_NEED[id]?.(n + 1, pick)) n++; return n; };
  const describePlan = (plan: Plan) => [...plan.take.map(t => `${t.src.name} ${t.n}`), ...Object.entries(plan.mats).map(([id, n]) => `${ALL_RAID_ITEMS[id]?.icon ?? ""} ${ALL_RAID_ITEMS[id]?.name ?? id} ${n}`)];
  /** 계획대로 재료·돈을 쓴다. */
  function spendPlan(plan: Plan) {
    const by = (kind: Source["kind"]) => plan.take.filter(t => t.src.kind === kind);
    const minus = (view: Record<string, number>, items: { src: Source; n: number }[]) => { const next = { ...view }; items.forEach(t => { next[t.src.id] = (next[t.src.id] ?? 0) - t.n; if (next[t.src.id] <= 0) delete next[t.src.id]; }); return next; };
    if (by("crop").length) setProduce(view => minus(view, by("crop")));
    if (by("fish").length) setFishStock(view => minus(view, by("fish")));
    if (by("hunt").length) setHuntStock(view => minus(view, by("hunt")));
    if (by("goods").length) setGoods(view => minus(view, by("goods")));
    if (Object.keys(plan.mats).length) setRaidItems(view => { const next = { ...view }; Object.entries(plan.mats).forEach(([id, n]) => { next[id] = (next[id] ?? 0) - n; if (next[id] <= 0) delete next[id]; }); return next; });
    if (plan.gold) setMoney(value => value - plan.gold);
  }
  const forgeHave: Record<string, number> = { ...huntStock, ...raidItems };
  /** 강화 가공 재료 현황: [쓸 수 있는 수, 가진 수(잠금·주문 예약 포함)] */
  const craftStock: Record<string, [number, number]> = (() => {
    const src = forgeSources(), sum = (tag: string) => src.filter(x => x.tag === tag).reduce((total, x) => total + x.n, 0);
    let crop0 = 0, fish = 0;
    for (const [key, n] of Object.entries(produce)) { const q = parseProduceKey(key); if (!q.golden) crop0 += n; }
    for (const [id, n] of Object.entries(fishStock)) { const f = ALL_FISH.find(x => x.id === id); if (f && f.rarity !== "전설" && f.rarity !== "신화") fish += n; }
    const hunt = HUNT_COMMON_LOOT.reduce((total, id) => total + (huntStock[id] ?? 0), 0);
    return { "farm-fiber": [sum("crop0") + sum("goodcrop"), crop0], "fish-oil": [sum("fish"), fish], "tanned-leather": [sum("hunt"), hunt], "artisan-core": [sum("goods"), Object.values(goods).reduce((t, n) => t + n, 0)] };
  })();
  { const src = forgeSources(); forgeHave["rare-hunt"] = src.filter(x => x.tag === "rarehunt").reduce((sum, x) => sum + x.n, 0); forgeHave.goods = src.filter(x => x.tag === "goods").reduce((sum, x) => sum + x.n, 0); forgeHave["good-crop"] = src.filter(x => x.tag === "goodcrop").reduce((sum, x) => sum + x.n, 0); }
  const forge: ForgeActions = {
    have: forgeHave, money,
    lifePlan: (id, n = 1, pick) => { const plan = LIFE_NEED[id]?.(n, pick); return plan ? describePlan(plan) : null; },
    lifeMax, craftStock,
    craftSources: id => { const tags = LIFE_TAGS[id]?.split("|") ?? []; return forgeSources().filter(x => tags.includes(x.tag)).sort((a, b) => a.value - b.value).map(x => ({ id: x.id, name: x.name, n: x.n })); },
    craftLife: (id, n = 1, pick) => {
      const plan = LIFE_NEED[id]?.(n, pick); if (!plan) return setNotice("재료가 부족해요.");
      spendPlan(plan); setRaidItems(view => ({ ...view, [id]: (view[id] ?? 0) + n }));
      playCoinSound([660, 880]); setNotice(`⚒️ ${LIFE_MATS[id].icon} ${LIFE_MATS[id].name} ${n}개 즉시 완성! (사용: ${describePlan(plan).join(", ")})`);
    },
    masteryUp: () => {
      const evo = raid.weapons[raid.equipped.weapon]?.evolution; if (!evo) return;
      const star = raid.mastery?.[evo] ?? 0, next = SPECIAL_MASTERY[star]; if (!next) return;
      const open = next.unlock === 0 || (next.unlock <= 30 ? raid.firstClears.includes(next.unlock) : raid.highestFloor >= next.unlock);
      if (!open) return setNotice(`★${next.star} 숙련은 아직 열리지 않았어요.`);
      if (money < next.gold || raid.towerSeals < next.seals) return setNotice("숙련에 필요한 골드나 탑의 인장이 모자라요.");
      setMoney(v => v - next.gold);
      setRaid(r => ({ ...r, towerSeals: r.towerSeals - next.seals, mastery: { ...(r.mastery ?? {}), [evo]: star + 1 } }));
      playCoinSound([660, 880, 1100, 1320]); setNotice(`⭐ 특수공격 숙련 ★${next.star}! 특수 피해 +${Math.round(next.dmg * 100)}%${next.star === 3 ? " · 잔향 폭발 해금" : ""}`);
    },
    enhance: useStabilizer => {
      const w = raid.weapons[raid.equipped.weapon], step = nextStep(w.enhancement, enhanceLimit(TEST_MODE ? RAID_DATA_FLOOR : RAID_MAX_FLOOR));
      if (!step || (w.enhancement >= 10 && !w.evolution) || (step.open && !w.unlockedEnhancements.includes(step.to))) return;
      const plan = planFor(step.need, step.gold); if (!plan) return setNotice("강화 재료나 돈이 모자라요.");
      spendPlan(plan);
      const pity = pityChance(step, w.fails?.[step.to] ?? 0), roll = rollEnhance(w.enhancement, step, useStabilizer, raid.stabilizers, Math.random, pity.fails);
      setRaid(r => applyEnhance(r, r.equipped.weapon, roll));
      if (roll.success) { playCoinSound([660, 880, 1100, 1320, 1760]); setNotice(`🔨✨ 강화 성공! ${weaponDef(raid.equipped.weapon).name} +${step.to}${pity.guaranteed ? " (천장 도달 확정 성공)" : ""}${step.to === 10 ? " — 이제 진화 방향을 고를 수 있어요!" : ""}`); }
      else if (roll.dropped) { playSadTrombone(); setNotice(`💥 강화 실패… 단계가 내려가 +${w.enhancement - 1}이 됐어요.`); }
      else if (roll.saved) { playCoinSound([440, 660]); setNotice("🪨 강화 실패! 하락할 뻔했지만 안정화석이 막아 줬어요(1개 소모)."); }
      else { playCoinSound([440, 330]); setNotice(`🔨 강화 실패… +${w.enhancement} 그대로예요. (재료와 돈은 사용됐어요)`); }
    },
    openStep: () => {
      const w = raid.weapons[raid.equipped.weapon], step = nextStep(w.enhancement, enhanceLimit(TEST_MODE ? RAID_DATA_FLOOR : RAID_MAX_FLOOR));
      if (!step?.open || w.unlockedEnhancements.includes(step.to)) return;
      const plan = planFor(step.open.need, step.open.gold); if (!plan) return setNotice("개방 재료나 돈이 모자라요.");
      spendPlan(plan);
      setRaid(r => ({ ...r, weapons: { ...r.weapons, [r.equipped.weapon]: { ...r.weapons[r.equipped.weapon], unlockedEnhancements: [...r.weapons[r.equipped.weapon].unlockedEnhancements, step.to] } } }));
      playCoinSound([660, 990, 1320]); setNotice(`🔓 +${step.to} 강화 단계를 열었어요!`);
    },
    evolve: (evolution: Evolution) => {
      const w = raid.weapons[raid.equipped.weapon];
      if (w.enhancement < 10 || w.evolution) return;
      setRaid(r => setEvolution(r, r.equipped.weapon, evolution)); playCoinSound([660, 880, 1100, 1320]);
      setNotice(`⚡ ${weaponDef(raid.equipped.weapon).name}이(가) 진화했어요!`);
    },
    craftArmor: id => {
      const armor = ARMORS.find(a => a.id === id); if (!armor || raid.armorOwned.includes(id)) return;
      if (!hasArmorPrerequisite(armor, raid.armorOwned)) {
        const previous = ARMORS.find(a => a.id === armor.prerequisite);
        return setNotice(`${previous?.name ?? "이전 단계 방어구"}을(를) 먼저 보유해야 만들 수 있어요.`);
      }
      const plan = planFor(armor.need, armor.gold); if (!plan) return setNotice("방어구 재료나 돈이 모자라요.");
      spendPlan(plan);
      setRaid(r => ({ ...r, armorOwned: [...r.armorOwned, id], equipped: r.equipped[armor.slot] ? r.equipped : { ...r.equipped, [armor.slot]: id } }));
      // 성장 수치(3.4.2): 지금 그 부위 대신 입었을 때 바뀌는 것만
      const before = gearOf(raid), after = gearOf({ ...raid, equipped: { ...raid.equipped, [armor.slot]: id } }), cut = (d: number) => (1 - 100 / (100 + d * 8)) * 100;
      const diff = [after.hp !== before.hp ? `체력 ${100 + before.hp} → ${100 + after.hp}` : "", after.defense !== before.defense ? `받는 피해 감소 ${cut(before.defense).toFixed(1)}% → ${cut(after.defense).toFixed(1)}%` : "", after.startShield !== before.startShield ? `시작 보호막 ${before.startShield} → ${after.startShield}` : "", after.crit !== before.crit ? `치명타 ${Math.round(before.crit * 100)}% → ${Math.round(after.crit * 100)}%` : "", after.speed !== before.speed ? `이동 +${Math.round(before.speed * 100)}% → +${Math.round(after.speed * 100)}%` : "", after.hazardCut !== before.hazardCut ? `바닥 피해 감소 ${Math.round(before.hazardCut * 100)}% → ${Math.round(after.hazardCut * 100)}%` : ""].filter(Boolean);
      playCoinSound([660, 880, 1100]); setNotice(`${armor.icon} ${armor.name}을(를) 만들었어요!${diff.length ? ` 착용하면: ${diff.join(" · ")}` : ""}`);
    },
    equip: (slot: ArmorSlot, id: string | null) => setRaid(r => ({ ...r, equipped: { ...r.equipped, [slot]: id } })),
    drawPets: count => {
      const cost = PET_GACHA.gold * count;
      if (money < cost) { setNotice(`전투펫 뽑기는 ${PET_GACHA.gold.toLocaleString()}원이에요.`); return []; }
      let shards = 0; const got: string[] = [], pets = { ...(raid.battlePets ?? {}) };
      for (let i = 0; i < count; i++) { const pet = rollBattlePet(); got.push(pet.id); if (pets[pet.id]) shards += DUPLICATE_SHARDS[pet.tier]; else pets[pet.id] = { level: 1 }; }
      setMoney(value => value - cost);
      setRaid(r => ({ ...r, contractShards: r.contractShards + shards, battlePets: pets, equipped: { ...r.equipped, battlePet: r.equipped.battlePet ?? got[0] } }));
      const best = got.map(id => BATTLE_PETS.find(p => p.id === id)!).sort((x, y) => ["보통", "희귀", "전설"].indexOf(y.tier) - ["보통", "희귀", "전설"].indexOf(x.tier))[0];
      playCoinSound(best.tier === "전설" ? [523, 659, 784, 1047, 1319] : best.tier === "희귀" ? [660, 880, 1100] : [660, 880]);
      setNotice(`🥚 전투펫 뽑기: ${got.map(id => { const p = BATTLE_PETS.find(x => x.id === id)!; return `${p.icon} ${p.name}(${p.tier})`; }).join(", ")}${shards ? ` · 이미 있어서 계약 조각 ${shards}개로 바꿨어요` : ""}`);
      return got;
    },
    changeEvolution: (evolution: Evolution) => {
      const w = raid.weapons[raid.equipped.weapon];
      if (!w.evolution || w.evolution === evolution) return;
      const plan = planFor({ ...EVOLUTION_CHANGE.need, ...(w.enhancement >= 13 ? EVOLUTION_CHANGE.upper : {}) }, EVOLUTION_CHANGE.gold);
      if (!plan) return setNotice("진화를 바꿀 재료나 돈이 모자라요.");
      spendPlan(plan); setRaid(r => setEvolution(r, r.equipped.weapon, evolution)); playCoinSound([660, 880, 1100, 1320]);
      setNotice(`🔁 ${weaponDef(raid.equipped.weapon).name}의 진화를 바꿨어요! 강화 단계는 그대로예요.`);
    },
    equipPet: id => setRaid(r => ({ ...r, equipped: { ...r.equipped, battlePet: id } })),
    craftWeapon: id => {
      const def = weaponDef(id); if (!def.craft || raid.weapons[id]) return;
      const plan = planFor({ "artisan-core": WEAPON_CRAFT.core, [def.craft.lifeMat]: WEAPON_CRAFT.mat }, WEAPON_CRAFT.gold); if (!plan) return setNotice("무기를 만들 재료나 돈이 모자라요.");
      spendPlan(plan);
      setRaid(r => ({ ...r, weapons: { ...r.weapons, [id]: { enhancement: 0, evolution: null, unlockedEnhancements: [] } }, equipped: { ...r.equipped, weapon: id } }));
      playCoinSound([660, 880, 1100, 1320]); setNotice(`${def.icon} ${def.name}을(를) 만들었어요!`);
    },
    equipWeapon: id => setRaid(r => ({ ...r, weapons: r.weapons[id] ? r.weapons : { ...r.weapons, [id]: { enhancement: 0, evolution: null, unlockedEnhancements: [] } }, equipped: { ...r.equipped, weapon: id } })),
    levelPet: id => {
      const lv = raid.battlePets?.[id]?.level ?? 0, next = PET_LEVELS[lv];
      if (!lv || !next || raid.contractShards < next.shards) return;
      setRaid(r => ({ ...r, contractShards: r.contractShards - next.shards, battlePets: { ...(r.battlePets ?? {}), [id]: { level: next.level } } }));
      playCoinSound([660, 880, 1100]); setNotice(`${BATTLE_PETS.find(p => p.id === id)?.icon} 전투펫이 Lv.${next.level}이 됐어요!`);
    },
    exchangePet: id => {
      const pet = BATTLE_PETS.find(p => p.id === id); if (!pet || pet.tier === "보통" || raid.battlePets?.[id]) return;
      const cost = PET_EXCHANGE[pet.tier]; if (raid.contractShards < cost) return;
      setRaid(r => ({ ...r, contractShards: r.contractShards - cost, battlePets: { ...(r.battlePets ?? {}), [id]: { level: 1 } } }));
      playCoinSound([660, 880, 1100, 1320]); setNotice(`${pet.icon} ${pet.name}을(를) 계약 조각으로 데려왔어요!`);
    },
  };
  const readyOrders = orders.filter(order => !doneToday.includes(order.id) && order.items.every(item => depositedFor(order, item) + orderHave(item) >= item.count)).length;
  // 창고: 작물별 상자 하나에 품질 묶음을 모은다. 최근 6번(30분) 시세 흐름도 함께.
  const matchesStorageQuery = (name: string) => { const q = storageQuery.trim(); return !q || name.toLowerCase().includes(q.toLowerCase()); };
  const storageBoxes = !showStorage ? [] : Object.values(Object.entries(produce).filter(([, count]) => count > 0).reduce<Record<string, { cropId: string; keys: string[] }>>((acc, [key]) => { const { cropId } = parseProduceKey(key); (acc[cropId] ??= { cropId, keys: [] }).keys.push(key); return acc; }, {})).map(({ cropId, keys }) => {
    const crop = CROPS.find(c => c.id === cropId);
    if (!crop) return null;
    const history = Array.from({ length: 6 }, (_, i) => marketPrice(crop, marketBucket - 5 + i)), now = history[5], prev = history[4];
    const min = Math.min(...history), max = Math.max(...history), change = Math.round((now / prev - 1) * 100);
    const label = now === max ? "🔥 최근 30분 최고가" : now === min ? "📉 최근 30분 최저가" : change > 0 ? `▲${change}% 오르는 중` : change < 0 ? `▼${Math.abs(change)}% 내리는 중` : "보합";
    const rows = keys.map(key => { const info = parseProduceKey(key); return { key, quality: QUALITIES[info.quality], qIndex: info.quality, golden: info.golden, count: produce[key], unit: produceUnitPrice(key), locked: isLocked(key), reserved: reserved[key] ?? 0, sellable: sellableOf(key) }; })
      .sort((a, b) => Number(a.golden) - Number(b.golden) || a.qIndex - b.qIndex);
    const total = rows.reduce((sum, row) => sum + row.count, 0), sellableCount = rows.reduce((sum, row) => sum + row.sellable, 0);
    const value = marketSellPlan(rows.filter(row => row.sellable > 0).map(row => ({ key: row.key, n: row.sellable }))).amount;
    return { crop, rows, total, sellableCount, value, reservedCount: rows.reduce((sum, row) => sum + row.reserved, 0), golden: rows.some(row => row.golden && row.count > 0),
      sat: Math.round(saturationOf(market, crop.id) * 100), free: freeLeft(market, crop.id), trend: { history, min, max, label, best: now === max } };
  }).filter((box): box is NonNullable<typeof box> => Boolean(box))
    .filter(box => matchesStorageQuery(box.crop.name))
    .filter(box => storageFilter === "all" || (storageFilter === "order" ? box.reservedCount > 0 : storageFilter === "calm" ? box.sat === 0 : box.golden))
    .sort((a, b) => storageSort === "name" ? a.crop.name.localeCompare(b.crop.name, "ko") : storageSort === "count" ? b.total - a.total : b.value - a.value);
  const sellPreview = sellConfirm ? (() => { const plan = sellPlan(sellConfirm.cropId), count = plan.reduce((sum, entry) => sum + entry.n, 0);
    const amount = sellConfirm.kind === "market" ? marketSellPlan(plan).amount : plan.reduce((sum, { key, n }) => sum + coopUnit(key) * n, 0);
    const scope = Object.keys(produce).filter(key => produce[key] > 0 && (!sellConfirm.cropId || parseProduceKey(key).cropId === sellConfirm.cropId));
    const lockedCount = scope.filter(isLocked).reduce((sum, key) => sum + produce[key], 0), reservedCount = scope.filter(key => !isLocked(key)).reduce((sum, key) => sum + Math.min(produce[key], reserved[key] ?? 0), 0);
    return { count, amount, lockedCount, reservedCount }; })() : null;
  const fieldStats = plots.slice(0, plotCount).reduce((acc, plot) => {
    const crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
    if (!plot || !crop || seasonPeriod(plot.plantedAt, startHour, endHour) !== currentPeriod) return acc;
    const status = plotStatus(plot, crop, nowMs, bugPenalty);
    acc.growing++; if (status.ready) acc.ready++; else if (status.thirsty) acc.thirsty++; if (plot.bug) acc.bugs++;
    return acc;
  }, { growing: 0, ready: 0, thirsty: 0, bugs: 0 });
  const activeFert = FERTILIZERS.find(item => item.id === tool);
  const toolBanner = tool === "seed" ? <><b>{currentPlanter.icon} {currentPlanter.name}</b> 빈 밭 {currentPlanter.note}에 <b>{selectedCropInfo.icon} {selectedCropInfo.name}</b> 심기 · 씨앗 {seedPrice(selectedCropInfo)}원/칸<small>씨앗은 오른쪽 상자에서 골라요</small></>
    : tool === "hand" ? <><b>{currentHand.icon} {currentHand.name}</b> 다 자란 작물 {currentHand.note} 수확{fieldStats.ready ? ` · 지금 ${fieldStats.ready}칸 수확 가능` : ""}<button className={`mode-toggle ${harvestMode}`} onClick={toggleHarvestMode} title="수확한 작물을 바로 팔지, 창고에 넣을지">{harvestMode === "store" ? "📦 창고 보관" : "💰 바로 판매"} ⇄</button></>
    : tool === "water" ? <><b>🚿 {currentCan.name}</b> 목마른 작물 {currentCan.note.split(" · ")[0]}에 물 주기 · 💧 {Math.min(canWater, canMax)}/{canMax}<small>{canWater ? "누른 채 쓸어도 돼요" : "물이 없어요! 🚰 우물(4)"}</small></>
    : activeFert ? <><b>{currentSpreader.icon} {currentSpreader.name}</b> 자라는 작물 {currentSpreader.note}에 <b>{activeFert.icon} {activeFert.name}</b> · 남은 {fertStock[activeFert.id] ?? 0}개(칸당 1개)<small>{fertStock[activeFert.id] ? `${activeFert.note} · 작물당 1번` : "거름이 없어요! 🌿 거름 상점에서 사 두세요"}</small></> : null;

  const cropCards = available.map(crop => {
    const cycleSeconds = cycleCrop(crop, marketBucket).seconds;
    const shownSeconds = Math.round(cycleSeconds * growthMul * (1 - PET_BASE.mole * pw("mole")) * (1 - PET_BASE.dragon * pw("dragon")));
    const tooLate = isWorkTime && shownSeconds > seasonSecondsLeft;
    const allowance = plantingAllowance(crop, specialPlantings, plantingDate);
    return <button key={crop.id} className={`crop-card ${crop.seasonalLimit ? "special-crop" : ""} ${selectedCrop === crop.id ? "selected" : ""} ${tooLate ? "too-late" : ""}`} onClick={() => { setSelectedCrop(crop.id); setTool("seed"); }} aria-pressed={selectedCrop === crop.id} disabled={allowance <= 0}>
      <span className="crop-icon">{crop.icon}</span><span className="crop-name">{crop.seasonalLimit ? "👑 " : ""}{crop.name}</span>
      <span className="crop-meta">{tooLate ? "이번 계절엔 시간 부족" : `씨앗 ${seedPrice(crop)}원 · 이번 재배 ${formatClock(shownSeconds)}`}</span>
      {crop.seasonalLimit && <span className="special-crop-limit">계절 한정 · 남은 파종 {allowance}/30개 · 기본 {formatClock(crop.seconds)}<small>수확·시듦 후에도 사용한 한도는 돌아오지 않아요</small></span>}
      {saturationOf(market, crop.id) > 0 ? <span className="sat-chip" title="많이 팔아서 값이 내려갔어요. 다른 작물을 팔거나 5분 시세가 바뀌면 풀려요.">📉 포화 -{Math.round(saturationOf(market, crop.id) * 100)}%</span> : freeLeft(market, crop.id) < FREE_PER_CYCLE ? <span className="sat-chip free" title="이번 5분 동안 이 개수까지는 정상가로 팔려요.">정상가 {freeLeft(market, crop.id)}개 남음</span> : null}
      {(() => { const base = marketPrice(crop, marketBucket), final = salePrice(crop), boost = Math.round((final / base - 1) * 100);
        return <span className={`crop-price ${boost ? (boost > 0 ? "up" : "down") : ""}`}><small>{boost ? <>시세 <s>{base.toLocaleString()}</s> {boost > 0 ? "▲" : "▼"}{Math.abs(boost)}%</> : "현재 시세"}</small>{final.toLocaleString()}원</span>; })()}
    </button>;
  });

  const shopItems = FURNITURE.filter(item => item.group === shopTab && !item.reward);
  const avatarImg = <img src={avatar.src} alt="" className={avatar.pixelated ? "pixelated" : ""} draggable={false} />;
  const currentBait = BAITS.find(item => item.id === selectedBait) ?? BAITS[0];
  const currentRod = RODS.find(item => item.id === rodId) ?? RODS[0];
  const currentSpot = SPOTS.find(item => item.id === spotId) ?? SPOTS[0];
  const phoenix = pw("phoenix");
  const gameRod = useMemo(() => ({ ...currentRod, gain: currentRod.gain * (1 + PET_BASE.phoenix * phoenix), treasure: currentRod.treasure + currentSpot.treasureBonus }), [currentRod, currentSpot, phoenix]);
  const bareReady = currentSpot.price === 0 && (selectedBait === BARE_HAND.id || !baits[currentBait.id]);
  const ticketLeft = currentSpot.price > 0 ? Math.max(0, Math.ceil(((tickets[currentSpot.id] ?? 0) - nowMs) / 1000)) : -1;

  const fieldGrid = (
    <div ref={plotsRef} onPointerLeave={() => setHoverArea([])} className={`plots plots-${plotCount} cols-${fieldColumns(plotCount)} ${plots.filter(Boolean).length >= LITE_FIELD_PLANTS ? "lite" : ""} hand-${handId} planter-${planterId} tool-${FERTILIZERS.some(item => item.id === tool) ? "fert" : tool}`}>
      {Array.from({ length: plotCount }).map((_, index) => {
        const plot = plots[index] || null; const crop = plot ? CROPS.find(c => c.id === plot.cropId)! : null;
        const withered = Boolean(plot && seasonPeriod(plot.plantedAt, startHour, endHour) !== currentPeriod);
        const status = plot && crop ? plotStatus(plot, crop, nowMs, bugPenalty) : null;
        const progress = status?.progress ?? 0, bugLeft = plot?.bug ? Math.max(0, BUG_SECONDS - Math.floor((nowMs - plot.bug) / 1000)) : 0;
        return <div key={index} className={`plot-cell ${FARM_V2_ENABLED && fieldSel.cells.includes(index) ? "sel" : ""} ${hoverArea.includes(index) ? (tool === "water" ? "can-area" : tool === "hand" ? "hand-area" : tool === "seed" ? "seed-area" : activeFert ? "fert-area" : "") : ""}`}><button className={`plot ${withered ? "withered" : status?.ready ? "ready" : status?.thirsty ? "thirsty" : ""} ${FERTILIZERS.some(item => item.id === tool) && status && !status.ready && !status.fert && !withered ? "fert-target" : ""} ${status?.fert && !withered ? `fert-${status.fert.id}` : ""}`}
          onClick={event => { if (tool === "water" && event.detail > 0) return; clickPlot(index); }}
          onPointerDown={event => { if (tool !== "water" && tool !== "hand" && tool !== "seed" && !activeFert) return; event.currentTarget.releasePointerCapture?.(event.pointerId); if (tool === "water") { if (plot?.bug) catchBug(index); else waterPlot(index); } }}
          onPointerEnter={event => { const reach = tool === "water" ? currentCan : tool === "hand" ? currentHand : tool === "seed" ? currentPlanter : activeFert ? currentSpreader : null;
            const selKey = `${index}:${tool}:${reach ? `${reach.w}x${reach.h}` : "1"}`;
                  if (FARM_V2_ENABLED && selKeyRef.current !== selKey) { selKeyRef.current = selKey; const r = reach ?? { w: 1, h: 1 }, area = canArea(index, plotColumns(), plotCount, r), label = r.h > 1 ? `${Math.min(r.w, plotColumns())}×${Math.ceil(area.length / Math.min(r.w, plotColumns()))}칸` : `가로 ${area.length}칸`; setFieldSel(prev => prev.label === label && prev.cells.length === area.length && prev.cells.every((v, i) => v === area[i]) ? prev : { cells: area, label }); }
            if (reach && (tool === "water" || reach.w * reach.h > 1)) { const area = canArea(index, plotColumns(), plotCount, reach); setHoverArea(prev => prev.length === area.length && prev.every((v, i) => v === area[i]) ? prev : area); }
            if (!(event.buttons & 1)) return;
            if (plot?.bug) return catchBug(index);
            if (tool === "water") waterPlot(index); else if (tool === "hand") harvest(index, true); else if (tool === "seed") plant(index, true); else if (activeFert) fertilize(index, activeFert, true); }}>
          {status?.fert && !withered && <span className={`fert-tag fert-tag-${status.fert.id}`}>{status.fert.icon} {status.fert.name}</span>}
          {crop && withered ? <><span className="plant">🥀</span><span className="plot-label">시듦 · 치우기</span></> : crop && status ? <>
            <span className={`plant stage-${status.ready ? "ripe" : progress < 35 ? "sprout" : progress < 75 ? "grow" : "mature"}`}>{progress < 35 ? "🌱" : progress < 75 ? "🌿" : crop.icon}</span>{status.ready && <span className="ripe-sparkle" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i></span>}
            <span className="plot-label">{status.ready ? `수확하기 ${status.quality.stars}` : status.thirsty ? "💧 목말라요" : `⏱ ${status.remaining >= 60 ? formatClock(status.remaining) : `${status.remaining}초`}`}</span>
            <span className="grow-bar"><i style={{ width: `${progress}%` }} /></span>
            <span className="plot-badges">{Array.from({ length: status.total }).map((_, k) => <i key={k} className={k < status.satisfied ? "on" : ""}>💧</i>)}{plot?.bugHits ? <i className="hurt">🐛-{Math.round((1 - status.bugMultiplier) * 100)}%</i> : null}</span>
          </> : <><span className="soil-lines">╱ ╱ ╱</span><span className="plot-label">{tool === "seed" ? `${selectedCropInfo.icon} 심기` : "빈 밭"}</span></>}
          {waterFx.filter(fx => fx.plotIndex === index).map(fx => <span className="water-fx" key={fx.id}><i>💧</i><i>💧</i><i>💧</i><i>💧</i></span>)}
          {harvestFx.filter(fx => fx.plotIndex === index).map(fx => <span className="harvest-fx" key={fx.id}><EffectBurst id={equipment.farm} /><b>{fx.icon}</b><i>{fx.amount ? `＋${fx.amount.toLocaleString()}원 ` : ""}{fx.stars}</i><em>✦</em><em>✦</em><em>●</em></span>)}
        </button>{squashFx.filter(fx => fx.plotIndex === index).map(fx => <span key={fx.id} className="squash-fx" style={{ left: fx.x, top: fx.y }} aria-hidden="true"><b>🐛</b>{[0, 1, 2, 3, 4, 5, 6].map(k => <i key={k} style={{ "--a": `${k * 51}deg` } as CSSProperties} />)}<em>찍!</em></span>)}{plot?.bug && !withered && <button className="bug" aria-label={`벌레 잡기, ${bugLeft}초 남음`} onPointerDown={event => { event.stopPropagation(); catchBug(index, event.currentTarget); }} onPointerEnter={event => { if (event.buttons & 1) catchBug(index, event.currentTarget); }} onClick={event => { event.stopPropagation(); if (event.detail === 0) catchBug(index, event.currentTarget); }}>🐛<b>{bugLeft}</b></button>}{FARM_V2_ENABLED && fieldSel.cells[0] === index && fieldSel.cells.length > 1 && <span className="sel-label" aria-hidden="true">← {fieldSel.label} →</span>}</div>;
      })}
    </div>
  );
  const toolShopBox = (
    <div className="tool-shop">
      <div className="tool-shop-tabs" role="tablist" aria-label="도구 상점">{([["seed", "🌱 심기"], ["hand", "🧺 수확"], ["water", "🚿 물"], ["fert", "🌿 거름"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={toolShop === id} className={toolShop === id ? "on" : ""} onClick={() => setToolShop(id)}>{label}</button>)}</div>
      <small>{toolShop === "seed" ? "좋은 도구일수록 빈 밭 넓은 범위에 씨앗을 한꺼번에 심어요(씨앗값은 칸마다)" : toolShop === "hand" ? "좋은 도구일수록 다 자란 작물을 넓은 범위로 한꺼번에 거둬요" : toolShop === "fert" ? "거름은 미리 사 두고 칸마다 1개씩 써요. 좋은 뿌리개일수록 자라는 작물 넓은 범위에 한꺼번에 뿌려요" : "좋을수록 물을 많이 담고, 한 번에 여러 칸에 물을 줘요"}</small>
      <div className="can-shop-list">{toolShop === "seed" ? PLANT_TOOLS.map(item => <button key={item.id} className={planterId === item.id ? "on" : ""} onClick={() => choosePlanter(item)} aria-pressed={planterId === item.id}><span className="can-grid" style={{ gridTemplateColumns: `repeat(${item.w}, 1fr)` }}>{Array.from({ length: item.w * item.h }).map((_, k) => <i key={k} />)}</span><b>{item.icon} {item.name}</b><small>{item.note} 심기</small><em>{planterId === item.id ? "사용 중" : ownsItem(ownedPlanters, item.id) ? "들기" : `${item.price.toLocaleString()}원`}</em></button>)
        : toolShop === "hand" ? HARVEST_TOOLS.map(hand => <button key={hand.id} className={handId === hand.id ? "on" : ""} onClick={() => chooseHand(hand)} aria-pressed={handId === hand.id}><span className="can-grid" style={{ gridTemplateColumns: `repeat(${hand.w}, 1fr)` }}>{Array.from({ length: hand.w * hand.h }).map((_, k) => <i key={k} />)}</span><b>{hand.icon} {hand.name}</b><small>{hand.note} 수확</small><em>{handId === hand.id ? "사용 중" : ownsItem(ownedHands, hand.id) ? "들기" : `${hand.price.toLocaleString()}원`}</em></button>)
        : toolShop === "fert" ? [...FERTILIZERS.map(item => <div key={item.id} className={`fert-stock ${tool === item.id ? "on" : ""}`}><button className="fert-pick" onClick={() => holdFert(item.id)} aria-pressed={tool === item.id}><span>{item.icon}</span><b>{item.name}</b><small>{item.note}</small><em>{fertStock[item.id] ?? 0}개</em></button><QtyBuy label={item.name} unitPrice={item.price} money={money} initial={item.pack} step={item.pack >= 10 ? 5 : 1} onBuy={count => buyFert(item, count)} /></div>), <b key="spreader-title" className="tool-shop-sub">🧺 거름 뿌리개</b>, ...SPREADERS.map(item => <button key={item.id} className={spreaderId === item.id ? "on" : ""} onClick={() => chooseSpreader(item)} aria-pressed={spreaderId === item.id}><span className="can-grid" style={{ gridTemplateColumns: `repeat(${item.w}, 1fr)` }}>{Array.from({ length: item.w * item.h }).map((_, k) => <i key={k} />)}</span><b>{item.icon} {item.name}</b><small>{item.note} 거름</small><em>{spreaderId === item.id ? "사용 중" : ownsItem(ownedSpreaders, item.id) ? "들기" : `${item.price.toLocaleString()}원`}</em></button>)]
        : CANS.map(can => <button key={can.id} className={canId === can.id ? "on" : ""} onClick={() => chooseCan(can)} aria-pressed={canId === can.id}><span className="can-grid" style={{ gridTemplateColumns: `repeat(${can.w}, 1fr)` }}>{Array.from({ length: can.w * can.h }).map((_, k) => <i key={k} />)}</span><b>{can.name}</b><small>{can.note}</small><em>{canId === can.id ? "사용 중" : ownsItem(ownedCans, can.id) ? "들기" : `${can.price.toLocaleString()}원`}</em></button>)}</div>
    </div>
  );
  // 새 텃밭 화면(FARM_V2): 씨앗 주머니·선택 구획·하단 도구대(public/concepts/farm-field-ui-concept-v1.png)
  const cropSeconds = (crop: Crop) => Math.round(cycleCrop(crop, marketBucket).seconds * growthMul * (1 - PET_BASE.mole * pw("mole")) * (1 - PET_BASE.dragon * pw("dragon")));
  const seedRows = [...available].sort((a, b) => seedSort === "short" ? cropSeconds(a) - cropSeconds(b) : seedSort === "profit" ? (salePrice(b) - seedPrice(b)) - (salePrice(a) - seedPrice(a)) : 0);
  const selInfo = fieldSel.cells.filter(i => i < plotCount).reduce((acc, i) => {
    const plot = plots[i], crop = plot ? CROPS.find(c => c.id === plot.cropId) : undefined;
    if (!plot || !crop) { acc.empty++; return acc; }
    if (seasonPeriod(plot.plantedAt, startHour, endHour) !== currentPeriod) { acc.withered++; return acc; }
    const status = plotStatus(plot, crop, nowMs, bugPenalty);
    acc.crops[crop.id] = (acc.crops[crop.id] ?? 0) + 1; acc.progress += status.ready ? 100 : status.progress; acc.growing++;
    if (status.thirsty) acc.thirsty++; if (status.ready) acc.ready++;
    acc.value += Math.round(salePrice(crop) * status.quality.multiplier * status.bugMultiplier);
    return acc;
  }, { crops: {} as Record<string, number>, empty: 0, withered: 0, growing: 0, thirsty: 0, ready: 0, progress: 0, value: 0 });
  const heldFert = FERTILIZERS.find(item => item.id === (activeFert ? activeFert.id : fertId)) ?? FERTILIZERS[0];
  const reachNow = tool === "water" ? currentCan : tool === "hand" ? currentHand : tool === "seed" ? currentPlanter : currentSpreader;

  const pondScene = (
    <div className={`pond phase-${fishState.phase} spot-${currentSpot.id}`}>
      <div className="pond-scenery" aria-hidden="true"><span className="far" /><span className="mid" /><i className="deco d1" /><i className="deco d2" /><i className="deco d3" /></div>
      <div className="pond-bank" />
      {currentSpot.price > 0 && <span className={`ticket-badge ${ticketLeft > 0 && ticketLeft <= 60 ? "ending" : ""} ${ticketLeft === 0 ? "expired" : ""}`}>{ticketLeft > 0 ? `🎫 남은 시간 ${formatClock(ticketLeft)}` : "🎫 입장권 만료"}</span>}
      {currentSpot.price > 0 && ticketLeft === 0 && fishState.phase !== "game" && <div className="ticket-expired"><b>🎫 입장권이 만료됐어요</b><button onClick={() => chooseSpot(currentSpot)}>다시 입장 · {currentSpot.price.toLocaleString()}원</button><button className="ghost" onClick={() => chooseSpot(SPOTS[0])}>무료 강가로</button></div>}
      <svg className={`rod rod-${currentRod.id}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line className="rod-shaft" x1="21" y1="58" x2="40" y2="36" /><line className="rod-shine" x1="22" y1="56.5" x2="39" y2="37" /><circle className="rod-reel" cx="23.5" cy="55" r="1.6" />{(fishState.phase === "waiting" || fishState.phase === "bite") && <line className="line" x1="40" y1="36" x2="60" y2={fishState.phase === "bite" ? 70 : 64} />}</svg>
      <div className="angler">{avatarImg}</div>
      {FISH_V2_ENABLED && <div className="fish2-dock" aria-hidden="true"><span className="fish2-bob"><i /></span></div>}
      <span className="ripple r1" /><span className="ripple r2" /><span className="bobber" />{fishState.phase === "bite" && <span className="bite-mark">!</span>}
      {fishState.phase === "game" && fishState.fish && <Suspense fallback={null}><FishingGame fish={fishState.fish} rod={gameRod} barBonus={fishState.bait?.barBonus ?? 0} onFinish={finishFishing} /></Suspense>}
      {fishState.phase === "result" && <div className={`catch-card ${fishState.fish?.rarity === "전설" ? "legend" : fishState.fish?.rarity === "신화" ? "legend mythic" : ""}`}>
        {fishState.fish ? <><EffectBurst id={equipment.fish} />{LEGEND_ART[fishState.fish.id] ? <span className={`legend-fish-art ${LEGEND_ART[fishState.fish.id]}`} role="img" aria-label={fishState.fish.name} /> : fishArt(fishState.fish, "fish-art big") ?? <b>{fishState.fish.icon}</b>}<strong>{fishState.fish.name}</strong><span className={`rarity rarity-${fishState.fish.rarity}`}>{fishState.fish.rarity}</span>{fishState.perfect && <span className="perfect">✨ 퍼펙트!</span>}<small>{fishState.fish.note}</small><em>{fishState.stored ? "📦 통합 창고 보관" : `＋${(fishState.price ?? fishState.fish.price).toLocaleString()}원`}</em></> : <><b>💨</b><small>{fishState.text}</small></>}
        {fishState.reward && <span className="treasure">🎁 보물상자: {fishState.reward}</span>}
      </div>}
    </div>
  );
  const rodList = (
    <div className="rod-list">{RODS.map(rod => { const owned = ownsItem(ownedRods, rod.id);
      return <button key={rod.id} className={rodId === rod.id ? "on" : ""} onClick={() => chooseRod(rod)} disabled={fishState.phase === "game"} aria-pressed={rodId === rod.id}><span>{rod.icon}</span><b>{rod.name}</b><small>{rod.note}</small><em>{rodId === rod.id ? "사용 중" : owned ? "들기" : `${rod.price.toLocaleString()}원`}</em><i className="rod-bar" style={{ width: `${rod.bar * 220}%` }} /></button>; })}</div>
  );
  const baitList = (
    <div className="bait-list"><div className={`bait bare ${selectedBait === BARE_HAND.id ? "on" : ""}`}>
      <button className="bait-pick" onClick={() => setSelectedBait(BARE_HAND.id)} aria-pressed={selectedBait === BARE_HAND.id}><span>{BARE_HAND.icon}</span><b>{BARE_HAND.name}</b><small>강가·호숫가 전용 · 입질 느림 · 흔함·보통만</small><em>공짜</em></button>
    </div>{BAITS.map(bait => <div key={bait.id} className={`bait ${selectedBait === bait.id ? "on" : ""}`}>
      <button className="bait-pick" onClick={() => setSelectedBait(bait.id)} aria-pressed={selectedBait === bait.id}><span>{bait.icon}</span><b>{bait.name}</b><small>{bait.note}</small><em>{baits[bait.id] ?? 0}개</em></button>
      <QtyBuy label={bait.name} unitPrice={bait.price / bait.pack} money={money} initial={bait.pack} step={bait.pack >= 10 ? 5 : 1} onBuy={count => buyBait(bait, count)} />
    </div>)}</div>
  );
  // 새 낚시터 화면(FISH_V2): 등급 확률은 reelIn의 rollFish와 같은 가중치로 계산한다(특별 물고기 제외).
  const fishBare = currentSpot.price === 0 && (selectedBait === BARE_HAND.id || !baits[currentBait.id]);
  const fishOdds = (() => {
    const bait = fishBare ? BARE_HAND : currentBait, rare = fishBare ? 0 : bait.rareBoost * currentSpot.rareBoost * Math.min(FISH_BOOST_MAX, fishMul * (1 + PET_BASE.cat * pw("cat")));
    const w = { 흔함: RARITY_WEIGHT.흔함, 보통: RARITY_WEIGHT.보통 * bait.normalBoost * currentSpot.normalBoost, 희귀: RARITY_WEIGHT.희귀 * rare };
    const hidden = fishBare ? 0 : HIDDEN_CHANCE, legend = fishBare ? 0 : (1 - hidden) * LEGEND_CHANCE, rest = (1 - hidden) * (1 - (fishBare ? 0 : LEGEND_CHANCE)), total = w.흔함 + w.보통 + w.희귀;
    return { 흔함: rest * w.흔함 / total, 보통: rest * w.보통 / total, 희귀: rest * w.희귀 / total, 전설: legend };
  })();
  const todayFish = FISH.filter(fish => fish.season === season && fish.rarity !== "신화").map(fish => {
    const same = FISH.filter(other => other.season === season && other.rarity === fish.rarity).length;
    return { fish, chance: (fishOdds[fish.rarity as keyof typeof fishOdds] ?? 0) / same };
  }).sort((a, b) => (a.fish.rarity === "전설" ? 1 : 0) - (b.fish.rarity === "전설" ? 1 : 0) || b.chance - a.chance);
  const pct = (v: number) => `${(v * 100) >= 10 ? Math.round(v * 100) : (v * 100).toFixed(1)}%`;

  return (
    <main className={`app season-${seasonIndex >= 0 ? seasonIndex : 4} ${tab === "farm" && !FARM_V2_ENABLED ? "has-dock" : ""}`}>
      <header className="topbar">
        {TEST_MODE && <span className="test-badge" title="로컬 개발 서버 전용: 숨긴 기능 공개 · 상점 아이템 모두 사용 · 계정 자동 저장 꺼짐">🧪 테스트 모드</span>}
        <div className="brand"><button className="avatar-button" onClick={() => setShowAvatar(true)} aria-label="내 아바타 바꾸기">{avatarImg}</button><div><h1>월루농가</h1><p>월급은 루팡, 농사는 진심</p></div></div>
        <div className="status-cluster">
          <div key={tab === "casino" && casinoFx ? casinoFx.id : "money"} className={`status-card money ${tab === "casino" && casinoFx ? (casinoFx.kind === "push" ? "" : casinoFx.kind === "win" || casinoFx.kind === "jackpot" ? "money-gain" : "money-loss") : ""}`}><span>💰 보유 자금</span><strong>{money.toLocaleString()}원</strong>{tab === "casino" && casinoFx && casinoFx.kind !== "push" && <em className="money-fly">{casinoFx.kind === "win" || casinoFx.kind === "jackpot" ? "+" : "-"}{casinoFx.amount.toLocaleString()}원</em>}</div>
          <div className="status-card clock" title="5분마다 작물 시세가 바뀌어요"><span>🕰 {timeLabel} · 📈 시세 {formatClock(marketSecondsLeft)}</span><strong>{isWorkTime ? `${SEASON_ICON[season]} 지금은 ${season}` : "🌙 농장 휴식"}</strong></div>
          <button className={`status-card top-action compact mission-action ${showMissions ? "on" : ""} ${readyOrders ? "ready" : ""}`} onClick={() => { setShowStorage(false); setShowMissions(open => !open); }} aria-label={`미션 ${doneToday.length}/${orders.length} (M)`} title="공용 미션 (M)"><span>📜<em className="ta-label"> 미션</em> <kbd>M</kbd></span><strong>{doneToday.length}/{orders.length}</strong>{readyOrders > 0 && <i className="tab-dot" aria-label={`완료 가능 ${readyOrders}건`}>{readyOrders}</i>}</button>
          <button className={`status-card top-action compact storage-action ${showStorage ? "on" : ""}`} onClick={() => { setShowMissions(false); setShowStorage(open => !open); }} aria-label={`통합 창고 ${storageUsed}/${storageCap} (E)`} title="통합 창고 (E)"><span>📦<em className="ta-label"> 창고</em> <kbd>E</kbd></span><strong>{storageUsed}/{storageCap}</strong></button>
          <button className="icon-button boss-button" onClick={() => setBossMode(true)} aria-label="보스 키: 업무 화면으로 위장 (ESC)" title="보스 키 (ESC)">🙈<small>ESC</small></button>
          {/* 계정·설정·아바타를 메뉴 하나로(상단 아이콘 버튼 줄이기) */}
          <div className="top-menu">
            <button className={`icon-button account-button ${session ? "on" : ""}`} onClick={() => setShowTopMenu(open => !open)} aria-haspopup="menu" aria-expanded={showTopMenu} aria-label={session ? `계정·설정 메뉴: ${session.id}` : "로그인·설정 메뉴"} title={session ? `${session.id} · 계정 저장 중` : "로그인 · 설정"}>👤<span>{session ? session.id : "로그인"}</span>{session && <small>☁️</small>}<i className="top-menu-caret" aria-hidden="true">▾</i></button>
            {showTopMenu && <>
              <button className="top-menu-backdrop" aria-label="메뉴 닫기" onClick={() => setShowTopMenu(false)} />
              <div className="top-menu-list" role="menu">
                <button role="menuitem" onClick={() => { setShowTopMenu(false); setAccountError(""); setShowAccount(true); }}>👤 {session ? `계정 · ${session.id}` : "로그인 · 계정 만들기"}</button>
                <button role="menuitem" onClick={() => { setShowTopMenu(false); setShowSettings(true); }}>⚙ 설정 <small>운영 시간 · 위장 화면 · 알림</small></button>
                <button role="menuitem" onClick={() => { setShowTopMenu(false); setShowAvatar(true); }}>🐱 아바타 바꾸기</button>
              </div>
            </>}
          </div>
        </div>
      </header>

      <MainMenu<typeof tab> active={tab} onSelect={switchTab} entries={[
        { id: "farm", label: "🌱 텃밭", group: "life" },
        { id: "workshop", label: "🏭 공방", group: "life", badge: doneJobs > 0 ? `✨${doneJobs}` : undefined },
        { id: "fish", label: "🎣 낚시터", group: "life" },
        ...(EXPLORE_ENABLED && explorationOpen ? [{ id: "explore", label: "🧭 탐험", group: "life" } as const] : []),
        { id: "book", label: "📖 도감", group: "life" },
        ...(HUNT_ENABLED ? [{ id: "hunt", label: "🏹 사냥터", group: "battle" } as const] : []),
        ...(RAID_ENABLED ? [{ id: "raid", label: "🗼 토벌탑 (베타)", group: "battle" } as const] : []),
        { id: "equipment", label: "🎒 장비", group: "battle" },
        { id: "home", label: "🏡 나의 집", group: "home" },
        ...(VILLAGE_ENABLED ? [villageOpen ? { id: "village", label: "🏘️ 마을", group: "home", badge: completable(village, money).length ? "🔨" : undefined } as const : { id: "village", label: "🔒 마을", group: "home" } as const] : []),
        { id: "pets", label: "🐾 펫", group: "home" },
        { id: "gacha", label: "🛍️ 상점", group: "home" },
        { id: "casino", label: "🎲 도박장", group: "home" },
      ]} />

      {/* 계절 배너: 텃밭에서는 크게, 다른 탭에서는 한 줄로 줄여 콘텐츠가 위에서 시작하게 */}
      <section className={`season-strip ${tab === "farm" && !FARM_V2_ENABLED ? "" : "compact"}`}>
        <div className="season-copy"><span className="eyebrow">REAL-TIME SEASON</span><h2>{isWorkTime ? `${season}의 농장` : "오늘의 농사가 끝났어요"}</h2><p>{isWorkTime ? `${toClock(seasonStart)}—${toClock(seasonEnd)} · ${formatClock(seasonSecondsLeft)} 뒤 ${nextSeason}` : `${startHour}:00—${endHour}:00 사이에 농사를 지을 수 있어요`}</p>{isWorkTime && seasonIndex >= 0 && seasonIndex < 3 && seasonSecondsLeft <= SEASON_WARN_SECONDS && <p className={`season-omen omen-${seasonIndex + 1}`}>🍃 {seasonOmen((["여름", "가을", "겨울"] as const)[seasonIndex], now)}</p>}</div>
        <div className="season-track" aria-label="오늘의 계절 진행도">
          {SEASONS.map((s, i) => <div key={s} className={`season-step ${i === seasonIndex ? "active" : ""}`}><span>{SEASON_ICON[s]}</span><b>{s}</b></div>)}
          <div className="season-fill" style={{ width: `${seasonIndex < 0 ? 0 : (seasonIndex * 25) + seasonProgress / 4}%` }} />
        </div>
        <div className="buff-bar" aria-label="날씨와 적용 중인 효과">
          {activeLunch && activeLunchRecipe && <span key={`${activeLunch.dishId}-${tab}`} className={`buff-chip lunch-chip ${activeLunchRecipe.target === tab ? "relevant" : ""}`}>{activeLunchRecipe.icon} {activeLunchRecipe.name} · {Math.ceil((activeLunch.expiresAt - nowMs) / 60000)}분{activeLunchRecipe.target === "explore" ? ` · ${activeLunch.actionsLeft}판` : ""}</span>}
        <span className={`buff-chip weather wx-${weather?.kind ?? "none"}`} title={wx.notes.join(" · ")}><b>{wx.icon} {weather ? `${weatherPlace.name} ${wx.name} ${weather.temp}°` : weatherFailed ? "날씨를 못 불러왔어요" : "날씨 불러오는 중…"}</b>{!weather && weatherFailed && <button onClick={() => setWeatherTry(value => value + 1)} aria-label="날씨 다시 불러오기" title="다시 불러오기">🔄</button>}{wx.notes.slice(0, 2).join(" · ")}{wx.notes.length > 2 ? " …" : ""}<button onClick={useMyLocation} aria-label="내 위치 날씨로 바꾸기" title="내 위치 날씨 쓰기">📍</button></span>
        {[...pets].map(id => { const item = FURNITURE.find(entry => entry.id === id)!; return <span key={id} className="buff-chip pet" title={petAbility(id, petLevel(id), true)}><b>{item.icon} {PET_BUFFS[id].title}{petLevel(id) > 1 ? ` Lv${petLevel(id)}` : ""}</b>{petAbility(id, petLevel(id), true)}</span>; })}
        {activeBuffs.map(buff => { const info = BUFF_INFO[buff.kind], good = info.good(buff.multiplier), percent = Math.round((buff.multiplier - 1) * 100);
          return <span key={buff.id} className={`buff-chip ${good ? "good" : "bad"}`}><b>{good ? "▲" : "▼"} {buff.label}</b>{info.name} {percent > 0 ? "+" : ""}{percent}%<i>{buff.left !== undefined ? `남은 ${buff.left}개` : formatClock(Math.ceil((buff.expiresAt - nowMs) / 1000))}</i></span>; })}
        </div>
      </section>



      {tab === "farm" && !FARM_V2_ENABLED && <div className="tool-dock" role="toolbar" aria-label="농사 도구 (단축키 1~5)">
        <span className="dock-title">도구</span>
        <button className={`seed ${tool === "seed" ? "on" : ""}`} onClick={() => setTool("seed")} aria-pressed={tool === "seed"} title={`${currentPlanter.name}: 빈 밭 ${currentPlanter.note}에 ${selectedCropInfo.name} 심기. 누른 채 쓸어도 돼요 (1)`}><b>{selectedCropInfo.icon}</b><span>{currentPlanter.w * currentPlanter.h > 1 ? `${currentPlanter.icon} ${currentPlanter.note}` : "심기"}</span><small>{seedPrice(selectedCropInfo)}원</small><kbd>1</kbd></button>
        <button className={`harvest ${tool === "hand" ? "on" : ""}`} onClick={() => setTool("hand")} aria-pressed={tool === "hand"} title={`${currentHand.name}: 다 자란 작물 ${currentHand.note} 수확. 누른 채 쓸어도 돼요 (2)`}><b>{currentHand.icon}</b><span>{currentHand.w * currentHand.h > 1 ? currentHand.note : "수확"}</span><small>{currentHand.name}</small><kbd>2</kbd></button>
        <button className={`can ${tool === "water" ? "on" : ""}`} onClick={() => setTool("water")} aria-pressed={tool === "water"} title={`${currentCan.name} · ${currentCan.note}. 누른 채로 쓸고 지나가도 돼요 (3)`}><b>🚿</b><span>{currentCan.w * currentCan.h > 1 ? `${currentCan.w}×${currentCan.h}칸` : "물뿌리개"}</span><small className="can-meter" aria-label={`물 ${canWater}/${canMax}`}><i style={{ width: `${(Math.min(canWater, canMax) / canMax) * 100}%` }} /></small><small className="can-count">💧 {Math.min(canWater, canMax)}/{canMax}</small><kbd>3</kbd></button>
        <button className={`refill ${canWater === 0 ? "empty" : ""}`} onClick={refillCan} disabled={canWater >= canMax} title="물뿌리개 가득 채우기 (4)"><b>🚰</b><span>우물</span><kbd>4</kbd></button>
        <span className="dock-sep" />
        {(() => { const held = FERTILIZERS.find(item => item.id === (activeFert ? activeFert.id : fertId)) ?? FERTILIZERS[0];
          return <div className="fert-slot">
            <button className={`fert ${activeFert ? "on" : ""}`} onClick={() => holdFert()} aria-pressed={Boolean(activeFert)} title={`${held.name} 들기 · ${fertStock[held.id] ?? 0}개 남음 (5)`}><b>{held.icon}</b><span>{held.name}</span><small className={fertStock[held.id] ? "" : "empty"}>{currentSpreader.w * currentSpreader.h > 1 ? `${currentSpreader.note} · ` : ""}{fertStock[held.id] ?? 0}개</small><kbd>5</kbd></button>
            <button className={`fert-more ${fertMenu ? "open" : ""}`} onClick={() => setFertMenu(open => !open)} aria-expanded={fertMenu} aria-haspopup="menu" aria-label="비료 종류 고르기" title="비료 종류 고르기">▼</button>
            {fertMenu && <div className="fert-menu" role="menu" aria-label="비료 고르기">{FERTILIZERS.map(item => <button key={item.id} role="menuitemradio" aria-checked={held.id === item.id} className={held.id === item.id ? "on" : ""} onClick={() => holdFert(item.id)}><b>{item.icon}</b><span>{item.name}<small>{item.note}</small></span><em className={fertStock[item.id] ? "" : "empty"}>{fertStock[item.id] ?? 0}개</em></button>)}</div>}
          </div>; })()}
      </div>}
      {tab === "farm" && FARM_V2_ENABLED && <div className={`farm2 season-${seasonIndex >= 0 ? seasonIndex : 4}`}>
        <header className="farm2-head">
          <div className="farm2-sign"><h3>{isWorkTime ? `${season} 텃밭` : "쉬는 텃밭"}</h3><span>오늘도 천천히, 한 칸씩</span></div>
          <span className="farm2-pill">{SEASON_ICON[season]} {isWorkTime ? <>{season} · <b>{formatClock(seasonSecondsLeft)}</b></> : `${startHour}:00—${endHour}:00`}</span>
          <span className="farm2-pill">🌱 재배 <b>{fieldStats.growing} / {plotCount}</b></span>
          <span className={`farm2-pill ${fieldStats.ready ? "hot" : ""}`}>🧺 수확 <b>{fieldStats.ready}</b></span>
          {fieldStats.thirsty > 0 && <span className="farm2-pill warn">💧 목마름 <b>{fieldStats.thirsty}</b></span>}
          {fieldStats.bugs > 0 && <span className="farm2-pill bad">🐛 <b>{fieldStats.bugs}</b></span>}
          <span className="farm2-pill">🪙 시세 갱신 <b>{formatClock(marketSecondsLeft)}</b></span>
        </header>
        <div className="farm2-body">
          <aside className="farm2-seeds">
            <div className="farm2-card-title"><span aria-hidden="true">👝</span><h4>씨앗 주머니</h4></div>
            <div className="farm2-sort" role="tablist" aria-label="씨앗 정렬">{([["reco", "추천"], ["short", "짧은 재배"], ["profit", "수익"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={seedSort === id} className={seedSort === id ? "on" : ""} onClick={() => setSeedSort(id)}>{label}</button>)}</div>
            {demandLeft(market) <= 0 && <p className="demand-out">🛒 이번 5분 수요를 다 채웠어요 · 시세 −{Math.round((1 - OVERFLOW_RATE) * 100)}%</p>}
            <div className="farm2-seed-list">{seedRows.map(crop => { const secs = cropSeconds(crop), tooLate = isWorkTime && secs > seasonSecondsLeft, allowance = plantingAllowance(crop, specialPlantings, plantingDate), sat = saturationOf(market, crop.id);
              return <button key={crop.id} className={`farm2-seed ${selectedCrop === crop.id ? "on" : ""} ${tooLate ? "late" : ""}`} onClick={() => { setSelectedCrop(crop.id); setTool("seed"); }} aria-pressed={selectedCrop === crop.id} disabled={allowance <= 0}>
                <span className="farm2-seed-icon">{crop.icon}</span>
                <span className="farm2-seed-info"><b>{crop.seasonalLimit ? "👑 " : ""}{crop.name}</b><small>씨앗 {seedPrice(crop).toLocaleString()}원</small><em>예상 {salePrice(crop).toLocaleString()}원{sat > 0 ? ` · 📉-${Math.round(sat * 100)}%` : ""}</em></span>
                <span className="farm2-seed-time">{tooLate ? "시간 부족" : <>⏱ {formatClock(secs)}</>}{crop.seasonalLimit ? <small>파종 {allowance}/30</small> : null}</span>
              </button>; })}</div>
            <div className="farm2-quick"><button onClick={() => setShowMissions(true)}>📜 미션</button><button onClick={() => { setShowMissions(false); setShowStorage(true); }}>📦 통합 창고 <kbd>E</kbd></button></div>
          </aside>
          <section className="farm2-field-wrap">
            {broke && lastBailout === today && <div className="broke-banner">💸 돈이 바닥났어요. <b>🎣 강가 맨손 낚시</b>로 다시 벌어 봐요!<button onClick={() => { setSelectedBait(BARE_HAND.id); goBareFishing(); }}>맨손 낚시하러 가기</button></div>}
            <div className={`farm2-field cols-${fieldColumns(plotCount)}`}>
              <div className="farm2-scenery" aria-hidden="true" />
              {fieldGrid}
            </div>
            <div className="farm2-tools" role="toolbar" aria-label="농사 도구 (단축키 1~5)">
              <button className={tool === "seed" ? "on" : ""} onClick={() => setTool("seed")} aria-pressed={tool === "seed"}><kbd>1</kbd><b>{selectedCropInfo.icon}</b><span>심기</span><small>{currentPlanter.note}</small></button>
              <button className={tool === "hand" ? "on" : ""} onClick={() => setTool("hand")} aria-pressed={tool === "hand"}><kbd>2</kbd><b>🧺</b><span>수확</span><small>{currentHand.note}</small></button>
              <button className={tool === "water" ? "on" : ""} onClick={() => setTool("water")} aria-pressed={tool === "water"}><kbd>3</kbd><b>🚿</b><span>물주기</span><small className="farm2-meter"><i style={{ width: `${(Math.min(canWater, canMax) / canMax) * 100}%` }} /><em>{Math.min(canWater, canMax)} / {canMax}</em></small></button>
              <button className={canWater === 0 ? "empty" : ""} onClick={refillCan} disabled={canWater >= canMax}><kbd>4</kbd><b>🪣</b><span>우물</span><small>가득 채우기</small></button>
              <div className="fert-slot farm2-fert">
                <button className={activeFert ? "on" : ""} onClick={() => setFertMenu(open => !open)} aria-expanded={fertMenu} aria-haspopup="menu"><kbd>5</kbd><b>{heldFert.icon}</b><span>비료 ▾</span><small className={fertStock[heldFert.id] ? "" : "empty"}>{heldFert.name} {fertStock[heldFert.id] ?? 0}개</small></button>
                {fertMenu && <div className="fert-menu farm2-fert-menu" role="menu" aria-label="비료 고르기">{FERTILIZERS.map(item => <button key={item.id} role="menuitemradio" aria-checked={heldFert.id === item.id} className={heldFert.id === item.id ? "on" : ""} onClick={() => holdFert(item.id)}><b>{item.icon}</b><span>{item.name}<small>{item.note}</small></span><em className={fertStock[item.id] ? "" : "empty"}>{fertStock[item.id] ?? 0}개</em></button>)}</div>}
              </div>
              <div className={`farm2-hint tb-${activeFert ? "fert" : tool}`}><span className="farm2-reach" style={{ gridTemplateColumns: `repeat(${reachNow.w}, 1fr)` }} aria-hidden="true">{Array.from({ length: reachNow.w * reachNow.h }).map((_, k) => <i key={k} />)}</span><div>{toolBanner}</div></div>
            </div>
          </section>
          <aside className="farm2-side">
            <div className="farm2-sel">
              <div className="farm2-card-title"><span aria-hidden="true">🌱</span><h4>선택 구획</h4></div>
              {fieldSel.cells.length ? <>
                <span className="farm2-sel-tag">{fieldSel.label} ({fieldSel.cells.filter(i => i < plotCount).length}개 밭)</span>
                <ul className="farm2-sel-crops">{Object.entries(selInfo.crops).map(([id, n]) => { const crop = CROPS.find(c => c.id === id)!; return <li key={id}><span>{crop.icon} {crop.name}</span><b>{n}칸</b></li>; })}
                  {selInfo.empty > 0 && <li><span>🟫 빈 밭</span><b>{selInfo.empty}칸</b></li>}{selInfo.withered > 0 && <li><span>🥀 시든 밭</span><b>{selInfo.withered}칸</b></li>}</ul>
                <ul className="farm2-sel-stats">
                  <li><span>🌿 평균 성장도</span><b>{selInfo.growing ? `약 ${Math.round(selInfo.progress / selInfo.growing)}%` : "—"}</b></li>
                  <li><span>💧 물 필요</span><b>{selInfo.thirsty}칸</b></li>
                  <li><span>🪙 예상 수확 가치</span><b>약 {selInfo.value.toLocaleString()}원</b></li>
                </ul>
                <button className="farm2-water-all" onClick={() => waterArea(fieldSel.cells)} disabled={!selInfo.thirsty}>💧 전체 물주기</button>
                <button className="farm2-fert-pick" onClick={() => setFertMenu(true)}>{heldFert.icon} 비료 선택</button>
                <button className="farm2-clear" onClick={() => { selKeyRef.current = ""; setFieldSel({ cells: [], label: "" }); }}>✕ 구획 해제</button>
              </> : <p className="hint">밭 위에 마우스를 올리면 지금 도구 범위가 선택 구획이 돼요. 여기서 물·성장도·예상 가치를 확인하고 한 번에 물을 줄 수 있어요.</p>}
            </div>
            <div className="farm2-expand">
              <h4>다음 밭 확장 · {ownedPlots} → {Math.min(MAX_PLOTS, ownedPlots + 2)}칸</h4>
              <div><span className="farm2-expand-art" aria-hidden="true">🌾</span><p>더 넓은 텃밭으로<br />다양한 작물을 재배해요!</p></div>
              <span className="field-meter"><i style={{ width: `${(ownedPlots / MAX_PLOTS) * 100}%` }} /></span>
              <button onClick={expandField} disabled={ownedPlots >= MAX_PLOTS}>{ownedPlots >= MAX_PLOTS ? "최대 확장 완료" : `🪙 ${fieldPrice(ownedPlots).toLocaleString()}원`}</button>
            </div>
            <details className="farm2-shop"><summary>🧰 도구 상점 <small>심기·수확·물·거름</small></summary>{toolShopBox}</details>
            <button className="farm2-workshop" onClick={() => switchTab("workshop")}>🏭 공방 <small>{workshop.jobs.length}/{workshop.slots}</small>{doneJobs > 0 && <i className="tab-dot">{doneJobs}</i>}</button>
          </aside>
        </div>
      </div>}
      {tab === "farm" && !FARM_V2_ENABLED && <div className="game-grid">
        <section className="farm-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">MY FIELD · {plotCount}칸</span><h3>햇살 텃밭</h3></div><div className="field-summary">
            <span title="재배 중">🌱 {fieldStats.growing}/{plotCount}</span>
            <span className={fieldStats.ready ? "hot" : ""} title="수확 가능">🧺 {fieldStats.ready}</span>
            <span className={fieldStats.thirsty ? "warn" : ""} title="목마름">💧 {fieldStats.thirsty}</span>
            <span className={fieldStats.bugs ? "bad" : ""} title="벌레">🐛 {fieldStats.bugs}</span>
          </div></div>
          {broke && lastBailout === today && <div className="broke-banner">💸 돈이 바닥났어요. 🦝 “지원금은 오늘 벌써 받았잖아~ 맨손으로 물고기나 잡아 ㅋㅋ” <b>🎣 강가 맨손 낚시</b>로 다시 벌어 봐요!<button onClick={() => { setSelectedBait(BARE_HAND.id); goBareFishing(); }}>맨손 낚시하러 가기</button></div>}
          <div className={`tool-banner tb-${FERTILIZERS.some(item => item.id === tool) ? "fert" : tool}`}>{toolBanner}</div>
          {fieldGrid}
        </section>
        <aside className="seed-panel panel">
          <div className="side-tabs" role="tablist" aria-label="씨앗과 가공">
            <button role="tab" aria-selected={sidePanel === "seed"} className={sidePanel === "seed" ? "on" : ""} onClick={() => setSidePanel("seed")}>🌱 씨앗</button>
            <button className="side-workshop-link" onClick={() => switchTab("workshop")}>🏭 공방 <small>{workshop.jobs.length}/{workshop.slots}</small>{doneJobs > 0 && <i className="tab-dot">{doneJobs}</i>}</button>
          </div>
          {sidePanel === "seed" ? <>
          <div className="panel-heading"><div><span className="eyebrow">SEED BOX · 5분 시세</span><h3>{season} 씨앗 상자</h3></div><span className="market-timer">{formatClock(marketSecondsLeft)}</span></div>
          {demandLeft(market) <= 0 && <p className="demand-out">🛒 이번 5분 시장 수요를 다 채웠어요 · 모든 작물 시세 −{Math.round((1 - OVERFLOW_RATE) * 100)}% <small>({formatClock(marketSecondsLeft)} 뒤 새 시세에서 회복)</small></p>}
          <p className="hint">한국의 노지 재배 시기를 바탕으로 고른 작물이에요.</p>
          <div className="crop-list">{cropCards}</div>
          </> : null}
          <div className="field-shop"><div><b>🌾 밭 두 칸 확장</b><small>{ownedPlots >= MAX_PLOTS ? "최대 확장 완료" : `${fieldPrice(ownedPlots).toLocaleString()}원 · ${ownedPlots}/${MAX_PLOTS}칸`}</small><span className="field-meter"><i style={{ width: `${(ownedPlots / MAX_PLOTS) * 100}%` }} /></span></div><button onClick={expandField} disabled={ownedPlots >= MAX_PLOTS}>구매</button></div>
          {toolShopBox}
          <div className="tip">🧰 오른쪽 도구함에서 도구를 고르세요(단축키 1~5, 5는 고른 비료). 🌱 심기와 🧺 수확은 따로예요. 둘 다 누른 채 밭 위를 쓸면 연달아 돼요.<br />🌿 거름을 들면 자라는 작물을 눌러 줘요(작물당 1번).<br />🚿 자라는 동안 2~3번 목말라해요. 물뿌리개로 제때 물을 주면 품질이 올라 더 비싸게 팔려요(좋음 ×1.12, 최상 ×1.3).<br />🐛 벌레가 날아오면 {BUG_SECONDS}초 안에 어떤 도구로든 눌러 잡으세요(벌레 있는 밭을 눌러도 돼요). 놓치면 그 작물 판매가 -{Math.round(bugPenalty * 100)}%.<br />🥀 계절이 바뀌면 지난 계절 작물은 시들어요.</div>
        </aside>
      </div>}

      {tab === "fish" && FISH_V2_ENABLED && <div className={`fish2 spot-${currentSpot.id}`}>
        <header className="fish2-head">
          <div className="fish2-sign"><h3>{season} {currentSpot.name}</h3><span>{FISH_MOOD[currentSpot.id] ?? "물결이 잔잔한 오후"}</span></div>
          <div className="fish2-spots" role="group" aria-label="낚시 장소">{SPOTS.map(spot => { const left = spot.price > 0 ? Math.max(0, Math.ceil(((tickets[spot.id] ?? 0) - nowMs) / 1000)) : -1;
            return <button key={spot.id} className={`fish2-spot spot-${spot.id} ${spotId === spot.id ? "on" : ""}`} onClick={() => chooseSpot(spot)} title={spot.note} aria-pressed={spotId === spot.id}>
              <span className="fish2-spot-art" aria-hidden="true" /><b>{spot.name}</b>{spot.price > 0 && <small>{left > 0 ? `🎫 ${formatClock(left)}` : `🪙 ${spot.price.toLocaleString()}원`}</small>}</button>; })}</div>
          <div className="fish2-pills">
            <span>🎫 입장 <b>{currentSpot.price === 0 ? "무료" : ticketLeft > 0 ? formatClock(ticketLeft) : "만료"}</b></span>
            <span>👑 전설 확률 <b>{pct(fishOdds.전설)}</b></span>
            <span title={wx.notes.join(" · ")}>{wx.icon} {weather ? wx.name : "날씨"} <b>{fishMul > 1 ? "입질 좋음" : fishMul < 1 ? "입질 나쁨" : "입질 보통"}</b></span>
          </div>
        </header>
        <div className="fish2-body">
          <aside className="fish2-bag">
            <div className="fish2-title"><span aria-hidden="true">🎒</span><h4>낚시 가방</h4></div>
            <div className="fish2-gear"><span className="fish2-gear-icon">{currentRod.icon}</span><div><b>{currentRod.name}</b><small>{currentRod.note}</small><span className="fish2-stat"><i>막대</i><em><u style={{ width: `${Math.min(100, currentRod.bar * 220)}%` }} /></em></span></div></div>
            <div className="fish2-gear"><span className="fish2-gear-icon">{fishBare ? BARE_HAND.icon : currentBait.icon}</span><div><b>{fishBare ? BARE_HAND.name : `${currentBait.name} × ${baits[currentBait.id] ?? 0}`}</b><small>{fishBare ? "입질 느림 · 흔함·보통만" : currentBait.note}</small></div></div>
            <div className="fish2-gear-buttons"><button onClick={() => setFishPicker("rod")} disabled={fishState.phase === "game"}>낚싯대 변경</button><button onClick={() => setFishPicker("bait")}>미끼 변경</button></div>
            <div className="fish2-odds">
              <b>이번 지역 확률 정보</b>
              <span className="fish2-odds-bar" aria-hidden="true">{(["흔함", "보통", "희귀", "전설"] as const).map(rarity => <i key={rarity} className={`r-${rarity}`} style={{ flexGrow: Math.max(0.001, fishOdds[rarity]) }} />)}</span>
              <ul>{(["흔함", "보통", "희귀", "전설"] as const).map(rarity => <li key={rarity} className={`r-${rarity}`}><span>{rarity}</span><b>{pct(fishOdds[rarity])}</b></li>)}</ul>
            </div>
            <div className="fish2-quick"><button onClick={() => setShowMissions(true)}>📜 미션</button><button onClick={() => { setShowMissions(false); setShowStorage(true); }}>📦 통합 창고 <kbd>E</kbd></button></div>
          </aside>
          <section className="fish2-stage">
            {pondScene}
            {fishState.phase === "bite" && <div className="fish2-gauge" aria-live="assertive"><span className="fish2-gauge-ring" style={{ animationDuration: `${BITE_WINDOW_MS}ms` }} /><b>지금!</b><kbd>Space</kbd></div>}
            <div className="fish2-controls">
              <p className="fish2-tip">{fishState.phase === "game" ? "🐟 초록 막대 안에! 누르면 올라가고 떼면 내려가요" : fishState.phase === "waiting" ? "❗ 찌가 잠기면 당기세요" : fishState.phase === "bite" ? "🎣 지금 당기세요!" : bareReady ? "🫳 맨손으로 던져 볼까요?" : "🎣 던질 준비 완료"}</p>
              {fishState.phase === "game" ? <span className="fish2-main idle">🐟 씨름 중…</span>
                : fishState.phase === "waiting" || fishState.phase === "bite" ? <button className={`fish2-main ${fishState.phase === "bite" ? "hot" : ""}`} onClick={reelIn}>🎣 당기기 <kbd>Space</kbd></button>
                : <button className="fish2-main" onClick={castLine} disabled={!isWorkTime || (!baits[currentBait.id] && !bareReady)}>{bareReady ? "🫳 맨손으로 던지기" : fishState.phase === "result" ? "🎣 다시 던지기" : "🎣 던지기"} <kbd>Space</kbd></button>}
            </div>
          </section>
          <aside className="fish2-side">
            <div className="fish2-title"><span aria-hidden="true">🌊</span><h4>오늘의 물길</h4></div>
            <ul className="fish2-today">{(["흔함", "보통", "희귀"] as const).map(rarity => { const group = todayFish.filter(entry => entry.fish.rarity === rarity); if (!group.length) return null;
              const face = group.find(entry => FISH_ART.has(entry.fish.id))?.fish ?? group[0].fish;
              return <li key={rarity} className={`r-${rarity}`}>{fishArt(face) ?? <span className="fish2-today-icon">{face.icon}</span>}<span><b>{group.slice(0, 2).map(entry => entry.fish.name).join(" · ")}{group.length > 2 ? ` 외 ${group.length - 2}종` : ""}</b><small>{rarity} · 종마다 {pct(group[0].chance)} · 합계 {pct(fishOdds[rarity])}</small></span><em>{group.filter(entry => fishLog[entry.fish.id]).length}/{group.length}</em></li>; })}
              {todayFish.filter(entry => entry.fish.rarity === "전설").map(({ fish, chance }) => <li key={fish.id} className="r-전설">
                {LEGEND_ART[fish.id] ? <span className={`legend-fish-art book ${LEGEND_ART[fish.id]}`} role="img" aria-label={fish.name} /> : <span className="fish2-today-icon">{fish.icon}</span>}
                <span><b>👑 {fishLog[fish.id] ? fish.name : "???"}</b><small>전설 · {pct(chance)}</small></span><em>{fishLog[fish.id] ? "📖" : ""}</em></li>)}</ul>
            <div className="fish2-title small"><h4>최근 어획</h4><button onClick={() => switchTab("book")}>도감 ›</button></div>
            {recentCatches.length ? <ul className="fish2-recent">{recentCatches.map(c => { const left = fishStock[c.id] ?? 0, locked = Boolean(fishLocks[c.id]);
              return <li key={c.at} className={`r-${c.fish.rarity}`}>{fishArt(c.fish) ?? <span className="fish2-today-icon">{c.fish.icon}</span>}<span><b>{c.fish.name}{c.perfect ? " ✨" : ""}</b><small>{c.stored ? `창고 · 보유 ${left}` : `${c.price.toLocaleString()}원 판매`}</small></span>
                {c.stored && left > 0 ? <button onClick={() => sellStoredFish(c.id, 1)} disabled={locked}>팔기</button> : <time>{new Date(c.at).toTimeString().slice(0, 5)}</time>}</li>; })}</ul> : <p className="hint">아직 잡은 물고기가 없어요.</p>}
            <div className="fish2-mode" role="radiogroup" aria-label="잡은 물고기 처리">
              <button role="radio" aria-checked={fishHarvestMode === "store"} className={fishHarvestMode === "store" ? "on" : ""} onClick={() => setFishHarvestMode("store")}>📦 잡은 물고기 → 창고 보관</button>
              <button role="radio" aria-checked={fishHarvestMode === "sell"} className={fishHarvestMode === "sell" ? "on" : ""} onClick={() => setFishHarvestMode("sell")}>🪙 바로 판매</button>
            </div>
          </aside>
        </div>
        {fishPicker && <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) setFishPicker(null); }}><section className="modal fish2-picker" role="dialog" aria-modal="true" aria-label={fishPicker === "rod" ? "낚싯대 고르기" : "미끼 고르기"}>
          <div className="fish2-title"><h4>{fishPicker === "rod" ? "🎣 낚싯대" : "🪱 미끼 가방"}</h4><button className="ghost-button small" onClick={() => setFishPicker(null)}>닫기</button></div>
          {fishPicker === "rod" ? rodList : baitList}
        </section></div>}
      </div>}
      {tab === "fish" && !FISH_V2_ENABLED && <div className="game-grid">
        <section className="panel fish-panel">
          <div className="panel-heading"><div><span className="eyebrow">FISHING SPOT</span><h3>{season} {currentSpot.name} {currentSpot.icon}</h3></div><div className="farm-actions"><button className="ghost-button small" onClick={() => setShowAvatar(true)}>🪞 캐릭터 바꾸기</button><span className="plot-count">전설 출현 {LEGEND_CHANCE * 100}% (고정)</span></div></div>
          <div className="spot-bar" role="group" aria-label="낚시 장소">{SPOTS.map(spot => { const left = spot.price > 0 ? Math.max(0, Math.ceil(((tickets[spot.id] ?? 0) - nowMs) / 1000)) : -1;
            return <button key={spot.id} className={`${spotId === spot.id ? "on" : ""} ${spot.price ? "paid" : ""}`} onClick={() => chooseSpot(spot)} title={spot.note}><b>{spot.icon}</b><span>{spot.name}</span><small>{spot.price === 0 ? "무료" : left > 0 ? `🎫 ${formatClock(left)}` : `${spot.price.toLocaleString()}원/${spot.minutes}분`}</small></button>; })}</div>
          <div className="fish-summary"><span>📍 {currentSpot.name}</span><span>{currentRod.icon} {currentRod.name}</span><span>{currentBait.icon} {currentBait.name} {baits[currentBait.id] ?? 0}개</span><span className="legend">🌈 전설 {LEGEND_CHANCE * 100}%</span><span>{fishHarvestMode === "store" ? "📦 창고 보관" : "💰 바로 판매"}</span></div>
          {pondScene}
          <div className="fish-controls">
            <p>{fishState.phase === "game" ? "🐟 물고기를 초록 막대 안에! 누르고 있으면 올라가고, 떼면 내려가요. 🎁가 보이면 막대에 함께 담아 보세요." : fishState.phase === "waiting" ? "찌가 흔들리길 기다리는 중… 입질 전에 채면 놓쳐요." : fishState.phase === "bite" ? "입질이 왔어요! 지금 당겨요!" : bareReady ? `${currentRod.icon} ${currentRod.name} · 🫳 미끼가 없어 맨손 낚시를 해요 (입질 느림 · 흔함·보통만, 공짜)` : `${currentRod.icon} ${currentRod.name} · ${currentBait.icon} ${currentBait.name} ${baits[currentBait.id] ?? 0}개 남음 · 던질 때마다 1개씩 써요.`}</p>
            <button className={`mode-toggle ${fishHarvestMode}`} onClick={() => setFishHarvestMode(mode => mode === "sell" ? "store" : "sell")}>{fishHarvestMode === "store" ? "📦 창고 보관" : "💰 바로 판매"} ⇄</button>
            {fishState.phase === "game" ? null : fishState.phase === "waiting" || fishState.phase === "bite" ? <button className={`reel-button ${fishState.phase === "bite" ? "hot" : ""}`} onClick={reelIn}>🎣 당기기!</button> : <button className="reel-button" onClick={castLine} disabled={!isWorkTime || (!baits[currentBait.id] && !bareReady)}>{bareReady ? "🫳 맨손으로 던지기" : fishState.phase === "result" ? "다시 던지기" : "낚싯대 던지기"}</button>}
          </div>
          {recentCatches.length > 0 && <div className="recent-catch"><b>🐟 최근 어획</b><ul>{recentCatches.map(c => { const left = fishStock[c.id] ?? 0, locked = Boolean(fishLocks[c.id]);
            return <li key={c.at} className={`rarity-${c.fish.rarity}`}><span className="rc-icon">{c.fish.icon}</span><span className="rc-info"><b>{c.fish.name}{c.perfect ? " ✨" : ""}</b><small>{c.fish.rarity} · {c.stored ? `📦 창고 (보유 ${left})` : `💰 ${c.price.toLocaleString()}원 판매`}</small></span>
              {c.stored && left > 0 && <span className="rc-actions"><button onClick={() => sellStoredFish(c.id, 1)} disabled={locked}>💰 1마리 판매</button><button onClick={() => setFishLocks(all => ({ ...all, [c.id]: !locked }))} aria-pressed={locked}>{locked ? "🔒 잠금" : "🔓 잠금"}</button></span>}</li>; })}</ul></div>}
        </section>
        <aside className="panel fish-book">
          <div className="panel-heading"><div><span className="eyebrow">FISHING ROD</span><h3>낚싯대</h3></div></div>
          {rodList}
          <div className="panel-heading"><div><span className="eyebrow">BAIT BAG</span><h3>미끼 가방</h3></div></div>
          {baitList}
          <button className="book-link" onClick={() => switchTab("book")}>📖 물고기 도감 보기 <b>{[...FISH, ...SPECIAL_FISH].filter(fish => fishLog[fish.id]).length}/{FISH.length + SPECIAL_FISH.length}</b></button>
        </aside>
      </div>}

      {tab === "equipment" && <EquipmentPanel raid={RAID_ENABLED ? <RaidGearView raid={raid} forge={forge} /> : undefined} owned={ownedEffects} equipment={equipment} onEquip={(slot, id) => setEquipment(current => equipEffect(current, ownedEffects, slot, id))} onShop={() => { setShopMain("gacha"); switchTab("gacha"); }} />}
      {tab === "gacha" && <div className="shop-main-tabs" role="tablist" aria-label="상점">{([["gacha", "🎁 가챠"], ["food", "🦴 펫 먹이"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={shopMain === id} className={shopMain === id ? "on" : ""} onClick={() => setShopMain(id)}>{label}</button>)}</div>}
      {tab === "gacha" && shopMain === "food" && <section className="panel food-shop">
        <div className="panel-heading"><div><span className="eyebrow">PET FOOD</span><h3>펫 먹이</h3></div><button className="ghost-button small" onClick={() => switchTab("pets")}>🐾 펫 돌보러 가기</button></div>
        <p className="hint">비싼 먹이일수록 애정도가 많이 올라요. 펫은 배가 부르면(배부름 {FULL_REFUSE} 이상) 먹지 않으니, 산책·교감도 함께 해 주세요.</p>
        <div className="food-list">{PET_FOODS.map(food => <div key={food.id} className="food-item">
          <span className="food-icon">{food.icon}</span><span className="food-info"><b>{food.name}</b><small>{food.note}</small></span><em>보유 {petFood[food.id] ?? 0}개</em>
          <QtyBuy label={food.name} unitPrice={food.price} money={money} onBuy={count => buyFood(food, count)} />
        </div>)}</div>
      </section>}
      {tab === "gacha" && shopMain === "gacha" && <div className="gacha-grid">
        <EffectGacha owned={ownedEffects} money={money} onDraw={drawCosmetic} result={effectResult} onEquipment={() => switchTab("equipment")} />
        <section className="panel gacha">
          <div className="panel-heading"><div><span className="eyebrow">PET GACHA</span><h3>펫 뽑기</h3></div><span className="plot-count">전설 0.1%</span></div>
          <div key={gachaResult?.at ?? 0} className={`gacha-machine ${gachaResult ? (gachaResult.item.legend ? "legend" : gachaResult.item.rare ? "rare" : "common") : ""}`}>
            {gachaResult ? <><span className="furniture-thumb" style={{ "--c": gachaResult.item.color } as CSSProperties}><FurnitureArt id={gachaResult.item.id} /></span><strong>{gachaResult.item.name}</strong><em>{gachaResult.item.legend ? "🌈 전설 펫!!!" : gachaResult.item.rare ? "✨ 능력 펫!" : "일반 펫"}</em>{(gachaResult.item.rare || gachaResult.item.legend) && <small>{PET_BUFFS[gachaResult.item.id].title} · {PET_BUFFS[gachaResult.item.id].text}</small>}</> : <><b>🐾</b><small>어떤 친구가 나올까요?</small></>}
          </div>
          <div className="gacha-buttons"><button className="gacha-button" onClick={() => drawPet(1)} disabled={money < GACHA_PRICE}>🎰 펫 뽑기 · {GACHA_PRICE.toLocaleString()}원</button><button className="gacha-button" onClick={() => drawPet(10)} disabled={money < GACHA_PRICE * 10}>🎰 10회 뽑기 · {(GACHA_PRICE * 10).toLocaleString()}원</button></div>
          <p className="hint">전설 {GACHA_LEGEND_CHANCE * 100}% · 능력 {Math.round(GACHA_RARE_CHANCE * 100)}% · 일반 {(100 - GACHA_LEGEND_CHANCE * 100 - GACHA_RARE_CHANCE * 100).toFixed(1)}% · 중복 가능 · 되팔기는 가치의 50%</p>
          <details className="gacha-odds"><summary>뽑을 수 있는 펫 보기</summary>
            <b>🌈 전설 펫 (각 {(GACHA_LEGEND_CHANCE * 100 / FURNITURE.filter(item => item.legend).length).toFixed(2)}%)</b>
            <ul>{FURNITURE.filter(item => item.legend).map(item => <li key={item.id}>{item.icon} {item.name} — {PET_BUFFS[item.id].text} <i>되팔기 {Math.round(item.price / 2).toLocaleString()}원</i></li>)}</ul>
            <b>✨ 능력 펫 (각 {(GACHA_RARE_CHANCE * 100 / FURNITURE.filter(item => item.rare).length).toFixed(1)}%)</b>
            <ul>{FURNITURE.filter(item => item.rare).map(item => <li key={item.id}>{item.icon} {item.name} — {PET_BUFFS[item.id].text} <i>되팔기 {Math.round(item.price / 2).toLocaleString()}원</i></li>)}</ul>
            <b>일반 펫 (각 {((1 - GACHA_RARE_CHANCE - GACHA_LEGEND_CHANCE) * 100 / FURNITURE.filter(item => item.pet && !item.rare && !item.legend).length).toFixed(2)}%)</b>
            <ul className="common">{FURNITURE.filter(item => item.pet && !item.rare && !item.legend).map(item => <li key={item.id}>{item.icon} {item.name}</li>)}</ul>
          </details>
          <b className="my-pets-title">우리 집 펫 <em>{[...placed, ...warehouse].filter(item => item.pet).length} / {PET_LIMIT}</em></b>
          <div className="pet-bulk"><button className="ghost-button small" onClick={() => sellPetsBulk("dupes")}>중복 펫 모두 되팔기</button><button className="ghost-button small" onClick={() => sellPetsBulk("common")}>일반 펫 모두 되팔기</button><small>잠긴 펫은 팔지 않아요</small></div>
          {/* 같은 종류는 한 줄로 묶는다(수천 마리여도 가볍게). 되팔기는 창고·잠금 안 된 것부터 1마리. */}
          <div className="my-pets">{(() => { const pets = [...placed, ...warehouse].filter(item => item.pet), groups = new Map<string, PlacedItem[]>(); for (const pet of pets) groups.set(pet.id, [...(groups.get(pet.id) ?? []), pet]);
            return [...groups.values()].sort((a, b) => Number(Boolean(b[0].legend)) - Number(Boolean(a[0].legend)) || Number(Boolean(b[0].rare)) - Number(Boolean(a[0].rare))).map(list => { const item = list[0], next = list.find(pet => !pet.locked && warehouse.includes(pet)) ?? list.find(pet => !pet.locked), stored = list.filter(pet => warehouse.includes(pet)).length;
              return <div key={item.id} className={item.legend ? "legend" : item.rare ? "rare" : ""}><span>{item.icon}</span><b>{item.name}{list.length > 1 && <em> ×{list.length}</em>}</b><small>{stored === list.length ? "창고 (효과 없음)" : item.rare || item.legend ? PET_BUFFS[item.id].title : "일반"}{stored && stored < list.length ? ` · 창고 ${stored}` : ""}</small><button disabled={!next} onClick={() => next && sellPet(next)}>{Math.round(item.price / 2).toLocaleString()}원에 1마리 되팔기</button></div>; }); })()}</div>
        </section>
        <section className="panel gacha">
          <div className="panel-heading"><div><span className="eyebrow">FURNITURE GACHA</span><h3>가구 뽑기</h3></div><span className="plot-count">가챠 전용</span></div>
          {(() => { const result = furnitureGachaResult, odds = furnitureGachaOdds(gachaCollected), complete = gachaPool(gachaCollected).length === 0, total = FURNITURE.filter(item => item.group === "gacha").length;
            return <>
              <div key={result?.at ?? 0} className={`gacha-machine ${result ? (result.item ? result.item.tier ?? "" : "miss") : ""}`}>
                {result ? result.item ? <><span className="furniture-thumb" style={{ "--c": result.item.color } as CSSProperties}><FurnitureArt id={result.item.id} /></span><strong>{result.item.name}</strong><em>{{ legend: "🌈 전설 가구!!", rare: "✨ 희귀 가구!", common: "일반 가구", junk: "🗑️ 쓸데없는 상품" }[result.item.tier ?? "common"]}</em><small>나의 집에 놓아 두었어요 · 되팔기 {Math.round(result.item.price / 2).toLocaleString()}원</small></> : <><b>📭</b><strong>꽝!</strong><em>빈 상자</em><small>상자 안에 먼지만 가득…</small></> : <><b>🎁</b><small>상점에는 없는 특별한 가구! (꽝도 있어요)</small></>}
              </div>
              <button className="gacha-button furniture" onClick={drawFurniture} disabled={money < FURNITURE_GACHA_PRICE || complete}>{complete ? "🏆 컴플리트! 모두 모았어요" : `🎁 가구 뽑기 · ${FURNITURE_GACHA_PRICE.toLocaleString()}원`}</button>
              <p className="hint">한 번 뽑은 상품은 다시 나오지 않아요(팔아도 마찬가지). 수집 {gachaCollected.length}/{total}</p>
              {!complete && <div className="gacha-odds-row">{odds.map(({ tier, chance, left }) => <span key={tier} className={`odds-${tier}`}>{tier === "miss" ? "📭 꽝" : TIER_NAME[tier]} <b>{(chance * 100).toFixed(1)}%</b>{tier !== "miss" && <small>남은 {left}</small>}</span>)}</div>}
              <div className="gacha-catalog">{(["legend", "rare", "common", "junk"] as const).map(tier => <div key={tier} className={`tier-${tier}`}><b>{TIER_NAME[tier]}</b>{FURNITURE.filter(item => item.group === "gacha" && item.tier === tier).map(item => { const got = gachaCollected.includes(item.id);
                return <span key={item.id} className={got ? "owned" : ""} title={got ? item.name : "???"}><span className="furniture-thumb" style={{ "--c": item.color } as CSSProperties}>{got ? <FurnitureArt id={item.id} /> : <b className="unknown">?</b>}</span><small>{got ? item.name : "???"}</small></span>; })}</div>)}</div>
            </>; })()}
        </section>
        {RAID_ENABLED && <section className="panel gacha battle-pet-gacha">
          <div className="panel-heading"><div><span className="eyebrow">BATTLE PET GACHA</span><h3>⚔️ 전투펫 뽑기</h3></div><span className="plot-count">토벌탑 전용</span></div>
          <BattlePetGacha raid={raid} forge={forge} />
        </section>}
      </div>}

      {tab === "pets" && RAID_ENABLED && <div className="shop-main-tabs pet-kind-tabs" role="tablist" aria-label="펫 종류">{([["life", `🐾 생활펫 · ${new Set([...placed, ...warehouse].filter(item => item.pet).map(item => item.id)).size}`], ["battle", `⚔️ 전투펫 · ${Object.keys(raid.battlePets ?? {}).length}/${BATTLE_PETS.length}`]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={petKind === id} className={petKind === id ? "active" : ""} onClick={() => setPetKind(id)}>{label}</button>)}</div>}
      {tab === "pets" && RAID_ENABLED && petKind === "battle" && <section className="panel battle-pet-panel">
        <div className="panel-heading"><div><span className="eyebrow">BATTLE PETS</span><h3>⚔️ 전투펫</h3></div><span className="plot-count">{Object.keys(raid.battlePets ?? {}).length} / {BATTLE_PETS.length}</span></div>
        <p className="hint">토벌탑에 한 마리 데려가요. 중복으로 모은 📜 계약 조각으로 레벨업하거나 희귀·전설 펫과 교환해요. <button className="ghost-button small" onClick={() => { setShopMain("gacha"); switchTab("gacha"); }}>🥚 전투펫 뽑으러 가기</button></p>
        <BattlePetRoster raid={raid} forge={forge} />
      </section>}

      {tab === "pets" && (!RAID_ENABLED || petKind === "life") && (() => { const ids = [...new Set([...placed, ...warehouse].filter(item => item.pet).map(item => item.id))];
        return <section className="panel pet-care-panel">
          <div className="panel-heading"><div><span className="eyebrow">PET CARE</span><h3>펫 돌보기</h3></div><span className="plot-count">{ids.length}마리</span></div>
          <p className="hint">🍽️ 먹이·🦮 산책·🤗 교감으로 애정도를 채우면 레벨업해요(최대 Lv{PET_MAX_LEVEL}). 기본 능력은 레벨당 0.1%씩 조금씩 강해져요. 일반 펫 판매 보너스는 레벨당 +0.01%p예요. 능력은 집에 둔 펫만 적용돼요.</p>
          <div className="pet-food-bar">{PET_FOODS.map(food => <span key={food.id} title={`${food.name} · ${food.note}`}>{food.icon} {petFood[food.id] ?? 0}</span>)}<button className="ghost-button small" onClick={() => { setShopMain("food"); switchTab("gacha"); }}>🛍️ 먹이 사러 가기</button></div>
          {ids.length === 0 ? <p className="empty">아직 펫이 없어요. 🛍️ 상점의 가챠에서 첫 친구를 뽑아 보세요!</p> : <div className="pet-care-grid">{ids.map(id => {
            const item = FURNITURE.find(entry => entry.id === id)!, care = petCare[id] ?? newCare(nowMs), full = fullness(care, nowMs), special = Boolean(item.rare || item.legend), home = placed.some(entry => entry.id === id);
            const walkLeft = Math.max(0, Math.ceil((care.walkAt + WALK_COOLDOWN_MIN * 60000 - nowMs) / 1000)), playLeft = Math.max(0, Math.ceil((care.playAt + PLAY_COOLDOWN_MIN * 60000 - nowMs) / 1000));
            const maxed = care.level >= PET_MAX_LEVEL && care.affection >= AFFECTION_MAX;
            return <article key={id} className={`pet-card ${item.legend ? "legend" : special ? "rare" : ""} ${maxed ? "maxed" : ""}`}>
              <div className="pet-card-top"><span className="furniture-thumb pet-avatar" style={{ "--c": item.color } as CSSProperties}><FurnitureArt id={id} /></span>
                <div><b>{item.name}</b><span className="pet-level" aria-label={`레벨 ${care.level}`}>Lv{care.level} / {PET_MAX_LEVEL}</span><small>{home ? "🏡 집에 있음" : "📦 보관 중 · 능력 꺼짐"}</small></div></div>
              <div className="pet-meter love"><span>💕 애정도</span><span className="bar"><i style={{ width: `${Math.min(100, care.affection)}%` }} /></span><em>{maxed ? "MAX" : `${Math.floor(care.affection)}/${AFFECTION_MAX}`}</em></div>
              <div className={`pet-meter food ${full >= FULL_REFUSE ? "full" : full < 20 ? "hungry" : ""}`}><span>🍽️ 배부름</span><span className="bar"><i style={{ width: `${full}%` }} /></span><em>{full >= FULL_REFUSE ? "배불러요" : full < 20 ? "배고파요!" : Math.round(full)}</em></div>
              <p className="pet-ability"><b>능력</b> {petAbility(id, care.level, special)}{care.level < PET_MAX_LEVEL && <small>다음 Lv{care.level + 1}: {petAbility(id, care.level + 1, special)}</small>}</p>
              <div className="pet-actions">
                <div className="pet-feed">{PET_FOODS.map(food => <button key={food.id} onClick={() => feedPet(id, food)} disabled={!petFood[food.id] || maxed} title={`${food.name} 먹이기 · ${food.note}`} aria-label={`${food.name} 먹이기, ${petFood[food.id] ?? 0}개 있음`}>{food.icon}<small>{petFood[food.id] ?? 0}</small></button>)}</div>
                <button className="walk" onClick={() => walkPet(id)} disabled={walkLeft > 0 || maxed}>🦮 산책{walkLeft ? <small>{formatClock(walkLeft)}</small> : <small>+{WALK_AFFECTION}</small>}</button>
                <button className="play" onClick={() => playPet(id)} disabled={playLeft > 0 || maxed}>🤗 교감{playLeft ? <small>{formatClock(playLeft)}</small> : <small>+{PLAY_AFFECTION}</small>}</button>
              </div>
              {petFx?.id === id && <span key={petFx.at} className={`pet-fx ${petFx.level ? "level" : ""}`} aria-hidden="true">{petFx.text}</span>}
            </article>; })}</div>}
        </section>; })()}

      {tab === "workshop" && <section className="panel workshop-panel">
        <div className="panel-heading"><div><span className="eyebrow">WORKSHOP</span><h3>🏭 공방</h3></div>
          <div className="shop-tabs" role="tablist">{([["life", "🏺 생활 가공"], ...(RAID_ENABLED ? [["raid", "⚒️ 강화 가공"]] as const : []), ...(KITCHEN_ENABLED ? [["cook", "🍳 요리"]] as const : [])] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={workshopView === id} className={workshopView === id ? "active" : ""} onClick={() => setWorkshopView(id)}>{label}</button>)}</div></div>
        {workshopView === "raid" && RAID_ENABLED ? <RaidCraftView forge={forge} onForge={() => switchTab("raid")} /> : workshopView === "cook" && KITCHEN_ENABLED ? <> {EXPLORE_ENABLED && <div className="lunch-controls"><button aria-pressed={kitchenKind === "battle"} onClick={() => setKitchenKind("battle")}>전투 음식</button><button aria-pressed={kitchenKind === "lunch"} onClick={() => setKitchenKind("lunch")}>생활 도시락</button></div>}{kitchenKind === "lunch" && EXPLORE_ENABLED ? <LunchPanel inventory={inventory} options={lunchOptions} unlocked={lunchUnlocked(cookedDishIds, DISHES.map(d => d.id))} crafted={cookedDishIds.filter(id => DISHES.some(d => d.id === id)).length} level={village.facilityLevels["craft-street"] ?? 0} onStart={lunchCooking.start} onEat={lunchCooking.eat} onLock={toggleItemLock} onExplore={() => { if (explorationOpen) switchTab("explore"); else setNotice("탐험은 밭 12칸 또는 첫 낚시 성공 시 열려요."); }} /> : <KitchenPanel cropHave={usableOf} fishHave={cookFishCount()} huntHave={id => huntStock[id] ?? 0} huntName={id => { const loot = ALL_LOOT.find(l => l.id === id); return loot ? `${loot.icon} ${loot.name}` : id; }} dishStock={dishStock} onCook={startCooking} />}</> : WORKSHOP_V2_ENABLED ? <WorkshopLifePanel workshop={workshop} nowMs={nowMs} stock={procStock} goods={goods} slotPrice={workshopSlotPrice(workshop.slots)} maxSlots={WORKSHOP_MAX_SLOTS} formatClock={formatClock} onStart={startProcessing} onCollect={collectJob} onSell={sellGoods} onBuySlot={buyWorkshopSlot} /> : <div className="workshop-view">
            <div className="panel-heading"><div><span className="eyebrow">WORKSHOP · 절임 항아리</span><h3>가공 공방</h3></div><span className="plot-count">항아리 {workshop.slots}개</span></div>
            <p className="hint">창고 작물을 담가 비싼 가공품으로 만들어요. <b>여러 작물을 섞을수록 배율이 높아요</b>(단일 ×1.25 → 4종 ×1.9). 가공품은 시세·포화와 상관없는 고정가예요. 잠금·주문 예약분은 쓰지 않아요.</p>
            <div className="jar-row">{Array.from({ length: workshop.slots }).map((_, i) => { const job = workshop.jobs[i], recipe = job && jobInfo(job);
              if (!job || !recipe) return <div key={i} className="jar empty"><span>🏺</span><small>비어 있어요</small></div>;
              const left = Math.max(0, Math.ceil((job.doneAt - nowMs) / 1000)), total = recipe.minutes * 60, done = left <= 0;
              return <div key={i} className={`jar ${done ? "done" : ""}`}><span>{recipe.icon}</span><b>{recipe.name}</b>{done ? <button onClick={() => collectJob(i)}>꺼내기 ✨</button> : <><span className="jar-bar"><i style={{ width: `${(1 - left / total) * 100}%` }} /></span><small>{formatClock(left)} 남음</small></>}</div>; })}
              {workshop.slots < WORKSHOP_MAX_SLOTS && <button className="jar add" onClick={buyWorkshopSlot}><span>＋</span><small>항아리 추가<br />{workshopSlotPrice(workshop.slots).toLocaleString()}원</small></button>}</div>
            <div className="recipe-list">{RECIPES.map(recipe => { const ok = recipe.inputs.every(input => usableOf(input.cropId) >= input.count), price = goodsPrice(recipe), raw = rawValue(recipe);
              return <div key={recipe.id} className={`recipe ${ok ? "ready" : ""} ${recipe.inputs.length > 1 ? "mix" : ""}`}>
                <div className="recipe-head"><span className="recipe-icon">{recipe.icon}</span><span><b>{recipe.name}</b><small>⏱ {recipe.minutes}분 · 💰 {price.toLocaleString()}원 <em>(재료 기준가 {raw.toLocaleString()}원보다 +{Math.round((price / raw - 1) * 100)}%)</em></small></span></div>
                <ul className="recipe-inputs">{recipe.inputs.map(input => { const crop = CROPS.find(c => c.id === input.cropId)!, have = usableOf(input.cropId);
                  return <li key={input.cropId} className={have >= input.count ? "ok" : ""}>{crop.icon} {crop.name} <b>{Math.min(have, input.count)}/{input.count}</b><small>{crop.seasons.join("·")}</small></li>; })}</ul>
                <button onClick={() => startRecipe(recipe)} disabled={!ok || workshop.jobs.length >= workshop.slots}>{workshop.jobs.length >= workshop.slots ? "항아리 가득" : ok ? "🏺 담그기" : "재료 모으는 중"}</button>
              </div>; })}</div>
            <div className="goods-list"><b className="tool-shop-sub">🎁 만든 가공품</b>{Object.keys(goods).filter(id => goods[id] > 0).length === 0 ? <p className="empty">아직 만든 가공품이 없어요.</p> : RECIPES.filter(recipe => (goods[recipe.id] ?? 0) > 0).map(recipe => <div key={recipe.id} className="goods-item"><span>{recipe.icon}</span><b>{recipe.name} ×{goods[recipe.id]}</b><small>개당 {goodsPrice(recipe).toLocaleString()}원</small><button onClick={() => sellGoods(recipe.id, 1)}>1개</button><button className="all" onClick={() => sellGoods(recipe.id, goods[recipe.id])}>전부 {(goodsPrice(recipe) * goods[recipe.id]).toLocaleString()}원</button></div>)}</div>
          </div>}
      </section>}

      {RAID_ENABLED && tab === "raid" && <section className="panel raid-panel">
        <div className="panel-heading"><div><span className="eyebrow">TOWER RAID · BETA</span><h3>월루탑 토벌 (베타)</h3></div><span className="plot-count">최고 {raid.highestFloor}층 · 1~{RAID_MAX_FLOOR}층 개방</span></div>
        <RaidPanel raid={raid} dishStock={dishStock} raidItems={raidItems} hold={bossMode || tab !== "raid"} avatar={avatar} forge={forge} onResult={applyRaidResult} onOpenGear={() => switchTab("equipment")} onOpenWorkshop={() => { setWorkshopView("raid"); switchTab("workshop"); }} />
      </section>}

      {HUNT_ENABLED && tab === "hunt" && <div className="game-grid">
        <section className="panel hunt-panel">
          <div className="panel-heading"><div><span className="eyebrow">HUNTING</span><h3>들판 사냥터</h3></div><span className="plot-count">{huntTicket > nowMs ? `🎫 남은 시간 ${formatClock(Math.ceil((huntTicket - nowMs) / 1000))}` : `🎫 입장권 ${HUNT_TICKET_PRICE.toLocaleString()}원 · ${HUNT_TICKET_MINUTES}분`}</span></div>
          <div className="hunt-weapons" role="radiogroup" aria-label="무기">{WEAPONS.map(item => <button key={item.id} role="radio" aria-checked={weaponId === item.id} className={weaponId === item.id ? "on" : ""} onClick={() => chooseWeapon(item)}><b>{item.icon}</b><span>{item.name}</span><small>데미지 {item.damage} · {item.cooldown}초</small><em>{weaponId === item.id ? "사용 중" : hasWeapon(item.id) ? "들기" : `${item.price.toLocaleString()}원`}</em></button>)}</div>
          {HUNT_TEST_UNLOCK_ALL && <p className="hint test-flag">🧪 로컬 테스트: 무기가 모두 열려 있어요(HUNT_TEST_UNLOCK_ALL).</p>}
          {huntTicket <= nowMs ? <div className="hunt-gate"><p>사냥터는 <b>입장권 {HUNT_TICKET_PRICE.toLocaleString()}원</b>을 내고 <b>{HUNT_TICKET_MINUTES}분</b> 동안 이용해요.{TEST_MODE ? " (테스트 모드: 무료)" : ""}</p><button className="save-button" onClick={buyHuntTicket} disabled={!TEST_MODE && money < HUNT_TICKET_PRICE}>🎫 입장하기 ({TEST_MODE ? "무료" : `${HUNT_TICKET_PRICE.toLocaleString()}원`})</button></div> :
          <HuntingGround quiet={quietMode} effectId={equipment.hunt} weapon={WEAPONS.find(item => item.id === weaponId) ?? WEAPONS[0]} paused={bossMode || tab !== "hunt" || huntTicket <= nowMs} petCatch={pets.has("dog") ? PET_BASE.dogCatch : pets.has("cat") ? PET_BASE.catCatch : 0} petName={pets.has("dog") ? "강아지" : "고양이"} lootName={id => { const loot = ALL_LOOT.find(item => item.id === id); return loot ? `${loot.icon} ${loot.name}` : id; }}
            onLoot={loot => { if (!Object.keys(loot).length) return; setHuntStock(stock => { const next = { ...stock }; Object.entries(loot).forEach(([id, n]) => { next[id] = (next[id] ?? 0) + n; }); return next; }); playCoinSound([660, 990]); }} />}
        </section>
        <aside className="panel hunt-bag">
          <div className="panel-heading"><div><span className="eyebrow">LOOT</span><h3>사냥 소재</h3></div></div>
          {Object.keys(huntStock).length === 0 ? <p className="empty">아직 모은 소재가 없어요.</p> : <ul className="hunt-loot">{ALL_LOOT.filter(loot => (huntStock[loot.id] ?? 0) > 0).map(loot => <li key={loot.id}><span>{loot.icon}</span><b>{loot.name}<small>{loot.price.toLocaleString()}원</small></b><em>×{huntStock[loot.id]}</em><span className="hunt-sell"><button onClick={() => sellLoot(loot.id, 1)}>1개</button><button className="all" onClick={() => sellLoot(loot.id, huntStock[loot.id] ?? 0)}>전부 {(loot.price * (huntStock[loot.id] ?? 0)).toLocaleString()}원</button></span></li>)}</ul>}
          <p className="hint">소재는 통합 인벤토리에 보관돼요. 지금은 상점에 팔 수 있고, 나중에 요리·토벌 장비에도 쓰여요.</p>
        </aside>
      </div>}

      {tab === "casino" && <div className="game-grid">
        <section className="panel casino-panel">
          <div className="panel-heading"><div><span className="eyebrow">BACK ALLEY</span><h3>뒷골목 도박장</h3></div></div>
          {/* 게임 고르기: 전체 폭 카드(아이콘·이름·배당 요약). 판이 진행 중이면 바꿀 수 없다. */}
          <div className="casino-games" role="tablist" aria-label="게임 고르기">{([
            ["parity", "🎲", "홀짝", `적중 ×${PAYOUT}`],
            ["slot", "🎰", "슬롯", `최대 ×${Math.max(...SLOT_SYMBOLS.map(symbol => symbol.triple))}`],
            ["blackjack", "🃏", "블랙잭", `승리 ×${BLACKJACK_WIN} · BJ ×${BLACKJACK_PAYOUT}`],
            ...(COIN_ENABLED ? [["coin", "🪙", "코인", "시세 사고팔기"]] as const : []),
          ] as const).map(([id, icon, name, note]) => <button key={id} role="tab" aria-selected={casinoGame === id} className={casinoGame === id ? "active" : ""} onClick={() => { setCasinoGame(id); setCasinoFx(null); }} disabled={Boolean(rolling) || slotSpinning > 0 || bj.phase === "player" || bj.phase === "dealer"}>
            <span className="casino-game-icon" aria-hidden="true">{icon}</span><b>{name}</b><small>{note}</small></button>)}</div>
          <CasinoDealer reaction={casinoFx} idleLine={dealerIdle} streak={casinoStats.streak}
            busy={Boolean(rolling) || slotSpinning > 0 || bj.phase === "player" || bj.phase === "dealer"}
            tension={casinoGame === "slot" && slotTension} />
          <div>
          {casinoGame === "coin" ? <CoinGame nowMs={nowMs} money={money} holdings={coinHoldings} onBuy={buyCoin} onSell={sellCoin} /> : casinoGame === "blackjack" ? <div className={`bj-table ${bj.outcome ?? ""}`}>
            {(() => { const hide = bj.phase === "player"; const cards = (list: Card[], hideSecond: boolean) => list.map((card, i) => hideSecond && i === 1 ? <span key={i} className="card back" /> : <span key={`${i}-${card.rank}${card.suit}`} className={`card ${card.suit === "♥" || card.suit === "♦" ? "red" : ""}`} style={{ animationDelay: `${i * 0.08}s` }}><b>{cardLabel(card)}</b><i>{card.suit}</i></span>);
              return <>
                <div className="bj-hand"><small>딜러 {bj.dealer.length ? (hide ? `${handValue([bj.dealer[0]]).total} + ?` : handValue(bj.dealer).total) : ""}</small><div>{bj.dealer.length ? cards(bj.dealer, hide) : <span className="card back" />}</div></div>
                <p className="dice-result">{bj.phase === "idle" ? "21에 가깝게! 넘으면 버스트" : bj.phase === "player" ? "히트? 스탠드?" : bj.phase === "dealer" ? "딜러 차례…" : { blackjack: `블랙잭!! +${(bj.payout ?? 0).toLocaleString()}원`, win: `승리! +${(bj.payout ?? 0).toLocaleString()}원`, push: "무승부 (판돈 반환)", lose: `패배! -${bj.bet.toLocaleString()}원`, bust: `버스트!! -${bj.bet.toLocaleString()}원` }[bj.outcome ?? "push"]}</p>
                <div className="bj-hand"><div>{bj.player.length ? cards(bj.player, false) : <span className="card back" />}</div><small>나 {bj.player.length ? handValue(bj.player).total : ""}{bj.player.length && handValue(bj.player).soft ? " (소프트)" : ""}</small></div>
              </>; })()}
          </div> : casinoGame === "slot" ? <>
          <div className={`slot-machine ${slotTension ? "tension" : ""} ${slotSpinning ? "spinning" : lastSlot ? (lastSlot.payout ? "win" : "lose") : ""}`}>
            <div className="slot-top">★ 월루 잭팟 ★</div>
            <div className="slot-reels">{slotReels.map((icon, i) => <b key={i} className={i >= 3 - slotSpinning ? "blur" : ""}>{icon}</b>)}</div>
            <p className="dice-result">{slotTension ? "두근두근… 하나만 더…!!" : slotSpinning ? "드르르르…" : lastSlot ? (lastSlot.payout ? `${lastSlot.multiplier}배! +${lastSlot.payout.toLocaleString()}원` : `꽝! -${lastSlot.bet.toLocaleString()}원`) : "같은 그림 3개를 맞춰 보세요!"}</p>
          </div>
          </> : <>
          <div className={`dice-table ${rolling ? "rolling" : lastRoll ? (lastRoll.payout ? "win" : "lose") : ""}`}>
            <div className="dice-cup">{rolling ? <><b>🎲</b><b>🎲</b></> : lastRoll ? <><b>{DICE_FACES[lastRoll.dice[0] - 1]}</b><b>{DICE_FACES[lastRoll.dice[1] - 1]}</b></> : <><b>⚀</b><b>⚅</b></>}</div>
            <p className="dice-result">{rolling ? `${PARITY_NAME[rolling.pick]}에 ${rolling.bet.toLocaleString()}원… 데구르르` : lastRoll ? `합 ${lastRoll.dice[0] + lastRoll.dice[1]} · ${PARITY_NAME[lastRoll.result]} — ${lastRoll.payout ? `적중! +${lastRoll.payout.toLocaleString()}원` : `꽝! -${lastRoll.bet.toLocaleString()}원`}` : "주사위 두 개의 합이 홀일까, 짝일까?"}</p>
          </div>
          <div className="parity-buttons">
            <button className="odd" onClick={() => placeBet("odd")} disabled={Boolean(rolling) || money < bet}><b>홀</b><small>{bet.toLocaleString()}원 → {Math.floor(bet * PAYOUT).toLocaleString()}원</small></button>
            <button className="even" onClick={() => placeBet("even")} disabled={Boolean(rolling) || money < bet}><b>짝</b><small>{bet.toLocaleString()}원 → {Math.floor(bet * PAYOUT).toLocaleString()}원</small></button>
          </div>
          </>}
          </div>
          {casinoGame !== "coin" && <div className="bet-tray">
            <div className="bet-now"><small>판돈</small><b>{bet.toLocaleString()}원</b><em>{money > 0 ? `가진 돈의 ${Math.min(100, Math.round((bet / money) * 100))}%` : "가진 돈 없음"}</em></div>
            <div className="bet-chips" role="group" aria-label="판돈 고르기">
              {BET_PRESETS.map((amount, i) => <button key={amount} className={`chip chip-${i} ${bet === amount ? "on" : ""}`} onClick={() => setBet(amount)} disabled={Boolean(rolling) || slotSpinning > 0 || bj.phase === "player" || bj.phase === "dealer"} aria-pressed={bet === amount}>{amount >= 1000 ? `${amount / 1000}천` : amount}</button>)}
              <button className={`chip chip-allin ${bet === Math.max(MIN_BET, money) ? "on" : ""}`} onClick={() => setBet(Math.max(MIN_BET, money))} disabled={Boolean(rolling) || slotSpinning > 0 || bj.phase === "player" || bj.phase === "dealer"} title="가진 돈 전부" aria-pressed={bet === Math.max(MIN_BET, money)}>올인</button>
            </div>
            <label className="bet-input"><span>직접</span><input type="number" min={MIN_BET} step={10} value={bet} onChange={event => setBet(Math.max(MIN_BET, Math.floor(Number(event.target.value)) || MIN_BET))} aria-label="판돈(자유 입력)" disabled={Boolean(rolling) || slotSpinning > 0 || bj.phase === "player" || bj.phase === "dealer"} /></label>
          </div>}
          {casinoGame === "parity" && lastRoll && !lastRoll.payout && !rolling && <div className="revenge-row">
            <button onClick={() => placeBet(lastRoll.pick)} disabled={money < bet}>🔥 복수전! 다시 {PARITY_NAME[lastRoll.pick]}에 {bet.toLocaleString()}원</button>
            <button className="double" onClick={() => { setBet(Math.min(money, bet * 2)); }} disabled={money < bet * 2}>💥 판돈 2배</button>
          </div>}
          {casinoGame === "blackjack" && (bj.phase === "player" ? <div className="bj-actions">
            <button onClick={hitBlackjack}>🃏 히트</button>
            <button onClick={() => runDealer(bj.player, bj.dealer, bj.bet)}>✋ 스탠드</button>
            <button className="double" onClick={doubleBlackjack} disabled={bj.player.length !== 2 || money < bj.bet}>💥 더블다운</button>
          </div> : <button className={`lever-button ${bj.outcome === "lose" || bj.outcome === "bust" ? "revenge" : ""}`} onClick={dealBlackjack} disabled={bj.phase === "dealer" || money < bet}>{bj.outcome === "lose" || bj.outcome === "bust" ? "🔥 복수의 딜" : "🃏 카드 받기"} · {bet.toLocaleString()}원</button>)}
          {casinoGame === "slot" && <>
            <button className={`lever-button ${lastSlot && lastSlot.payout < lastSlot.bet ? "revenge" : ""}`} onClick={pullLever} disabled={slotSpinning > 0 || money < bet}>{lastSlot && lastSlot.payout < lastSlot.bet ? "🔥 복수의 레버" : "🎰 레버 당기기"} · {bet.toLocaleString()}원</button>
            <div className="slot-paytable">{SLOT_SYMBOLS.map(symbol => <span key={symbol.icon}>{symbol.icon}{symbol.icon}{symbol.icon}<b>×{symbol.triple}</b></span>)}<span title="체리 2개 + 아무 그림">🍒🍒❔<b>×{CHERRY_PAIR}</b></span></div>
          </>}
          {casinoGame !== "coin" && (() => { const [win, lose] = casinoGame === "parity" ? [PARITY_WIN_CHANCE, 1 - PARITY_WIN_CHANCE] : casinoGame === "slot" ? [slotOdds().anyWin, 1 - slotOdds().anyWin] : [BLACKJACK_ODDS.win, BLACKJACK_ODDS.lose];
            const push = casinoGame === "blackjack" ? BLACKJACK_ODDS.push : 0;
            return <div className="odds-bar" aria-label={`이길 확률 ${Math.round(win * 100)}%, 질 확률 ${Math.round(lose * 100)}%`}>
              <span className="win" style={{ flexGrow: win }}>이길 {Math.round(win * 100)}%</span>
              {push > 0 && <span className="push" style={{ flexGrow: push }}>무승부 {Math.round(push * 100)}%</span>}
              <span className="lose" style={{ flexGrow: lose }}>질 {Math.round(lose * 100)}%</span>
            </div>; })()}
          {casinoGame !== "coin" && <details className="casino-rules"><summary>⚠ 게임 속 돈으로만 하는 놀이예요 · 오래 하면 조금씩 잃어요 <em>규칙 자세히</em></summary>
            {casinoGame === "blackjack" && <p>21을 넘지 않고 딜러보다 높으면 ×{BLACKJACK_WIN} · 처음 두 장이 21이면 블랙잭 ×{BLACKJACK_PAYOUT} · 비기면 반환 · 딜러는 17 이상에서 멈춰요 · 더블다운: 판돈 2배로 딱 한 장 더</p>}
            <p>{casinoGame === "blackjack" ? "블랙잭은 딜러가 마지막에 카드를 받아 조금 유리해서" : casinoGame === "slot" ? `슬롯의 기대 환수율은 약 ${Math.round(slotReturnRate() * 100)}%라` : `홀짝은 이길 확률 ${Math.round(PARITY_WIN_CHANCE * 100)}% · 질 확률 ${100 - Math.round(PARITY_WIN_CHANCE * 100)}%에 배당 ×${PAYOUT}라`} 오래 하면 조금씩 잃게 돼요. 판돈은 {MIN_BET.toLocaleString()}원부터 가진 돈 전부까지 자유롭게 걸 수 있어요(올인 주의!).</p>
          </details>}
        </section>
        <aside className="panel casino-side">
          <div className="panel-heading"><div><span className="eyebrow">RECORD</span><h3>전적</h3></div></div>
          <div className="casino-stats">
            <span><small>적중</small><b>{casinoStats.wins}</b></span><span><small>꽝</small><b>{casinoStats.losses}</b></span>
            <span className={casinoStats.net >= 0 ? "plus" : "minus"}><small>누적 손익</small><b>{casinoStats.net >= 0 ? "+" : ""}{casinoStats.net.toLocaleString()}원</b></span>
            <span><small>현재</small><b>{casinoStats.streak > 0 ? `${casinoStats.streak}연승` : casinoStats.streak < 0 ? `${-casinoStats.streak}연패` : "-"}</b></span>
            <span><small>최고 연승</small><b>{casinoStats.best}</b></span>
            <span className="rate"><small>승률</small><b>{casinoStats.wins + casinoStats.losses ? `${Math.round((casinoStats.wins / (casinoStats.wins + casinoStats.losses)) * 100)}%` : "-"}</b><i style={{ width: `${casinoStats.wins + casinoStats.losses ? (casinoStats.wins / (casinoStats.wins + casinoStats.losses)) * 100 : 0}%` }} /></span>
          </div>
          <b className="history-title">최근 홀짝 결과</b>
          <div className="roll-history">{rollHistory.length === 0 ? <p>아직 기록이 없어요.</p> : rollHistory.map(roll => <span key={roll.at} className={`${roll.result} ${roll.payout ? "hit" : ""}`} title={`${roll.dice[0]}+${roll.dice[1]} · ${roll.payout ? "적중" : "꽝"}`}>{PARITY_NAME[roll.result]}</span>)}</div>
        </aside>
      </div>}

      {tab === "explore" && EXPLORE_ENABLED && <ExplorePanel exploration={exploration} season={season} guideLevel={village.facilityLevels["guide-office"] ?? 0}
        avatar={avatar} onStart={lunchCooking.enterRun} onCheckpoint={saveExploreCheckpoint} onFinish={finishExploration} onOpenStorage={() => { setShowMissions(false); setShowStorage(true); }} />}
      {tab === "village" && VILLAGE_ENABLED && !villageOpen && <section className="panel village-panel village-locked">
        <div className="panel-heading"><div><span className="eyebrow">VILLAGE · 잠김</span><h3>🔒 마을 복구</h3></div></div>
        <p>채집 탐험을 <b>3번</b> 마치면 무너진 마을을 복구할 수 있어요. (지금 {Math.min(3, exploration.totalRuns)}/3회)</p>
        <p className="hint">{explorationOpen ? "🧭 생활 → 탐험에서 새싹 숲길 탐험을 시작해 보세요." : "🧭 탐험은 텃밭 12칸을 갖거나 물고기를 한 마리 잡으면 열려요."}</p>
        {explorationOpen && EXPLORE_ENABLED && <button className="ghost-button small" onClick={() => switchTab("explore")}>🧭 탐험하러 가기</button>}
      </section>}
      {tab === "village" && VILLAGE_ENABLED && villageOpen && <VillagePanel village={village} inventory={inventory} money={money} options={lunchOptions}
        onDeliver={deliverVillage} onCancel={cancelVillage} onComplete={completeVillage} onOpenStorage={() => { setShowMissions(false); setShowStorage(true); }} />}
      {tab === "book" && <div className="book-kind" role="tablist" aria-label="도감 종류">{([["fish", "🐟 물고기 도감"], ["crop", "🌱 작물 도감"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={bookKind === id} className={bookKind === id ? "on" : ""} onClick={() => setBookKind(id)}>{label}</button>)}</div>}
      {tab === "book" && bookKind === "crop" && (() => {
        const shown: Season = bookSeason && bookSeason !== "special" ? bookSeason : season, list = CROPS.filter(crop => crop.seasons.includes(shown));
        const got = CROPS.filter(crop => cropLog[crop.id]?.n).length, seasonDone = list.every(crop => cropLog[crop.id]?.n), reward = FURNITURE.find(item => item.id === CROP_BOOK_REWARDS[shown])!, claimed = cropRewards.includes(shown);
        return <section className="panel crop-book book-page">
          <div className="panel-heading"><div><span className="eyebrow">CROP BOOK</span><h3>작물 도감</h3></div><span className="plot-count">전체 {got}/{CROPS.length} · {Math.round((got / CROPS.length) * 100)}%</span></div>
          <div className="book-seasons" role="tablist">{SEASONS.map(s => { const items = CROPS.filter(crop => crop.seasons.includes(s)), have = items.filter(crop => cropLog[crop.id]?.n).length;
            return <button key={s} role="tab" aria-selected={shown === s} className={`${shown === s ? "on" : ""} ${have === items.length ? "done" : ""}`} onClick={() => setBookSeason(s)}><b>{SEASON_ICON[s]} {s}</b><small>{have}/{items.length}{cropRewards.includes(s) ? " 🎁" : have === items.length ? " 완성!" : ""}</small><i style={{ width: `${(have / items.length) * 100}%` }} /></button>; })}</div>
          <div className={`crop-reward ${seasonDone ? (claimed ? "claimed" : "ready") : ""}`}><span className="crop-reward-art furniture-thumb" style={{ "--c": reward.color } as CSSProperties}><FurnitureArt id={reward.id} /></span>
            <span><b>{shown} 완성 보상 · {reward.name}</b><small>{claimed ? "받았어요! 🏡 나의 집 창고에서 마당에 놓을 수 있어요." : seasonDone ? "모두 수확했어요! 보상을 받으세요." : `${shown} 작물 ${list.length}종을 모두 한 번씩 수확하면 받을 수 있는 마당 장식이에요.`}</small></span>
            {seasonDone && !claimed && <button className="save-button" onClick={() => claimCropReward(shown)}>🎁 받기</button>}</div>
          <div className="book-grid">{list.map(crop => { const record = cropLog[crop.id];
            return <div key={crop.id} className={`book-card ${record?.n ? "caught" : ""}`}>
              <span className="book-icon">{record?.n ? crop.icon : <span className="silhouette">{crop.icon}</span>}</span>
              <b>{record?.n ? crop.name : "???"}</b>
              {record?.n ? <p className="crop-record"><span>수확 {record.n.toLocaleString()}개</span><span>최고 품질 {QUALITIES[record.best].name}{QUALITIES[record.best].stars ? ` ${QUALITIES[record.best].stars}` : ""}</span>{record.golden > 0 && <span>✨ 황금 {record.golden}번</span>}<span>최고 판매가 {record.top.toLocaleString()}원</span></p> : <p>{crop.seasons.join("·")} 작물 · 아직 수확하지 못했어요.</p>}
            </div>; })}</div>
        </section>; })()}
      {tab === "book" && bookKind === "fish" && (() => {
        const shown = bookSeason ?? season, special = shown === "special", list = [...(special ? SPECIAL_FISH : FISH.filter(fish => fish.season === shown))]
          .sort((a, b) => Number(a.rarity === "전설") - Number(b.rarity === "전설"));
        const allFish = [...FISH, ...SPECIAL_FISH], caught = allFish.filter(fish => fishLog[fish.id]).length, specialGot = SPECIAL_FISH.filter(fish => fishLog[fish.id]).length;
        return <section className="panel fish-book book-page">
          <div className="panel-heading"><div><span className="eyebrow">FISH BOOK</span><h3>물고기 도감</h3></div><span className="plot-count">전체 {caught}/{allFish.length} · {Math.round((caught / allFish.length) * 100)}%</span></div>
          <div className="book-seasons" role="tablist">{SEASONS.map(s => { const total = FISH.filter(fish => fish.season === s).length, got = FISH.filter(fish => fish.season === s && fishLog[fish.id]).length;
            return <button key={s} role="tab" aria-selected={shown === s} className={`${shown === s ? "on" : ""} ${got === total ? "done" : ""}`} onClick={() => setBookSeason(s)}><b>{SEASON_ICON[s]} {s}</b><small>{got}/{total}{got === total ? " 완성!" : ""}</small><i style={{ width: `${(got / total) * 100}%` }} /></button>; })}<button role="tab" aria-selected={special} className={`special ${special ? "on" : ""}`} onClick={() => setBookSeason("special")}><b>✨ 특별</b><small>{specialGot}/{SPECIAL_FISH.length} · 날씨·장소</small><i style={{ width: `${(specialGot / SPECIAL_FISH.length) * 100}%` }} /></button></div>
          <p className="hint">{special ? `특별 물고기는 계절과 상관없이 특정 날씨나 유료 낚시 장소에서만 잡혀요. 지금 날씨: ${wx.icon} ${wx.name}` : shown === season && isWorkTime ? `지금 ${season}에 잡히는 물고기예요.` : `${shown} 물고기는 ${shown} 계절에만 잡혀요.`}{fishMul > 1 ? ` · 희귀 확률 ×${fishMul.toFixed(1)}` : ""}</p>
          <div className="book-grid">{list.map(fish => { const count = fishLog[fish.id] ?? 0, hidden = !count && fish.rarity === "전설";
            return <div key={fish.id} className={`book-card ${count ? "caught" : ""} ${fish.rarity === "전설" ? "legend" : ""}`}>
              <span className="book-icon">{count && LEGEND_ART[fish.id] ? <span className={`legend-fish-art book ${LEGEND_ART[fish.id]}`} role="img" aria-label={fish.name} /> : count ? fish.icon : hidden ? "❓" : <span className="silhouette">{fish.icon}</span>}</span>
              <b>{hidden ? "???" : fish.name}</b><small className={`rarity rarity-${fish.rarity}`}>{fish.rarity}</small>
              <p>{count ? fish.note : hidden ? "전설 속 물고기. 아직 아무도 본 적이 없어요." : "아직 잡지 못했어요."}{"condition" in fish && <span className="book-condition">{String(fish.condition)}</span>}</p>
              <em>{count ? `🎣 ${count}마리 · ${fish.price.toLocaleString()}원` : `${fish.price.toLocaleString()}원`}</em>
            </div>; })}</div>
        </section>;
      })()}

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
            {selectedItem && isResizable(selectedItem) && <div className="rotate-row size-row" role="group" aria-label="러그 크기">
              {(["sx", "sz"] as const).map(axis => <label key={axis}>{axis === "sx" ? "가로" : "세로"}<input type="range" min={RUG_SCALE.min} max={RUG_SCALE.max} step={RUG_SCALE.step} value={selectedItem[axis] ?? 1} onChange={event => updateItem(selectedItem.instanceId, { [axis]: Number(event.target.value) })} aria-label={`러그 ${axis === "sx" ? "가로" : "세로"} 크기`} /><b>×{(selectedItem[axis] ?? 1).toFixed(1)}</b></label>)}
              <button onClick={() => updateItem(selectedItem.instanceId, { sx: undefined, sz: undefined })}>원래 크기</button>
            </div>}
            {selectedItem && <div className="tint-row" role="group" aria-label="가구 색상">{TINTS.map(color => <button key={color} className={`tint ${(selectedItem.tint ?? selectedItem.color) === color ? "on" : ""}`} style={{ background: color }} onClick={() => updateItem(selectedItem.instanceId, { tint: color })} aria-label={`색상 ${color}`} />)}<button className="tint reset" onClick={() => updateItem(selectedItem.instanceId, { tint: undefined })} aria-label="기본 색상">↺</button><button className="tint more" onClick={() => setShowPicker(on => !on)} aria-label="더 많은 색" aria-expanded={showPicker} style={{ background: selectedItem.tint ?? selectedItem.color }}>🎨</button></div>}
            {selectedItem && showPicker && <ColorPicker key={selectedItem.instanceId} value={selectedItem.tint ?? selectedItem.color} onChange={hex => updateItem(selectedItem.instanceId, { tint: hex })} onClose={() => setShowPicker(false)} />}
            {selectedItem?.pet && <>{selectedItem.rare ? <span className="pet-info">{selectedItem.icon} <b>{PET_BUFFS[selectedItem.id].title}</b> {PET_BUFFS[selectedItem.id].text}</span> : <span className="pet-info">{selectedItem.icon} 일반 펫 · 능력 없음</span>}<button onClick={() => { setCheer({ id: selectedItem.instanceId, at: performance.now() }); setNotice(`${selectedItem.icon} ${josa(selectedItem.name, "이가")} 기분이 좋아 폴짝 뛰었어요! 💕`); }}>💕 쓰다듬기</button></>}
            {selectedItem && <><button onClick={storeFurniture}>📦 창고 보관</button>{isSellable(selectedItem) ? <button className="sell-button" onClick={sellFurniture}>{selectedItem.pet ? "되팔기" : "판매"} (50%)</button> : <button className="sell-button" disabled title={UNSELLABLE_NOTICE}>🎖️ 기념품 · 판매 불가</button>}</>}
            {selectedFurniture === AVATAR_ID && <><button onClick={() => setShowAvatar(true)}>🪞 아바타 이미지 바꾸기</button>{stories > 1 && avatarPos.story !== viewStory && <button onClick={() => setAvatarPos({ x: 0, z: 0, story: viewStory })}>🧍 아바타를 {viewStory + 1}층으로</button>}</>}
          </div>
          <p className="room-help">가구 끌기: 이동 · 가구 선택 후 휠: 회전(Shift+휠 5°) · 빈 곳 끌기: 시점 회전 · 선택 없이 휠: 확대/축소 · 방향키: 미세 이동 · Q/E: 15° 회전. 카메라 쪽 벽은 자동으로 낮아져 안이 보여요.</p>
        </section>
        <aside className="shop-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">COUNTRY SHOP</span><h3>시골 가구점</h3></div></div>
          <div className="shop-tabs" role="tablist">{([["furniture", "가구"], ["decor", "벽 장식"], ["structure", "구조"], ["yard", "마당"], ["pet", "🐾 내 펫"], ["interior", "인테리어"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={shopTab === id} className={shopTab === id ? "active" : ""} onClick={() => setShopTab(id)}>{label}</button>)}</div>
          {shopTab === "interior" ? <div className="theme-shop">
            {([["wall", "벽지", WALLPAPERS, wallpaper], ["floor", "바닥재", FLOORS, floor]] as const).map(([kind, title, themes, current]) => <section key={kind}><b>{title}</b><div>{themes.map(theme => { const owned = ownsItem(ownedThemes, `${kind}:${theme.id}`);
              return <button key={theme.id} className={current === theme.id ? "on" : ""} onClick={() => buyTheme(kind, theme)}><i style={{ background: theme.swatch }} /><span>{theme.name}</span><small>{current === theme.id ? "사용 중" : owned ? "보유" : `${theme.price.toLocaleString()}원`}</small></button>; })}</div></section>)}
          </div> : <>
            {shopTab === "pet" && <div className="pet-manager">
              <p className="hint">상점에서 뽑은 펫이에요. 먹이·산책·교감은 <b>🐾 펫</b> 탭에서 해요. 집에 둔 펫만 돌아다니고 능력 효과가 적용돼요. 같은 종류는 몇 마리가 있어도 효과가 한 번만 적용돼요. 새 펫은 <b>🛍️ 상점</b>에서 뽑을 수 있어요.</p>
              {[...placed, ...warehouse].filter(item => item.pet).length === 0 ? <p className="empty">아직 펫이 없어요. 가챠샵에서 첫 친구를 뽑아 보세요!</p> :
                <div className="pet-manage-list">{[...placed.filter(item => item.pet), ...warehouse.filter(item => item.pet)].map(item => { const home = placed.includes(item);
                  return <div key={item.instanceId} className={`${item.legend ? "legend" : item.rare ? "rare" : ""} ${home ? "home" : "stored"}`}>
                    <span className="furniture-thumb" style={{ "--c": item.tint ?? item.color } as CSSProperties}><FurnitureArt id={item.id} /></span>
                    <span><b>{item.nickname || item.name}</b>{item.nickname && <small>종류: {item.name}</small>}{item.legend && <em>전설</em>}{item.rare && <em>능력</em>}<small>{!(item.rare || item.legend) ? "일반 펫 · 능력 없음" : home && placed.find(entry => entry.id === item.id) !== item ? "중복 · 같은 펫 효과는 한 번만 적용돼요" : `${PET_BUFFS[item.id].title} Lv${petLevel(item.id)} · ${petAbility(item.id, petLevel(item.id), true)}`}</small></span>
                    <button onClick={() => renamePet(item)}>✏️ 이름</button>
                    <button onClick={() => toggleWarehouseLock(item)}>{item.locked ? "🔒 잠금 해제" : "🔓 판매 잠금"}</button>
                    <button className={home ? "out" : "in"} onClick={() => (home ? storePet(item) : restoreFurniture(item))}>{home ? "📦 보관하기" : "🏡 집에 두기"}</button>
                  </div>; })}</div>}
            </div>}
            {shopTab === "yard" && <div className="theme-shop structure-shop"><section><b>마당 넓히기</b><div>{YARD_SIZES.map(size => <button key={size.level} className={yardLevel === size.level ? "on" : ""} onClick={() => size.level === yardLevel + 1 ? expandYard() : undefined} disabled={size.level > yardLevel + 1}><i className="yard-icon" style={{ transform: `scale(${0.55 + size.level * 0.15})` }} /><span>{size.name}</span><small>{size.level <= yardLevel ? "보유" : `${size.price.toLocaleString()}원`}</small></button>)}</div></section><b>마당 소품 · 집 바깥 잔디 위에만 놓여요</b></div>}
            {shopTab === "structure" && <div className="theme-shop structure-shop"><section><b>2층 올리기 · {SECOND_FLOOR_PRICE.toLocaleString()}원</b><div><button className={stories > 1 ? "on" : ""} onClick={buildSecondFloor} disabled={houseLevel < 3 && stories < 2}><i className="shape-icon shape-two" /><span>{stories > 1 ? "2층 보기" : "2층 증축"}</span><small>{stories > 1 ? "완료 · 계단 포함" : houseLevel < 3 ? "18평부터 가능" : "계단·창문 포함"}</small></button></div></section><section><b>방 구조 리모델링 · {REMODEL_PRICE.toLocaleString()}원</b><div>{SHAPES.map(shape => <button key={shape.id} className={houseShape === shape.id ? "on" : ""} onClick={() => remodel(shape.id)}><i className={`shape-icon shape-${shape.id}`} /><span>{shape.name}</span><small>{houseShape === shape.id ? "현재 구조" : shape.note}</small></button>)}</div></section><b>문·창문·가벽</b></div>}
            {shopTab !== "pet" && <div className="furniture-list">{shopItems.map(item => <button key={item.id} onClick={() => buyFurniture(item)}><span className="furniture-thumb" style={{ "--c": item.color } as CSSProperties}><FurnitureArt id={item.id} /></span><span><b>{item.name}</b><small>{item.price.toLocaleString()}원</small></span><i>＋</i></button>)}</div>}
          </>}
          <section className="warehouse"><div className="warehouse-heading"><span>📦 MY STORAGE</span><b>가구·펫 창고 <em>{warehouse.length}</em></b></div>{warehouse.length === 0 ? <p>보관한 가구와 펫이 없어요.</p> : <div className="warehouse-list">{warehouse.map(item => <div key={item.instanceId}><span className="furniture-thumb" style={{ "--c": item.tint ?? item.color } as CSSProperties}><FurnitureArt id={item.id} /></span><b>{item.nickname || item.name}</b>{item.pet && <button onClick={() => renamePet(item)}>✏️ 이름</button>}<button onClick={() => toggleWarehouseLock(item)} title={item.locked ? "잠금 해제" : "판매 잠금"}>{item.locked ? "🔒" : "🔓"}</button><button onClick={() => restoreFurniture(item)}>꺼내기</button>{isSellable(item) ? <button className="sell-mini" onClick={() => sellWarehouseFurniture(item)} disabled={item.locked}>{item.locked ? "잠금됨" : `${Math.round(item.price * 0.5).toLocaleString()}원에 판매`}</button> : <button className="sell-mini" disabled title={UNSELLABLE_NOTICE}>기념품 · 판매 불가</button>}</div>)}</div>}</section>
        </aside>
      </div>}


      <section className="bottom-dock">
        <div className="message"><span>✦ 농장 소식</span><p>{notice}</p></div>
        <div className="music"><div className="record">♪</div><div><span>FARM RADIO</span><strong>{musicId ? "YouTube BGM 재생 중" : "농장에 음악을 틀어주세요"}</strong></div><input value={musicUrl} onChange={e => setMusicUrl(e.target.value)} placeholder="YouTube 링크 붙여넣기" aria-label="YouTube 링크"/><button onClick={() => { const id = getYoutubeId(musicUrl); if (id) { setMusicId(id); setNotice("🎵 농장 라디오를 켰어요."); } else setNotice("올바른 YouTube 영상 링크를 넣어주세요."); }}>재생</button>{musicId && <button className="music-stop" onClick={() => { setMusicId(""); setNotice("🔇 농장 라디오를 껐어요."); }}>끄기</button>}</div>
      </section>
      {musicId && !bossMode && <iframe className="youtube-player" src={`https://www.youtube.com/embed/${musicId}?autoplay=1&loop=1&playlist=${musicId}`} title="농장 BGM" allow="autoplay; encrypted-media" />}

      {activeEvent && <div className="modal-backdrop"><section className="modal story-modal" role="dialog" aria-labelledby="story-title">
        <span className="eyebrow">VILLAGE STORY</span>
        <div className="story-icon">{activeEvent.event.icon}</div>
        <h3 id="story-title">{activeEvent.event.title}</h3>
        {activeEvent.result ? <>
          <p className="story-text">{activeEvent.result.text}</p>
          <div className="story-effects">
            {activeEvent.result.money ? <span className={activeEvent.result.money > 0 ? "good" : "bad"}>💰 {activeEvent.result.money > 0 ? "+" : ""}{activeEvent.result.money.toLocaleString()}원</span> : null}
            {activeEvent.result.buff && <span className={BUFF_INFO[activeEvent.result.buff.kind].good(activeEvent.result.buff.multiplier) ? "good" : "bad"}>{effectText(activeEvent.result.buff)}</span>}
            {!activeEvent.result.money && !activeEvent.result.buff && <span>별일 없이 지나갔어요.</span>}
          </div>
          <button className="save-button" onClick={closeEvent}>{activeEvent.result.buff ? "확인 · 효과 시작" : "다시 하루로"}</button>
        </> : <>
          <p className="story-text">{activeEvent.event.text}</p>
          <div className="story-choices">{activeEvent.event.choices.map((choice, index) => { const cost = choiceCost(index);
            return <button key={choice.label} onClick={() => chooseEventOption(index)} disabled={cost > money}><b>{index + 1}</b>{choice.label}{"chance" in choice.outcome && <small>운에 맡기기</small>}{cost > money && <small>돈이 부족해요</small>}</button>; })}</div>
        </>}
      </section></div>}

      {spotConfirm && <div className="modal-backdrop"><section className="modal spot-modal" role="dialog" aria-labelledby="spot-title">
        <div className="spot-modal-icon">{spotConfirm.icon}</div>
        <h3 id="spot-title">{spotConfirm.name}에 입장할까요?</h3>
        <p>입장권 <b>{spotConfirm.price.toLocaleString()}원</b> · {spotConfirm.minutes}분 동안 낚시할 수 있어요.<br />{spotConfirm.note}{SPECIAL_FISH.some(fish => fish.spot === spotConfirm.id) ? ` · 이곳에서만 ${SPECIAL_FISH.find(fish => fish.spot === spotConfirm.id)!.name}이(가) 잡혀요` : ""}</p>
        <div className="spot-modal-actions"><button className="ghost-button" onClick={() => setSpotConfirm(null)}>그만두기</button><button className="save-button" onClick={() => chooseSpot(spotConfirm)} disabled={money < spotConfirm.price}>{money < spotConfirm.price ? "돈이 모자라요" : `🎫 입장권 사고 입장 (${spotConfirm.price.toLocaleString()}원)`}</button></div>
      </section></div>}

      {cookingBatch && lunchRecipe(cookingBatch.dishId) && <div className="modal-backdrop storage-backdrop"><section className="modal cook-modal" role="dialog" aria-modal="true" aria-label="도시락 조리">
        <CookingGame key={cookingBatch.batchId} title={`${lunchRecipe(cookingBatch.dishId)!.name} ${cookingBatch.quantity}개`} icon={lunchRecipe(cookingBatch.dishId)!.icon} initialResults={cookingBatch.results} onStepComplete={lunchCooking.progress} onFinish={lunchCooking.finish} />
        <p>단계마다 저장돼요. 새로고침해도 이어서 만들 수 있어요.</p><button className="ghost-button" onClick={lunchCooking.cancel}>조리 취소 · 재료 반환 없음</button>
      </section></div>}
      {(cooking || cookResult) && <div className="modal-backdrop storage-backdrop"><section className="modal cook-modal" role="dialog" aria-modal="true" aria-label="요리">
        {cooking ? <CookingGame key={cooking.at} title={cooking.dish.name} icon={cooking.dish.icon} onFinish={finishCooking} /> : cookResult && (() => { const [normal, good, best] = gradeChances(cookResult.score);
          return <div className={`cook-result grade-${cookResult.grade}`}>
            <span className="cook-result-icon">{cookResult.dish.icon}</span>
            <h3>{cookResult.grade === 2 ? "✨ 일품 요리 완성!" : cookResult.grade === 1 ? "맛있게 됐어요! ★" : "요리 완성"}</h3>
            <p><b>{cookResult.dish.name} {DISH_GRADES[cookResult.grade].stars} {DISH_GRADES[cookResult.grade].name}</b><br />토벌탑에서 먹으면 {dishEffectText(cookResult.dish, cookResult.grade)}</p>
            <small>타이밍 점수 {cookResult.score}/6 → 이번 확률: 일품 {Math.round(best * 100)}% · 맛있음 {Math.round(good * 100)}% · 보통 {Math.round(normal * 100)}%<br />🎒 사냥 가방에 넣었어요.</small>
            <button className="save-button" onClick={() => setCookResult(null)}>주방으로</button>
          </div>; })()}
      </section></div>}

      {showMissions && <div className="modal-backdrop storage-backdrop"><section className="modal storage-modal missions-modal" role="dialog" aria-modal="true" aria-labelledby="missions-title">
        <button className="modal-close" onClick={() => setShowMissions(false)} aria-label="미션 닫기 (M)">×</button>
        <div className="orders-view big">
            <div className="panel-heading"><div><span className="eyebrow">DAILY MISSIONS</span><h3 id="missions-title">농사·낚시 공용 미션</h3></div><span className="plot-count">{doneToday.length}/{orders.length} 완료</span></div>
            <p className="hint">농산물과 물고기를 통합 창고에서 납품해요. 필요한 수량은 📜 미션 예약으로 자동 보호되어 판매할 수 없어요.</p>
            <div className="order-list">{orders.map(order => { const done = doneToday.includes(order.id), canDeliver = !done && order.items.every(item => depositedFor(order, item) + orderHave(item) >= item.count), canDeposit = !done && order.items.some(item => depositedFor(order, item) < item.count && orderHave(item) > 0);
              return <article key={order.id} className={`order ${order.special ? "special" : ""} ${done ? "done" : ""} ${canDeliver ? "ready" : ""}`}>
                <div className="order-head"><span className="order-npc">{order.npc.icon}</span><div><b>{order.npc.name}{order.special && <em>특별</em>}</b><small>“{order.line}”</small></div></div>
                <ul className="order-items">{order.items.map(item => { const deposited = depositedFor(order, item), have = Math.min(item.count, deposited + orderHave(item)); const crop = item.kind === "crop" ? CROPS.find(c => c.id === item.cropId) : undefined; const fish = item.kind === "fish" ? ALL_FISH.find(f => f.id === item.fishId) : undefined;
                  return <li key={item.kind === "crop" ? item.cropId : item.fishId} className={have >= item.count ? "ok" : ""}><span>{crop ? `${crop.icon} ${crop.name}${item.kind === "crop" && item.minQuality > 0 ? ` ${QUALITIES[item.minQuality].stars} 이상` : ""}` : `${fish?.icon ?? "🐟"} ${fish?.name ?? "물고기"}`}</span><small>{deposited > 0 ? `선납 ${deposited} · ` : ""}{crop ? crop.seasons.join("·") : "낚시"}</small><b>{done ? item.count : have}/{item.count}</b></li>; })}</ul>
                <div className="order-foot"><span className="order-reward">💰 {order.reward.toLocaleString()}원{order.bonus && <small> + {bonusLabel(order)}</small>}</span>
                  <button onClick={() => depositOrder(order)} disabled={!canDeposit}>{done ? "✅ 납품 완료" : canDeliver ? "📜 전부 납품" : canDeposit ? "📦 보유분 미리 납품" : "재료 모으는 중"}</button></div>
              </article>; })}</div>
          </div>
      </section></div>}

      {showStorage && <div className="modal-backdrop storage-backdrop"><section className="modal storage-modal" role="dialog" aria-modal="true" aria-labelledby="storage-title">
        <button className="modal-close" onClick={() => setShowStorage(false)} aria-label="창고 닫기 (E)">×</button>
        <div className="storage-view big">
            <div className="panel-heading"><div><span className="eyebrow">GLOBAL STORAGE · E</span><h3 id="storage-title">농사·낚시·사냥 통합 창고</h3></div><span className="market-timer">{formatClock(marketSecondsLeft)}</span></div>
            <div className="harvest-mode" role="group" aria-label="수확한 작물 처리"><span>🌾 농사</span>
              <button aria-pressed={harvestMode === "sell"} className={harvestMode === "sell" ? "on" : ""} onClick={() => harvestMode !== "sell" && toggleHarvestMode()}>💰 바로 판매</button>
              <button aria-pressed={harvestMode === "store"} className={harvestMode === "store" ? "on" : ""} onClick={() => harvestMode !== "store" && toggleHarvestMode()}>📦 창고 보관</button></div>
            <div className="harvest-mode" role="group" aria-label="잡은 물고기 처리"><span>🎣 낚시</span>
              <button aria-pressed={fishHarvestMode === "sell"} className={fishHarvestMode === "sell" ? "on" : ""} onClick={() => setFishHarvestMode("sell")}>💰 바로 판매</button>
              <button aria-pressed={fishHarvestMode === "store"} className={fishHarvestMode === "store" ? "on" : ""} onClick={() => setFishHarvestMode("store")}>📦 창고 보관</button></div>
            <div className="storage-cap"><span>📦 {storageUsed.toLocaleString()} / {storageCap.toLocaleString()}개</span><span className="field-meter"><i style={{ width: `${Math.min(100, (storageUsed / storageCap) * 100)}%` }} /></span></div>
            <input className="storage-search" type="search" value={storageQuery} onChange={event => setStorageQuery(event.target.value)} placeholder="🔍 이름으로 찾기 (작물·물고기·소재·채집물)" aria-label="창고 검색" />
            {/* 사냥 소재: 같은 통합 인벤토리(hunt:)에 있고 보관 수량은 따로(창고 용량을 쓰지 않음) */}
            {ALL_LOOT.some(loot => (huntStock[loot.id] ?? 0) > 0) && (() => { const loots = ALL_LOOT.filter(loot => (huntStock[loot.id] ?? 0) > 0 && matchesStorageQuery(loot.name)); if (!loots.length) return null; const total = loots.reduce((sum, loot) => sum + (huntStock[loot.id] ?? 0), 0), worth = loots.reduce((sum, loot) => sum + loot.price * (huntStock[loot.id] ?? 0), 0);
              return <details className="hunt-store"><summary><b>🏹 사냥 소재</b><span>{loots.length}종 · {total}개 · 약 {worth.toLocaleString()}원</span><small>창고 용량을 쓰지 않아요 · 눌러서 펼치기</small></summary>
                <div className="hunt-store-grid">{loots.map(loot => { const n = huntStock[loot.id] ?? 0; return <div key={loot.id} className="hunt-chip"><span className="hunt-chip-icon">{loot.icon}</span><span className="hunt-chip-info"><b>{loot.name}</b><small>{loot.price.toLocaleString()}원 · ×{n}</small></span>
                  <span className="hunt-chip-sell"><button onClick={() => sellLoot(loot.id, 1)}>1</button><button className="all" onClick={() => sellLoot(loot.id, n)} title={`전부 ${(loot.price * n).toLocaleString()}원`}>전부</button></span></div>; })}</div></details>; })()}
            {/* 채집물(forage:): 창고 용량을 함께 쓰고 고정 저가로 판다(LIFE_CONTENT_EXPANSION_SPEC 6·7절) */}
            {(() => { const items = FORAGE.filter(item => (forageStock[item.id] ?? 0) > 0 && matchesStorageQuery(item.name)); if (!items.length) return null;
              const total = items.reduce((sum, item) => sum + (forageStock[item.id] ?? 0), 0);
              return <details className="hunt-store forage-store" open><summary><b>🧺 채집물</b><span>{items.length}종 · {total}개</span><small>창고 용량을 함께 써요 · 고정가 판매</small></summary>
                <div className="hunt-store-grid">{items.map(item => { const n = forageStock[item.id] ?? 0, locked = Boolean(itemLocks[forageKey(item.id)]);
                  return <div key={item.id} className={`hunt-chip forage-chip ${locked ? "locked" : ""}`}><button className="item-lock" onClick={() => toggleItemLock(forageKey(item.id))} aria-pressed={locked} title={locked ? "잠금 해제(팔 수 있게)" : "잠그기(판매·제작·납품에서 제외)"}>{locked ? "🔒" : "🔓"}</button><span className="hunt-chip-icon">{item.icon}</span><span className="hunt-chip-info"><b>{item.name}{item.rare && <em className="forage-rare"> 희귀</em>}</b><small>{item.price.toLocaleString()}원 · ×{n}</small></span>
                    <span className="hunt-chip-sell">{locked ? <em className="fish-locked-note">잠금</em> : <><button onClick={() => sellForage(item.id, 1)}>1</button><button className="all" onClick={() => sellForage(item.id, n)} title={`전부 ${(item.price * n).toLocaleString()}원`}>전부</button></>}</span></div>; })}</div></details>; })()}
            {storageUsed === 0 ? <p className="empty">창고가 비었어요. “📦 창고 보관”을 고르고 수확하면 여기 쌓여요. 보관 중인 작물은 썩지 않으니 시세가 좋을 때 파세요!</p> : <>
              {EXPLORE_ENABLED && <LunchBag query={storageQuery} inventory={inventory} locks={itemLocks} onEat={lunchCooking.eat} onLock={toggleItemLock} />}
              {Object.entries(fishStock).filter(([, count]) => count > 0).length > 0 && (() => { const stored = Object.entries(fishStock).filter(([, count]) => count > 0).map(([id, count]) => ({ fish: ALL_FISH.find(item => item.id === id), id, count, reserved: fishReserved[id] ?? 0 })).filter(entry => entry.fish && matchesStorageQuery(entry.fish.name)).sort((a, b) => b.fish!.price * b.count - a.fish!.price * a.count); if (!stored.length) return null;
                return <div className="fish-store"><b className="tool-shop-sub">🎣 보관한 물고기 · {stored.reduce((sum, entry) => sum + entry.count, 0)}마리</b><div className="fish-grid">{stored.map(({ fish, id, count, reserved }) => { const free = count - reserved;
                  const locked = Boolean(fishLocks[id]);
                  return <div key={id} className={`fish-card rarity-${fish!.rarity} ${locked ? "locked" : ""}`}><button className="fish-lock" onClick={() => setFishLocks(all => ({ ...all, [id]: !locked }))} aria-pressed={locked} title={locked ? "잠금 해제(팔 수 있게)" : "잠그기(팔기·요리에서 제외)"}>{locked ? "🔒" : "🔓"}</button><span className="fish-card-icon">{fish!.icon}</span><span className="fish-card-info"><b>{fish!.name} <em>×{count}</em></b><small>{fish!.rarity} · 마리당 {fish!.price.toLocaleString()}원</small>{reserved > 0 && <i className="reserve-tag">📜 미션 예약 {reserved}</i>}</span>
                    <span className="fish-card-actions">{locked ? <em className="fish-locked-note">🔒 잠금 중</em> : <><button onClick={() => sellStoredFish(id, 1)} disabled={free < 1}>1마리</button><button className="all" onClick={() => sellStoredFish(id, free)} disabled={free < 1}>{free}마리 · {(fish!.price * free).toLocaleString()}원</button></>}</span></div>; })}</div></div>; })()}
              <div className="storage-tools">
                <select value={storageSort} onChange={event => setStorageSort(event.target.value as typeof storageSort)} aria-label="정렬"><option value="value">가치순</option><option value="count">수량순</option><option value="name">이름순</option></select>
                {([["all", "전체"], ["order", "📜 주문 재료"], ["calm", "📈 포화 아님"], ["golden", "✨ 황금"]] as const).map(([id, label]) => <button key={id} className={storageFilter === id ? "on" : ""} onClick={() => setStorageFilter(id)} aria-pressed={storageFilter === id}>{label}</button>)}
              </div>
              <div className="storage-list">{storageBoxes.length === 0 ? <p className="empty">이 조건에 맞는 작물이 없어요.</p> : storageBoxes.map(box => <div key={box.crop.id} className={`crop-box ${box.trend.best ? "best" : ""}`}>
                <div className="crop-box-head"><span className="stack-icon">{box.crop.icon}</span>
                  <span className="stack-info"><b>{box.crop.name} <em>×{box.total}</em>{box.reservedCount > 0 && <i className="reserve-tag">📜 주문 예약 {box.reservedCount}</i>}</b>
                    <small>{box.trend.label}{box.sat > 0 ? <b className="sat-badge"> · 📉 포화 -{box.sat}%</b> : box.free < FREE_PER_CYCLE ? <b className="free-badge"> · 정상가 {box.free}개 남음</b> : null}</small>
                    <span className="spark" aria-hidden="true">{box.trend.history.map((value, i) => <i key={i} className={i === box.trend.history.length - 1 ? "now" : ""} style={{ height: `${20 + ((value - box.trend.min) / Math.max(1, box.trend.max - box.trend.min)) * 80}%` }} />)}</span></span></div>
                <ul className="quality-rows">{box.rows.map(row => <li key={row.key} className={`${row.golden ? "golden" : ""} ${row.locked ? "locked" : ""}`}>
                  <button className="lock" onClick={() => toggleLock(row.key)} aria-pressed={row.locked} title={row.locked ? "잠금 해제(팔 수 있게)" : "잠그기(전부 팔기·농협 출하에서 제외)"}>{row.locked ? "🔒" : "🔓"}</button>
                  <span className="q-name">{row.golden ? "✨ 황금" : row.quality.name}{row.quality.stars ? ` ${row.quality.stars}` : ""}</span>
                  <span className="q-count">{row.count}개{row.reserved > 0 && <small> (예약 {row.reserved})</small>}</span>
                  <span className="q-price">개당 {row.unit.toLocaleString()}원</span>
                  <span className="q-actions"><button onClick={() => sellProduce(row.key, 1)} disabled={row.sellable < 1}>1개</button><button className="all" onClick={() => sellProduce(row.key, row.sellable)} disabled={row.sellable < 1}>{row.sellable}개 팔기</button></span>
                </li>)}</ul>
                <div className="crop-box-foot"><span>팔 수 있는 {box.sellableCount}개 · 약 {box.value.toLocaleString()}원</span><button onClick={() => setSellConfirm({ kind: "coop", cropId: box.crop.id })} disabled={box.sellableCount < 1}>🏦 이 작물만 농협 출하</button></div>
              </div>)}</div>
              <button className="save-button sell-all" onClick={() => setSellConfirm({ kind: "market" })}>💰 창고 전부 팔기 <small>(잠금·주문 예약분 제외)</small></button>
              <button className="ghost-button coop-button" onClick={() => setSellConfirm({ kind: "coop" })}>🏦 농협 일괄 출하 <small>(시세의 {Math.round(COOP_RATE * 100)}%, 포화 없음, 잠금·예약분 제외)</small></button>
            </>}
            <div className="field-shop"><div><b>📦 창고 넓히기</b><small>{storageCap >= STORAGE_MAX ? "최대 크기" : `${storagePrice(storageCap).toLocaleString()}원 · +${STORAGE_STEP}개 (${storageCap}/${STORAGE_MAX})`}</small><span className="field-meter"><i style={{ width: `${(storageCap / STORAGE_MAX) * 100}%` }} /></span></div><button onClick={expandStorage} disabled={storageCap >= STORAGE_MAX}>구매</button></div>
            <p className="hint">농산물과 물고기가 같은 총 보관 수량을 사용해요. 잠금은 품질과 관계없이 직접 선택하며, 오늘 미션에 필요한 수량은 📜 예약되어 판매에서 빠져요.</p>
          </div>
      </section></div>}

      {sellConfirm && sellPreview && <div className="modal-backdrop"><section className="modal sell-modal" role="dialog" aria-labelledby="sell-title">
        <h3 id="sell-title">{sellConfirm.kind === "coop" ? "🏦 농협 출하" : "💰 창고 전부 팔기"}{sellConfirm.cropId ? ` · ${CROPS.find(c => c.id === sellConfirm.cropId)?.name ?? ""}` : ""}</h3>
        {sellPreview.count ? <p><b>{sellPreview.count}개</b>를 약 <b>{sellPreview.amount.toLocaleString()}원</b>에 {sellConfirm.kind === "coop" ? `팔아요(시세 ${Math.round(COOP_RATE * 100)}%, 포화 없음).` : "시장에 팔아요(포화 슬롯 적용)."}</p> : <p>지금 팔 수 있는 작물이 없어요.</p>}
        <ul className="sell-keep">{sellPreview.lockedCount > 0 && <li>🔒 잠금 {sellPreview.lockedCount}개는 남겨 둬요</li>}{sellPreview.reservedCount > 0 && <li>📜 오늘 주문 예약 {sellPreview.reservedCount}개는 남겨 둬요</li>}</ul>
        <div className="spot-modal-actions"><button className="ghost-button" onClick={() => setSellConfirm(null)}>그만두기</button><button className="save-button" onClick={confirmSell} disabled={!sellPreview.count}>{sellConfirm.kind === "coop" ? "출하하기" : "팔기"}</button></div>
      </section></div>}

      {showBailout && <div className="modal-backdrop"><section className="modal bailout-modal" role="dialog" aria-labelledby="bailout-title">
        <div className="neogul-bailout"><NeogulMascot mood="help" /></div>
        <h3 id="bailout-title">월루 지원금</h3>
        <p className="bailout-line">“ㅋㅋㅋ 진짜 다 잃었어? 거지 농부 탄생~<br />옛다, 300원. 불쌍해서 주는 거야. 오늘만이다?”</p>
        <p className="bailout-taunt">“이걸로도 모자라면 🎣 낚시터 가서 <b>맨손으로</b> 물고기나 잡아 와~<br />미끼 살 돈도 없잖아? ㅋㅋㅋㅋ”</p>
        <div className="offwork-summary"><span>지원금 (하루 1번)</span><b className="plus">+{BAILOUT_AMOUNT.toLocaleString()}원</b></div>
        <p className="bailout-tip">🌱 싼 씨앗부터 심거나, 🎣 강가에서 미끼 없이 맨손 낚시로도 벌 수 있어요.</p>
        <div className="spot-modal-actions"><button className="ghost-button" onClick={() => { takeBailout(); setSelectedBait(BARE_HAND.id); goBareFishing(); }}>받고 맨손 낚시하러 가기 🫳</button><button className="save-button" onClick={takeBailout}>…고맙게 받기 🙏</button></div>
      </section></div>}

      {offWork && <div className="modal-backdrop offwork-backdrop"><section className="modal offwork-modal" role="dialog" aria-labelledby="offwork-title">
        <div className="offwork-confetti" aria-hidden="true">{["🎉", "✨", "🎊", "💼", "🏃", "🎉", "✨", "🍻", "🎊", "🌙"].map((icon, i) => <i key={i} style={{ left: `${5 + i * 9.5}%`, animationDelay: `${(i % 5) * 0.15}s` }}>{icon}</i>)}</div>
        <div className="offwork-avatar">{avatarImg}</div>
        <h3 id="offwork-title" className="offwork-title">월루~~~!!</h3>
        <p className="offwork-sub">{endHour}:00, 퇴근 시간이에요! 🏃💨<br />오늘도 월급 루팡 대성공~</p>
        <div className="offwork-summary"><span>오늘 {offWork.earned >= 0 ? "번 돈" : "쓴 돈"}</span><b className={offWork.earned >= 0 ? "plus" : "minus"}>{offWork.earned >= 0 ? "+" : "-"}{Math.abs(offWork.earned).toLocaleString()}원</b></div>
        <button className="save-button" onClick={() => setOffWork(null)}>퇴근하기 🏃‍♂️</button>
      </section></div>}

      {showAccount && <div className="modal-backdrop"><section className="modal account-modal" role="dialog" aria-labelledby="account-title">
        <button className="modal-close" onClick={() => { setShowAccount(false); setPendingLoad(null); }} aria-label="닫기">×</button>
        <span className="eyebrow">ACCOUNT</span><h3 id="account-title">{pendingLoad ? "저장된 게임 불러오기" : session ? `👤 ${session.id}` : "계정"}</h3>
        {pendingLoad ? <>
          <p>{pendingLoad.conflict ? <><b>⚠️ 계정에 저장된 게임이 이 기기의 게임과 달라요.</b> 다른 기기에서 진행했을 수 있어서, 덮어쓰지 않도록 자동 저장을 멈췄어요. 어느 쪽으로 할지 골라 주세요.</> : "이 계정에 저장된 게임이 있어요."}<br /><b>마지막 저장 {new Date(pendingLoad.updatedAt).toLocaleString("ko-KR")}</b>{saveSummary(pendingLoad.save) ? ` · 보유 자금 ${saveSummary(pendingLoad.save)!.money.toLocaleString()}원` : ""}</p>
          <p className="account-warn">불러오면 이 기기의 지금 진행 상황(보유 자금 {money.toLocaleString()}원)은 계정의 게임으로 바뀌어요. (이 기기 게임은 백업해 둬요)</p>
          <div className="account-actions">
            <button className="save-button" onClick={() => applyCloudSave(pendingLoad.save, pendingLoad.session, pendingLoad.updatedAt)}>☁️ 계정 게임 불러오기</button>
            <button className="ghost-button" onClick={() => { if (!window.confirm(`계정에 저장된 게임(보유 자금 ${(saveSummary(pendingLoad.save)?.money ?? 0).toLocaleString()}원)을 지우고 이 기기의 게임으로 바꿀까요? 되돌릴 수 없어요.`)) return; const next = pendingLoad.session; writeSession(next); setSession(next); setPendingLoad(null); setShowAccount(false); accountCall({ action: "save", token: next.token, save: packSave(), force: true }).then(reply => { lastSynced.current = packSave(); setCloudAt(reply.updatedAt ?? Date.now()); writeCloudBase(next.id, reply.updatedAt ?? Date.now()); cloudChecked.current = true; cloudConflict.current = false; setNotice("☁️ 이 기기의 게임을 계정에 저장했어요."); }).catch(error => setNotice(`☁️ 저장하지 못했어요: ${(error as Error).message}`)); }}>이 기기 게임을 계정에 덮어쓰기</button>
            <button className="ghost-button" onClick={() => { setPendingLoad(null); if (!session) setShowAccount(false); }}>{pendingLoad.conflict ? "나중에 고르기 (자동 저장 멈춤)" : session ? "취소" : "취소 (로그인 안 함)"}</button>
          </div>
        </> : session ? <>
          <p>로그인 중이에요. 진행 상황이 {CLOUD_SYNC_SECONDS}초마다 계정에 자동 저장돼요.<br />다른 기기(웹·위젯)에서 같은 아이디로 로그인하면 이어서 할 수 있어요.</p>
          <p className="account-sync">☁️ {cloudAt ? `마지막 저장 ${new Date(cloudAt).toLocaleTimeString("ko-KR")}` : "아직 이번 접속에서 저장 전"}</p>
          <div className="account-actions">
            <button className="save-button" onClick={() => syncRef.current(true)} disabled={accountBusy}>지금 저장</button>
            <button className="ghost-button" onClick={reloadFromCloud} disabled={accountBusy}>계정에서 다시 불러오기</button>
            <button className="ghost-button" onClick={logout} disabled={accountBusy}>로그아웃</button>
          </div>
        </> : <>
          <div className="account-tabs" role="tablist">{(["login", "register"] as const).map(mode => <button key={mode} role="tab" aria-selected={accountMode === mode} className={accountMode === mode ? "on" : ""} onClick={() => { setAccountMode(mode); setAccountError(""); }}>{mode === "login" ? "로그인" : "새 계정 만들기"}</button>)}</div>
          <p>{accountMode === "login" ? "아이디로 로그인하면 계정에 저장된 게임을 불러올 수 있어요." : "이메일 같은 개인정보는 받지 않아요. 아이디와 비밀번호만 정하면, 지금 진행 상황이 계정에 저장돼요."}</p>
          <form className="account-form" onSubmit={submitAccount}>
            <label>아이디<input value={accountForm.id} onChange={event => setAccountForm(form => ({ ...form, id: event.target.value }))} autoComplete="username" placeholder="영어 소문자·숫자·_ 3~20자" maxLength={20} required /></label>
            <label>비밀번호<input type="password" value={accountForm.password} onChange={event => setAccountForm(form => ({ ...form, password: event.target.value }))} autoComplete={accountMode === "login" ? "current-password" : "new-password"} placeholder="4자 이상" minLength={4} maxLength={64} required /></label>
            {accountMode === "register" && <label>비밀번호 확인<input type="password" value={accountForm.confirm} onChange={event => setAccountForm(form => ({ ...form, confirm: event.target.value }))} autoComplete="new-password" minLength={4} maxLength={64} required /></label>}
            <button className="save-button" type="submit" disabled={accountBusy}>{accountBusy ? "잠시만요…" : accountMode === "login" ? "로그인" : "계정 만들고 지금 게임 저장"}</button>
          </form>
          {accountMode === "register" && <p className="account-warn">⚠ 비밀번호를 잊으면 찾을 방법이 없어요(개인정보를 받지 않기 때문이에요).</p>}
        </>}
        {accountError && <p className="account-error" role="alert">{accountError}</p>}
      </section></div>}

      {showAvatar && <div className="modal-backdrop" onClick={() => setShowAvatar(false)}><section className="modal avatar-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setShowAvatar(false)}>×</button>
        <span className="eyebrow">MY AVATAR</span><h3>내 아바타</h3>
        <p>상단 프로필, 낚시터, 3D 집에 나오는 내 캐릭터예요. 아래에서 고르거나, 좋아하는 캐릭터 이미지를 <b>PNG(배경 투명)</b>로 올려 주세요(최대 5MB, 256px로 줄여 저장).</p>
        <div className="avatar-preview">{avatarImg}</div>
        <div className="avatar-presets" role="group" aria-label="기본 캐릭터">
          <button className={avatar.src === DEFAULT_AVATAR ? "on" : ""} onClick={resetAvatar} aria-label="농부 고양이(기본)"><img src={DEFAULT_AVATAR} alt="" /></button><button className={avatar.src === BLACKCAT_AVATAR ? "on" : ""} onClick={() => { const next = { src: BLACKCAT_AVATAR, pixelated: false }; setAvatar(next); try { localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(next)); } catch { /* 이번 접속에서만 */ } setNotice("🐈‍⬛ 검은 고양이로 바꿨어요."); }} aria-label="검은 고양이"><img src={BLACKCAT_AVATAR} alt="" /></button><button className={avatar.src === PIXEL_CAT_AVATAR ? "on" : ""} onClick={() => { const next = { src: PIXEL_CAT_AVATAR, pixelated: true }; setAvatar(next); try { localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(next)); } catch { /* 이번 접속에서만 */ } setNotice("🐱 픽셀 고양이로 바꿨어요."); }} aria-label="픽셀 고양이"><img src={PIXEL_CAT_AVATAR} alt="" className="pixelated" /></button>
          {PRESET_AVATARS.map(preset => <button key={preset.id} className={avatar.preset === preset.id ? "on" : ""} onClick={() => pickPresetAvatar(preset)} aria-label={preset.name} title={preset.name}>{preset.emoji}</button>)}
        </div>
        <input ref={avatarInput} type="file" accept="image/png,.png" hidden onChange={event => uploadAvatar(event.target.files?.[0])} />
        <div className="avatar-actions"><button className="save-button" onClick={() => avatarInput.current?.click()}>🖼️ 내 캐릭터 PNG 올리기</button><button className="ghost-button" onClick={resetAvatar} disabled={avatar.src === DEFAULT_AVATAR}>기본 검은 고양이로</button></div>
      </section></div>}

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowSettings(false)}>×</button><span className="eyebrow">TIME SETTINGS</span><h3>농장 운영 시간</h3><p>운영 시간을 네 구간으로 나눠 봄·여름·가을·겨울이 흘러가요. 시간을 바꾸면 계절 구간이 달라져 심어 둔 작물이 시들 수 있어요.</p><label>시작 시간 <strong>{startHour}:00</strong><input type="range" min="0" max="20" value={startHour} onChange={e => { const v = Number(e.target.value); setStartHour(v); if (endHour <= v + 4) setEndHour(Math.min(24, v + 4)); }} /></label><label>종료 시간 <strong>{endHour}:00</strong><input type="range" min="4" max="24" value={endHour} onChange={e => setEndHour(Math.max(startHour + 4, Number(e.target.value)))} /></label><div className="time-preview">{SEASONS.map((s, i) => <span key={s}>{SEASON_ICON[s]} {s}<b>{toClock(startHour + (endHour-startHour)/4*i)}—{toClock(startHour + (endHour-startHour)/4*(i+1))}</b></span>)}</div><div className="boss-theme"><b>🙈 ESC 위장 화면</b><div>{BOSS_MODES.map(mode => <button key={mode.id} className={bossTheme === mode.id ? "on" : ""} onClick={() => setBossTheme(mode.id)}><span>{mode.icon}</span>{mode.name}<small>{mode.id === "office" ? "엑셀 실적표" : mode.id === "dev" ? "코드 에디터 + 터미널" : "디자인 툴 캔버스"}</small></button>)}</div></div><label className="notify-toggle"><input type="checkbox" checked={notifyOffWork} onChange={event => toggleOffWorkNotify(event.target.checked)} /><span>🔔 퇴근 시간(종료 {endHour}:00)과 10분 전에 <b>브라우저 알림</b>으로도 알려 주기<small>화면 안의 &ldquo;월루~~&rdquo; 퇴근 팝업은 항상 떠요</small></span></label><div className="settings-save"><b>☁️ 계정 저장</b>{TEST_MODE ? <small>로컬 테스트 모드에서는 계정에 저장하지 않아요.</small> : session ? <><small>{session.id} · {CLOUD_SYNC_SECONDS}초마다 바뀐 내용을 자동 저장 · {cloudAt ? `마지막 저장 ${new Date(cloudAt).toLocaleTimeString("ko-KR")}` : "이번 접속에서 아직 저장 전"}</small><button className="save-button" onClick={() => syncRef.current(true)}>💾 지금 저장</button></> : <><small>로그인하지 않으면 이 기기(브라우저)에만 저장돼요.</small><button className="ghost-button" onClick={() => { setShowSettings(false); setShowAccount(true); }}>👤 로그인하기</button></>}</div><button className="ghost-button guide-replay" onClick={() => { setShowSettings(false); goGuide(0); }}>📖 기능 가이드 다시 보기</button><button className="save-button" onClick={() => setShowSettings(false)}>이 시간으로 농사짓기</button></section></div>}
      {guideStep !== null && GUIDE_STEPS[guideStep] && (() => { const step = GUIDE_STEPS[guideStep], last = guideStep === GUIDE_STEPS.length - 1;
        return <aside className={`guide-card ${step.target ? "" : "center"}`} role="dialog" aria-labelledby="guide-title" aria-live="polite">
          <div className="guide-head"><span className="guide-icon">{step.icon}</span><span className="guide-count">{guideStep + 1} / {GUIDE_STEPS.length}</span><button className="guide-skip" onClick={closeGuide}>건너뛰기 ✕</button></div>
          <h3 id="guide-title">{step.title}</h3>
          <p>{step.body}</p>
          <div className="guide-dots" aria-hidden="true">{GUIDE_STEPS.map((_, i) => <i key={i} className={i === guideStep ? "on" : i < guideStep ? "done" : ""} />)}</div>
          <div className="guide-actions">{guideStep > 0 && <button className="ghost-button" onClick={() => goGuide(guideStep - 1)}>← 이전</button>}<button className="save-button" onClick={() => (last ? closeGuide() : goGuide(guideStep + 1))}>{last ? "시작하기 🌱" : guideStep === 0 ? "둘러보기 →" : "다음 →"}</button></div>
        </aside>; })()}
      {guideStep !== null && !GUIDE_STEPS[guideStep]?.target && <div className="guide-dim" aria-hidden="true" />}

      {bossMode && <BossScreen mode={bossTheme} />}
    </main>
  );
}
