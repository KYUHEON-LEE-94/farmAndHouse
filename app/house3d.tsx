"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STORY_HEIGHT, WALL_HEIGHT, fitsInRoom, fitsInYard, wallInfo, yardBounds, type PlacedItem, type Room } from "./house";

export type AvatarState = { src: string; pixelated: boolean; x: number; z: number; story: number };
type Palette = { sky: string; grass: string; leaf: string };
type Props = {
  items: PlacedItem[]; room: Room; wallpaper: string; floor: string; night: boolean; palette: Palette; avatar: AvatarState;
  stories: number; viewStory: number; yardLevel: number; cheer?: { id: string; at: number };
  selectedId: string | null; onSelect: (id: string | null) => void; onMove: (id: string, patch: Partial<PlacedItem>) => void; onAvatarMove: (x: number, z: number) => void;
};
type Wall = { group: THREE.Group; inner: THREE.Mesh; normal: [number, number]; mid: [number, number]; full: boolean; story: number };
type Scene = {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls;
  hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight; shell: THREE.Group; outdoor: THREE.Group; furniture: THREE.Group;
  walls: Wall[]; items: Map<string, { group: THREE.Group; key: string }>; avatar: THREE.Sprite; avatarShadow: THREE.Mesh;
  selection: THREE.BoxHelper; render: () => void; roomKey: string; viewStory: number; dragging: string | null;
};

export const AVATAR_ID = "avatar";
const WALL_THICK = 0.14;

// ---------- 텍스처: 캔버스 256px = 1m ----------
function canvasTexture(draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function wallpaperTexture(id: string) {
  return canvasTexture(ctx => {
    const fill = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    if (id === "flower") { fill("#f7e7e2", 0, 0, 256, 256); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? "#b6cd9b" : "#e7aeb0"; ctx.beginPath(); ctx.arc(32 + i * 64 + (j % 2) * 32, 32 + j * 64, 7, 0, Math.PI * 2); ctx.fill(); } }
    else if (id === "mint") { fill("#e4f0e7", 0, 0, 256, 256); for (let i = 0; i < 256; i += 32) { fill("#cfe3d5", i, 0, 4, 256); fill("#cfe3d5", 0, i, 256, 4); } }
    else if (id === "panel") { fill("#c99d6e", 0, 0, 256, 256); for (let i = 0; i < 256; i += 43) fill("#a87a4c", i, 0, 3, 256); }
    else { fill("#f4e9d4", 0, 0, 256, 256); for (let i = 0; i < 256; i += 64) fill("#ecdcbf", i, 0, 24, 256); }
  });
}

function floorTexture(id: string) {
  return canvasTexture(ctx => {
    if (id === "tile") { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? "#c97b5d" : "#efe4cf"; ctx.fillRect(i * 64, j * 64, 64, 64); } return; }
    const [base, seam, alt] = id === "walnut" ? ["#7a5236", "#553722", "#6f4a30"] : ["#c9965f", "#9c6f40", "#bf8c56"];
    for (let row = 0; row < 5; row++) {
      ctx.fillStyle = row % 2 ? alt : base; ctx.fillRect(0, row * 51.2, 256, 51.2);
      ctx.fillStyle = seam; ctx.fillRect(0, row * 51.2, 256, 2);
      ctx.fillRect(((row * 97) % 256), row * 51.2, 2, 51.2);
    }
  });
}

// ---------- 가구 3D 모델 (기본 도형 조합, 앞면 +z, 바닥 기준) ----------
function shade(color: string) {
  const main = new THREE.Color(color);
  return { main, dark: main.clone().multiplyScalar(0.68), light: main.clone().lerp(new THREE.Color("#ffffff"), 0.4) };
}
function solid(g: THREE.Object3D, geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, x: number, y: number, z: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
const box = (g: THREE.Object3D, w: number, h: number, d: number, c: THREE.ColorRepresentation, x = 0, y = 0, z = 0, extra?: Partial<THREE.MeshStandardMaterialParameters>) => solid(g, new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, extra);
const cyl = (g: THREE.Object3D, rt: number, rb: number, h: number, c: THREE.ColorRepresentation, x = 0, y = 0, z = 0, extra?: Partial<THREE.MeshStandardMaterialParameters>) => solid(g, new THREE.CylinderGeometry(rt, rb, h, 24), c, x, y + h / 2, z, extra);
const ball = (g: THREE.Object3D, r: number, c: THREE.ColorRepresentation, x: number, y: number, z: number, s: [number, number, number] = [1, 1, 1], extra?: Partial<THREE.MeshStandardMaterialParameters>) => { const m = solid(g, new THREE.SphereGeometry(r, 16, 12), c, x, y, z, extra); m.scale.set(...s); return m; };
const BOOK_COLORS = ["#c4574b", "#e2b85a", "#4f7a6a", "#8ba5bc", "#9a7bb0", "#efe6d6", "#57514f"];


// ---------- 펫: 만화풍(3단 음영 + 외곽선) ----------
const TOON_GRADIENT = (() => {
  const texture = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  texture.minFilter = texture.magFilter = THREE.NearestFilter; texture.needsUpdate = true;
  return texture;
})();

/** 만화풍 부품: 3단 음영 재질 + 뒷면을 키운 외곽선. */
function part(g: THREE.Object3D, geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, x: number, y: number, z: number, scale: [number, number, number] = [1, 1, 1], outline = true) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshToonMaterial({ color, gradientMap: TOON_GRADIENT }));
  mesh.position.set(x, y, z); mesh.scale.set(...scale); mesh.castShadow = true;
  if (outline) { const line = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: "#3b2a20", side: THREE.BackSide })); line.scale.setScalar(1.08); mesh.add(line); }
  g.add(mesh); return mesh;
}
const sphere = (r: number) => new THREE.SphereGeometry(r, 20, 16);
const capsule = (r: number, length: number) => new THREE.CapsuleGeometry(r, Math.max(0.001, length), 6, 14);

