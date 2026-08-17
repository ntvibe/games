import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function hash1(n) {
  return (Math.sin(n * 127.1 + 311.7) * 43758.5453123) % 1 + 1 % 1;
}

export function hash(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u);
}

export function fbm1(x) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    sum += noise1(x * freq) * amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

export function makeRng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size, painter, colorSpace = THREE.SRGBColorSpace) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: true });
  painter(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 2;
  tex.needsUpdate = true;
  return tex;
}

export function makeHullAlbedo(size = 256, seed = 7) {
  const rng = makeRng(seed);
  return makeCanvas(size, (ctx, s) => {
    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pad = 2 + rng() * 3;
        const lum = 9 + Math.floor(rng() * 18);
        ctx.fillStyle = `rgb(${lum},${lum + 2},${lum + 8})`;
        ctx.fillRect(x * 32 + pad, y * 32 + pad, 32 - pad * 2, 32 - pad * 2);
        if (rng() > 0.48) {
          ctx.strokeStyle = `rgba(95,245,255,${0.08 + rng() * 0.14})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x * 32 + 5, y * 32 + 7 + rng() * 18);
          ctx.lineTo(x * 32 + 27, y * 32 + 7 + rng() * 18);
          ctx.stroke();
        }
      }
    }
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 90; i++) {
      const v = 15 + rng() * 25;
      ctx.fillStyle = `rgba(255,255,255,${v / 255})`;
      ctx.fillRect(rng() * s, rng() * s, 1 + rng() * 4, 1);
    }
  });
}

export function makeRoughness(size = 128, seed = 13) {
  const rng = makeRng(seed);
  return makeCanvas(size, (ctx, s) => {
    const image = ctx.createImageData(s, s);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = 82 + Math.floor(rng() * 116);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, THREE.NoColorSpace);
}

export function makeGlowDisc(size = 128) {
  return makeCanvas(size, (ctx, s) => {
    const c = s * 0.5;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(255,255,255,.95)');
    g.addColorStop(0.32, 'rgba(130,235,255,.58)');
    g.addColorStop(0.68, 'rgba(90,120,255,.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

export function makeSmoke(size = 128, seed = 29) {
  const rng = makeRng(seed);
  return makeCanvas(size, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    for (let i = 0; i < 28; i++) {
      const x = s * (0.5 + (rng() - 0.5) * 0.35);
      const y = s * (0.5 + (rng() - 0.5) * 0.35);
      const r = s * (0.1 + rng() * 0.24);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${0.025 + rng() * 0.05})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

export function makeSpark(size = 128) {
  return makeCanvas(size, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const g = ctx.createLinearGradient(0, s / 2, s, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.58, 'rgba(120,210,255,.22)');
    g.addColorStop(0.84, 'rgba(230,255,255,.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(2, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(4, s / 2);
    ctx.lineTo(s - 4, s / 2);
    ctx.stroke();
  });
}

export function makeGlyphTexture(size = 256, seed = 41) {
  const rng = makeRng(seed);
  return makeCanvas(size, (ctx, s) => {
    ctx.fillStyle = '#05060b';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(105,247,255,.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const y = 8 + i * 14;
      ctx.beginPath();
      let x = rng() * 16;
      ctx.moveTo(x, y);
      while (x < s) {
        x += 5 + rng() * 18;
        const dy = (rng() - 0.5) * 8;
        ctx.lineTo(x, y + dy);
        if (rng() > 0.75) ctx.lineTo(x, y + dy + (rng() > 0.5 ? 7 : -7));
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(165,115,255,.16)';
    for (let i = 0; i < 55; i++) {
      const w = 1 + rng() * 7;
      ctx.fillRect(rng() * s, rng() * s, w, 1);
    }
  });
}

export function makeTexturePack() {
  return {
    hull: makeHullAlbedo(),
    roughness: makeRoughness(),
    glow: makeGlowDisc(),
    smoke: makeSmoke(),
    spark: makeSpark(),
    glyph: makeGlyphTexture()
  };
}
