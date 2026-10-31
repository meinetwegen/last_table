const SAVE_KEY = "last_table_save_v1";
const ENDING_SUB = {
  A: "The rules held the house together. For now.", B: "The table has a new mistress.", C: "To still being here.",
  D: "Nobody came.", E: "Push back the chair. Do not look back.",
};

const Game = {
  async fade(to, ms = 500) {
    const f = $("#fader");
    f.style.transition = `opacity ${ms}ms`; f.style.opacity = to;
    await sleep(ms + 30);
  },
  fadeInstant(v) {
    const f = $("#fader");
    f.style.transition = "none"; f.style.opacity = v; void f.offsetWidth; f.style.transition = "";
  },

  setMode(mode) {
    $("#scene-bg").classList.toggle("hidden", mode !== "vn");
    if (mode !== "dinner") { $("#room").classList.add("hidden"); $("#prep").classList.add("hidden"); $("#prep").innerHTML = ""; }
  },

  fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    $("#game").style.transform = `translate(-50%,-50%) scale(${s})`;
  },

  async init() {
    this.fit(); window.addEventListener("resize", () => this.fit());
    VN.init(); Journal.init(); Dinner.init();
    window.addEventListener("keydown", e => { if (e.code === "Escape") Journal.close(); });
    $("#btn-full").onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    };
    $("#btn-new").onclick = () => this.newGame(0);
    $("#btn-continue").onclick = () => this.continueGame();
    $("#btn-menu").onclick = () => this.toTitle();
    const ch = $("#chapters");
    if (!/debug/.test(location.search + location.hash)) ch.classList.add("hidden");
    for (let i = 1; i <= 6; i++) { const b = el("button", { class: "btn" }, String(i)); b.onclick = () => this.newGame(2 * i - 1); ch.append(b); }
    await applyBackground($("#title .bgimg"), null, "title");
    this.toTitle();
    Assets.img("assets/backgrounds/dining_room.jpg");
  },

  toTitle() {
    $("#endscreen").classList.add("hidden"); $("#title").classList.remove("hidden");
    VN.hide(); this.setMode("none"); this.fadeInstant(0);
    $("#btn-continue").classList.toggle("hidden", !this.loadSave());
  },

  loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  save(idx) { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ idx, state: GameState.snapshot() })); } catch (e) { /* без сохранения */ } },
  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } },

  newGame(idx) { GameState.reset(); this.run(idx); },
  continueGame() {
    const sv = this.loadSave(); if (!sv) return;
    GameState.restore(sv.state); this.run(sv.idx);
  },

  async run(idx) {
    $("#title").classList.add("hidden");
    for (let i = idx; i <= 12; i++) {
      this.save(i);
      if (i === 0) await this.interlude(Story.interlude(0));
      else if (i === 12) {
        const code = Story.pick_ending();
        const b = await Assets.bg("ending_" + code.toLowerCase());
        await this.interlude(Story.ending(code), !!(b && b.ending));
      }
      else if (i % 2 === 1) await this.dinner((i + 1) / 2);
      else await this.interlude(Story.interlude(i / 2));
    }
    this.clearSave();
    await this.showEnd();
  },

  async dinner(n) {
    await this.fade(1, 500);
    this.setMode("dinner");
    await Dinner.run(n);
    this.setMode("none");
  },

  async interlude(steps, cg = false) {
    await this.fade(1, 500);
    this.setMode("vn");
    VN.setOverlay(false); VN.clearStage(); VN.resetUi(); VN.fxHandler = null; VN.show();
    VN.root.classList.toggle("cg", cg);
    await this.fade(0, 500);
    await VN.play(steps);
    await this.fade(1, 600);
    VN.hide(); VN.clearStage();
  },

  async showEnd() {
    const code = Story.pick_ending(), g = GameState;
    $("#end-title").textContent = Story.ending_title(code);
    $("#end-sub").textContent = ENDING_SUB[code] || "";
    await applyBackground($("#endscreen .bgimg"), $("#endscreen .bgtint"), "ending_" + code.toLowerCase());
    $("#end-stats").textContent = `Order ${g.v("order")} · Sara ${g.v("sara")} · Chaos ${g.v("chaos")} · Stranger ${g.v("stranger")} · Losses ${g.v("casualties")} · Clumsy moments ${g.v("clumsy")}`;
    this.setMode("none");
    $("#endscreen").classList.remove("hidden");
    await this.fade(0, 600);
  },
};

window.addEventListener("DOMContentLoaded", () => Game.init());
window.GAME = { Game, VN, Dinner, Journal, GameState, Story, Assets };
