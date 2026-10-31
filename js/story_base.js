const s = (who, text, to = "", mood = "") => ({ say: who, t: text, to, mood });
const sv = (who, as_id, text, to = "") => ({ say: who, t: text, to, mood: "", as: as_id });
const n = text => ({ say: "", t: text });
const p = text => ({ say: "player", t: text });
const st = ids => ({ stage: ids });
const loc = (title, bg = "") => ({ loc: title, bg });
const intro = ids => ({ intro: ids });
const clue = id => ({ clue: id });
const fx = (name, args = []) => ({ fx: name, args });
const setv = d => ({ set: d });
const addv = d => ({ add: d });
const relc = (a, b, delta) => ({ rel: [a, b, delta] });
const wait = sec => ({ wait: sec });
const rewrite = (a, b) => ({ rewrite: [a, b] });
const iff = (cond, then_steps, else_steps = []) => ({ if: cond, then: then_steps, else: else_steps });
const ch = (options, prompt = "") => ({ choice: options, prompt });
const o = (text, steps = [], cond = "") => { const d = { t: text, do: steps }; if (String(cond) !== "") d.cond = cond; return d; };

const has = cond => GameState.check(cond);

function lead() {
  const g = GameState;
  if (int(g.v("stranger")) >= 3 && g.check("stranger_noticed")) return "stranger";
  const od = int(g.v("order")), sa = int(g.v("sara")), c = int(g.v("chaos"));
  if (od >= sa && od >= c) return "order";
  if (sa >= c) return "sara";
  return "chaos";
}
function by_lead(d) { return d[lead()] || d["default"] || []; }