/** 반짝이는 큰 눈 한 쌍 + 볼터치. */
function face(g: THREE.Object3D, x: number, y: number, z: number, r: number, spread: number, cheeks = true) {
  [-1, 1].forEach(s => {
    part(g, sphere(r), "#1d1410", x + s * spread, y, z, [1, 1.15, 0.7], false);
    const glint = new THREE.Mesh(sphere(r * 0.38), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
    glint.position.set(x + s * spread + r * 0.3, y + r * 0.4, z + r * 0.55); g.add(glint);
    if (cheeks) { const blush = new THREE.Mesh(sphere(r * 0.75), new THREE.MeshBasicMaterial({ color: "#f59aa8", transparent: true, opacity: 0.75 })); blush.position.set(x + s * spread * 1.55, y - r * 1.3, z - r * 0.15); blush.scale.set(1, 0.6, 0.4); g.add(blush); }
  });
}

type CritterShape = { len: number; w: number; h: number; leg: number; head: number; ears: "flop" | "point" | "round" | "long" | "none"; tail: number; tailUp?: boolean; fluffyTail?: boolean; snout?: boolean; stripes?: boolean; belly?: string; nose?: string; spot?: string };

/** 네 발 동물 공통 모델(머리가 큰 귀여운 비율). 앞이 +z. */
function critter(g: THREE.Group, c: ReturnType<typeof shade>, o: CritterShape) {
  const r = o.h / 2, bodyY = o.leg + r;
  const body = part(g, capsule(r, o.len - o.h), c.main, 0, bodyY, 0, [o.w / o.h, 1, 1]); body.rotation.x = Math.PI / 2;
  if (o.belly) { const belly = part(g, capsule(r * 0.8, o.len - o.h), o.belly, 0, bodyY - r * 0.2, 0.01, [o.w / o.h * 0.85, 1, 1], false); belly.rotation.x = Math.PI / 2; }
  if (o.spot) part(g, sphere(r * 0.55), o.spot, o.w * 0.25, bodyY + r * 0.6, -o.len * 0.1, [1, 0.35, 1.3], false);
  if (o.stripes) for (let i = -2; i <= 2; i++) { const stripe = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.07, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: "#2a1d14" })); stripe.position.set(0, bodyY, i * o.len * 0.15); stripe.scale.set(o.w / o.h, 1, 1); g.add(stripe); }
  // 다리와 밝은 발
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const lx = sx * o.w * 0.3, lz = sz * (o.len / 2 - r * 0.6);
    if (o.leg > 0.04) part(g, capsule(o.w * 0.13, o.leg), c.main, lx, o.leg / 2 + o.w * 0.06, lz);
    part(g, sphere(o.w * 0.15), o.belly ?? c.light, lx, o.w * 0.06, lz + o.w * 0.04, [1, 0.6, 1.25], false);
  });
  // 머리(크게)와 얼굴
  const hy = bodyY + r * 0.75 + o.head * 0.35, hz = o.len / 2 - r * 0.2 + o.head * 0.35;
  part(g, sphere(o.head), c.main, 0, hy, hz);
  if (o.snout) part(g, sphere(o.head * 0.45), o.belly ?? c.light, 0, hy - o.head * 0.3, hz + o.head * 0.75, [1.15, 0.85, 1], false);
  else if (o.belly) part(g, sphere(o.head * 0.55), o.belly, 0, hy - o.head * 0.35, hz + o.head * 0.55, [1.3, 0.8, 0.8], false);
  part(g, sphere(o.head * 0.13), o.nose ?? "#2a1d14", 0, hy - o.head * (o.snout ? 0.22 : 0.18), hz + o.head * (o.snout ? 1.15 : 0.98), [1.3, 1, 1], false);
  face(g, 0, hy + o.head * 0.12, hz + o.head * 0.82, o.head * 0.16, o.head * 0.42);
  if (o.stripes) [-1, 1].forEach(s => { const mark = new THREE.Mesh(new THREE.BoxGeometry(o.head * 0.08, o.head * 0.45, 0.01), new THREE.MeshBasicMaterial({ color: "#2a1d14" })); mark.position.set(s * o.head * 0.25, hy + o.head * 0.6, hz + o.head * 0.78); mark.rotation.set(-0.5, 0, s * 0.35); g.add(mark); });
  // 귀
  [-1, 1].forEach(s => {
    const ex = s * o.head * 0.62, ey = hy + o.head * 0.72;
    if (o.ears === "point") { part(g, new THREE.ConeGeometry(o.head * 0.36, o.head * 0.7, 12), c.main, ex, ey + o.head * 0.12, hz - o.head * 0.05).rotation.z = -s * 0.25; part(g, new THREE.ConeGeometry(o.head * 0.2, o.head * 0.45, 10), "#f6b0b8", ex, ey + o.head * 0.08, hz + o.head * 0.12, [1, 1, 0.5], false).rotation.z = -s * 0.25; }
    if (o.ears === "round") { part(g, sphere(o.head * 0.32), c.main, ex, ey, hz - o.head * 0.1, [1, 1, 0.55]); part(g, sphere(o.head * 0.18), "#f6b0b8", ex, ey, hz + o.head * 0.04, [1, 1, 0.4], false); }
    if (o.ears === "flop") part(g, sphere(o.head * 0.38), c.dark, s * o.head * 0.95, hy + o.head * 0.15, hz - o.head * 0.05, [0.45, 1.25, 0.8]).rotation.z = s * 0.35;
    if (o.ears === "long") { part(g, capsule(o.head * 0.2, o.head * 1.1), c.main, s * o.head * 0.35, hy + o.head * 1.35, hz - o.head * 0.15, [1, 1, 0.55]).rotation.z = -s * 0.12; part(g, capsule(o.head * 0.1, o.head * 0.9), "#f6b0b8", s * o.head * 0.35, hy + o.head * 1.35, hz - o.head * 0.03, [1, 1, 0.3], false).rotation.z = -s * 0.12; }
  });
  // 꼬리
  if (o.fluffyTail) { const tail = part(g, capsule(o.h * 0.42, o.h * 1.2), c.dark, 0, bodyY + o.h * 0.9, -o.len / 2 - o.h * 0.2); tail.rotation.x = -0.35; }
  else if (o.tail > 0.06) { const tail = part(g, capsule(0.015 + o.w * 0.06, o.tail), c.main, 0, bodyY + (o.tailUp ? o.tail * 0.4 : 0), -o.len / 2 - o.tail * 0.3); tail.rotation.x = o.tailUp ? -0.4 : -1.1; }
  else part(g, sphere(Math.max(o.tail, 0.04) * 1.3), "#ffffff", 0, bodyY + r * 0.2, -o.len / 2);
}

