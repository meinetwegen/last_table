const VN = {
  overlay: false, fxHandler: null,
  sprites: new Map(), stageIds: [], speaker: "",
  typing: false, _adv: null, ctrl: false, manualHidden: false, choiceOpen: false, introOpen: false,

  init() {
    this.root = $("#vn"); this.stage = $("#stage"); this.text = $("#text"); this.nameEl = $("#name"); this.tagEl = $("#tag");
    this.plate = $("#nameplate"); this.rel = $("#rel"); this.cont = $("#cont");
    this.choices = $("#choices"); this.clist = $("#choice-list"); this.cprompt = $("#choice-prompt");
    this.locEl = $("#loc"); this.toastEl = $("#toast"); this.hist = $("#history"); this.histBody = $("#history-body");
    this.intro = $("#intro"); this.introRow = $("#intro-row");
    this.root.addEventListener("click", e => {
      if (e.target.closest("button, .panel")) return;
      this.advance();
    });
    $("#btn-journal").onclick = () => Journal.toggle();
    $("#btn-log").onclick = () => this.toggleHist();
    $("#btn-hide").onclick = () => this.toggleHide();
    $("#hist-close").onclick = () => this.toggleHist();
    window.addEventListener("keydown", e => {
      if (e.key === "Control") this.ctrl = true;
      if (this.root.classList.contains("hidden")) return;
      if ((e.code === "Space" || e.code === "Enter") && !this.choiceOpen) { e.preventDefault(); this.advance(); }
      else if (e.code === "KeyH") this.toggleHide();
      else if (e.code === "KeyL") this.toggleHist();
      else if (e.code === "KeyJ") Journal.toggle();
      else if (e.code === "Escape") { Journal.close(); if (!this.hist.classList.contains("hidden")) this.toggleHist(); }
    });
    window.addEventListener("keyup", e => { if (e.key === "Control") this.ctrl = false; });
  },

  show() { this.root.classList.remove("hidden"); },
  hide() { this.root.classList.add("hidden"); },
  setOverlay(on) { this.overlay = on; this.root.classList.toggle("overlay", on); },
  spriteH() { return this.overlay ? 400 : 600; },
  bottomY() { return this.overlay ? H - 156 : H - 40; },

  resetUi() {
    this.text.textContent = ""; this.nameEl.textContent = ""; this.tagEl.textContent = ""; this.rel.textContent = "";
    this.plate.style.display = "none"; this.cont.style.visibility = "hidden";
    this.choices.style.display = "none"; this.choiceOpen = false;
    this.root.classList.remove("peek", "hideui", "cg"); this.manualHidden = false;
    this.hist.classList.add("hidden"); this.intro.classList.add("hidden"); this.introOpen = false;
    this._adv = null; this.typing = false;
  },
  clearStage() {
    this.stage.innerHTML = ""; this.sprites.clear(); this.stageIds = []; this.speaker = "";
  },

  async setUiVisible(on) {
    this.root.classList.toggle("peek", !on);
    await sleep(360);
  },

  async play(steps) { for (const step of steps) await this.exec(step); },

  async exec(st) {
    if ("say" in st) return this.say(st);
    if ("stage" in st) return this.setStage(st.stage);
    if ("choice" in st) return this.choice(st);
    if ("if" in st) return this.play(GameState.check(st.if) ? st.then : (st.else || []));
    if ("set" in st) { for (const k of Object.keys(st.set)) GameState.vars[k] = st.set[k]; return; }
    if ("add" in st) { for (const k of Object.keys(st.add)) GameState.add_var(k, int(st.add[k])); return; }
    if ("rel" in st) { GameState.change_rel(st.rel[0], st.rel[1], int(st.rel[2])); return; }
    if ("clue" in st) {
      if (GameState.add_clue(st.clue)) this.toast("New dossier entry: " + Chars.name(String(st.clue).replace("_secret", "")));
      return;
    }
    if ("intro" in st) return this.introCards(st.intro);
    if ("loc" in st) return this.location(st);
    if ("fx" in st) { if (this.fxHandler) await this.fxHandler(st.fx, st.args || []); return; }
    if ("rewrite" in st) { for (const h of GameState.history) if (h.t === st.rewrite[0]) h.t = st.rewrite[1]; return; }
    if ("wait" in st) return sleep(st.wait * 1000);
  },

  async setStage(ids) {
    const list = [];
    for (const id of ids) if (id && id !== "player" && !list.includes(id)) list.push(id);
    while (list.length > 4) list.shift();
    this.stageIds = list;
    for (const [id, sp] of [...this.sprites]) {
      if (!list.includes(id)) { this.sprites.delete(id); sp.style.opacity = 0; setTimeout(() => sp.remove(), 320); }
    }
    for (const id of list) {
      GameState.meet(id);
      if (!this.sprites.has(id)) {
        const sp = await makePortrait(id, "", this.spriteH());
        sp.style.opacity = 0;
        sp.style.left = (W / 2 - sp._w / 2) + "px";
        sp.style.top = (this.bottomY() - sp._h) + "px";
        this.stage.appendChild(sp);
        this.sprites.set(id, sp);
      }
    }
    await new Promise(r => requestAnimationFrame(r));
    this.place();
  },

  place() {
    const nn = this.stageIds.length;
    this.stageIds.forEach((id, i) => {
      const sp = this.sprites.get(id); if (!sp) return;
      const cx = W * (i + 1) / (nn + 1);
      const isSp = id === this.speaker;
      sp.style.left = Math.round(cx - sp._w / 2) + "px";
      sp.style.top = Math.round(this.bottomY() - sp._h - (isSp ? 14 : 0)) + "px";
      sp.style.opacity = 1;
      sp.style.zIndex = isSp ? 2 : 1;
      sp.classList.toggle("dim", this.speaker !== "" && !isSp);
      sp.classList.toggle("narr", this.speaker === "");
    });
  },

  async setMood(id, mood) {
    const sp = this.sprites.get(id);
    if (!sp || (sp._mood || "") === (mood || "")) return;
    const fresh = await makePortrait(id, mood || "", this.spriteH());
    fresh.style.cssText += `;left:${sp.style.left};top:${sp.style.top};opacity:1`;
    sp.replaceWith(fresh);
    this.sprites.set(id, fresh);
  },

  async say(st) {
    const who = st.say, shown = st.as || who, to = st.to || "";
    if (who !== "" && who !== "player" && !this.stageIds.includes(who)) await this.setStage([...this.stageIds, who]);
    this.speaker = (who === "player") ? "" : who;
    if (who !== "" && who !== "player") await this.setMood(who, st.mood || "");
    this.place();
    this.nameplate(shown, to);
    GameState.history.push({ who: shown, t: st.t });
    await this.type(st.t, who === "" ? "narr" : who === "player" ? "you" : "");
    await this.waitAdvance();
  },

  nameplate(id, to) {
    if (id === "") { this.plate.style.display = "none"; this.rel.textContent = ""; return; }
    this.plate.style.display = "flex";
    this.rel.textContent = "";
    if (id === "player") {
      this.nameEl.textContent = "You"; this.nameEl.style.color = "#9fc7e8"; this.tagEl.textContent = "the one who sets the table";
      return;
    }
    this.nameEl.textContent = Chars.title(id);
    this.nameEl.style.color = shade(Chars.color(id), 0.25);
    this.tagEl.textContent = (CHARS[id] && CHARS[id].tag) || "";
    if (to === "player") this.rel.textContent = "→ speaking to you";
    else if (to) {
      const r = Chars.find_rel(id, to);
      this.rel.textContent = r ? `→ ${Chars.name(to)} · ${r.label}` : `→ ${Chars.name(to)}`;
    }
  },

  async type(text, cls) {
    this.cont.style.visibility = "hidden";
    this.text.className = cls; this.text.textContent = "";
    this.typing = true;
    for (let i = 1; i <= text.length && this.typing; i++) {
      this.text.textContent = text.slice(0, i);
      await sleep(this.ctrl ? 0 : 20);
    }
    this.typing = false;
    this.text.textContent = text;
  },

  waitAdvance() {
    this.cont.style.visibility = "visible";
    return new Promise(res => {
      this._adv = res;
      if (this.ctrl) setTimeout(() => this.advance(), 40);
      const poll = setInterval(() => {
        if (this._adv !== res) { clearInterval(poll); return; }
        if (this.ctrl) this.advance();
      }, 70);
    }).then(() => { this.cont.style.visibility = "hidden"; });
  },

  advance() {
    if (this.manualHidden) { this.toggleHide(); return; }
    if (!this.hist.classList.contains("hidden") || !$("#journal").classList.contains("hidden")) return;
    if (this.choiceOpen) return;
    if (this.typing) { this.typing = false; return; }
    if (this._adv) { const r = this._adv; this._adv = null; r(); }
  },

  async choice(st) {
    const opts = st.choice.filter(op => !("cond" in op) || GameState.check(op.cond));
    if (!opts.length) return;
    this.clist.innerHTML = "";
    this.cprompt.textContent = st.prompt || "";
    const picked = await new Promise(res => {
      opts.forEach((op, i) => {
        const b = el("button", { class: "btn" }, op.t);
        b.onclick = e => { e.stopPropagation(); res(i); };
        this.clist.append(b);
      });
      this.speaker = ""; this.place();
      this.plate.style.display = "none"; this.rel.textContent = ""; this.text.textContent = "";
      this.choices.style.display = "flex"; this.choiceOpen = true;
    });
    this.choices.style.display = "none"; this.choiceOpen = false;
    GameState.history.push({ who: "You (choice)", t: opts[picked].t });
    await this.play(opts[picked].do || []);
  },

  async location(st) {
    if (!this.overlay && st.bg) await applyBackground($("#scene-bg .bgimg"), $("#scene-bg .bgtint"), st.bg);
    this.locEl.textContent = st.loc; this.locEl.style.opacity = 1;
    await sleep(1700);
    this.locEl.style.opacity = 0;
    await sleep(500);
  },
  toast(msg) {
    this.toastEl.textContent = msg; this.toastEl.style.opacity = 1;
    clearTimeout(this._tt); this._tt = setTimeout(() => { this.toastEl.style.opacity = 0; }, 3000);
  },

  async introCards(ids) {
    this.introRow.innerHTML = "";
    for (const id of ids) { GameState.meet(id); this.introRow.append(await this.makeCard(id)); }
    this.plate.style.display = "none"; this.rel.textContent = ""; this.text.textContent = "";
    this.intro.classList.remove("hidden"); this.introOpen = true;
    await this.waitAdvance();
    this.intro.classList.add("hidden"); this.introOpen = false;
  },

  async makeCard(id) {
    const d = CHARS[id] || {};
    const card = el("div", { class: "card", style: `border-color:${Chars.color(id)}` });
    const top = el("div", { class: "top" });
    const por = await makePortrait(id, "", 130);
    por.style.position = "relative"; por.style.opacity = 1;
    top.append(por);
    const nv = el("div", {}, el("div", { class: "nm", style: `color:${shade(Chars.color(id), .25)}` }, Chars.title(id)), el("div", { class: "tg" }, d.tag || ""));
    top.append(nv); card.append(top);
    card.append(el("p", { html: `<b>Public image:</b> ${d.pub || ""}` }));
    let shownRel = 0, relHtml = "";
    for (const r of Chars.relations_of(id)) {
      if (shownRel >= 3) break;
      const o2 = Chars.other(r, id);
      if (o2 === "don" || GameState.met.has(o2) || GameState.present.includes(o2)) {
        relHtml += `<div class="gold">• ${Chars.name(o2)}: ${r.label}</div>`; shownRel++;
      }
    }
    if (relHtml) card.append(el("div", { html: relHtml }));
    card.append(el("p", { html: `<b>Role in the game:</b> ${d.game || ""}` }));
    if (d.secret) card.append(el("p", { class: "sec", html: "<b>Secret role:</b> ???" }));
    return card;
  },

  toggleHist() {
    if (!this.hist.classList.contains("hidden")) { this.hist.classList.add("hidden"); return; }
    this.histBody.innerHTML = "";
    for (const h of GameState.history) {
      const nm = h.who && CHARS[h.who] ? Chars.name(h.who) : h.who;
      const p2 = el("p");
      if (!h.who) { p2.style.fontStyle = "italic"; p2.style.color = "#c8c0a8"; p2.textContent = h.t; }
      else { p2.append(el("b", {}, nm + ": "), h.t); }
      this.histBody.append(p2);
    }
    this.hist.classList.remove("hidden");
    this.histBody.scrollTop = this.histBody.scrollHeight;
  },
  toggleHide() {
    this.manualHidden = !this.manualHidden;
    this.root.classList.toggle("hideui", this.manualHidden);
  },
};

