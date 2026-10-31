const DINNERS = [
	{"n": 1, "title": "An Ordinary Evening", "sub": "Everything looks normal. Almost."},
	{"n": 2, "title": "A Shadow on the Tablecloth", "sub": "Something is going wrong, and you are not sure what."},
	{"n": 3, "title": "A “Family-Style” Dinner", "sub": "Old stories sound far too alive."},
	{"n": 4, "title": "The Empty Chair", "sub": "The Don is absent. The one who was not invited arrives."},
	{"n": 5, "title": "Everyone Pretends", "sub": "The table remembers more than the people do."},
	{"n": 6, "title": "The Last Table", "sub": "Whoever remains is the family."},
];

const SEAT_TITLES = {
	1: "Head of the table: the strongest seat (by the fireplace)",
	2: "Top row, next to the head: you can hear the head of the table",
	7: "Top row, second seat from the head",
	4: "Top row, farther from the head",
	8: "Top row, far end",
	3: "Bottom row, next to the head · back to the main door",
	9: "Bottom row, second seat · back to the door",
	5: "Bottom row, farther from the head · back to the door",
	10: "Bottom row, far end · back to the door",
	6: "The foot of the table: the weakest seat",
};


const ADJ = [[1, 2], [1, 3], [2, 7], [7, 4], [4, 8], [3, 9], [9, 5], [5, 10], [6, 8], [6, 10]]
const OPP = [[2, 3], [7, 9], [4, 5], [8, 10]]
const BACK_TO_DOOR = [3, 9, 5, 10]

const SEAT_FLAGS = ["don_head", "don_displaced", "sara_head", "sara_right", "sara_angry",
	"luigi_humiliated", "tension_ml", "table_soft", "marco_careful", "emil_humiliated",
	"rose_near_sara", "rose_near_joe", "stranger_head"]


const WINE_FIRST = {
	"don": {"add": {"order": 1}, "txt": "The Don nods: protocol observed."},
	"sara": {"add": {"sara": 1}, "txt": "Sara is faintly satisfied: you acknowledged her place."},
	"luigi": {"add": {"luigi_nervous": 1}, "txt": "Luigi flinches: why him, and not the Don?"},
	"marco": {"add": {"marco_sign": 1}, "txt": "Marco smiles wider. To him, this is a signal."},
	"nora": {"add": {"table_soft_wine": 1}, "txt": "Aunt Nora pats your hand, touched."},
	"frank": {"add": {"frank_noticed": 1}, "txt": "Frank looks at the glass but does not drink."},
	"emil": {"add": {"emil_pleased": 1}, "txt": "Emil accepts the glass with a slight bow."},
	"rose": {"add": {"rose_trust": 1}, "txt": "Rose is embarrassed: she didn't expect to be first."},
	"joe": {"add": {"joe_pleased": 1}, "txt": "Joe raises his glass: “That's how it was in my day.”"},
	"stranger": {"add": {"stranger": 1}, "txt": "The Stranger accepts the glass as his due."},
};

const DISH_TO = {
	"don": {"add": {"order": 1}, "txt": "The Don thanks you with a nod. Protocol observed."},
	"sara": {"add": {"sara": 1}, "txt": "Sara is served first, and takes it as respect."},
	"luigi": {"add": {"luigi_suspicious": 1}, "txt": "Luigi eyes the dish with suspicion: is it a bribe?"},
	"marco": {"add": {"marco_sign": 0}, "txt": "Marco eats with gusto and winks at you."},
	"nora": {"add": {"order": 1}, "txt": "Nora brightens. The table softens."},
	"frank": {"add": {"frank_noticed": 1}, "txt": "Frank doesn't touch the dish. The plate just stays there."},
	"emil": {"add": {"emil_pleased": 1}, "txt": "Emil judges the presentation with a doctor's eye."},
	"rose": {"add": {"rose_trust": 1}, "txt": "Rose is grateful. She remembers everything she is given."},
	"joe": {"add": {"joe_pleased": 1}, "txt": "Joe remembers how they used to cook this in his day."},
	"stranger": {"add": {"stranger": 1}, "txt": "The Stranger tastes it and makes a note in his mind."},
};

const DISHES = [
	{"id": "soup", "name": "Minestrone", "desc": "Simple home cooking. Forgives mistakes.",
		"likes": ["luigi", "frank"], "diff": 0.75, "stages": ["Vegetables", "Broth", "Salt"]},
	{"id": "dolce", "name": "Tiramisu", "desc": "A delicate dessert. Doesn't tolerate haste.",
		"likes": ["nora", "rose"], "diff": 0.9, "stages": ["Cream", "Coffee", "Plating"]},
	{"id": "osso", "name": "Osso buco", "desc": "Heavy and filling. Takes patience.",
		"likes": ["don", "marco", "joe"], "diff": 1.0, "stages": ["Searing", "Braising", "Plating"]},
	{"id": "fish", "name": "Sturgeon with lemon", "desc": "Elegant and expensive. The fish won't forgive overcooking.",
		"likes": ["sara", "emil"], "diff": 1.25, "stages": ["Cleaning", "Fire", "Lemon"]},
	{"id": "special", "name": "Goose in wine — the house specialty", "desc": "The special dish. Difficult, but people will talk about it.",
		"likes": ["don", "sara", "stranger"], "diff": 1.45, "stages": ["Marinade", "Fire", "Glaze"]},
];

const WINE_FAIL_LINES = {
	"don": "Careful. In this house wine is not water.",
	"sara": "Careful. A cuff is not a tablecloth.",
	"luigi": "That is… a bad sign, isn't it? Tell me it's not a sign.",
	"marco": "Ha! Hands shaking? Then they won't trust you with knives either.",
	"nora": "It's all right, it happens. They've spilled worse in the old days.",
	"frank": "",
	"emil": "Stains are traces. Traces must be cleaned up fast.",
	"rose": "Oh! It's fine, it's fine.",
	"joe": "In my day, you'd be thrown out of the house for that.",
	"stranger": "Interesting.",
};

const DISH_FAIL_LINES = {
	"don": "The dish is… memorable.",
	"sara": "Tell the cook: I will remember him.",
	"luigi": "Is that a warning? From whom?",
	"marco": "I've eaten worse. But that was in the trenches.",
	"nora": "Oh, a bit too much salt. But I'll eat it.",
	"frank": "",
	"emil": "Food is medicine too. This is poison.",
	"rose": "A very… interesting flavor.",
	"joe": "My wife cooked worse. But at least she tried.",
	"stranger": "Curious: even the mistakes here are consistent.",
};