const MODELS: Record<string, (g: THREE.Group, c: ReturnType<typeof shade>) => void> = {
  chair: (g, c) => { box(g, 0.46, 0.06, 0.46, c.light, 0, 0.44); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, 0.05, 0.44, 0.05, c.dark, sx * 0.19, 0, sz * 0.19)); box(g, 0.46, 0.46, 0.05, c.main, 0, 0.5, -0.205); box(g, 0.36, 0.06, 0.06, c.light, 0, 0.78, -0.2); },
  plant: (g, c) => { cyl(g, 0.21, 0.15, 0.38, "#c9784f"); cyl(g, 0.23, 0.23, 0.05, "#b0623f", 0, 0.35); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; ball(g, 0.2, i % 2 ? c.main : c.dark, Math.cos(a) * 0.2, 0.62 + (i % 3) * 0.12, Math.sin(a) * 0.2, [1.25, 0.45, 0.85]).rotation.y = -a; } ball(g, 0.17, c.light, 0, 0.98, 0, [0.8, 1.35, 0.8]); },
  lamp: (g, c) => { cyl(g, 0.16, 0.18, 0.04, "#4a3b2e"); cyl(g, 0.018, 0.018, 1.25, "#5b4a3a", 0, 0.04); cyl(g, 0.12, 0.22, 0.3, c.main, 0, 1.26, 0, { side: THREE.DoubleSide, emissive: c.main, emissiveIntensity: 0.15 }); ball(g, 0.06, "#fff4c7", 0, 1.33, 0, [1, 1, 1], { emissive: "#ffe9a8", emissiveIntensity: 0.6 }); const light = new THREE.PointLight("#ffd58a", 0, 7, 1.6); light.position.set(0, 1.3, 0); light.userData.nightLight = true; g.add(light); },
  table: (g, c) => { box(g, 1.3, 0.06, 0.75, c.main, 0, 0.72); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, 0.07, 0.72, 0.07, c.dark, sx * 0.58, 0, sz * 0.3)); cyl(g, 0.06, 0.05, 0.18, "#7da0b5", 0, 0.78); ball(g, 0.06, "#f2b5c4", -0.03, 0.99, 0); ball(g, 0.06, "#f6d16a", 0.05, 1, 0.02); },
  bookshelf: (g, c) => {
    [-1, 1].forEach(s => box(g, 0.04, 1.85, 0.38, c.dark, s * 0.455)); box(g, 0.95, 0.04, 0.38, c.dark, 0, 1.81); box(g, 0.95, 0.04, 0.38, c.dark); box(g, 0.95, 1.85, 0.02, c.dark, 0, 0, -0.18);
    [0.45, 0.9, 1.35].forEach(y => box(g, 0.87, 0.03, 0.36, c.main, 0, y));
    [0.04, 0.48, 0.93, 1.38].forEach((y, shelf) => { let x = -0.4; for (let i = 0; x < 0.36; i++) { const w = 0.05 + ((shelf * 7 + i * 3) % 4) * 0.015, h = 0.24 + ((shelf + i * 5) % 4) * 0.035; box(g, w, h, 0.26, BOOK_COLORS[(shelf * 3 + i) % BOOK_COLORS.length], x + w / 2, y, 0.02); x += w + 0.008; } });
  },
  sofa: (g, c) => { box(g, 2, 0.42, 0.86, c.main, 0, 0.08); [-1, 1].forEach(s => { box(g, 0.84, 0.14, 0.66, c.light, s * 0.43, 0.5, 0.07); box(g, 0.8, 0.38, 0.13, c.light, s * 0.43, 0.55, -0.22); box(g, 0.18, 0.62, 0.86, c.dark, s * 0.91, 0.08); }); box(g, 1.64, 0.5, 0.2, c.main, 0, 0.45, -0.33); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cyl(g, 0.03, 0.03, 0.08, "#5b3d26", sx * 0.86, 0, sz * 0.34)); },
  bed: (g, c) => { box(g, 1.6, 0.3, 2.1, c.dark, 0, 0.08); box(g, 1.5, 0.22, 2, "#fbf6ec", 0, 0.38); box(g, 1.54, 0.08, 1.35, c.main, 0, 0.56, 0.33); box(g, 1.55, 0.1, 0.18, c.light, 0, 0.56, -0.3); [-1, 1].forEach(s => box(g, 0.6, 0.13, 0.36, "#fffdf7", s * 0.38, 0.6, -0.78)); box(g, 1.6, 1, 0.08, c.dark, 0, 0, -1.03); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, 0.08, 0.08, 0.08, "#6d4a2e", sx * 0.74, 0, sz * 1)); },
  piano: (g, c) => { box(g, 1.5, 1.25, 0.38, c.main, 0, 0, -0.12); box(g, 1.52, 0.06, 0.42, c.dark, 0, 1.25, -0.12); box(g, 1.42, 0.08, 0.3, c.dark, 0, 0.72, 0.18); box(g, 1.3, 0.03, 0.18, "#fbf8f0", 0, 0.8, 0.2); for (let i = 0; i < 18; i++) if (![2, 6, 9, 13, 16].includes(i % 18)) box(g, 0.025, 0.03, 0.1, "#221c19", -0.62 + i * 0.073, 0.83, 0.16); box(g, 0.6, 0.22, 0.02, "#f3ead6", 0, 0.92, 0.075); [-1, 1].forEach(s => box(g, 0.07, 0.72, 0.07, c.dark, s * 0.64, 0, 0.26)); },
  rug: (g, c) => { const r = new THREE.Group(); r.scale.set(1.1, 1, 0.75); g.add(r); [[1, c.dark, 0], [0.95, c.main, 0.004], [0.75, c.light, 0.008], [0.5, c.main, 0.012], [0.28, c.light, 0.016]].forEach(([radius, color, y]) => { const m = cyl(r, radius as number, radius as number, 0.012, color as THREE.Color, 0, y as number); m.castShadow = false; }); },
  frame: (g, c) => { box(g, 0.75, 0.6, 0.04, c.main, 0, -0.3, -0.02); box(g, 0.63, 0.48, 0.012, "#bfe0e6", 0, -0.24, 0.005); box(g, 0.63, 0.16, 0.014, "#8bb46f", 0, -0.24, 0.006); ball(g, 0.05, "#f6d16a", 0.18, 0.1, 0.012, [1, 1, 0.2]); },
  clock: (g, c) => { const face = new THREE.Group(); face.rotation.x = Math.PI / 2; g.add(face); cyl(face, 0.22, 0.22, 0.05, c.main, 0, -0.03); cyl(face, 0.18, 0.18, 0.02, "#fffaf0", 0, 0.015); box(g, 0.02, 0.14, 0.01, "#2f3d33", 0.03, -0.01, 0.04).rotation.z = -0.6; box(g, 0.02, 0.1, 0.01, "#2f3d33", -0.03, -0.02, 0.045).rotation.z = 1.2; },
  shelf: (g, c) => { box(g, 1, 0.05, 0.26, c.main, 0, -0.12); [-1, 1].forEach(s => box(g, 0.04, 0.16, 0.2, c.dark, s * 0.38, -0.28, -0.02)); [0, 1, 2].forEach(i => box(g, 0.06, 0.24 - i * 0.03, 0.18, BOOK_COLORS[i], -0.4 + i * 0.07, -0.07)); cyl(g, 0.07, 0.06, 0.13, "#c9784f", 0.05, -0.07); ball(g, 0.09, "#81a96b", 0.05, 0.12, 0, [1.3, 0.8, 1]); cyl(g, 0.06, 0.06, 0.16, "#cfe3e8", 0.32, -0.07, 0, { transparent: true, opacity: 0.8 }); },
  window: (g, c) => { box(g, 1.2, 0.08, 0.12, c.main, 0, 0.47); box(g, 1.2, 0.08, 0.12, c.main, 0, -0.55); [-1, 1].forEach(s => box(g, 0.08, 1.1, 0.12, c.main, s * 0.56, -0.55)); const glass = box(g, 1.04, 0.94, 0.02, "#bfe0ec", 0, -0.47, -0.03, { emissive: "#bfe0ec", emissiveIntensity: 0.35, roughness: 0.2 }); glass.userData.glass = true; glass.castShadow = false; box(g, 0.04, 0.94, 0.05, c.main, 0, -0.47); box(g, 1.04, 0.04, 0.05, c.main, 0, -0.02); box(g, 1.32, 0.05, 0.2, c.main, 0, -0.6, 0.04); },
  door: (g, c) => { box(g, 0.95, 2.1, 0.05, "#efe2c8", 0, -1.05, -0.03); box(g, 0.82, 2.02, 0.07, c.main, 0, -1.05, 0.01); box(g, 0.6, 0.62, 0.02, c.dark, 0, 0.17, 0.05); box(g, 0.6, 0.82, 0.02, c.dark, 0, -0.85, 0.05); ball(g, 0.035, "#e2b85a", 0.3, -0.05, 0.07); },
  armchair: (g, c) => { box(g, 0.95, 0.4, 0.9, c.main, 0, 0.08); box(g, 0.7, 0.14, 0.68, c.light, 0, 0.48, 0.06); box(g, 0.95, 0.55, 0.2, c.main, 0, 0.42, -0.35); [-1, 1].forEach(s => box(g, 0.14, 0.58, 0.9, c.dark, s * 0.4, 0.08)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cyl(g, 0.03, 0.03, 0.08, "#5b3d26", sx * 0.4, 0, sz * 0.38)); },
  rocker: (g, c) => { box(g, 0.5, 0.06, 0.5, c.light, 0, 0.46); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, 0.04, 0.4, 0.04, c.dark, sx * 0.21, 0.08, sz * 0.2)); box(g, 0.5, 0.55, 0.05, c.main, 0, 0.52, -0.23); [-1, 1].forEach(s => { const rocker = solid(g, new THREE.TorusGeometry(0.75, 0.02, 6, 24, 0.9), c.dark, s * 0.21, 0.82, 0); rocker.rotation.set(0, Math.PI / 2, Math.PI + 0.35 + 0.8); }); },
  desk: (g, c) => { box(g, 1.3, 0.05, 0.65, c.main, 0, 0.72); [-1, 1].forEach(s => box(g, 0.06, 0.72, 0.6, c.dark, s * 0.6)); box(g, 0.4, 0.5, 0.55, c.dark, 0.4, 0.2); box(g, 0.08, 0.15, 0.08, "#333", 0, 0.77, -0.15); box(g, 0.62, 0.38, 0.04, "#222", 0, 0.9, -0.17); const screen = box(g, 0.56, 0.32, 0.01, "#cfe8c8", 0, 0.93, -0.145, { emissive: "#cfe8c8", emissiveIntensity: 0.6 }); screen.castShadow = false; box(g, 0.45, 0.02, 0.15, "#dddddd", 0, 0.77, 0.12); cyl(g, 0.04, 0.035, 0.1, "#efe6d6", 0.45, 0.77, 0.1); },
  wardrobe: (g, c) => { box(g, 1.2, 1.95, 0.6, c.main); box(g, 1.26, 0.06, 0.64, c.dark, 0, 1.95); box(g, 0.02, 1.85, 0.01, c.dark, 0, 0.05, 0.3); [-1, 1].forEach(s => box(g, 0.03, 0.2, 0.03, "#e2b85a", s * 0.06, 0.95, 0.31)); },
  fishtank: (g, c) => { box(g, 1.1, 0.7, 0.45, c.main); const glass = box(g, 1.05, 0.45, 0.4, "#9fd3e6", 0, 0.7, 0, { transparent: true, opacity: 0.45, roughness: 0.1 }); glass.castShadow = false; box(g, 1.02, 0.06, 0.37, "#e8d6a8", 0, 0.71); [[-0.25, 0.92, 0.05, "#f08a3a"], [0.2, 0.86, -0.06, "#e2483a"], [0.05, 1.0, 0.08, "#f6d16a"]].forEach(([x, y, z, color]) => ball(g, 0.04, color as string, x as number, y as number, z as number, [1.6, 1, 0.6])); box(g, 0.02, 0.25, 0.02, "#4f7a3e", 0.4, 0.75, 0); },
  fridge: (g, c) => { box(g, 0.75, 1.8, 0.7, c.main, 0, 0, 0, { roughness: 0.35 }); box(g, 0.76, 0.02, 0.71, c.dark, 0, 1.15); [[1.32, 0.3], [0.6, 0.5]].forEach(([y, h]) => box(g, 0.03, h, 0.04, "#8a9598", 0.3, y, 0.37)); box(g, 0.12, 0.08, 0.01, "#f2b5c4", -0.2, 1.55, 0.355); },
  tvstand: (g, c) => { box(g, 1.6, 0.45, 0.45, c.main); [-1, 1].forEach(s => box(g, 0.74, 0.35, 0.01, c.dark, s * 0.39, 0.05, 0.226)); box(g, 0.25, 0.04, 0.15, "#222", 0, 0.45, -0.05); box(g, 0.03, 0.08, 0.03, "#222", 0, 0.48, -0.05); box(g, 1.1, 0.62, 0.05, "#1d1d1d", 0, 0.52, -0.05); const screen = box(g, 1.04, 0.56, 0.01, "#5a8fb5", 0, 0.55, -0.02, { emissive: "#5a8fb5", emissiveIntensity: 0.5 }); screen.castShadow = false; },
  kitchen: (g, c) => { box(g, 1.8, 0.86, 0.6, c.main); box(g, 1.85, 0.06, 0.65, "#7d7a74", 0, 0.86); box(g, 0.5, 0.02, 0.35, "#b9c3c6", -0.45, 0.92); cyl(g, 0.02, 0.02, 0.25, "#8a9598", -0.45, 0.92, -0.2); [-1, 1].forEach(s => cyl(g, 0.11, 0.11, 0.01, "#222", 0.5, 0.92, s * 0.13)); [-0.6, 0, 0.6].forEach(x => box(g, 0.56, 0.7, 0.01, c.dark, x, 0.08, 0.301)); },
  bathtub: (g, c) => { box(g, 1.7, 0.55, 0.8, c.main, 0, 0.05, 0, { roughness: 0.3 }); const water = box(g, 1.5, 0.02, 0.6, "#a9d8f0", 0, 0.56, 0, { roughness: 0.1, emissive: "#a9d8f0", emissiveIntensity: 0.15 }); water.castShadow = false; [[-0.3, 0.06], [-0.18, -0.1], [0.4, 0.12]].forEach(([x, z]) => ball(g, 0.07, "#ffffff", x, 0.6, z)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => ball(g, 0.05, "#d6b56d", sx * 0.75, 0.04, sz * 0.32)); },
  fireplace: (g, c) => { box(g, 1.4, 1.1, 0.5, c.main); box(g, 1.55, 0.08, 0.6, "#efe2c8", 0, 1.1); box(g, 0.8, 0.62, 0.02, "#2a1a10", 0, 0.12, 0.25); [-0.15, 0.15].forEach(x => cyl(g, 0.04, 0.04, 0.5, "#6b4a32", x, 0.13, 0.12).rotation.set(0, 0, Math.PI / 2)); const fire = solid(g, new THREE.ConeGeometry(0.16, 0.35, 8), "#f08a3a", 0, 0.32, 0.15, { emissive: "#ff8a2a", emissiveIntensity: 1.2 }); fire.castShadow = false; const light = new THREE.PointLight("#ff9a4a", 0, 6, 1.6); light.position.set(0, 0.5, 0.5); light.userData.nightLight = true; g.add(light); },
  curtain: (g, c) => { box(g, 1.5, 0.03, 0.03, "#8a6a48", 0, 0.78); [-1, 1].forEach(s => { for (let i = 0; i < 4; i++) box(g, 0.14, 1.5, 0.05, i % 2 ? c.main : c.dark.clone().lerp(c.main, 0.6), s * (0.32 + i * 0.13), -0.75, (i % 2) * 0.02); }); },
  mirror: (g, c) => { box(g, 0.6, 1, 0.04, c.main, 0, -0.5, -0.01); box(g, 0.5, 0.9, 0.01, "#dfeef3", 0, -0.45, 0.012, { metalness: 0.9, roughness: 0.05 }); },
  walltv: (g, c) => { box(g, 1.3, 0.75, 0.05, c.main, 0, -0.375, -0.01); const screen = box(g, 1.22, 0.67, 0.01, "#5a8fb5", 0, -0.335, 0.016, { emissive: "#5a8fb5", emissiveIntensity: 0.5 }); screen.castShadow = false; },
  dog: (g, c) => critter(g, c, { len: 0.5, w: 0.3, h: 0.28, leg: 0.16, head: 0.2, ears: "flop", tail: 0.2, tailUp: true, snout: true, belly: "#f3e3c4", spot: c.dark.getStyle() }),
  cat: (g, c) => critter(g, c, { len: 0.44, w: 0.24, h: 0.22, leg: 0.13, head: 0.17, ears: "point", tail: 0.36, tailUp: true, belly: "#fff3e0", nose: "#f2899a" }),
  rabbit: (g, c) => critter(g, c, { len: 0.3, w: 0.26, h: 0.26, leg: 0.05, head: 0.15, ears: "long", tail: 0.04, belly: "#ffffff", nose: "#f2899a" }),
  mole: (g, c) => critter(g, c, { len: 0.34, w: 0.28, h: 0.22, leg: 0.03, head: 0.12, ears: "none", tail: 0.05, nose: "#f2899a", belly: "#f2b5c4" }),
  weasel: (g, c) => critter(g, c, { len: 0.58, w: 0.15, h: 0.15, leg: 0.08, head: 0.11, ears: "round", tail: 0.28, belly: "#f3e3c4" }),
  tiger: (g, c) => critter(g, c, { len: 1.15, w: 0.52, h: 0.46, leg: 0.32, head: 0.36, ears: "round", tail: 0.6, stripes: true, belly: "#fff6e8", snout: true }),
  duck: (g, c) => { part(g, sphere(0.17), c.main, 0, 0.18, 0, [0.95, 0.8, 1.2]); part(g, sphere(0.12), c.main, 0, 0.38, 0.13); part(g, new THREE.BoxGeometry(0.11, 0.035, 0.1), "#f08a3a", 0, 0.35, 0.26); [-1, 1].forEach(s => { part(g, sphere(0.09), c.dark, s * 0.14, 0.2, -0.02, [0.35, 0.7, 1.2]); part(g, new THREE.BoxGeometry(0.06, 0.02, 0.08), "#f08a3a", s * 0.06, 0.01, 0.03, [1, 1, 1], false); }); face(g, 0, 0.41, 0.22, 0.022, 0.055); },
  chick: (g, c) => { part(g, sphere(0.11), c.main, 0, 0.11, 0, [1, 0.95, 1.05]); part(g, sphere(0.075), c.main, 0, 0.22, 0.05); part(g, new THREE.ConeGeometry(0.025, 0.05, 8), "#f08a3a", 0, 0.21, 0.13, [1, 1, 1], false).rotation.x = Math.PI / 2; part(g, new THREE.ConeGeometry(0.02, 0.06, 6), c.main, 0, 0.31, 0.04, [1, 1, 1], false); [-1, 1].forEach(s => part(g, sphere(0.045), c.dark, s * 0.1, 0.12, 0, [0.4, 0.8, 1])); face(g, 0, 0.235, 0.115, 0.016, 0.035); },
  grasshopper: (g, c) => { const body = part(g, capsule(0.035, 0.18), c.main, 0, 0.07, 0); body.rotation.x = Math.PI / 2; part(g, sphere(0.045), c.main, 0, 0.1, 0.13); part(g, sphere(0.03), c.light, 0, 0.1, -0.02, [1.1, 0.5, 3], false); [-1, 1].forEach(s => { const leg = part(g, capsule(0.012, 0.13), c.dark, s * 0.05, 0.11, -0.05); leg.rotation.x = 0.9; const ant = part(g, capsule(0.004, 0.08), c.dark, s * 0.015, 0.16, 0.18, [1, 1, 1], false); ant.rotation.x = -0.7; }); face(g, 0, 0.115, 0.165, 0.012, 0.025, false); },
  snail: (g, c) => { const foot = part(g, capsule(0.04, 0.2), "#efdcb8", 0, 0.035, 0.02); foot.rotation.x = Math.PI / 2; foot.scale.set(1.3, 1, 0.8); [0.07, 0.05, 0.032].forEach((r, k) => { const ring = part(g, new THREE.TorusGeometry(r, 0.03 - k * 0.006, 10, 20), k % 2 ? c.light : c.main, 0, 0.11 + k * 0.012, -0.02 + k * 0.01); ring.rotation.y = Math.PI / 2; }); [-1, 1].forEach(s => { part(g, capsule(0.008, 0.06), "#efdcb8", s * 0.018, 0.08, 0.13, [1, 1, 1], false).rotation.x = 0.3; part(g, sphere(0.014), "#1d1410", s * 0.018, 0.12, 0.14, [1, 1, 1], false); }); },
  frog: (g, c) => { part(g, sphere(0.12), c.main, 0, 0.08, 0, [1.05, 0.65, 0.95]); part(g, sphere(0.09), c.light, 0, 0.06, 0.04, [1, 0.5, 0.9], false); [-1, 1].forEach(s => { part(g, sphere(0.042), c.main, s * 0.06, 0.15, 0.05); part(g, sphere(0.04), c.dark, s * 0.11, 0.02, -0.07, [1.2, 0.5, 1.5]); }); face(g, 0, 0.165, 0.085, 0.02, 0.06); const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: "#2f5a2a" })); mouth.position.set(0, 0.1, 0.11); mouth.rotation.z = Math.PI; g.add(mouth); },
  squirrel: (g, c) => critter(g, c, { len: 0.22, w: 0.14, h: 0.14, leg: 0.05, head: 0.1, ears: "point", tail: 0.05, fluffyTail: true, belly: "#f6e6c8" }),
  hamster: (g, c) => critter(g, c, { len: 0.18, w: 0.18, h: 0.15, leg: 0.02, head: 0.1, ears: "round", tail: 0.03, belly: "#fff6e8", nose: "#f2899a" }),
  turtle: (g, c) => { const shell = part(g, new THREE.SphereGeometry(0.17, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), c.main, 0, 0.05, 0, [1, 0.75, 1.2]); shell.castShadow = true; part(g, new THREE.CylinderGeometry(0.175, 0.175, 0.03, 20), c.dark, 0, 0.05, 0, [1, 1, 1.2]); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; part(g, new THREE.CylinderGeometry(0.035, 0.035, 0.01, 6), c.light, Math.cos(a) * 0.08, 0.15, Math.sin(a) * 0.09, [1, 1, 1], false).rotation.z = Math.cos(a) * 0.5; } part(g, sphere(0.06), "#a7cf86", 0, 0.08, 0.24); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(g, sphere(0.04), "#a7cf86", sx * 0.13, 0.03, sz * 0.14, [1, 0.6, 1.1])); face(g, 0, 0.1, 0.285, 0.012, 0.025, false); },
  sparrow: (g, c) => { part(g, sphere(0.09), c.main, 0, 0.1, 0, [0.95, 0.85, 1.2]); part(g, sphere(0.065), c.main, 0, 0.19, 0.07); part(g, sphere(0.06), "#f3e6cf", 0, 0.08, 0.04, [0.8, 0.6, 1], false); part(g, new THREE.ConeGeometry(0.018, 0.04, 8), "#e2b85a", 0, 0.18, 0.14, [1, 1, 1], false).rotation.x = Math.PI / 2; const tail = part(g, new THREE.BoxGeometry(0.07, 0.015, 0.09), c.dark, 0, 0.13, -0.12); tail.rotation.x = 0.4; [-1, 1].forEach(s => part(g, sphere(0.05), c.dark, s * 0.08, 0.11, -0.01, [0.4, 0.7, 1.3])); face(g, 0, 0.205, 0.125, 0.014, 0.032); },
  stairs: (g, c) => { for (let i = 0; i < 10; i++) { box(g, 1, (i + 1) * 0.28, 0.26, i % 2 ? c.main : c.light, 0, 0, 1.17 - i * 0.26); } [-1, 1].forEach(s => { const rail = box(g, 0.04, 0.04, 2.9, c.dark, s * 0.48, 1.85, 0); rail.rotation.x = Math.atan2(2.8, 2.6); }); },
  fence: (g, c) => { [-0.95, -0.475, 0, 0.475, 0.95].forEach(x => { box(g, 0.1, 0.85, 0.08, c.main, x); const tip = solid(g, new THREE.ConeGeometry(0.07, 0.12, 4), c.main, x, 0.91, 0); tip.rotation.y = Math.PI / 4; }); [0.28, 0.62].forEach(y => box(g, 2, 0.07, 0.05, c.dark, 0, y, 0.05)); },
  flowerbed: (g, c) => { box(g, 1.6, 0.25, 0.8, c.dark.clone().lerp(new THREE.Color("#8a6a4a"), 0.7)); box(g, 1.5, 0.04, 0.7, "#5f4330", 0, 0.24); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const x = -0.6 + i * 0.24, z = -0.22 + j * 0.22; box(g, 0.02, 0.2, 0.02, "#4f7a3e", x, 0.28, z); ball(g, 0.06, [c.main, c.light, "#f6d16a"][(i + j) % 3], x, 0.5, z); } },
  stonepath: (g, c) => { [[-0.12, -0.9], [0.14, -0.3], [-0.1, 0.3], [0.12, 0.9]].forEach(([x, z], i) => { const m = cyl(g, 0.32, 0.34, 0.05, i % 2 ? c.main : c.dark.clone().lerp(c.main, 0.5), x, 0, z); m.scale.set(1, 1, 0.8); m.castShadow = false; }); },
  appletree: (g, c) => { cyl(g, 0.14, 0.2, 1.5, "#7a5236"); ball(g, 0.95, c.main, 0, 2.1, 0, [1, 0.9, 1]); ball(g, 0.6, c.light, -0.45, 2.5, 0.2); ball(g, 0.55, c.dark, 0.5, 1.8, -0.2); [[0.6, 2.2, 0.5], [-0.5, 1.9, 0.6], [0.2, 2.6, 0.7], [-0.7, 2.3, -0.3], [0.8, 1.9, -0.4], [0, 1.7, 0.9]].forEach(([x, y, z]) => ball(g, 0.09, "#d8453a", x, y, z)); },
  bench: (g, c) => { [-0.18, -0.04, 0.1].forEach(z => box(g, 1.5, 0.05, 0.12, c.main, 0, 0.43, z)); [0.6, 0.76].forEach(y => box(g, 1.5, 0.1, 0.04, c.main, 0, y, -0.27)); [-1, 1].forEach(s => { box(g, 0.06, 0.45, 0.45, "#3f4a44", s * 0.66, 0, -0.04); box(g, 0.06, 0.5, 0.05, "#3f4a44", s * 0.66, 0.45, -0.27); }); },
  mailbox: (g, c) => { box(g, 0.08, 1, 0.08, "#5b4a3a"); box(g, 0.34, 0.26, 0.44, c.main, 0, 1); const top = solid(g, new THREE.CylinderGeometry(0.17, 0.17, 0.44, 16, 1, false, 0, Math.PI), c.main, 0, 1.26, 0); top.rotation.set(Math.PI / 2, Math.PI / 2, 0); box(g, 0.03, 0.22, 0.03, "#e2b85a", 0.19, 1.1, 0.1); },
  streetlamp: (g, c) => { box(g, 0.3, 0.1, 0.3, c.dark); cyl(g, 0.04, 0.05, 2.05, c.main, 0, 0.1); box(g, 0.26, 0.3, 0.26, "#fff1b8", 0, 2.1, 0, { emissive: "#ffe39a", emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }); cyl(g, 0.05, 0.22, 0.14, c.main, 0, 2.4); const light = new THREE.PointLight("#ffd58a", 0, 9, 1.5); light.position.set(0, 2.2, 0); light.userData.nightLight = true; g.add(light); },
  pond: (g, c) => { const r = new THREE.Group(); r.scale.set(1.3, 1, 0.9); g.add(r); cyl(r, 1, 1.02, 0.08, "#a9a398").castShadow = false; cyl(r, 0.86, 0.86, 0.09, c.main, 0, 0.005, 0, { roughness: 0.15, metalness: 0.1, emissive: c.main, emissiveIntensity: 0.12 }).castShadow = false; [[0.4, 0.2], [-0.3, -0.3], [0.1, -0.5]].forEach(([x, z]) => { const pad = cyl(r, 0.13, 0.13, 0.01, "#6f9a5a", x, 0.1, z); pad.castShadow = false; }); ball(r, 0.05, "#f2b5c4", 0.4, 0.13, 0.2); },
  doghouse: (g, c) => { box(g, 0.9, 0.7, 1, c.main); [-1, 1].forEach(s => { const roof = box(g, 0.66, 0.05, 1.12, c.dark, s * 0.23, 0.82, 0); roof.rotation.z = -s * 0.68; }); const gable = solid(g, new THREE.ConeGeometry(0.64, 0.42, 3), c.main, 0, 0.91, 0); gable.rotation.set(Math.PI / 2, 0, 0); gable.scale.set(1, 1.55, 1); box(g, 0.34, 0.44, 0.02, "#3b2a1e", 0, 0, 0.505); },
  scarecrow: (g, c) => { box(g, 0.06, 1.8, 0.06, "#7a5236"); box(g, 0.9, 0.06, 0.06, "#7a5236", 0, 1.15); box(g, 0.5, 0.5, 0.2, "#6f8fb5", 0, 0.75); box(g, 0.5, 0.06, 0.21, "#c4574b", 0, 0.95); ball(g, 0.17, "#efd9a8", 0, 1.48, 0); cyl(g, 0.3, 0.3, 0.03, c.main, 0, 1.62); cyl(g, 0.12, 0.16, 0.16, c.main, 0, 1.64); },
  partition: (g, c) => { box(g, 2, 2.4, 0.14, c.main); box(g, 2.02, 0.1, 0.16, c.dark); box(g, 2.02, 0.05, 0.17, c.light, 0, 2.38); },
  arch: (g, c) => {
    const shape = new THREE.Shape();
    shape.moveTo(-1.1, 0); shape.lineTo(-0.45, 0); shape.lineTo(-0.45, 1.6); shape.absarc(0, 1.6, 0.45, Math.PI, 0, true); shape.lineTo(0.45, 0); shape.lineTo(1.1, 0); shape.lineTo(1.1, 2.4); shape.lineTo(-1.1, 2.4); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: 20 }); geometry.translate(0, 0, -0.07);
    solid(g, geometry, c.main, 0, 0, 0); [-1, 1].forEach(s => box(g, 0.66, 0.1, 0.16, c.dark, s * 0.775)); box(g, 2.22, 0.05, 0.17, c.light, 0, 2.38);
  },
};