const REL_WORDS = ["Hostility", "Distrust", "Cold", "Neutral", "Contact", "Trust", "Alliance"];
const Journal = {
  init() {
    this.root = $("#journal"); this.list = $("#journal-list"); this.detail = $("#journal-detail");
    $("#journal-close").onclick = () => this.close();
    $("#btn-journal-prep").onclick = () => this.toggle();
    window.addEventListener("keydown", e => {
      if (e.code === "KeyJ" && !$("#room").classList.contains("hidden") && $("#vn").classList.contains("hidden")) this.toggle();
    });
  },
  open() { this.refresh(); this.root.classList.remove("hidden"); },
  close() { this.root.classList.add("hidden"); },
  toggle() { this.root.classList.contains("hidden") ? this.open() : this.close(); },
  refresh() {
    this.list.innerHTML = "";
    const ids = CHAR_ORDER.filter(id => GameState.met.has(id));
    if (!ids.length) { this.detail.innerHTML = '<p class=\"muted\"><i>You haven\'t met anyone yet.</i></p>'; return; }
    ids.forEach((id, i) => {
      const d = el("div", {}, Chars.title(id));
      d.onclick = () => { [...this.list.children].forEach(c => c.classList.remove("sel")); d.classList.add("sel"); this.show(id); };
      this.list.append(d);
      if (i === 0) d.click();
    });
  },
  bar(v) { let s = ""; for (let i = -3; i <= 3; i++) s += i <= v ? "▮" : "▯"; return s; },
  show(id) {
    const d = CHARS[id];
    let h = `<h2 style="color:${shade(Chars.color(id), .2)}">${Chars.title(id)}</h2><p><i>${d.tag || ""}</i></p>`;
    h += `<p><b>Public image:</b> ${d.pub}</p><p><b>Role in the game:</b> ${d.game}</p>`;
    if (d.secret) {
      if (GameState.has_clue(id + "_secret"))
        h += `<p><b>Secret role:</b> <span class=\"sec-line\">${d.secret}</span><br><b>Main interest:</b> <span class=\"sec-line\">${d.interest}</span></p>`;
      else h += `<p><b>Secret role:</b> <span class=\"muted\">— unknown. Look for clues —</span></p>`;
    }
    if (d.dinners && d.dinners.length) h += `<p><b>Appears at dinners:</b> ${d.dinners.join(", ")}</p>`;
    if (GameState.trust.has(id) || GameState.tension.has(id)) {
      const t = int(GameState.trust.get(id, 0));
      h += `<p><b>Attitude toward you:</b> ${t > 0 ? "+" : ""}${t} &nbsp; <b>Tension:</b> ${int(GameState.tension.get(id, 0))}</p>`;
    }
    const rels = Chars.relations_of(id).filter(r => GameState.met.has(Chars.other(r, id)));
    if (rels.length) {
      h += "<p><b>Connections:</b></p>";
      for (const r of rels) {
        const o2 = Chars.other(r, id), v = GameState.get_rel(r.a, r.b);
        h += `<p>• <b>${Chars.name(o2)}</b> — ${r.label}: ${this.bar(v)} <span class="muted">(${REL_WORDS[clamp(v + 3, 0, 6)]})</span><br>&nbsp;&nbsp;${r.text}`;
        if (r.secret && (GameState.has_clue(id + "_secret") || GameState.has_clue(o2 + "_secret")))
          h += `<br>&nbsp;&nbsp;<span class=\"sec-line\">Hidden: ${r.secret}</span>`;
        h += "</p>";
      }
    }
    this.detail.innerHTML = h;
  },
};
