"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Season = "봄" | "여름" | "가을" | "겨울";
type Crop = { id: string; name: string; icon: string; seasons: Season[]; seed: number; sell: number; seconds: number; difficulty: string };
type Plot = { cropId: string; plantedAt: number } | null;
type Furniture = { id: string; name: string; icon: string; price: number; color: string };
type PlacedItem = Furniture & { instanceId: string; x: number; y: number; rotation: number };
type HarvestFx = { id: number; plotIndex: number; icon: string; amount: number };

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

const FURNITURE: Furniture[] = [
  { id: "chair", name: "원목 의자", icon: "🪑", price: 500, color: "#d89c63" },
  { id: "plant", name: "몬스테라", icon: "🪴", price: 750, color: "#81a96b" },
  { id: "lamp", name: "스탠드 조명", icon: "💡", price: 900, color: "#e9c75d" },
  { id: "sofa", name: "폭신 소파", icon: "🛋️", price: 1600, color: "#c78979" },
  { id: "bed", name: "포근한 침대", icon: "🛏️", price: 2200, color: "#8ba5bc" },
  { id: "piano", name: "업라이트 피아노", icon: "🎹", price: 3800, color: "#57514f" },
];

const initialPlots: Plot[] = Array(8).fill(null);

function marketPrice(crop: Crop, bucket: number) {
  const seed = [...crop.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const wave = ((seed * 97 + bucket * 53) % 201) / 1000;
  return Math.round(crop.sell * (0.9 + wave));
}

function playCoinSound() {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx();
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
  [880, 1320].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.08);
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.08);
    oscillator.stop(context.currentTime + 0.42);
  });
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

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState<"farm" | "home">("farm");
  const [money, setMoney] = useState(1500);
  const [plots, setPlots] = useState<Plot[]>(initialPlots);
  const [selectedCrop, setSelectedCrop] = useState("potato");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [houseLevel, setHouseLevel] = useState(1);
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [ownedPlots, setOwnedPlots] = useState(8);
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [harvestFx, setHarvestFx] = useState<HarvestFx[]>([]);
  const [notice, setNotice] = useState("오늘도 흙은 정직해요. 씨앗을 심어볼까요?");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicId, setMusicId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("four-seasons-farm");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setMoney(data.money ?? 1500); setPlots(data.plots ?? initialPlots); setStartHour(data.startHour ?? 9);
        setEndHour(data.endHour ?? 18); setHouseLevel(data.houseLevel ?? 1); setOwnedPlots(data.ownedPlots ?? 8);
        setPlaced((data.placed ?? []).map((item: PlacedItem) => ({ ...item, x: item.x > 10 ? item.x : 14 + item.x * 14, y: item.y > 10 ? item.y : 20 + item.y * 28, rotation: item.rotation ?? 0 })));
        setMusicId(data.musicId ?? "");
      } catch { /* start fresh */ }
    }
    setLoaded(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("four-seasons-farm", JSON.stringify({ version: 2, money, plots, startHour, endHour, houseLevel, ownedPlots, placed, musicId }));
  }, [money, plots, startHour, endHour, houseLevel, ownedPlots, placed, musicId, loaded]);

  const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const isWorkTime = currentHour >= startHour && currentHour < endHour;
  const seasonIndex = isWorkTime ? Math.min(3, Math.floor(((currentHour - startHour) / (endHour - startHour)) * 4)) : -1;
  const season: Season = seasonIndex >= 0 ? SEASONS[seasonIndex] : SEASONS[Math.min(3, Math.floor(((Math.max(startHour, Math.min(endHour - .01, currentHour)) - startHour) / (endHour - startHour)) * 4))] || "봄";
  const seasonStart = seasonIndex >= 0 ? startHour + ((endHour - startHour) / 4) * seasonIndex : startHour;
  const seasonEnd = seasonIndex >= 0 ? seasonStart + (endHour - startHour) / 4 : endHour;
  const seasonProgress = isWorkTime ? Math.max(0, Math.min(100, ((currentHour - seasonStart) / (seasonEnd - seasonStart)) * 100)) : 0;
  const available = CROPS.filter(c => c.seasons.includes(season));
  const plotCount = ownedPlots;
  const roomCols = houseLevel === 1 ? 4 : houseLevel === 2 ? 5 : 6;
  const marketBucket = Math.floor(now.getTime() / 300000);
  const marketSecondsLeft = 300 - Math.floor((now.getTime() / 1000) % 300);

  useEffect(() => {
    if (!available.some(c => c.id === selectedCrop)) setSelectedCrop(available[0]?.id || "potato");
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps

  const timeLabel = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const nextSeason = seasonIndex >= 0 && seasonIndex < 3 ? SEASONS[seasonIndex + 1] : "휴식";
  const toClock = (hour: number) => `${String(Math.floor(hour)).padStart(2,"0")}:${String(Math.round((hour % 1) * 60)).padStart(2,"0")}`;

  function plant(index: number) {
    if (!isWorkTime) return setNotice(`농장은 ${startHour}:00에 문을 열어요. 시간 설정에서 바꿀 수 있어요.`);
    const crop = CROPS.find(c => c.id === selectedCrop)!;
    if (!crop.seasons.includes(season)) return setNotice(`${crop.name}은 ${crop.seasons.join("·")} 작물이에요.`);
    if (money < crop.seed) return setNotice("씨앗을 살 돈이 부족해요. 익은 작물을 수확해 보세요.");
    const next = [...plots]; next[index] = { cropId: crop.id, plantedAt: Date.now() };
    setPlots(next); setMoney(m => m - crop.seed); setNotice(`${crop.icon} ${crop.name}을(를) 심었어요. ${crop.seconds}초 뒤 수확해요!`);
  }

  function harvest(index: number, plot: NonNullable<Plot>, crop: Crop) {
    const progress = (Date.now() - plot.plantedAt) / 1000 / crop.seconds;
    if (progress < 1) return setNotice(`${crop.name}이(가) 아직 자라는 중이에요. 조금만 기다려주세요.`);
    const salePrice = marketPrice(crop, marketBucket);
    const fx = { id: Date.now(), plotIndex: index, icon: crop.icon, amount: salePrice };
    const next = [...plots]; next[index] = null; setPlots(next); setMoney(m => m + salePrice);
    setHarvestFx(items => [...items, fx]); window.setTimeout(() => setHarvestFx(items => items.filter(item => item.id !== fx.id)), 1100);
    playCoinSound();
    setNotice(`짤랑~ ${crop.icon} ${crop.name}을(를) 오늘 시세 ${salePrice.toLocaleString()}원에 팔았어요!`);
  }

  function expandField() {
    const price = 2400 + (ownedPlots - 8) * 700;
    if (ownedPlots >= 16) return setNotice("밭은 이미 최대 크기예요.");
    if (money < price) return setNotice(`밭 두 칸을 넓히려면 ${price.toLocaleString()}원이 필요해요.`);
    setMoney(value => value - price); setOwnedPlots(value => value + 2);
    setPlots(current => [...current, null, null]);
    setNotice(`🌱 밭 두 칸을 새로 샀어요! 이제 ${ownedPlots + 2}칸에서 농사지을 수 있어요.`);
  }

  function upgradeHouse() {
    const price = houseLevel === 1 ? 4500 : 9000;
    if (houseLevel >= 3) return setNotice("집은 이미 가장 넓어요!");
    if (money < price) return setNotice(`증축하려면 ${price.toLocaleString()}원이 필요해요.`);
    setMoney(m => m - price); setHouseLevel(l => l + 1); setNotice("🔨 증축 완료! 방과 텃밭이 함께 넓어졌어요.");
  }

  function buyFurniture(item: Furniture) {
    if (money < item.price) return setNotice(`${item.name}을(를) 사려면 ${item.price.toLocaleString()}원이 필요해요.`);
    const instanceId = `${item.id}-${Date.now()}`;
    const offset = (placed.length * 11) % 52;
    setMoney(m => m - item.price); setPlaced(p => [...p, { ...item, instanceId, x: 24 + offset, y: 42 + (placed.length % 2) * 22, rotation: 0 }]);
    setSelectedFurniture(instanceId);
    setNotice(`${item.icon} ${item.name}을(를) 집에 배치했어요.`);
  }

  function dragFurniture(event: React.PointerEvent<HTMLButtonElement>, instanceId: string) {
    const room = roomRef.current; if (!room) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = room.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(91, ((event.clientY - rect.top) / rect.height) * 100));
    setSelectedFurniture(instanceId);
    setPlaced(items => items.map(item => item.instanceId === instanceId ? { ...item, x, y } : item));
  }

  function rotateFurniture(direction: number) {
    if (!selectedFurniture) return;
    setPlaced(items => items.map(item => item.instanceId === selectedFurniture ? { ...item, rotation: (item.rotation + direction + 360) % 360 } : item));
  }

  function sellFurniture() {
    if (!selectedFurniture) return;
    const item = placed.find(furniture => furniture.instanceId === selectedFurniture);
    if (!item) return;
    const refund = Math.round(item.price * 0.5);
    setPlaced(items => items.filter(item => item.instanceId !== selectedFurniture));
    setMoney(value => value + refund); setSelectedFurniture(null);
    setNotice(`${item.icon} ${item.name}을(를) 정리하고 ${refund.toLocaleString()}원을 돌려받았어요.`);
  }

  const cropCards = useMemo(() => available.map(crop => (
    <button key={crop.id} className={`crop-card ${selectedCrop === crop.id ? "selected" : ""}`} onClick={() => setSelectedCrop(crop.id)} aria-pressed={selectedCrop === crop.id}>
      <span className="crop-icon">{crop.icon}</span><span className="crop-name">{crop.name}</span>
      <span className="crop-meta">씨앗 {crop.seed}원 · {crop.seconds}초</span>
      <span className="crop-price"><small>현재 시세</small>{marketPrice(crop, marketBucket).toLocaleString()}원</span>
    </button>
  )), [available, selectedCrop, marketBucket]);

  return (
    <main className={`app season-${seasonIndex >= 0 ? seasonIndex : 4}`}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">田</span><div><h1>사계농가</h1><p>오늘 심고, 천천히 사는 집</p></div></div>
        <div className="status-cluster">
          <div className="status-card money"><span>💰 보유 자금</span><strong>{money.toLocaleString()}원</strong></div>
          <div className="status-card clock"><span>🕰 {timeLabel}</span><strong>{isWorkTime ? `${SEASON_ICON[season]} 지금은 ${season}` : "🌙 농장 휴식"}</strong></div>
          <div className="status-card market-status"><span>📈 다음 시세</span><strong>{Math.floor(marketSecondsLeft / 60)}:{String(marketSecondsLeft % 60).padStart(2, "0")}</strong></div>
          <button className="icon-button" onClick={() => setShowSettings(true)} aria-label="시간 설정">⚙</button>
        </div>
      </header>

      <section className="season-strip">
        <div className="season-copy"><span className="eyebrow">REAL-TIME SEASON</span><h2>{isWorkTime ? `${season}의 농장` : "오늘의 농사가 끝났어요"}</h2><p>{isWorkTime ? `${toClock(seasonStart)}—${toClock(seasonEnd)} · 다음은 ${nextSeason}` : `${startHour}:00—${endHour}:00 사이에 농사를 지을 수 있어요`}</p></div>
        <div className="season-track" aria-label="오늘의 계절 진행도">
          {SEASONS.map((s, i) => <div key={s} className={`season-step ${i === seasonIndex ? "active" : ""}`}><span>{SEASON_ICON[s]}</span><b>{s}</b></div>)}
          <div className="season-fill" style={{ width: `${seasonIndex < 0 ? 0 : (seasonIndex * 25) + seasonProgress / 4}%` }} />
        </div>
      </section>

      <nav className="tabs" aria-label="게임 공간">
        <button className={tab === "farm" ? "active" : ""} onClick={() => setTab("farm")}>🌱 텃밭</button>
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>🏡 나의 집</button>
      </nav>

      {tab === "farm" ? <div className="game-grid">
        <section className="farm-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">MY FIELD</span><h3>햇살 텃밭</h3></div><span className="plot-count">{plots.filter(Boolean).length}/{plotCount} 재배 중</span></div>
          <div className={`plots plots-${plotCount}`}>
            {Array.from({ length: plotCount }).map((_, index) => {
              const plot = plots[index] || null; const crop = plot ? CROPS.find(c => c.id === plot.cropId)! : null;
              const progress = plot && crop ? Math.min(100, ((now.getTime() - plot.plantedAt) / 1000 / crop.seconds) * 100) : 0;
              return <button key={index} className={`plot ${progress >= 100 ? "ready" : ""}`} onClick={() => plot && crop ? harvest(index, plot, crop) : plant(index)}>
                {crop ? <><span className="plant">{progress < 35 ? "🌱" : progress < 75 ? "🌿" : crop.icon}</span><span className="plot-label">{progress >= 100 ? "수확하기" : `${Math.floor(progress)}%`}</span><span className="grow-bar"><i style={{ width: `${progress}%` }} /></span></> : <><span className="soil-lines">╱ ╱ ╱</span><span className="plot-label">심기</span></>}
                {harvestFx.filter(fx => fx.plotIndex === index).map(fx => <span className="harvest-fx" key={fx.id}><b>{fx.icon}</b><i>＋{fx.amount.toLocaleString()}원</i><em>✦</em><em>✦</em><em>●</em></span>)}
              </button>;
            })}
          </div>
        </section>
        <aside className="seed-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">SEED BOX · 5분 시세</span><h3>{season} 씨앗 상자</h3></div><span className="market-timer">{Math.floor(marketSecondsLeft / 60)}:{String(marketSecondsLeft % 60).padStart(2, "0")}</span></div>
          <p className="hint">한국의 노지 재배 시기를 바탕으로 고른 작물이에요.</p>
          <div className="crop-list">{cropCards}</div>
          <div className="field-shop"><div><b>🌾 밭 두 칸 확장</b><small>{ownedPlots >= 16 ? "최대 확장 완료" : `${(2400 + (ownedPlots - 8) * 700).toLocaleString()}원 · 최대 16칸`}</small></div><button onClick={expandField} disabled={ownedPlots >= 16}>구매</button></div>
          <div className="tip">💡 판매가는 기준가의 ±10% 범위에서 5분마다 바뀌어요.</div>
        </aside>
      </div> : <div className="home-grid">
        <section className="house-panel panel">
          <div className="panel-heading"><div><span className="eyebrow">MY COTTAGE</span><h3>{["", "작은 농가", "햇살 가득 농가", "꿈의 전원주택"][houseLevel]}</h3></div><button className="upgrade" onClick={upgradeHouse}>{houseLevel >= 3 ? "최대 증축" : `증축 ${houseLevel === 1 ? "4,500" : "9,000"}원`}</button></div>
          <div ref={roomRef} className={`room level-${houseLevel}`} style={{ gridTemplateColumns: `repeat(${roomCols}, 1fr)` }} onPointerDown={event => { if (event.target === event.currentTarget) setSelectedFurniture(null); }}>
            {Array.from({length: roomCols * 3}).map((_, i) => <div className="floor-tile" key={i} />)}
            <div className="window">☁️<span>☀️</span></div><div className="rug" />
            {placed.map(item => <button key={item.instanceId} className={`placed-item ${selectedFurniture === item.instanceId ? "selected" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%`, background: item.color, transform: `translate(-50%, -50%) rotate(${item.rotation}deg)` }} onPointerDown={event => dragFurniture(event, item.instanceId)} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) dragFurniture(event, item.instanceId); }} aria-label={`${item.name} 이동`}><span>{item.icon}</span></button>)}
          </div>
          <div className="decor-toolbar"><span>{selectedFurniture ? "선택한 가구 편집" : "가구를 선택해 보세요"}</span><button onClick={() => rotateFurniture(-45)} disabled={!selectedFurniture}>↶ 왼쪽 회전</button><button onClick={() => rotateFurniture(45)} disabled={!selectedFurniture}>↷ 오른쪽 회전</button><button className="store-button" onClick={sellFurniture} disabled={!selectedFurniture}>판매 (50%)</button></div>
          <p className="room-help">가구를 마우스나 손가락으로 자유롭게 끌어 놓고, 선택 후 45°씩 회전할 수 있어요.</p>
        </section>
        <aside className="shop-panel panel"><div className="panel-heading"><div><span className="eyebrow">COUNTRY SHOP</span><h3>시골 가구점</h3></div></div><div className="furniture-list">{FURNITURE.map(item => <button key={item.id} onClick={() => buyFurniture(item)}><span className="furniture-icon">{item.icon}</span><span><b>{item.name}</b><small>{item.price.toLocaleString()}원</small></span><i>＋</i></button>)}</div></aside>
      </div>}

      <section className="bottom-dock">
        <div className="message"><span>✦ 농장 소식</span><p>{notice}</p></div>
        <div className="music"><div className="record">♪</div><div><span>FARM RADIO</span><strong>{musicId ? "YouTube BGM 재생 중" : "농장에 음악을 틀어주세요"}</strong></div><input value={musicUrl} onChange={e => setMusicUrl(e.target.value)} placeholder="YouTube 링크 붙여넣기" aria-label="YouTube 링크"/><button onClick={() => { const id = getYoutubeId(musicUrl); if (id) { setMusicId(id); setNotice("🎵 농장 라디오를 켰어요."); } else setNotice("올바른 YouTube 영상 링크를 넣어주세요."); }}>재생</button></div>
      </section>
      {musicId && <iframe className="youtube-player" src={`https://www.youtube.com/embed/${musicId}?autoplay=1&loop=1&playlist=${musicId}`} title="농장 BGM" allow="autoplay; encrypted-media" />}

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowSettings(false)}>×</button><span className="eyebrow">TIME SETTINGS</span><h3>농장 운영 시간</h3><p>운영 시간을 네 구간으로 나눠 봄·여름·가을·겨울이 흘러가요.</p><label>시작 시간 <strong>{startHour}:00</strong><input type="range" min="0" max="20" value={startHour} onChange={e => { const v = Number(e.target.value); setStartHour(v); if (endHour <= v + 4) setEndHour(Math.min(24, v + 4)); }} /></label><label>종료 시간 <strong>{endHour}:00</strong><input type="range" min="4" max="24" value={endHour} onChange={e => setEndHour(Math.max(startHour + 4, Number(e.target.value)))} /></label><div className="time-preview">{SEASONS.map((s, i) => <span key={s}>{SEASON_ICON[s]} {s}<b>{toClock(startHour + (endHour-startHour)/4*i)}—{toClock(startHour + (endHour-startHour)/4*(i+1))}</b></span>)}</div><button className="save-button" onClick={() => setShowSettings(false)}>이 시간으로 농사짓기</button></section></div>}
    </main>
  );
}