function buildItem(item: PlacedItem) {
  const group = new THREE.Group();
  MODELS[item.id]?.(group, shade(item.tint ?? item.color));
  group.userData.instanceId = item.instanceId;
  return group;
}

function disposeTree(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(material) ? material : material ? [material] : []).forEach(m => { (m as THREE.MeshStandardMaterial).map?.dispose(); m.dispose(); });
  });
}

const storyY = (item: PlacedItem) => (item.yard ? 0 : (item.story ?? 0) * STORY_HEIGHT);

function placeItem(group: THREE.Group, item: PlacedItem, room: Room) {
  if (item.kind !== "wall") { group.position.set(item.x, storyY(item), item.z); group.rotation.set(0, THREE.MathUtils.degToRad(item.rot), 0); return; }
  const wall = wallInfo(room.points, item.wall ?? 0), u = item.u ?? 0.5;
  group.position.set(wall.start[0] + wall.dir[0] * wall.length * u + wall.normal[0] * (item.size[2] / 2 + 0.01), storyY(item) + (item.h ?? item.mount ?? 1.4), wall.start[1] + wall.dir[1] * wall.length * u + wall.normal[1] * (item.size[2] / 2 + 0.01));
  group.rotation.set(0, Math.atan2(wall.normal[0], wall.normal[1]), 0);
}

