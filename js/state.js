const int = x => Math.trunc(Number(x) || 0);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sleep = ms => new Promise(r => setTimeout(r, ms * (window.SPEED ?? 1)));

class Dict {
  constructor(o) { this.o = Object.assign({}, o || {}); }
  get(k, d) { return Object.prototype.hasOwnProperty.call(this.o, k) ? this.o[k] : d; }
  set(k, v) { this.o[k] = v; }
  has(k) { return Object.prototype.hasOwnProperty.call(this.o, k); }
  erase(k) { delete this.o[k]; }
  clear() { this.o = {}; }
  keys() { return Object.keys(this.o); }
  toJSON() { return this.o; }
}

const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

const GameState = {
  vars: {}, rel: new Dict(), trust: new Dict(), tension: new Dict(), clues: new Dict(), met: new Dict(),
  history: [], pending: [], seating: {}, seat_of: {}, knives: {}, present: [], prep: {}, dinner_no: 0,

  reset() {
    this.vars = { louis_alive: true, marco_alive: true };
    for (const k of ["order", "sara", "chaos", "stranger", "rose_trust", "joe_strong", "louis_trust",
      "marco_sign", "marco_loyal", "casualties", "clumsy"]) this.vars[k] = 0;
    this.rel = new Dict(); this.trust = new Dict(); this.tension = new Dict();
    this.clues = new Dict(); this.met = new Dict();
    for (const r of REL) this.rel.set(pairKey(r.a, r.b), r.v);
    this.history = []; this.pending = []; this.seating = {}; this.seat_of = {};
    this.knives = {}; this.present = []; this.prep = {}; this.dinner_no = 0;
  },
  v(key, def = 0) { return Object.prototype.hasOwnProperty.call(this.vars, key) ? this.vars[key] : def; },
  set_var(k, val) { this.vars[k] = val; },
  add_var(k, d) { this.vars[k] = int(this.vars[k]) + d; },
  _truthy(x) {
    if (typeof x === "boolean") return x;
    if (typeof x === "number") return x !== 0;
    return x !== null && x !== undefined;
  },
  check(cond) {
    if (Array.isArray(cond)) return cond.every(c => this.check(c));
    const s = String(cond === undefined || cond === null ? "" : cond).trim();
    if (s === "") return true;
    for (const op of [">=", "<=", "==", "!=", ">", "<"]) {
      const i = s.indexOf(op);
      if (i > 0) {
        const key = s.slice(0, i).trim();
        const val = parseFloat(s.slice(i + op.length));
        const cur = Number(this.vars[key] ?? 0);
        switch (op) {
          case ">=": return cur >= val; case "<=": return cur <= val;
          case "==": return cur === val; case "!=": return cur !== val;
          case ">": return cur > val; case "<": return cur < val;
        }
      }
    }
    if (s.startsWith("!")) return !this._truthy(this.vars[s.slice(1)] ?? false);
    return this._truthy(this.vars[s] ?? false);
  },
  change_rel(a, b, d) { const k = pairKey(a, b); this.rel.set(k, clamp(int(this.rel.get(k, 0)) + d, -3, 3)); },
  get_rel(a, b) { return int(this.rel.get(pairKey(a, b), 0)); },
  add_clue(id) { if (!this.clues.has(id)) { this.clues.set(id, true); return true; } return false; },
  has_clue(id) { return this.clues.has(id); },
  meet(id) { this.met.set(id, true); },
  apply_penalty(id, sev) {
    this.trust.set(id, int(this.trust.get(id, 0)) - sev);
    this.tension.set(id, int(this.tension.get(id, 0)) + sev);
    this.add_var("clumsy", 1);
  },
  apply_reward(id, amount) {
    this.trust.set(id, int(this.trust.get(id, 0)) + amount);
    this.tension.set(id, Math.max(0, int(this.tension.get(id, 0)) - 1));
  },
  snapshot() {
    return JSON.stringify({ vars: this.vars, rel: this.rel, trust: this.trust, tension: this.tension,
      clues: this.clues, met: this.met, history: this.history.slice(-200), dinner_no: this.dinner_no });
  },
  restore(json) {
    const d = JSON.parse(json);
    this.reset();
    this.vars = d.vars; this.rel = new Dict(d.rel); this.trust = new Dict(d.trust);
    this.tension = new Dict(d.tension); this.clues = new Dict(d.clues); this.met = new Dict(d.met);
    this.history = d.history || []; this.dinner_no = d.dinner_no || 0;
  },
};

const Chars = {
  PLAYER: "player",
  data: id => CHARS[id] || {},
  name: id => id === "player" ? "You" : (CHARS[id] ? CHARS[id].name : id),
  color: id => (CHARS[id] ? CHARS[id].color : "#b0b0b0"),
  title: id => {
    const d = CHARS[id];
    if (!d) return Chars.name(id);
    return d.nick ? `${d.name} «${d.nick}»` : d.name;
  },
  find_rel(a, b) { const k = pairKey(a, b); return REL.find(r => pairKey(r.a, r.b) === k) || null; },
  relations_of(id) { return REL.filter(r => r.a === id || r.b === id); },
  other(r, id) { return r.a === id ? r.b : r.a; },
};
