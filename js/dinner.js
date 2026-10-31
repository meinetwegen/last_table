const SEATS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SEAT_POS = { 1: [292, 398], 2: [419, 228], 7: [590, 228], 4: [770, 228], 8: [949, 228],
  3: [427, 587], 9: [599, 587], 5: [775, 587], 10: [945, 587], 6: [1067, 402] };
const FACING = { 1: "right", 6: "left", 2: "down", 7: "down", 4: "down", 8: "down", 3: "up", 9: "up", 5: "up", 10: "up" };
const PLATE = { 1: [385, 400], 6: [989, 404], 2: [419, 310], 7: [590, 310], 4: [770, 310], 8: [949, 310],
  3: [427, 499], 9: [599, 499], 5: [775, 499], 10: [945, 499] };
const SEAT_PX = 112;
const DISH_COLORS = { soup: "#d97333", dolce: "#e6d19e", osso: "#80471f", fish: "#d9ccb3", special: "#d1992e" };
const PROP_NAMES = ["plate", "glass", "knife", "spill", "dish_soup", "dish_dolce", "dish_osso", "dish_fish", "dish_special", "dish_burnt"];

const Dinner = {
  assign: {}, sel: "", guests: [], tokens: new Map(), n: 0, standAway: false,
  items: { plates: {}, glasses: {}, knives: {}, marks: {}, extra: [], pulse: -1 },

  init() {
    this.room = $("#room"); this.roomBg = $("#room-bg"); this.canvas = $("#items"); this.ctx = this.canvas.getContext("2d");
    this.tokensEl = $("#tokens"); this.captionEl = $("#caption"); this.prep = $("#prep");
  },

  clearPrep() { this.prep.innerHTML = ""; },

  async caption(text, ms = 2400) {
    this.captionEl.textContent = text; this.captionEl.style.opacity = 1;
    await sleep(ms);
    this.captionEl.style.opacity = 0;
    await sleep(350);
  },

  async titleCard(title, sub) {
    const card = $("#card");
    $("#card-title").textContent = title; $("#card-sub").textContent = sub;
    card.style.transition = "none"; card.style.opacity = 1; card.classList.remove("hidden");
    void card.offsetWidth; card.style.transition = "";
    await sleep(2300);
    card.style.opacity = 0;
    await sleep(650);
    card.classList.add("hidden");
  },

  menu(title, desc, labels, cols = 1, width = 760) {
    this.clearPrep();
    const panel = el("div", { class: "panel menu", style: `width:${width}px` }, el("h2", {}, title));
    if (desc) panel.append(el("div", { class: "desc" }, desc));
    const grid = el("div", { class: "grid", style: `grid-template-columns:repeat(${cols},1fr)` });
    panel.append(grid);
    return new Promise(res => {
      labels.forEach((lb, i) => {
        const b = el("button", { class: "btn" }, lb);
        b.onclick = () => { this.clearPrep(); res(i); };
        grid.append(b);
      });
      this.prep.append(panel);
    });
  },

  async run(n) {
    this.n = n; GameState.dinner_no = n;
    const info = Story.DINNERS[n - 1];
    this.guests = Story.dinner_guests(n);
    GameState.present = this.guests.slice(); GameState.prep = {};
    this.resetTable();
    await applyBackground(this.roomBg, null, "dining_room");
    this.room.classList.remove("hidden"); this.prep.classList.remove("hidden");
    const card = $("#card");
    card.style.transition = "none"; card.style.opacity = 1; card.classList.remove("hidden");
    $("#card-title").textContent = `DINNER ${n} — ${info.title}`; $("#card-sub").textContent = info.sub;
    Game.fadeInstant(0);
    void card.offsetWidth; card.style.transition = "";
    await sleep(2300);
    card.style.opacity = 0; await sleep(650); card.classList.add("hidden");

    $("#btn-journal-prep").classList.remove("hidden");
    for (const id of this.guests) GameState.meet(id);
    await this.seatingPhase();
    await this.winePhase();
    await this.dishPhase();
    const knives = await this.knifePhase();
    await this.standPhase();
    $("#btn-journal-prep").classList.add("hidden"); Journal.close();
    Story.apply_seating(this.assign);
    await this.buildTable();
    Story.apply_knives(knives);
    this.syncKnives();
    await sleep(600);

    VN.setOverlay(true); VN.clearStage(); VN.resetUi(); VN.fxHandler = (name, args) => this.fx(name, args); VN.show();
    const steps = [];
    if (this.standAway) steps.push(n_("You stand by the door. From here you can see everyone better, but you hear less: part of the lines drown in the noise."));
    steps.push(...Story.reaction_steps(), ...Story.dinner(n));
    await VN.play(steps);
    VN.hide(); VN.clearStage(); VN.fxHandler = null;
    await Game.fade(1, 600);
    this.resetTable();
  },

  resetTable() {
    for (const t of this.tokens.values()) t.el.remove();
    this.tokens.clear();
    Object.assign(this.items, { plates: {}, glasses: {}, knives: {}, marks: {}, extra: [], pulse: -1 });
    this.drawItems();
    this.roomBg.style.filter = ""; this.assign = {}; this.sel = ""; this.standAway = false;
    this.clearPrep();
  },

  seatingPhase() {
    this.assign = {}; this.sel = "";
    this.clearPrep();
    const hint = el("div", { class: "panel", id: "hint" });
    this.hintEl = hint;
    hint.textContent = "Seat your guests. Pick a guest below, then a seat at the table. Hover over a seat to see what it means and who sits nearby.";
    this.prep.append(hint);
    this.slotBtns = {}; this.guestBtns = {};
    for (const seat of SEATS) {
      const [x, y] = SEAT_POS[seat];
      const b = el("button", { class: "btn slot", style: `left:${x - 64}px;top:${y - 20}px` });
      b.onclick = () => this.onSlot(seat);
      b.onmouseenter = () => this.hover(seat);
      this.prep.append(b); this.slotBtns[seat] = b;
    }
    const bar = el("div", { id: "guestbar", class: "panel", style: "padding:8px" });
    for (const id of this.guests) {
      const b = el("button", { class: "btn" }); b.onclick = () => this.onGuest(id);
      bar.append(b); this.guestBtns[id] = b;
    }
    bar.append(el("div", { class: "spacer" }));
    this.startBtn = el("button", { class: "btn" }, "Seating done →");
    bar.append(this.startBtn);
    this.prep.append(bar);
    this.refreshSeating();
    return new Promise(res => { this.startBtn.onclick = () => { this.clearPrep(); res(); }; });
  },
  seatOf(id) { for (const s of Object.keys(this.assign)) if (this.assign[s] === id) return int(s); return 0; },
  refreshSeating() {
    for (const seat of SEATS) this.slotBtns[seat].textContent = this.assign[seat] ? Chars.name(this.assign[seat]) : ([1, 6].includes(seat) ? `seat ${seat}` : `· ${seat} ·`);
    for (const id of this.guests) {
      const b = this.guestBtns[id], s = this.seatOf(id);
      b.textContent = s ? `${Chars.name(id)}\n[seat ${s}]` : Chars.name(id);
      b.classList.toggle("sel", id === this.sel);
      b.style.opacity = s && id !== this.sel ? .6 : 1;
    }
    this.startBtn.disabled = Object.keys(this.assign).length !== this.guests.length;
  },
  onGuest(id) { const s = this.seatOf(id); if (s) delete this.assign[s]; this.sel = id; this.refreshSeating(); },
  onSlot(seat) {
    if (this.sel) { delete this.assign[seat]; this.assign[seat] = this.sel; this.sel = ""; }
    else if (this.assign[seat]) { this.sel = this.assign[seat]; delete this.assign[seat]; }
    this.refreshSeating(); this.hover(seat);
  },
  hover(seat) {
    let t = Story.SEAT_TITLES[seat];
    const cand = this.sel || this.assign[seat] || "";
    if (cand) {
      const notes = [];
      for (const pr of [...Story.ADJ, ...Story.OPP]) {
        let other = -1;
        if (pr[0] === seat) other = pr[1]; else if (pr[1] === seat) other = pr[0];
        if (other > 0 && this.assign[other] && this.assign[other] !== cand) {
          const r = Chars.find_rel(cand, this.assign[other]);
          if (r) notes.push(`${Chars.name(this.assign[other])} — ${r.label}`);
        }
      }
      if (notes.length) t += `\nNext to ${Chars.name(cand)}: ${notes.join("; ")}`;
    }
    this.hintEl.textContent = t;
  },

  guestLabels() { return this.guests.map(id => `${Chars.title(id)}\n${(CHARS[id] || {}).tag || ""}`); },
  async winePhase() {
    const i = await this.menu("Who gets the wine first?", "It is a mark of respect. But an unsteady hand will cost you their trust.", this.guestLabels(), 2, 780);
    const guest = this.guests[i];
    this.cur = new WineGame(this.n, guest);
    const res = await this.cur.run(this.prep);
    this.cur = null; this.clearPrep();
    await this.caption(Story.apply_wine(guest, res.grade), 2600);
  },

  async dishPhase() {
    const gi = await this.menu("Who gets the special dish?", "A dish is a compliment. A ruined dish is an insult.", this.guestLabels(), 2, 780);
    const guest = this.guests[gi];
    const dl = Story.DISHES.map(d => `${d.name}\n${d.desc} Loved by: ${d.likes.map(x => Chars.name(x)).join(", ")}.`);
    const di = await this.menu("What will you cook for: " + Chars.name(guest) + "?", "A harder dish is riskier, but if you guess their taste, the guest will appreciate it.", dl, 1, 860);
    const dish = Story.DISHES[di];
    this.cur = new DishGame(dish, guest, this.n);
    const res = await this.cur.run(this.prep);
    this.cur = null; this.clearPrep();
    await this.caption(Story.apply_dish(guest, dish, res.grade), 3000);
  },

  knifePhase() {
    this.clearPrep();
    const panel = el("div", { class: "panel menu", style: "width:700px;top:110px" }, el("h2", {}, "Knives on the table"),
      el("div", { class: "desc" }, "Leaving a guest their knife shows trust. Taking it away makes the table safer, but the guest will notice."));
    const boxes = {};
    for (const id of this.guests) {
      const cb = el("input", { type: "checkbox" }); cb.checked = true; boxes[id] = cb;
      panel.append(el("label", { class: "knife-row" }, cb, `${Chars.title(id)} — keeps the knife`));
    }
    const ok = el("button", { class: "btn", style: "width:100%;margin-top:10px" }, "Done →");
    panel.append(ok); this.prep.append(panel);
    return new Promise(res => {
      ok.onclick = () => { const k = {}; for (const id of this.guests) k[id] = boxes[id].checked; this.clearPrep(); res(k); };
    });
  },

  async standPhase() {
    const i = await this.menu("Where will you stand?",
      "By the table you see everything, but you draw attention. By the door no one notices you, but you hear less.", ["By the table", "By the door"], 2, 720);
    this.standAway = i === 1;
    if (this.standAway) GameState.add_var("stood_away", 1);
  },

  async buildTable() {
    await Promise.all(PROP_NAMES.map(p0 => Assets.prop(p0)));
    for (const seat of Object.keys(this.assign)) {
      const id = this.assign[seat], sn = int(seat);
      await this.spawnToken(id, Chars.name(id), Chars.color(id), sn, 1);
      this.items.plates[sn] = true; this.items.glasses[sn] = 1; this.items.knives[sn] = true;
      const pm = GameState.prep[id] || {}, mk = {};
      if (pm.wine && !["perfect", "good"].includes(pm.wine)) mk.spill = ["over", "spill"].includes(pm.wine);
      if (pm.dish && pm.dish_grade) { mk.dish = pm.dish; mk.burnt = pm.dish_grade === "ruined"; }
      this.items.marks[sn] = mk;
    }
    this.refreshTokens(); this.drawItems();
  },
  syncKnives() {
    for (const seat of Object.keys(this.assign)) this.items.knives[seat] = GameState.knives[this.assign[seat]] !== false;
    this.drawItems();
  },
  refreshTokens() {
    for (const [id, t] of this.tokens) {
      const tn = int(GameState.tension.get(id, 0));
      t.el.classList.toggle("ring-r", tn >= 3);
      t.el.classList.toggle("ring-a", tn === 2);
    }
  },

  async spawnToken(tag, label, color, seat, alpha) {
    const facing = FACING[seat];
    const e = el("div", { class: "token" });
    e.style.left = (SEAT_POS[seat][0] - SEAT_PX / 2) + "px"; e.style.top = (SEAT_POS[seat][1] - SEAT_PX / 2) + "px";
    e.style.opacity = 0;
    const info = await Assets.seat(CHARS[tag] ? tag : "unknown", facing);
    if (info) {
      const im = info.img, sc = intScale(im.naturalHeight, SEAT_PX);
      const w = im.naturalWidth * sc, h = im.naturalHeight * sc;
      const img = el("img", { src: im.src, width: w, height: h, draggable: "false" });
      img.style.left = (SEAT_PX - w) / 2 + "px"; img.style.top = (SEAT_PX - h) / 2 + "px";
      img.style.transform = `rotate(${info.rot}deg)`;
      e.append(img);
    } else {
      const ph = el("div", { class: "ph", style: `background:${color}` }, (label || "?").slice(0, 1));
      const dirs = { up: "top:-4px;left:42px;border-bottom-color", down: "bottom:-4px;left:42px;border-top-color",
        left: "left:-4px;top:42px;border-right-color", right: "right:-4px;top:42px;border-left-color" };
      const ar = el("div", { class: "arrow", style: dirs[facing] + ":" + shade(color, .3) });
      e.append(ph, ar);
    }
    this.tokensEl.append(e);
    const rec = { el: e, seat, tag };
    this.tokens.set(tag, rec);
    requestAnimationFrame(() => { e.style.opacity = alpha; });
    return rec;
  },

  freeSeat(pref) {
    const used = new Set(Object.keys(this.assign).map(Number));
    for (const t of this.tokens.values()) used.add(t.seat);
    if (!used.has(pref)) return pref;
    for (const s of [7, 9, 8, 10, 4, 5, 2, 3]) if (!used.has(s)) return s;
    return pref;
  },

  _isTop(seat) { return FACING[seat] === "down"; },
  _offs(seat, which) {
    const sg = which === "glass" ? 1 : -1;
    if (seat === 1) return [0, -34 * sg];
    if (seat === 6) return [0, 34 * sg];
    return [34 * sg, this._isTop(seat) ? -3 : 3];
  },
  _prop(name, x, y, targetH) {
    const im = Assets.peek(`assets/props/${name}.png`);
    if (!im) return false;
    const sc = intScale(im.naturalHeight, targetH), w = im.naturalWidth * sc, h = im.naturalHeight * sc;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(im, x - w / 2, y - h / 2, w, h);
    return true;
  },
  _circ(x, y, r, col) { const c = this.ctx; c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); },
  _plate(x, y, dish = "", burnt = false) {
    if (dish) { if (this._prop(burnt ? "dish_burnt" : "dish_" + dish, x, y, 48)) return; }
    else if (this._prop("plate", x, y, 44)) return;
    else if (!DRAW_FALLBACK_PROPS) return;
    this._circ(x + 2, y + 3, 21, "rgba(0,0,0,.35)"); this._circ(x, y, 20, "#d1ccbd"); this._circ(x, y, 14, "#b8b3a3");
    if (dish) { const col = burnt ? "#1f1a17" : DISH_COLORS[dish] || "#996633"; this._circ(x, y, 10, col); this._circ(x + 3, y - 2, 4, burnt ? "#3a302a" : shade(col, .25)); }
  },
  _glass(x, y) {
    if (this._prop("glass", x, y, 22) || !DRAW_FALLBACK_PROPS) return;
    this._circ(x, y, 8, "rgba(190,204,230,.8)"); this._circ(x, y, 5, "#800d1a"); this._circ(x - 2, y - 2, 1.5, "rgba(255,255,255,.7)");
  },
  _knife(x, y) {
    if (this._prop("knife", x, y, 34) || !DRAW_FALLBACK_PROPS) return;
    const c = this.ctx; c.strokeStyle = "#d9dee6"; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x, y + 14); c.stroke();
    c.strokeStyle = "#59331a"; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y + 14); c.lineTo(x, y + 19); c.stroke();
  },
  _spill(x, y) {
    if (this._prop("spill", x, y, 40)) return;
    const red = "rgba(128,10,26,.75)";
    this._circ(x, y, 14, red); this._circ(x + 12, y + 5, 8, red); this._circ(x - 10, y + 8, 6, red); this._circ(x + 4, y - 12, 5, red);
  },
  drawItems(time = 0) {
    const c = this.ctx, it = this.items;
    c.clearRect(0, 0, W, H);
    for (const seat of Object.keys(it.plates)) {
      const sn = int(seat), [px, py] = PLATE[sn], mk = it.marks[sn] || {};
      this._plate(px, py, mk.dish || "", !!mk.burnt);
      const [gx, gy] = this._offs(sn, "glass");
      for (let i = 0; i < (it.glasses[sn] || 1); i++) this._glass(px + gx, py + gy + 12 * i);
      if (mk.spill) this._spill(px + gx, py + gy + 6);
      if (it.knives[sn]) { const [kx, ky] = this._offs(sn, "knife"); this._knife(px + kx, py + ky); }
    }
    for (const e of it.extra) {
      const [px, py] = PLATE[e.seat];
      if (e.kind === "plate") this._plate(px, py); else if (e.kind === "dish") this._plate(px, py, "special");
      else if (e.kind === "glass") this._glass(px, py); else if (e.kind === "knife") this._knife(px, py);
    }
    if (it.pulse > 0) {
      const [sx, sy] = SEAT_POS[it.pulse];
      c.strokeStyle = "rgba(230,77,77,.85)"; c.lineWidth = 3; c.beginPath(); c.arc(sx, sy, 52 + 6 * Math.sin(time / 160), 0, 7); c.stroke();
    }
  },
  _pulseLoop() {
    if (this._pl) return; this._pl = true;
    const f = t => { this.drawItems(t); if (this.items.pulse > 0) requestAnimationFrame(f); else { this._pl = false; this.drawItems(); } };
    requestAnimationFrame(f);
  },

  tok(id) { return this.tokens.get(id); },
  async peek(sec) { await VN.setUiVisible(false); await sleep(sec * 1000); await VN.setUiVisible(true); },
  moveTok(t, seat) { t.el.style.left = (SEAT_POS[seat][0] - SEAT_PX / 2) + "px"; t.el.style.top = (SEAT_POS[seat][1] - SEAT_PX / 2) + "px"; },

  async fx(name, a) {
    switch (name) {
      case "peek": return this.peek(a.length ? +a[0] : 1.6);
      case "swap": {
        const x = this.tok(a[0]), y = this.tok(a[1]); if (!x || !y) return;
        await VN.setUiVisible(false);
        const sx = x.seat, sy = y.seat; this.moveTok(x, sy); this.moveTok(y, sx); x.seat = sy; y.seat = sx;
        await sleep(1600); await VN.setUiVisible(true); return;
      }
      case "silent_swap": {
        const x = this.tok(a[0]), y = this.tok(a[1]); if (!x || !y) return;
        const sx = x.seat, sy = y.seat; this.moveTok(x, sy); this.moveTok(y, sx); x.seat = sy; y.seat = sx; return;
      }
      case "blink": {
        const t = this.tok(a[0]); if (!t) return;
        const home = t.seat, away = this.freeSeat(int(a[1])), delay = (a[2] ?? 3) * 1000;
        this.moveTok(t, away); setTimeout(() => this.moveTok(t, home), delay); return;
      }
      case "vanish": { const t = this.tok(a[0]); if (t) t.el.style.opacity = 0; return; }
      case "appear": { const t = this.tok(a[0]); if (t) t.el.style.opacity = 1; return; }
      case "vanish_many": {
        await VN.setUiVisible(false);
        for (const id of a[0]) { const t = this.tok(id); if (t) t.el.style.opacity = 0; }
        await sleep(2000); await VN.setUiVisible(true); return;
      }
      case "extra_guest": await this.spawnToken(String(a[0]), String(a[2]), "#73737f", this.freeSeat(int(a[1])), .85); return this.peek(1.4);
      case "ghost": await this.spawnToken(String(a[0]), String(a[2]), "#738cb3", this.freeSeat(int(a[1])), .55); return;
      case "remove_extra": { const t = this.tok(a[0]); if (t) { this.tokens.delete(a[0]); t.el.style.opacity = 0; setTimeout(() => t.el.remove(), 500); } return; }
      case "item_flash": {
        const item = { kind: String(a[0]), seat: this.freeSeat(int(a[1])) };
        this.items.extra.push(item); this.drawItems();
        setTimeout(() => { this.items.extra = this.items.extra.filter(e => e !== item); this.drawItems(); }, +a[2] * 1000);
        return this.peek(Math.min(+a[2], 1.2));
      }
      case "flicker": {
        for (let i = 0; i < 3; i++) { this.roomBg.style.filter = "brightness(.35)"; await sleep(80); this.roomBg.style.filter = ""; await sleep(80); }
        return;
      }
      case "reflect": {
        const t = this.tok(a[0]); if (!t) return;
        await VN.setUiVisible(false); t.el.classList.add("alt"); await sleep(900); t.el.classList.remove("alt"); await VN.setUiVisible(true); return;
      }
      case "stare": {
        const t = this.tok(a[0]); if (!t) return;
        await VN.setUiVisible(false); t.el.classList.add("stare"); await sleep(2500); t.el.classList.remove("stare"); await VN.setUiVisible(true); return;
      }
      case "laugh": {
        const t = this.tok(a[0]); if (!t) return;
        await VN.setUiVisible(false); t.el.classList.add("laugh"); await sleep(1300); t.el.classList.remove("laugh"); await sleep(300); await VN.setUiVisible(true); return;
      }
      case "empty_chair": {
        this.items.pulse = this.freeSeat(int(a[0])); this._pulseLoop();
        await this.peek(1.6);
        setTimeout(() => { this.items.pulse = -1; }, ((a[1] ?? 2) * 1000)); return;
      }
      case "player_leave": await Game.fade(1, 500); await sleep(500); await Game.fade(0, 500); return;
      case "shake": this.room.classList.add("shake"); await sleep(380); this.room.classList.remove("shake"); return;
    }
  },
};
const n_ = text => ({ say: "", t: text });