export default function House3D(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const propsRef = useRef(props);
  const [failed, setFailed] = useState(false);
  useEffect(() => { propsRef.current = props; });

  // 장면 생성 (한 번)
  useEffect(() => {
    const host = hostRef.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { queueMicrotask(() => setFailed(true)); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const hemi = new THREE.HemisphereLight("#ffffff", "#8a7a5a", 2.2);
    const sun = new THREE.DirectionalLight("#fff3dc", 2.4);
    sun.position.set(6, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005;
    scene.add(hemi, sun);
    const shell = new THREE.Group(), outdoor = new THREE.Group(), furniture = new THREE.Group();
    scene.add(shell, outdoor, furniture);
    const avatar = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
    avatar.center.set(0.5, 0); avatar.userData.instanceId = AVATAR_ID;
    const avatarShadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.18, depthWrite: false }));
    avatarShadow.rotation.x = -Math.PI / 2;
    scene.add(avatar, avatarShadow);
    const selection = new THREE.BoxHelper(new THREE.Object3D(), "#f3b33d");
    selection.visible = false; scene.add(selection);

    let frame = 0;
    const ctx: Scene = { renderer, scene, camera, controls: null!, hemi, sun, shell, outdoor, furniture, walls: [], items: new Map(), avatar, avatarShadow, selection, roomKey: "", viewStory: 0, dragging: null,
      render: () => { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; updateCutaway(ctx); renderer.render(scene, camera); }); } };
    sceneRef.current = ctx;

    // 직접 드래그 처리: OrbitControls보다 먼저 등록해야 가구를 잡았을 때 카메라 회전을 막을 수 있다.
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    let drag: { id: string; wall: boolean; yard: boolean; ox: number; oz: number; patch: Partial<PlacedItem> | null } | null = null, downAt: [number, number] | null = null;
    const setPointer = (event: PointerEvent) => { const rect = renderer.domElement.getBoundingClientRect(); pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointer, camera); };
    const onDown = (event: PointerEvent) => {
      downAt = [event.clientX, event.clientY]; setPointer(event);
      const targets = [...furniture.children.filter(child => child.visible), ...(avatar.visible ? [avatar] : [])];
      const found = raycaster.intersectObjects(targets, true)[0];
      if (!found) return;
      let node: THREE.Object3D | null = found.object;
      while (node && !node.userData.instanceId) node = node.parent;
      if (!node) return;
      const id = node.userData.instanceId as string, item = propsRef.current.items.find(entry => entry.instanceId === id);
      propsRef.current.onSelect(id);
      ctx.controls.enabled = false; try { renderer.domElement.setPointerCapture(event.pointerId); } catch { /* 합성 이벤트 등 */ }
      floorPlane.constant = -node.position.y * (item?.kind === "wall" ? 0 : 1);
      raycaster.ray.intersectPlane(floorPlane, hit);
      drag = { id, wall: item?.kind === "wall", yard: Boolean(item?.yard), ox: node.position.x - hit.x, oz: node.position.z - hit.z, patch: null };
      ctx.dragging = id;
    };
    const onMove = (event: PointerEvent) => {
      if (!drag) return;
      setPointer(event);
      const { room, items, yardLevel } = propsRef.current, node = drag.id === AVATAR_ID ? avatar : ctx.items.get(drag.id)?.group;
      if (!node) return;
      if (drag.wall) {
        const item = items.find(entry => entry.instanceId === drag!.id)!;
        const wallHit = raycaster.intersectObjects(ctx.walls.filter(wall => wall.full && wall.story === (item.story ?? 0)).map(wall => wall.inner))[0];
        if (!wallHit) return;
        const index = wallHit.object.userData.wallIndex as number, wall = wallInfo(room.points, index);
        const along = (wallHit.point.x - wall.start[0]) * wall.dir[0] + (wallHit.point.z - wall.start[1]) * wall.dir[1];
        const half = item.size[0] / 2 + 0.05, u = THREE.MathUtils.clamp(along, half, wall.length - half) / wall.length;
        const h = item.fixedMount ? item.mount! : THREE.MathUtils.clamp(wallHit.point.y - (item.story ?? 0) * STORY_HEIGHT, item.size[1] / 2 + 0.1, WALL_HEIGHT - item.size[1] / 2 - 0.05);
        drag.patch = { wall: index, u, h }; placeItem(node as THREE.Group, { ...item, ...drag.patch }, room);
      } else if (raycaster.ray.intersectPlane(floorPlane, hit)) {
        const x = hit.x + drag.ox, z = hit.z + drag.oz;
        const isPet = items.find(entry => entry.instanceId === drag!.id)?.pet;
        const ok = drag.yard ? fitsInYard(room, yardLevel, x, z) : drag.id === AVATAR_ID || isPet ? fitsInRoom(room.points, x, z, 0.25) || fitsInYard(room, yardLevel, x, z, 0.3) : fitsInRoom(room.points, x, z, 0.25);
        if (!ok) return;
        node.position.x = x; node.position.z = z; drag.patch = { x, z };
        if (drag.id === AVATAR_ID) avatarShadow.position.set(x, avatar.position.y + 0.01, z);
      }
      ctx.selection.update(); ctx.render();
    };
    const onUp = (event: PointerEvent) => {
      if (drag?.patch) { if (drag.id === AVATAR_ID) propsRef.current.onAvatarMove(drag.patch.x!, drag.patch.z!); else propsRef.current.onMove(drag.id, drag.patch); }
      else if (!drag && downAt && Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1]) < 5) propsRef.current.onSelect(null);
      drag = null; downAt = null; ctx.controls.enabled = true; ctx.dragging = null;
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);

    // 가구를 선택한 상태에서 휠: 회전(15°, Shift는 5°). OrbitControls보다 먼저 등록해 확대/축소를 가로챈다.
    const onWheel = (event: WheelEvent) => {
      const { selectedId: id, items } = propsRef.current;
      const item = id ? items.find(entry => entry.instanceId === id) : undefined;
      if (!item || item.kind === "wall") return;
      event.preventDefault(); event.stopImmediatePropagation();
      const step = (event.shiftKey ? 5 : 15) * Math.sign(event.deltaY || event.deltaX);
      propsRef.current.onMove(item.instanceId, { rot: (((item.rot + step) % 360) + 360) % 360 });
    };
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.38; controls.minDistance = 3; controls.maxDistance = 30;
    controls.addEventListener("change", ctx.render);
    ctx.controls = controls;

    const resize = () => { const { clientWidth: w, clientHeight: h } = host; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); ctx.render(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();

    return () => {
      observer.disconnect(); cancelAnimationFrame(frame); controls.dispose();
      disposeTree(scene); renderer.dispose(); renderer.domElement.remove(); sceneRef.current = null;
    };
  }, []);

  // 방 구조·벽지·바닥 다시 짓기
  const { room, wallpaper, floor, palette, night, items, avatar, selectedId, stories, viewStory, yardLevel } = props;
  useEffect(() => {
    const ctx = sceneRef.current; if (!ctx) return;
    disposeTree(ctx.shell); ctx.shell.clear(); ctx.walls = [];
    const wallTexture = wallpaperTexture(wallpaper), floorMap = floorTexture(floor);
    const shape = new THREE.Shape(room.points.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (let story = 0; story < stories; story++) {
    const base = story * STORY_HEIGHT, level = new THREE.Group(); level.userData.story = story; ctx.shell.add(level);
    const floorGeometry = new THREE.ShapeGeometry(shape); floorGeometry.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeometry, new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.75, side: THREE.DoubleSide }));
    floorMesh.position.y = base + 0.001; floorMesh.receiveShadow = true; level.add(floorMesh);
    if (story > 0) {
      const slab = new THREE.ExtrudeGeometry(shape, { depth: STORY_HEIGHT - WALL_HEIGHT, bevelEnabled: false }); slab.rotateX(-Math.PI / 2);
      const slabMesh = new THREE.Mesh(slab, new THREE.MeshStandardMaterial({ color: "#d9c8a8", roughness: 0.9 }));
      slabMesh.position.y = WALL_HEIGHT; slabMesh.castShadow = true; slabMesh.receiveShadow = true; level.add(slabMesh);
    }
    room.points.forEach((_, index) => {
      const info = wallInfo(room.points, index), angle = Math.atan2(info.normal[0], info.normal[1]);
      const mid: [number, number] = [info.start[0] + info.dir[0] * info.length / 2, info.start[1] + info.dir[1] * info.length / 2];
      const group = new THREE.Group(); group.position.set(mid[0], base, mid[1]); group.rotation.y = angle;
      const outer = new THREE.Mesh(new THREE.BoxGeometry(info.length + WALL_THICK * 2, WALL_HEIGHT, WALL_THICK), new THREE.MeshStandardMaterial({ color: "#e9dcc0", roughness: 0.9 }));
      outer.position.set(0, WALL_HEIGHT / 2, -WALL_THICK / 2 - 0.002); outer.castShadow = true; outer.receiveShadow = true;
      const plane = new THREE.PlaneGeometry(info.length, WALL_HEIGHT), uv = plane.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * info.length, uv.getY(i) * WALL_HEIGHT);
      const inner = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.95 }));
      inner.position.set(0, WALL_HEIGHT / 2, 0); inner.receiveShadow = true; inner.userData.wallIndex = index;
      const baseboard = new THREE.Mesh(new THREE.BoxGeometry(info.length, 0.1, 0.02), new THREE.MeshStandardMaterial({ color: "#efe2c8" }));
      baseboard.position.set(0, 0.05, 0.01);
      group.add(outer, inner, baseboard); level.add(group);
      ctx.walls.push({ group, inner, normal: info.normal, mid, full: true, story });
    });
    }
    // 처음이거나 방 크기가 바뀌면 카메라를 다시 맞춘다.
    const key = `${room.points.flat().map(value => value.toFixed(2)).join(",")}|${yardLevel}`;
    if (ctx.roomKey !== key) {
      ctx.roomKey = key;
      const yardSpan = yardBounds(room, yardLevel), span = Math.max(room.width, room.depth), distance = span * 1.15 + 3 + (yardSpan.maxZ - room.depth / 2) * 0.9, lift = ctx.viewStory * STORY_HEIGHT;
      ctx.controls.target.set(0, 0.8 + lift, 0);
      ctx.camera.position.set(Math.sin(0.6) * Math.sin(0.95) * distance, Math.cos(0.95) * distance + 0.8 + lift, Math.cos(0.6) * Math.sin(0.95) * distance);
      ctx.controls.update();
      const bounds = yardBounds(room, yardLevel), reach = Math.max(-bounds.minX, bounds.maxX, -bounds.minZ, bounds.maxZ) + 1;
      const shadow = ctx.sun.shadow.camera; shadow.left = shadow.bottom = -reach; shadow.right = shadow.top = reach; shadow.far = 80; shadow.updateProjectionMatrix();
    }
    // 바깥 풍경
    disposeTree(ctx.outdoor); ctx.outdoor.clear();
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; ctx.outdoor.add(ground);
    const yard = yardBounds(room, yardLevel), yardW = yard.maxX - yard.minX, yardD = yard.maxZ - yard.minZ;
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(yardW, yardD), new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.grass).lerp(new THREE.Color("#ffffff"), 0.12), roughness: 1 }));
    lawn.rotation.x = -Math.PI / 2; lawn.position.set((yard.minX + yard.maxX) / 2, -0.01, (yard.minZ + yard.maxZ) / 2); lawn.receiveShadow = true; ctx.outdoor.add(lawn);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(yardW, 0.02, yardD)), new THREE.LineBasicMaterial({ color: "#7d6a4a", transparent: true, opacity: 0.45 }));
    edge.position.copy(lawn.position); ctx.outdoor.add(edge);
    const radius = Math.max(yardW, yardD) / 2 + 1.5;
    for (let i = 0; i < 9; i++) {
      const a = i * 0.71 + 0.4, r = radius + (i % 3) * 1.6, tree = new THREE.Group();
      tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      cyl(tree, 0.12, 0.16, 1, "#7a5236"); ball(tree, 0.75, palette.leaf, 0, 1.5, 0, [1, 1.15, 1]); ball(tree, 0.5, palette.leaf, 0.3, 2.1, 0.1);
      tree.scale.setScalar(0.8 + (i % 4) * 0.15); ctx.outdoor.add(tree);
    }
    ctx.items.forEach(({ group }, id) => { const item = items.find(entry => entry.instanceId === id); if (item) placeItem(group, item, room); });
    ctx.render();
    applyStoryView(ctx);
    ctx.render();
  }, [room, wallpaper, floor, palette.grass, palette.leaf, stories, yardLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // 보고 있는 층 전환: 카메라를 층 높이만큼 올리거나 내린다.
  useEffect(() => {
    const ctx = sceneRef.current; if (!ctx) return;
    const delta = (viewStory - ctx.viewStory) * STORY_HEIGHT;
    ctx.viewStory = viewStory; ctx.camera.position.y += delta; ctx.controls.target.y += delta; ctx.controls.update();
    applyStoryView(ctx); ctx.render();
  }, [viewStory]);

  // 가구 동기화
  useEffect(() => {
    const ctx = sceneRef.current; if (!ctx) return;
    const alive = new Set(items.map(item => item.instanceId));
    ctx.items.forEach((entry, id) => { if (!alive.has(id)) { ctx.furniture.remove(entry.group); disposeTree(entry.group); ctx.items.delete(id); } });
    items.forEach(item => {
      const key = `${item.id}|${item.tint ?? ""}`;
      let entry = ctx.items.get(item.instanceId);
      if (!entry || entry.key !== key) {
        if (entry) { ctx.furniture.remove(entry.group); disposeTree(entry.group); }
        entry = { group: buildItem(item), key }; ctx.items.set(item.instanceId, entry); ctx.furniture.add(entry.group);
      }
      const posKey = `${item.x},${item.z},${item.rot},${item.story ?? 0},${item.wall},${item.u},${item.h}`;
      if (!item.pet || entry.group.userData.posKey !== posKey) placeItem(entry.group, item, room);
      entry.group.userData.posKey = posKey;
      entry.group.userData.wall = item.kind === "wall" ? item.wall ?? 0 : undefined;
      entry.group.userData.story = item.yard ? -1 : item.story ?? 0;
    });
    applyStoryView(ctx);
    applyLighting(ctx, night, palette.sky);
    ctx.render();
  }, [items, room]); // eslint-disable-line react-hooks/exhaustive-deps


  // 펫: 지금 있는 공간(방 또는 마당) 안에서 천천히 돌아다닌다. 돌아다닌 위치는 저장하지 않는다.
  useEffect(() => {
    const ctx = sceneRef.current; if (!ctx) return;
    const pets = items.filter(item => item.pet);
    if (!pets.length) return;
    const state = new Map<string, { tx: number; tz: number; wait: number; jump: number }>();
    let frame = 0, last = performance.now();
    const tick = (time: number) => {
      const dt = Math.min(0.1, (time - last) / 1000); last = time;
      const { room, yardLevel: yl, cheer: cheerNow } = propsRef.current;
      pets.forEach(pet => {
        const node = ctx.items.get(pet.instanceId)?.group; if (!node || ctx.dragging === pet.instanceId) return;
        const indoor = fitsInRoom(room.points, node.position.x, node.position.z, 0);
        const fits = (x: number, z: number) => (indoor ? fitsInRoom(room.points, x, z, 0.3) : fitsInYard(room, yl, x, z, 0.3));
        let st = state.get(pet.instanceId);
        if (!st) { st = { tx: node.position.x, tz: node.position.z, wait: Math.random() * 2, jump: 0 }; state.set(pet.instanceId, st); }
        if (cheerNow?.id === pet.instanceId && time - cheerNow.at < 50 && st.jump <= 0) st.jump = 0.8;
        const base = (pet.story ?? 0) * STORY_HEIGHT;
        if (st.jump > 0) { st.jump -= dt; node.position.y = base + Math.abs(Math.sin((0.8 - st.jump) * Math.PI * 2.5)) * 0.25; return; }
        const dx = st.tx - node.position.x, dz = st.tz - node.position.z, dist = Math.hypot(dx, dz);
        if (dist < 0.05) {
          st.wait -= dt; node.position.y = base;
          if (st.wait <= 0) { const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 1.4, x = node.position.x + Math.cos(a) * r, z = node.position.z + Math.sin(a) * r; if (fits(x, z)) { st.tx = x; st.tz = z; } st.wait = 1.5 + Math.random() * 3; }
          return;
        }
        const speed = pet.id === "tiger" ? 0.55 : pet.id === "snail" || pet.id === "turtle" ? 0.06 : pet.id === "mole" || pet.id === "duck" || pet.id === "hamster" ? 0.25 : 0.4, step = Math.min(dist, speed * dt);
        node.position.x += (dx / dist) * step; node.position.z += (dz / dist) * step;
        node.rotation.y = Math.atan2(dx, dz); node.position.y = base + Math.abs(Math.sin(time / 120)) * 0.03;
      });
      if (ctx.selection.visible) ctx.selection.update();
      ctx.renderer.render(ctx.scene, ctx.camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [items]);

  // 낮/밤, 하늘
  useEffect(() => { const ctx = sceneRef.current; if (!ctx) return; applyLighting(ctx, night, palette.sky); ctx.render(); }, [night, palette.sky]);

  // 아바타
  useEffect(() => {
    const ctx = sceneRef.current; if (!ctx) return;
    let cancelled = false;
    new THREE.TextureLoader().load(avatar.src, texture => {
      if (cancelled) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      if (avatar.pixelated) { texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; }
      const material = ctx.avatar.material; material.map?.dispose(); material.map = texture; material.needsUpdate = true;
      const image = texture.image as HTMLImageElement, height = 1.25;
      ctx.avatar.scale.set(height * (image.width / image.height), height, 1);
      ctx.render();
    });
    return () => { cancelled = true; };
  }, [avatar.src, avatar.pixelated]);
  useEffect(() => {
    const ctx = sceneRef.current; if (!ctx) return;
    const y = avatar.story * STORY_HEIGHT;
    ctx.avatar.position.set(avatar.x, y + 0.01, avatar.z); ctx.avatarShadow.position.set(avatar.x, y + 0.012, avatar.z);
    ctx.avatar.userData.story = fitsInRoom(props.room.points, avatar.x, avatar.z, 0) ? avatar.story : -1;
    applyStoryView(ctx); ctx.render();
  }, [avatar.x, avatar.z, avatar.story]); // eslint-disable-line react-hooks/exhaustive-deps

  // 선택 표시
  useEffect(() => {
    const ctx = sceneRef.current; if (!ctx) return;
    const target = selectedId === AVATAR_ID ? ctx.avatar : selectedId ? ctx.items.get(selectedId)?.group : undefined;
    ctx.selection.visible = Boolean(target);
    if (target) { ctx.selection.setFromObject(target); }
    ctx.render();
  }, [selectedId, items, avatar.x, avatar.z]);

  return <div ref={hostRef} className="house3d">{failed && <p className="house3d-fallback">이 기기에서는 3D(WebGL)를 사용할 수 없어요. 브라우저의 하드웨어 가속을 켜 주세요.</p>}</div>;
}

/** 위층은 그 층을 볼 때만 보이고, 아래층 가구는 위층을 볼 때 숨긴다. */
function applyStoryView(ctx: Scene) {
  ctx.shell.children.forEach(level => { level.visible = (level.userData.story ?? 0) <= ctx.viewStory; });
  const avatarStory = ctx.avatar.userData.story ?? 0;
  ctx.avatar.visible = avatarStory === -1 || avatarStory === ctx.viewStory; ctx.avatarShadow.visible = ctx.avatar.visible;
}

function applyLighting(ctx: Scene, night: boolean, sky: string) {
  ctx.scene.background = new THREE.Color(sky);
  ctx.scene.fog = new THREE.Fog(sky, 25, 60);
  ctx.hemi.intensity = night ? 0.35 : 2.2; ctx.hemi.color.set(night ? "#7080b0" : "#ffffff");
  ctx.sun.intensity = night ? 0.12 : 2.4;
  ctx.furniture.traverse(child => {
    if ((child as THREE.PointLight).isPointLight && child.userData.nightLight) (child as THREE.PointLight).intensity = night ? 6 : 0;
    const mesh = child as THREE.Mesh;
    if (mesh.userData.glass) { const material = mesh.material as THREE.MeshStandardMaterial; material.color.set(night ? "#2a3654" : "#bfe0ec"); material.emissive.set(night ? "#1c2540" : "#bfe0ec"); }
  });
}

/** 카메라 쪽을 향한 벽은 낮게 잘라(컷어웨이) 방 안이 보이게 한다. 잘린 벽의 벽 장식도 숨긴다. */
function updateCutaway(ctx: Scene) {
  const { x, z } = ctx.camera.position;
  ctx.walls.forEach(wall => {
    const facing = wall.normal[0] * (x - wall.mid[0]) + wall.normal[1] * (z - wall.mid[1]) > 0;
    wall.full = wall.story < ctx.viewStory || facing;
    wall.group.scale.y = wall.full ? 1 : 0.06;
  });
  ctx.furniture.children.forEach(child => {
    const story = child.userData.story ?? 0;
    const onView = story === -1 || story === ctx.viewStory;
    const perStory = ctx.walls.filter(entry => entry.story === 0).length;
    const wall = child.userData.wall !== undefined ? ctx.walls[story * perStory + child.userData.wall] : undefined;
    child.visible = onView && (wall ? wall.full : true);
  });
}
