const W = 1376, H = 768;

const CROPS = {};
const TINTS = { ending_a: [1, .92, .75], ending_b: [1, .6, .6], ending_c: [.72, .62, 1], ending_d: [.5, .55, .66], ending_e: [.75, .88, 1],
  kitchen: [1, .85, .6], backdoor: [.5, .65, 1], empty: [.45, .45, .55], cellar: [.6, .7, 1], study: [.9, .8, .7] };

const DRAW_FALLBACK_PROPS = true;

const Assets = {
  _p: new Map(), _r: new Map(),
  img(path) {
    if (!this._p.has(path)) {
      this._p.set(path, new Promise(res => {
        const im = new Image();
        im.onload = () => { this._r.set(path, im); res(im); };
        im.onerror = () => res(null);
        im.src = (window.EMBED && window.EMBED[path]) || path;
      }));
    }
    return this._p.get(path);
  },
  peek(path) { return this._r.get(path) || null; },
  async sprite(id, mood) {
    if (mood) { const a = await this.img(`assets/sprites/${id}_${mood}.png`); if (a) return a; }
    return this.img(`assets/sprites/${id}.png`);
  },
  async seat(id, facing) {
    const ROT = { down: 0, up: 180, right: -90, left: 90 };
    const exact = await this.img(`assets/sprites/seat/${id}_${facing}.png`);
    if (exact) return { img: exact, rot: 0 };
    const base = await this.img(`assets/sprites/seat/${id}_down.png`);
    if (base) return { img: base, rot: ROT[facing] || 0 };
    return null;
  },
  prop(name) { return this.img(`assets/props/${name}.png`); },
  async bg(key) {
    if (key.startsWith("ending_")) {
      for (const ext of ["png", "jpg", "webp"]) {
        const im = await this.img(`assets/endings/${key}.${ext}`);
        if (im) return { src: im.src, crop: null, real: true, w: im.naturalWidth, ending: true };
      }
    }
    for (const ext of ["png", "jpg", "webp"]) {
      const im = await this.img(`assets/backgrounds/${key}.${ext}`);
      if (im) return { src: im.src, crop: null, real: true, w: im.naturalWidth };
    }
    for (const ext of ["png", "jpg", "webp"]) {
      const room = await this.img(`assets/backgrounds/dining_room.${ext}`);
      if (room) return { src: room.src, crop: CROPS[key] || null };
    }
    return null;
  },
};

function intScale(srcH, targetH) {
  if (srcH <= 0) return 1;
  if (srcH >= targetH * 0.9) return targetH / srcH;
  return Math.max(1, Math.round(targetH / srcH));
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = c => Math.round(clamp(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt, 0, 255));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

async function applyBackground(bgEl, tintEl, key) {
  const b = await Assets.bg(key || "dining_room");
  if (!b) { bgEl.style.backgroundImage = "none"; }
  else {
    bgEl.style.backgroundImage = `url("${b.src}")`;
    bgEl.style.imageRendering = b.w && b.w > W * 1.05 ? "auto" : "pixelated";
    if (b.crop) {
      const [fx, fy, fw, fh] = b.crop;
      bgEl.style.backgroundSize = `${100 / fw}% ${100 / fh}%`;
      bgEl.style.backgroundPosition = `${fw >= 1 ? 0 : fx / (1 - fw) * 100}% ${fh >= 1 ? 0 : fy / (1 - fh) * 100}%`;
    } else { bgEl.style.backgroundSize = "100% 100%"; bgEl.style.backgroundPosition = "0 0"; }
  }
  if (tintEl) {
    const t = TINTS[key];
    tintEl.style.background = t ? `rgb(${t.map(v => Math.round(Math.min(1, v) * 255)).join(",")})` : "transparent";
  }
}

async function makePortrait(id, mood, h) {
  const box = document.createElement("div");
  box.className = "sprite";
  box._mood = mood || "";
  const img = await Assets.sprite(id, mood);
  if (img) {
    const sc = intScale(img.naturalHeight, h);
    const w = Math.round(img.naturalWidth * sc), hh = Math.round(img.naturalHeight * sc);
    const im = document.createElement("img");
    im.src = img.src; im.width = w; im.height = hh; im.draggable = false;
    if (img.naturalHeight > h) im.className = "smooth";
    box.style.width = w + "px"; box.style.height = hh + "px";
    box._w = w; box._h = hh;
    box.appendChild(im);
  } else {
    const w = Math.round(h * 0.46);
    const col = Chars.color(id), dark = shade(col, -0.45), light = shade(col, 0.2);
    const pts = [[.04, 1], [.1, .56], [.33, .44], [.67, .44], [.9, .56], [.96, 1]].map(([x, y]) => `${x * w},${y * h}`).join(" ");
    const hint = `${id}${mood ? "_" + mood : ""}.png`;
    box.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polygon points="${pts}" fill="${dark}" stroke="${light}" stroke-width="3"/>
      <circle cx="${w / 2}" cy="${h * .3}" r="${w * .19}" fill="${col}" stroke="${light}" stroke-width="3"/>
      <text x="${w / 2}" y="${h * .64}" text-anchor="middle" font-size="${h < 200 ? 11 : 20}" fill="#fff" font-family="Georgia,serif">${h < 200 ? "" : Chars.name(id)}</text>
      ${h < 200 ? "" : `<text x="${w / 2}" y="${h * .64 + 22}" text-anchor="middle" font-size="13" fill="rgba(255,255,255,.55)" font-family="monospace">sprites/${hint}</text>`}</svg>`;
    box.style.width = w + "px"; box.style.height = h + "px";
    box._w = w; box._h = h;
  }
  return box;
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}
const $ = sel => document.querySelector(sel);
