/* The rack: four glossy pool balls spelling ADHD in the mode's colours. They roll in from the
   right as the section pins (GSAP ScrollTrigger scrub) and lean toward the cursor. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const { STATIC, REDUCE } = window.CB;
const canvas = document.getElementById('rackCanvas');
const pin = document.getElementById('rackPin');

// Ball colours per mode, A D H D.
const SETS = {
  paper: ['#111111', '#C8102E', '#111111', '#C8102E'],
  noir: ['#D50C08', '#121212', '#EEEBE6', '#D50C08'],
};
const LETTERS = ['A', 'D', 'H', 'D'];

// preserveDrawingBuffer only for ?static screenshots, which read the canvas after it has drawn.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: STATIC });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.85;
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(-4, 6, 8);
scene.add(key, new THREE.AmbientLight(0xffffff, 0.15));

// Soft contact shadow, drawn once into a canvas.
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

// Equirectangular ball texture: base colour with a number disc facing the camera (u = 0.25 is +z).
const isLight = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) > 150; };
function ballTexture(base, letter) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const light = isLight(base);
  g.fillStyle = base; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = light ? '#111111' : '#F7F5F0';
  g.beginPath(); g.arc(256, 256, 74, 0, Math.PI * 2); g.fill();
  g.fillStyle = light ? '#F7F5F0' : '#111111';
  g.font = '700 92px "Bricolage Grotesque", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(letter, 256, 262);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

const R = 1, GAP = 2.36;
const FINAL = [-1.5, -0.5, 0.5, 1.5].map((k) => k * GAP);
const ROLL = Math.PI * 2 * 2 * R; // two full turns, so each letter lands upright
const geo = new THREE.SphereGeometry(R, 96, 64);
const balls = LETTERS.map((L) => {
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04 });
  const mesh = new THREE.Mesh(geo, mat);
  const holder = new THREE.Group(); // leans toward the cursor; the mesh rolls inside it
  holder.add(mesh); scene.add(holder);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -R - 0.01; scene.add(shadow);
  return { L, mesh, holder, shadow, mat, p: 0 };
});

function applyTheme(mode) {
  const set = SETS[mode] || SETS.paper;
  balls.forEach((b, i) => {
    b.mat.map?.dispose();
    b.mat.map = ballTexture(set[i], b.L);
    b.mat.needsUpdate = true;
    b.shadow.material.opacity = mode === 'noir' ? 0.9 : 0.45;
  });
  render();
}
window.addEventListener('cb:theme', (e) => applyTheme(e.detail));
document.fonts.ready.then(() => applyTheme(window.CB.theme()));

function resize() {
  const w = pin.clientWidth, h = pin.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const span = 4 * GAP + 0.6;
  const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  camera.position.set(0, 1.6, Math.max((span / 2) / Math.tan(hfov / 2), 9));
  camera.lookAt(0, w < 760 ? 1.1 : 0.62, 0);
  camera.updateProjectionMatrix();
  render();
}
new ResizeObserver(resize).observe(pin);

// p: 0 = waiting off to the right, 1 = racked in place.
function place() {
  balls.forEach((b, i) => {
    const x = FINAL[i] + (1 - b.p) * (ROLL + 6 + i * 1.2);
    b.holder.position.x = x;
    b.mesh.rotation.z = -(x - FINAL[i]) / R;
    b.shadow.position.x = x;
  });
}
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
pin.addEventListener('pointermove', (e) => {
  const r = pin.getBoundingClientRect();
  pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
  pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
});
pin.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });

function render() {
  place();
  balls.forEach((b, i) => {
    b.holder.rotation.y = pointer.x * 0.45 + (i - 1.5) * -0.04;
    b.holder.rotation.x = pointer.y * 0.22;
  });
  renderer.render(scene, camera);
}

// Only draw while the section is on screen.
let visible = false, raf = 0;
new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) loop(); }).observe(pin);
function loop() {
  raf = 0;
  if (!visible) return;
  pointer.x += (pointer.tx - pointer.x) * 0.06;
  pointer.y += (pointer.ty - pointer.y) * 0.06;
  render();
  if (!REDUCE) raf = requestAnimationFrame(loop);
}

if (REDUCE || STATIC) {
  balls.forEach((b) => { b.p = 1; });
  resize();
} else {
  const { gsap, ScrollTrigger } = window;
  gsap.set('.rack-title em', { yPercent: 110 });
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  balls.forEach((b, i) => tl.to(b, { p: 1, duration: 1, ease: 'power2.out' }, i * 0.18));
  tl.to('.rack-title em', { yPercent: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out' }, 0.3).to({}, { duration: 0.35 });
  ScrollTrigger.create({ trigger: pin, start: () => `top ${document.getElementById('siteHeader').offsetHeight}px`, end: '+=140%', invalidateOnRefresh: true, pin: true, scrub: 0.8, animation: tl, refreshPriority: 5, onUpdate: () => { if (!raf) render(); } });
  resize();
}
