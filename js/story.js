const Story = {
  DINNERS, SEAT_TITLES, ADJ, OPP, DISHES, BACK_TO_DOOR,
  interlude: i => interlude(i),
  dinner: i => [null, dinner1, dinner2, dinner3, dinner4, dinner5, dinner6][i](),
  ending: code => {
    const steps = ending(code);
    const first = steps.find(st => "loc" in st);
    if (first) first.bg = "ending_" + code.toLowerCase();
    return steps;
  },
  ending_title: code => ending_title(code),

  dinner_guests(i) {
    const L = {
      1: ["don", "sara", "luigi", "marco", "nora", "frank"],
      2: ["don", "sara", "luigi", "marco", "nora", "emil"],
      3: ["don", "sara", "marco", "nora", "rose", "joe"],
      4: ["sara", "luigi", "marco", "nora", "emil", "stranger"],
      5: ["don", "sara", "luigi", "frank", "rose", "joe"],
    };
    if (L[i]) return L[i].slice();
    const g = GameState;
    const out = ["sara"];
    if (!(int(g.v("sara")) >= 5 && int(g.v("order")) < 2)) out.push("don");
    out.push("frank", "rose", "joe");
    const extra = [];
    if (g.check("stranger_noticed")) extra.push("stranger");
    if (g.check("louis_alive") && !g.check("louis_fled")) extra.push("luigi");
    if (g.check("marco_alive")) extra.push("marco");
    extra.push("nora");
    for (const id of extra) if (out.length < 6) out.push(id);
    return out;
  },

  _near(a, b) {
    const so = GameState.seat_of;
    if (!(a in so) || !(b in so)) return false;
    const sa = so[a], sb = so[b];
    return ADJ.some(pr => (pr[0] === sa && pr[1] === sb) || (pr[0] === sb && pr[1] === sa));
  },

  apply_seating(assign) {
    const g = GameState;
    g.seating = Object.assign({}, assign);
    g.seat_of = {};
    for (const seat of Object.keys(assign)) g.seat_of[assign[seat]] = int(seat);
    for (const k of SEAT_FLAGS) g.vars[k] = false;
    for (const id of Object.keys(CHARS)) g.vars["present_" + id] = false;
    g.present = Object.values(assign);
    for (const id of g.present) g.vars["present_" + id] = true;
    const so = g.seat_of;
    if (so.don === 1) { g.vars.don_head = true; g.add_var("order", 1); }
    else if ("don" in so) { g.vars.don_displaced = true; g.add_var("order", -1); }
    if (so.sara === 1) { g.vars.sara_head = true; g.add_var("sara", 2); }
    if (so.don === 1 && so.sara === 2) { g.vars.sara_right = true; g.add_var("sara", 1); }
    if (so.sara === 6) { g.vars.sara_angry = true; g.trust.set("sara", int(g.trust.get("sara", 0)) - 1); }
    if (so.luigi === 6) g.vars.luigi_humiliated = true;
    if (this._near("marco", "luigi")) { g.vars.tension_ml = true; g.change_rel("marco", "luigi", -1); }
    if (this._near("nora", "don")) { g.vars.table_soft = true; g.add_var("order", 1); }
    if (BACK_TO_DOOR.includes(so.frank) && g.dinner_no === 1) g.vars.frank_back_to_door = true;
    if (BACK_TO_DOOR.includes(so.marco)) g.vars.marco_careful = true;
    if (so.emil === 6) { g.vars.emil_humiliated = true; g.vars.emil_grudge = true; }
    if (this._near("rose", "sara")) { g.vars.rose_near_sara = true; g.change_rel("rose", "sara", -1); }
    if (this._near("rose", "joe")) { g.vars.rose_near_joe = true; g.change_rel("rose", "joe", 1); }
    if (so.stranger === 1) { g.vars.stranger_head = true; g.add_var("stranger", 2); }
  },

  apply_wine(guest, grade) {
    const g = GameState;
    const info = WINE_FIRST[guest] || { add: {}, txt: "" };
    const pm = g.prep[guest] || {}; pm.wine = grade; g.prep[guest] = pm;
    if (grade === "perfect" || grade === "good") {
      for (const k of Object.keys(info.add)) g.add_var(k, info.add[k]);
      g.apply_reward(guest, grade === "good" ? 1 : 2);
      g.pending.push({ guest, kind: "wine_ok", txt: info.txt });
      return info.txt;
    }
    const sev = grade === "under" ? 1 : 2;
    g.apply_penalty(guest, sev);
    if (guest !== "don" && g.present.includes("don")) g.tension.set("don", int(g.tension.get("don", 0)) + 1);
    g.pending.push({ guest, kind: "wine_fail" });
    return `Penalty: ${Chars.name(guest)} will remember this (trust −${sev}, tension +${sev}).`;
  },

  apply_dish(guest, dish, grade) {
    const g = GameState;
    const info = DISH_TO[guest] || { add: {}, txt: "" };
    const likes = dish.likes.includes(guest);
    const pm = g.prep[guest] || {}; pm.dish = dish.id; pm.dish_grade = grade; g.prep[guest] = pm;
    if (grade === "excellent" || grade === "good") {
      for (const k of Object.keys(info.add)) g.add_var(k, info.add[k]);
      g.apply_reward(guest, likes ? 2 : 1);
      g.pending.push({ guest, kind: "dish_ok", txt: info.txt });
      return info.txt + (likes ? " The dish was to their taste." : "");
    }
    if (grade === "poor") {
      g.tension.set(guest, int(g.tension.get(guest, 0)) + 1);
      return "The dish turned out mediocre. The guest said nothing, but noticed.";
    }
    g.apply_penalty(guest, 3);
    if (guest === "luigi") g.add_var("luigi_suspicious", 1);
    g.pending.push({ guest, kind: "dish_fail" });
    return `Penalty: the dish is ruined! ${Chars.name(guest)} is offended (trust −3, tension +3).`;
  },

  apply_knives(knives) {
    const g = GameState;
    g.knives = Object.assign({}, knives);
    for (const id of Object.keys(knives)) {
      if (knives[id]) continue;
      if (id === "marco") {
        g.vars.marco_noticed = true; g.add_var("marco_loyal", 1);
        g.trust.set("marco", int(g.trust.get("marco", 0)) - 1);
      } else if (id === "sara" || id === "don") {
        g.trust.set(id, int(g.trust.get(id, 0)) - 1);
      }
    }
  },

  reaction_steps() {
    const steps = [];
    for (const r of GameState.pending) {
      const id = r.guest;
      if (!GameState.present.includes(id)) continue;
      if (r.kind === "wine_ok" || r.kind === "dish_ok") steps.push(n(r.txt || ""));
      else if (r.kind === "wine_fail") {
        const line = WINE_FAIL_LINES[id] ?? "Careful.";
        steps.push(n(`The wine splashed past the glass — ${Chars.name(id)} notices.`));
        steps.push(line === "" ? n(`${Chars.name(id)} silently pushes the glass away.`) : s(id, line, "player", "cold"));
      } else if (r.kind === "dish_fail") {
        const line = DISH_FAIL_LINES[id] ?? "An interesting dish.";
        steps.push(line === "" ? n(`${Chars.name(id)} pushes the plate away without even looking.`) : s(id, line, "player", "cold"));
      }
    }
    GameState.pending = [];
    return steps;
  },

  pick_ending() {
    const g = GameState;
    const od = int(g.v("order")), sa = int(g.v("sara")), c = int(g.v("chaos"));
    const stg = int(g.v("stranger")), cas = int(g.v("casualties"));
    if (stg >= 5 && g.check("stranger_noticed")) return "E";
    const toasted = g.check("toast_order") || g.check("toast_sara") || g.check("toast_chaos") || g.check("toast_stranger");
    if (cas >= 3 && (!toasted || Math.max(od, sa, c) < 8)) return "D";
    if (od >= sa && od >= c) return "A";
    if (sa >= c) return "B";
    return "C";
  },
};
