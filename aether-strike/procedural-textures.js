import * as THREE from 'three';

let cache = null;
let particleCache = null;

function rng(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d', { alpha: true })];
}

function textureFromCanvas(c, { srgb = false, repeat = 1 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function makeHullColor() {
  const [c, x] = canvas(256), r = rng(42);
  const g = x.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, '#203554');
  g.addColorStop(.45, '#14243c');
  g.addColorStop(1, '#0b1628');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.globalAlpha = .42;
  for (let yy = 0; yy < 256; yy += 32) {
    x.strokeStyle = yy % 64 ? '#355274' : '#091421';
    x.lineWidth = yy % 64 ? 1 : 2;
    x.beginPath(); x.moveTo(0, yy + .5); x.lineTo(256, yy + .5); x.stroke();
  }
  for (let xx = 0; xx < 256; xx += 48) {
    x.strokeStyle = '#091421'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(xx + .5, 0); x.lineTo(xx + .5, 256); x.stroke();
  }
  x.globalAlpha = .23;
  for (let i = 0; i < 180; i++) {
    const px = r() * 256, py = r() * 256, len = 3 + r() * 17;
    x.strokeStyle = r() > .5 ? '#9bb7d0' : '#000';
    x.lineWidth = r() > .85 ? 1.2 : .55;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + len, py + (r() - .5) * 2); x.stroke();
  }
  x.globalAlpha = 1;
  return textureFromCanvas(c, { srgb: true, repeat: 2.4 });
}

function makeRoughness() {
  const [c, x] = canvas(256), r = rng(71);
  const img = x.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.max(38, Math.min(228, 128 + (r() - .5) * 72 + (r() > .985 ? 70 : 0)));
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.globalAlpha = .5;
  x.fillStyle = '#202020';
  for (let y = 0; y < 256; y += 32) x.fillRect(0, y, 256, 1);
  for (let xx = 0; xx < 256; xx += 48) x.fillRect(xx, 0, 1, 256);
  x.globalAlpha = 1;
  return textureFromCanvas(c, { repeat: 2.4 });
}

function makeNormalLike() {
  const [c, x] = canvas(256), r = rng(99);
  const img = x.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 126 + Math.floor((r() - .5) * 14);
    img.data[i + 1] = 126 + Math.floor((r() - .5) * 14);
    img.data[i + 2] = 245;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.globalAlpha = .6;
  x.strokeStyle = 'rgb(116,142,244)';
  x.lineWidth = 2;
  for (let y = 16; y < 256; y += 32) { x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); }
  x.globalAlpha = 1;
  return textureFromCanvas(c, { repeat: 2.4 });
}

function makeRockColor() {
  const [c, x] = canvas(256), r = rng(123);
  const img = x.createImageData(256, 256);
  for (let yy = 0; yy < 256; yy++) for (let xx = 0; xx < 256; xx++) {
    const i = (yy * 256 + xx) * 4;
    const wave = Math.sin(xx * .08) * 9 + Math.sin((xx + yy) * .035) * 7;
    const n = (r() - .5) * 28 + wave;
    img.data[i] = Math.max(18, Math.min(78, 42 + n));
    img.data[i + 1] = Math.max(28, Math.min(98, 58 + n));
    img.data[i + 2] = Math.max(40, Math.min(122, 78 + n));
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return textureFromCanvas(c, { srgb: true, repeat: 3.2 });
}

function makeRockRoughness() {
  const [c, x] = canvas(128), r = rng(321);
  const img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 175 + Math.floor(r() * 72);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v);
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return textureFromCanvas(c, { repeat: 3.2 });
}

function makeEmissiveStripe() {
  const [c, x] = canvas(128);
  x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#fff';
  for (let y = 7; y < 128; y += 24) x.fillRect(0, y, 128, 4);
  x.globalAlpha = .55;
  for (let xx = 15; xx < 128; xx += 32) x.fillRect(xx, 0, 2, 128);
  x.globalAlpha = 1;
  return textureFromCanvas(c, { repeat: 1.5 });
}

function radialSprite(size, stops) {
  const [c, x] = canvas(size);
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [p, col] of stops) g.addColorStop(p, col);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return textureFromCanvas(c, { srgb: true });
}

function makeSparkSprite() {
  const [c, x] = canvas(128);
  x.clearRect(0, 0, 128, 128);
  const g = x.createLinearGradient(0, 64, 128, 64);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(.42, 'rgba(255,210,130,.2)');
  g.addColorStop(.5, 'rgba(255,255,255,1)');
  g.addColorStop(.58, 'rgba(255,120,170,.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 60, 128, 8);
  return textureFromCanvas(c, { srgb: true });
}

function makeCloudSprite() {
  const [c, x] = canvas(128), r = rng(777);
  x.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 18; i++) {
    const px = 30 + r() * 68, py = 38 + r() * 50, rr = 16 + r() * 25;
    const g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, 'rgba(220,238,255,.22)');
    g.addColorStop(.55, 'rgba(125,160,192,.11)');
    g.addColorStop(1, 'rgba(70,100,135,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, Math.PI * 2); x.fill();
  }
  return textureFromCanvas(c, { srgb: true });
}

export function getProceduralTextures(maxAnisotropy = 4) {
  if (!cache) {
    cache = {
      hullColor: makeHullColor(),
      hullRoughness: makeRoughness(),
      hullNormal: makeNormalLike(),
      rockColor: makeRockColor(),
      rockRoughness: makeRockRoughness(),
      emissiveStripe: makeEmissiveStripe(),
    };
  }
  for (const t of Object.values(cache)) t.anisotropy = Math.max(1, Math.min(maxAnisotropy || 1, 8));
  return cache;
}

export function getParticleTextures() {
  if (!particleCache) {
    particleCache = {
      glow: radialSprite(128, [[0, 'rgba(255,255,255,1)'], [.18, 'rgba(130,245,255,.9)'], [.48, 'rgba(82,170,255,.34)'], [1, 'rgba(0,0,0,0)']]),
      smoke: radialSprite(128, [[0, 'rgba(210,225,242,.36)'], [.35, 'rgba(95,120,145,.24)'], [.72, 'rgba(30,40,55,.12)'], [1, 'rgba(0,0,0,0)']]),
      spark: makeSparkSprite(),
      cloud: makeCloudSprite(),
    };
  }
  return particleCache;
}
