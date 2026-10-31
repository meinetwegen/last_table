const TS = () => window.TIME_SCALE || 1;

class WineGame {
  constructor(dinnerNo, guest) {
    this.d = dinnerNo; this.guest = guest;
    this.level = 0; this.pouring = false; this.finished = false; this.timeLeft = 9; this.t = 0;
    this.rate = 0.30 + 0.025 * dinnerNo;
    this.half = Math.max(0.045, 0.085 - 0.006 * dinnerNo);
    this.target = 0.5 + Math.random() * 0.28;
    if (int(GameState.v("wine_tip")) > 0) this.half *= 1.3;
    this.spaceDown = false;
  }
  run(parent) {
    return new Promise(res => {
      this.resolve = res;
      this.panel = el("div", { class: "panel game-panel", style: "width:540px" });
      this.panel.append(
        el("h3", {}, "Pour the wine: " + Chars.title(this.guest)),
        el("div", { class: "hint" }, "Hold SPACE or the button to pour. Release when the level is in the golden zone. Don't overfill the glass!"));
      this.canvas = el("canvas", { width: 300, height: 300 });
      this.info = el("div", { class: "info" });
      this.btn = el("button", { class: "btn" }, "POUR (hold)");
      this.panel.append(this.canvas, this.info, this.btn);
      parent.append(this.panel);
      this.ctx = this.canvas.getContext("2d");
      const start = e => { e.preventDefault(); this.start(); }, stop = e => { e.preventDefault(); this.stop(); };
      this.btn.addEventListener("pointerdown", start);
      for (const ev of ["pointerup", "pointerleave", "pointercancel"]) this.btn.addEventListener(ev, stop);
      this.kd = e => { if (e.code === "Space" && !e.repeat && !this.spaceDown) { this.spaceDown = true; e.preventDefault(); this.start(); } };
      this.ku = e => { if (e.code === "Space" && this.spaceDown) { this.spaceDown = false; e.preventDefault(); this.stop(); } };
      window.addEventListener("keydown", this.kd); window.addEventListener("keyup", this.ku);
      this.last = performance.now();
      const loop = now => {
        if (this.finished) return;
        const dt = Math.min((now - this.last) / 1000, 0.1) * TS(); this.last = now;
        this.tick(dt); this.draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  }
  start() { if (!this.finished) this.pouring = true; }
  stop() { if (this.finished || !this.pouring) return; this.pouring = false; this.evaluate(); }
  tick(dt) {
    this.t += dt; this.timeLeft -= dt;
    if (this.pouring) {
      const wob = 1 + 0.35 * Math.sin(this.t * 7) * (0.4 + 0.1 * this.d);
      this.level += this.rate * wob * dt;
      if (this.level >= 1) { this.level = 1; this.pouring = false; this.finish("spill"); }
    }
    if (this.timeLeft <= 0 && !this.finished) { this.pouring = false; this.evaluate(); }
    if (!this.finished) this.info.textContent = `Time: ${Math.max(0, this.timeLeft).toFixed(1)}`;
  }
  evaluate() {
    const dd = Math.abs(this.level - this.target);
    if (this.level <= 0.02) this.finish("under");
    else if (dd <= this.half * 0.45) this.finish("perfect");
    else if (dd <= this.half) this.finish("good");
    else if (this.level < this.target) this.finish("under");
    else this.finish("over");
  }
  async finish(grade) {
    if (this.finished) return;
    this.finished = true;
    const msg = { perfect: "Perfect! Not a drop wasted.", good: "Good. Your hand didn't shake.", under: "Underfilled. The guest noticed.",
      over: "Overfilled! The wine is at the very rim.", spill: "Spilled! Wine on the tablecloth." };
    this.info.textContent = msg[grade];
    this.info.className = "info " + (grade === "perfect" || grade === "good" ? "good" : "bad");
    this.draw();
    window.removeEventListener("keydown", this.kd); window.removeEventListener("keyup", this.ku);
    await sleep(1300);
    this.panel.remove();
    this.resolve({ grade });
  }
  draw() {
    const c = this.ctx; c.clearRect(0, 0, 300, 300);
    const gx = 100, gw = 100, top = 70, bot = 285, gh = bot - top;
    c.fillStyle = "rgba(190,205,230,.12)"; c.fillRect(gx, top, gw, gh);
    const fh = gh * this.level;
    c.fillStyle = "rgba(140,12,30,.95)"; c.fillRect(gx, bot - fh, gw, fh);
    const yHi = bot - gh * (this.target + this.half), yLo = bot - gh * (this.target - this.half);
    c.fillStyle = "rgba(242,204,76,.25)"; c.fillRect(gx - 14, yHi, gw + 28, yLo - yHi);
    const yiHi = bot - gh * (this.target + this.half * .45), yiLo = bot - gh * (this.target - this.half * .45);
    c.fillStyle = "rgba(242,204,76,.55)"; c.fillRect(gx - 14, yiHi, gw + 28, yiLo - yiHi);
    c.strokeStyle = "#d9e6ff"; c.lineWidth = 3; c.beginPath();
    c.moveTo(gx, top); c.lineTo(gx, bot); c.lineTo(gx + gw, bot); c.lineTo(gx + gw, top); c.stroke();
    c.strokeStyle = "#e08080"; c.lineWidth = 2; c.beginPath(); c.moveTo(gx - 8, top); c.lineTo(gx + gw + 8, top); c.stroke();
    c.save(); c.translate(gx + gw + 40, 30); c.rotate(this.pouring ? -0.9 : -0.35);
    c.fillStyle = "#1a4020"; c.fillRect(-18, 0, 36, 110); c.fillRect(-8, -34, 16, 36); c.restore();
    if (this.pouring) { c.strokeStyle = "rgba(140,12,30,.95)"; c.lineWidth = 4; c.beginPath(); c.moveTo(gx + gw / 2, top - 20); c.lineTo(gx + gw / 2, bot - fh); c.stroke(); }
  }
}

class DishGame {
  constructor(dish, guest, dinnerNo) {
    this.dish = dish; this.guest = guest; this.d = dinnerNo;
    this.stage = 0; this.pos = 0; this.dir = 1; this.score = 0; this.results = []; this.active = false; this.finished = false;
  }
  run(parent) {
    return new Promise(res => {
      this.resolve = res;
      this.panel = el("div", { class: "panel game-panel", style: "width:640px" });
      this.title = el("h3", {}, `${this.dish.name} — for: ${Chars.title(this.guest)}`);
      this.stageLbl = el("div", { style: "font-size:24px;margin:6px 0" });
      this.canvas = el("canvas", { width: 560, height: 80 });
      this.res = el("div", { class: "info" });
      this.btn = el("button", { class: "btn" }, "STOP!");
      this.panel.append(this.title, el("div", { class: "hint" }, "Stop the slider in the green zone: SPACE or the STOP button. Three stages."),
        this.stageLbl, this.canvas, this.res, this.btn);
      parent.append(this.panel);
      this.ctx = this.canvas.getContext("2d");
      this.btn.addEventListener("pointerdown", e => { e.preventDefault(); this.press(); });
      this.kd = e => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); this.press(); } };
      window.addEventListener("keydown", this.kd);
      this.beginStage();
      this.last = performance.now();
      const loop = now => {
        if (this.finished) return;
        const dt = Math.min((now - this.last) / 1000, 0.1) * TS(); this.last = now;
        this.tick(dt); this.draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  }
  beginStage() {
    const diff = this.dish.diff;
    this.speed = (0.85 + 0.1 * this.d + 0.22 * this.stage) * diff;
    this.zh = clamp(0.11 / diff - 0.004 * this.d - 0.01 * this.stage, 0.035, 0.12);
    if (int(GameState.v("dish_tip")) > 0) this.zh = Math.min(this.zh * 1.25, 0.15);
    this.zc = 0.2 + Math.random() * 0.6;
    this.pos = 0; this.dir = 1;
    this.stageLbl.textContent = `Stage ${this.stage + 1}/3: ${this.dish.stages[this.stage]}`;
    this.active = true;
  }
  tick(dt) {
    if (!this.active) return;
    this.pos += this.dir * this.speed * dt;
    if (this.pos >= 1) { this.pos = 1; this.dir = -1; } else if (this.pos <= 0) { this.pos = 0; this.dir = 1; }
  }
  async press() {
    if (!this.active || this.finished) return;
    this.active = false;
    const dd = Math.abs(this.pos - this.zc);
    let pts = 0, msg = "Missed!";
    if (dd <= this.zh * 0.4) { pts = 2; msg = "Perfect!"; } else if (dd <= this.zh) { pts = 1; msg = "Good."; }
    this.score += pts; this.results.push(pts);
    this.res.textContent = msg; this.res.className = "info " + (pts ? "good" : "bad");
    await sleep(800);
    this.res.textContent = "";
    this.stage++;
    if (this.stage >= 3) this.finish(); else this.beginStage();
  }
  async finish() {
    this.finished = true;
    let grade = "ruined";
    if (this.score >= 5) grade = "excellent"; else if (this.score >= 3) grade = "good"; else if (this.score === 2) grade = "poor";
    const names = { excellent: "A flawless dish!", good: "A good dish.", poor: "Mediocre.", ruined: "The dish is ruined!" };
    this.stageLbl.textContent = `Result: ${this.score} of 6 — ${names[grade]}`;
    window.removeEventListener("keydown", this.kd);
    this.draw();
    await sleep(1400);
    this.panel.remove();
    this.resolve({ grade, score: this.score });
  }
  draw() {
    const c = this.ctx, w = 560; c.clearRect(0, 0, w, 80);
    c.fillStyle = "#262121"; c.fillRect(0, 20, w, 30);
    c.strokeStyle = "#998050"; c.lineWidth = 2; c.strokeRect(0, 20, w, 30);
    c.fillStyle = "rgba(77,178,89,.65)"; c.fillRect((this.zc - this.zh) * w, 20, this.zh * 2 * w, 30);
    c.fillStyle = "rgba(140,242,128,.85)"; c.fillRect((this.zc - this.zh * .4) * w, 20, this.zh * .8 * w, 30);
    c.fillStyle = "#ffe680"; c.fillRect(this.pos * w - 4, 10, 8, 50);
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i < this.results.length ? (this.results[i] > 0 ? "#f2cc4c" : "#cc4d4d") : "#666";
      c.beginPath(); c.arc(w / 2 + (i - 1) * 30, 66, 7, 0, 7); c.fill();
    }
  }
}
