const ABILITIES = [
  ["str", "Strength"],
  ["dex", "Dexterity"],
  ["con", "Constitution"],
  ["int", "Intelligence"],
  ["wis", "Wisdom"],
  ["cha", "Charisma"],
];

const SAVES = [
  ["fortitude", "Fortitude", "con"],
  ["reflex", "Reflex", "dex"],
  ["will", "Will", "wis"],
];

const SKILLS = [
  ["Appraise", "int"], ["Balance", "dex"], ["Bluff", "cha"], ["Climb", "str"],
  ["Concentration", "con"], ["Craft 1", "int"], ["Craft 2", "int"], ["Craft 3", "int"],
  ["Decipher Script", "int"], ["Diplomacy", "cha"], ["Disable Device", "int"], ["Disguise", "cha"],
  ["Escape Artist", "dex"], ["Forgery", "int"], ["Gather Information", "cha"], ["Handle Animal", "cha"],
  ["Heal", "wis"], ["Hide", "dex"], ["Intimidate", "cha"], ["Jump", "str"],
  ["Knowledge 1", "int"], ["Knowledge 2", "int"], ["Knowledge 3", "int"], ["Knowledge 4", "int"],
  ["Knowledge 5", "int"], ["Listen", "wis"], ["Move Silently", "dex"], ["Open Lock", "dex"],
  ["Perform 1", "cha"], ["Perform 2", "cha"], ["Perform 3", "cha"], ["Profession 1", "wis"],
  ["Profession 2", "wis"], ["Ride", "dex"], ["Search", "int"], ["Sense Motive", "wis"],
  ["Sleight of Hand", "dex"], ["Spellcraft", "int"], ["Spot", "wis"], ["Survival", "wis"],
  ["Swim", "str"], ["Tumble", "dex"], ["Use Magic Device", "cha"], ["Use Rope", "dex"],
];

const SPELL_LEVELS = ["0", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
const STORAGE_KEY = "dnd35-character-sheet";
const ACTIVE_TAB_KEY = "dnd35-character-sheet-active-tab";
const LIST_EDIT_MODE_KEY = "dnd35-character-sheet-list-edit-mode";
const THEME_KEY = "dnd35-character-sheet-theme";
const CARRYING_CAPACITY = {
  1: [3, 6, 10],
  2: [6, 13, 20],
  3: [10, 20, 30],
  4: [13, 26, 40],
  5: [16, 33, 50],
  6: [20, 40, 60],
  7: [23, 46, 70],
  8: [26, 53, 80],
  9: [30, 60, 90],
  10: [33, 66, 100],
  11: [38, 76, 115],
  12: [43, 86, 130],
  13: [50, 100, 150],
  14: [58, 116, 175],
  15: [66, 133, 200],
  16: [76, 153, 230],
  17: [86, 173, 260],
  18: [100, 200, 300],
  19: [116, 233, 350],
  20: [133, 266, 400],
  21: [153, 306, 460],
  22: [173, 346, 520],
  23: [200, 400, 600],
  24: [233, 466, 700],
  25: [266, 533, 800],
  26: [306, 613, 920],
  27: [346, 693, 1040],
  28: [400, 800, 1200],
  29: [466, 933, 1400],
};
const BIPED_SIZE_MULTIPLIER = {
  F: 0.125,
  D: 0.25,
  T: 0.5,
  S: 0.75,
  M: 1,
  L: 2,
  H: 4,
  G: 8,
  C: 16,
};
const ARMOR_CHECK_PENALTY_SKILLS = new Set([
  "balance",
  "climb",
  "escape artist",
  "hide",
  "jump",
  "move silently",
  "sleight of hand",
  "swim",
  "tumble",
]);

function createDefaultAbilities() {
  return Object.fromEntries(ABILITIES.map(([key]) => [key, { score: 10, tempScore: 10 }]));
}

function createDefaultSaves() {
  return Object.fromEntries(SAVES.map(([key]) => [key, { total: 0, base: 0, magic: 0, misc: 0, temp: 0 }]));
}

function createDefaultAttacks() {
  return Array.from({ length: 5 }, () => ({ name: "", attackBonus: "", damage: "", critical: "", range: "", type: "", notes: "", ammunition: "" }));
}

function createDefaultSkills() {
  return SKILLS.map(([name, ability]) => ({
    name,
    ability,
    editableName: /\d$/.test(name),
    classSkill: false,
    total: 0,
    ranks: 0,
    misc: 0,
  }));
}

function createDefaultSpells() {
  return SPELL_LEVELS.map((level) => ({ level, known: 0, perDay: 0, bonus: 0, spellsList: "" }));
}

function createDefaultCustomSkills() {
  return [];
}

function createDefaultGear() {
  return Array.from({ length: 6 }, () => ({ description: "", weight: "" }));
}

function createDefaultFeats() {
  return Array.from({ length: 4 }, () => ({ name: "" }));
}

const state = {
  abilities: createDefaultAbilities(),
  saves: createDefaultSaves(),
  attacks: createDefaultAttacks(),
  skills: createDefaultSkills(),
  spells: createDefaultSpells(),
  customSkills: createDefaultCustomSkills(),
  gear: createDefaultGear(),
  feats: createDefaultFeats(),
  useTempStats: false,
  theme: "light",
};

function numeric(value) {
  return Number.parseInt(value || 0, 10) || 0;
}

function modifier(score) {
  return Math.floor((numeric(score) - 10) / 2);
}

function activeAbilityScore(abilityKey) {
  const ability = state.abilities[abilityKey];
  if (!ability) return 10;
  return state.useTempStats ? ability.tempScore : ability.score;
}

function saveAbilityKey(saveKey) {
  return SAVES.find(([key]) => key === saveKey)?.[2] || "";
}

function decimal(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function characterLevel() {
  const matches = String(state.classLevel || "").match(/\d+/g);
  if (!matches) return 0;
  return matches.reduce((sum, value) => sum + numeric(value), 0);
}

function maxSkillRanks() {
  return 3 + characterLevel();
}

function clampSkillRanks(value) {
  return Math.max(0, Math.min(numeric(value), maxSkillRanks()));
}

function penaltyValue(value) {
  const amount = numeric(value);
  return amount === 0 ? 0 : -Math.abs(amount);
}

function appliesArmorCheckPenalty(skillName) {
  const normalized = String(skillName || "").replace(/\s+\d+$/, "").trim().toLowerCase();
  return ARMOR_CHECK_PENALTY_SKILLS.has(normalized);
}

function formatWeight(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function computeLoadStatus(totalWeight, lightLoad, mediumLoad, heavyLoad) {
  if (!heavyLoad && !mediumLoad && !lightLoad) return "Set load thresholds";
  if (lightLoad && totalWeight <= lightLoad) return "Light load";
  if (mediumLoad && totalWeight <= mediumLoad) return "Medium load";
  if (heavyLoad && totalWeight <= heavyLoad) return "Heavy load";
  return "Over heavy load";
}

function loadEffects(loadStatus) {
  if (loadStatus === "Medium load") {
    return { maxDex: "+3", checkPenalty: "-3", runMultiplier: "x4" };
  }
  if (loadStatus === "Heavy load" || loadStatus === "Over heavy load") {
    return { maxDex: "+1", checkPenalty: "-6", runMultiplier: "x3" };
  }
  return { maxDex: "-", checkPenalty: "0", runMultiplier: "x4" };
}

function carryingCapacityForStrength(score) {
  const strength = Math.max(0, numeric(score));
  if (strength <= 0) return [0, 0, 0];
  if (strength <= 29) return CARRYING_CAPACITY[strength];

  const baseScore = 20 + ((strength - 20) % 10);
  const multiplier = 4 ** Math.floor((strength - baseScore) / 10);
  return CARRYING_CAPACITY[baseScore].map((value) => value * multiplier);
}

function sizeMultiplier(size) {
  return BIPED_SIZE_MULTIPLIER[String(size || "M").trim().toUpperCase()] || 1;
}

function updateDerivedFields() {
  let totalRanks = 0;
  const skillRankCap = maxSkillRanks();

  ABILITIES.forEach(([key]) => {
    const block = document.querySelector(`[data-ability-block="${key}"]`);
    const activeMod = modifier(activeAbilityScore(key));
    if (!block) return;
    block.querySelector("[data-modifier]").value = modifier(state.abilities[key].score);
    block.querySelector("[data-temp-modifier]").value = modifier(state.abilities[key].tempScore);
    const combatSummaryInput = document.querySelector(`[data-field="combat${key[0].toUpperCase()}${key.slice(1)}Mod"]`);
    if (combatSummaryInput) combatSummaryInput.value = activeMod;
  });

  SAVES.forEach(([saveKey]) => {
    const card = document.querySelector(`[data-save-block="${saveKey}"]`);
    if (!card) return;
    const abilityKey = saveAbilityKey(saveKey);
    const abilityMod = modifier(activeAbilityScore(abilityKey));
    const total = numeric(state.saves[saveKey].base)
      + abilityMod
      + numeric(state.saves[saveKey].magic)
      + numeric(state.saves[saveKey].misc)
      + numeric(state.saves[saveKey].temp);
    state.saves[saveKey].total = total;
    card.querySelector("[data-total]").value = total;
    card.querySelector("[data-ability]").value = abilityMod;
    const combatSaveInput = document.querySelector(`[data-field="combat${saveKey[0].toUpperCase()}${saveKey.slice(1)}Total"]`);
    if (combatSaveInput) combatSaveInput.value = total;
  });

  state.initiativeTotal = String(modifier(activeAbilityScore("dex")) + numeric(state.initiativeMisc));
  const initiativeTotalInput = document.querySelector('[data-field="initiativeTotal"]');
  if (initiativeTotalInput) initiativeTotalInput.value = state.initiativeTotal;

  const [lightLoad, mediumLoad, heavyLoad] = carryingCapacityForStrength(activeAbilityScore("str"))
    .map((value) => Math.floor(value * sizeMultiplier(state.size)));
  state.lightLoad = String(lightLoad);
  state.mediumLoad = String(mediumLoad);
  state.heavyLoad = String(heavyLoad);
  state.liftOverHead = String(heavyLoad);
  state.liftOffGround = String(heavyLoad * 2);
  state.pushOrDrag = String(heavyLoad * 5);

  ["lightLoad", "mediumLoad", "heavyLoad", "liftOverHead", "liftOffGround", "pushOrDrag"].forEach((field) => {
    const input = document.querySelector(`[data-field="${field}"]`);
    if (input) input.value = state[field] ?? "";
  });

  const gearWeight = state.gear.reduce((sum, item) => sum + decimal(item.weight), 0);
  const totalCoins = numeric(state.cp) + numeric(state.sp) + numeric(state.gp) + numeric(state.pp);
  const coinWeight = totalCoins / 50;
  const totalWeight = gearWeight + coinWeight;

  state.coinWeight = formatWeight(coinWeight);
  state.gearWeightCarried = formatWeight(gearWeight);
  state.totalWeightCarried = formatWeight(totalWeight);
  const coinWeightInput = document.querySelector('[data-field="coinWeight"]');
  if (coinWeightInput) coinWeightInput.value = state.coinWeight;
  const gearWeightInput = document.querySelector('[data-field="gearWeightCarried"]');
  if (gearWeightInput) gearWeightInput.value = state.gearWeightCarried;
  const totalWeightInput = document.querySelector('[data-field="totalWeightCarried"]');
  if (totalWeightInput) totalWeightInput.value = state.totalWeightCarried;

  const loadStatus = computeLoadStatus(
    totalWeight,
    lightLoad,
    mediumLoad,
    heavyLoad,
  );
  const loadStatusInput = document.getElementById("load-status");
  if (loadStatusInput) {
    loadStatusInput.value = loadStatus;
  }

  const effects = loadEffects(loadStatus);
  state.loadMaxDex = effects.maxDex;
  state.loadCheckPenalty = effects.checkPenalty;
  state.runMultiplier = effects.runMultiplier;
  const loadMaxDexInput = document.querySelector('[data-field="loadMaxDex"]');
  if (loadMaxDexInput) loadMaxDexInput.value = state.loadMaxDex;
  const loadCheckPenaltyInput = document.querySelector('[data-field="loadCheckPenalty"]');
  if (loadCheckPenaltyInput) loadCheckPenaltyInput.value = state.loadCheckPenalty;
  const runMultiplierInput = document.querySelector('[data-field="runMultiplier"]');
  if (runMultiplierInput) runMultiplierInput.value = state.runMultiplier;

  const skillCheckPenalty = penaltyValue(state.armorCheckPenalty) + penaltyValue(state.loadCheckPenalty);

  state.skills.forEach((skill, index) => {
    const row = document.querySelector(`[data-skill-block="${index}"]`);
    if (!row) return;
    const abilityMod = skill.ability ? modifier(activeAbilityScore(skill.ability)) : 0;
    row.querySelector("[data-skill-ranks]").max = String(skillRankCap);
    const ranks = clampSkillRanks(skill.ranks);
    skill.ranks = ranks;
    const effectiveRanks = skill.classSkill ? ranks : Math.floor(ranks / 2);
    const total = effectiveRanks + numeric(skill.misc) + abilityMod + (appliesArmorCheckPenalty(skill.name) ? skillCheckPenalty : 0);
    totalRanks += ranks;
    skill.total = total;
    row.querySelector("[data-skill-total]").value = total;
    row.querySelector("[data-skill-ranks]").value = ranks;
    row.querySelector("[data-skill-ability]").textContent = skill.ability ? skill.ability.toUpperCase() : "Custom";
  });

  state.customSkills.forEach((skill, index) => {
    const row = document.querySelector(`[data-custom-skill-block="${index}"]`);
    if (!row) return;
    const abilityMod = skill.ability ? modifier(activeAbilityScore(skill.ability)) : 0;
    row.querySelector("[data-skill-ranks]").max = String(skillRankCap);
    const ranks = clampSkillRanks(skill.ranks);
    skill.ranks = ranks;
    const effectiveRanks = skill.classSkill ? ranks : Math.floor(ranks / 2);
    const total = effectiveRanks + numeric(skill.misc) + abilityMod + (appliesArmorCheckPenalty(skill.name) ? skillCheckPenalty : 0);
    totalRanks += ranks;
    skill.total = total;
    row.querySelector("[data-skill-total]").value = total;
    row.querySelector("[data-skill-ranks]").value = ranks;
  });

  const totalRanksInput = document.getElementById("total-skill-ranks");
  if (totalRanksInput) totalRanksInput.value = totalRanks;

  const summary = document.getElementById("character-summary");
  if (summary) {
    const name = state.characterName?.trim() || "Unnamed Character";
    const classLevel = state.classLevel?.trim() || "Unassigned Class";
    summary.textContent = `${name} • ${classLevel}`;
  }
}

function attachTempStatsToggle() {
  const button = document.getElementById("toggle-temp-stats");
  const sync = () => {
    document.body.classList.toggle("using-temp-stats", state.useTempStats);
    button.classList.toggle("is-active-toggle", state.useTempStats);
    button.textContent = state.useTempStats ? "Using Temp Stats" : "Use Temp Stats";
  };

  button.addEventListener("click", () => {
    state.useTempStats = !state.useTempStats;
    sync();
    updateDerivedFields();
    autoSave();
  });

  sync();
}

function attachThemeToggle() {
  const button = document.getElementById("toggle-theme");
  const sync = () => {
    document.body.classList.toggle("dark-mode", state.theme === "dark");
    button.textContent = state.theme === "dark" ? "Light Mode" : "Dark Mode";
  };

  button.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, state.theme);
    sync();
  });

  state.theme = localStorage.getItem(THEME_KEY) || "light";
  sync();
}

function bindSimpleFields() {
  document.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      state[input.dataset.field] = input.value;
      updateDerivedFields();
      autoSave();
    });
  });
}

function renderAbilities() {
  const root = document.getElementById("abilities");
  const template = document.getElementById("ability-template");
  ABILITIES.forEach(([key, label]) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.abilityBlock = key;
    node.querySelector("[data-ability-name]").textContent = label;
    const score = node.querySelector("[data-score]");
    const tempScore = node.querySelector("[data-temp-score]");
    score.value = state.abilities[key].score;
    tempScore.value = state.abilities[key].tempScore;
    score.addEventListener("input", () => {
      state.abilities[key].score = numeric(score.value);
      updateDerivedFields();
      autoSave();
    });
    tempScore.addEventListener("input", () => {
      state.abilities[key].tempScore = numeric(tempScore.value);
      updateDerivedFields();
      autoSave();
    });
    root.appendChild(node);
  });
}

function renderSaves() {
  const root = document.getElementById("saves");
  const template = document.getElementById("save-template");
  SAVES.forEach(([key, label]) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.saveBlock = key;
    node.querySelector("[data-save-name]").textContent = label;
    [["[data-total]", "total"], ["[data-base]", "base"], ["[data-magic]", "magic"], ["[data-misc]", "misc"], ["[data-temp]", "temp"]].forEach(([selector, field]) => {
      const input = node.querySelector(selector);
      input.value = state.saves[key][field];
      input.addEventListener("input", () => {
        state.saves[key][field] = numeric(input.value);
        updateDerivedFields();
        autoSave();
      });
    });
    root.appendChild(node);
  });
}

function renderAttacks() {
  const root = document.getElementById("attacks");
  const template = document.getElementById("attack-template");
  state.attacks.forEach((attack, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    Object.entries({
      name: "[data-name]",
      attackBonus: "[data-attack-bonus]",
      damage: "[data-damage]",
      critical: "[data-critical]",
      range: "[data-range]",
      type: "[data-type]",
      notes: "[data-notes]",
      ammunition: "[data-ammunition]",
    }).forEach(([field, selector]) => {
      const input = node.querySelector(selector);
      input.value = attack[field];
      input.addEventListener("input", () => {
        state.attacks[index][field] = input.value;
        autoSave();
      });
    });
    root.appendChild(node);
  });
}

function renderSkills() {
  const root = document.getElementById("skills");
  const template = document.getElementById("skill-template");
  root.replaceChildren();
  state.skills.forEach((skill, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.skillBlock = index;
    const name = node.querySelector("[data-skill-name]");
    const classSkill = node.querySelector("[data-class-skill]");
    const ranks = node.querySelector("[data-skill-ranks]");
    const misc = node.querySelector("[data-skill-misc]");
    name.value = skill.name;
    name.readOnly = !skill.editableName;
    classSkill.checked = skill.classSkill;
    ranks.max = String(maxSkillRanks());
    ranks.value = clampSkillRanks(skill.ranks);
    misc.value = skill.misc;
    if (skill.editableName) {
      name.addEventListener("input", () => {
        state.skills[index].name = name.value;
        autoSave();
      });
    }
    classSkill.addEventListener("input", () => {
      state.skills[index].classSkill = classSkill.checked;
      updateDerivedFields();
      autoSave();
    });
    ranks.addEventListener("input", () => {
      state.skills[index].ranks = clampSkillRanks(ranks.value);
      updateDerivedFields();
      autoSave();
    });
    misc.addEventListener("input", () => {
      state.skills[index].misc = numeric(misc.value);
      updateDerivedFields();
      autoSave();
    });
    root.appendChild(node);
  });
}

function renderCustomSkills() {
  const root = document.getElementById("custom-skills");
  const template = document.getElementById("custom-skill-template");
  root.replaceChildren();
  state.customSkills.forEach((skill, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.customSkillBlock = index;
    const name = node.querySelector("[data-skill-name]");
    const ability = node.querySelector("[data-skill-ability]");
    const classSkill = node.querySelector("[data-class-skill]");
    const ranks = node.querySelector("[data-skill-ranks]");
    const misc = node.querySelector("[data-skill-misc]");
    const removeButton = node.querySelector("[data-remove-custom-skill]");
    name.value = skill.name;
    ability.value = skill.ability || "int";
    classSkill.checked = skill.classSkill;
    ranks.max = String(maxSkillRanks());
    ranks.value = clampSkillRanks(skill.ranks);
    misc.value = skill.misc;
    name.addEventListener("input", () => {
      state.customSkills[index].name = name.value;
      autoSave();
    });
    ability.addEventListener("input", () => {
      state.customSkills[index].ability = ability.value;
      updateDerivedFields();
      autoSave();
    });
    classSkill.addEventListener("input", () => {
      state.customSkills[index].classSkill = classSkill.checked;
      updateDerivedFields();
      autoSave();
    });
    ranks.addEventListener("input", () => {
      state.customSkills[index].ranks = clampSkillRanks(ranks.value);
      updateDerivedFields();
      autoSave();
    });
    misc.addEventListener("input", () => {
      state.customSkills[index].misc = numeric(misc.value);
      updateDerivedFields();
      autoSave();
    });
    removeButton.addEventListener("click", () => {
      state.customSkills.splice(index, 1);
      renderCustomSkills();
      updateDerivedFields();
      autoSave();
    });
    root.appendChild(node);
  });
}

function renderSpells() {
  const root = document.getElementById("spells");
  const template = document.getElementById("spell-template");
  state.spells.forEach((spell, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector("[data-level-label]").value = spell.level;
    [["[data-known]", "known"], ["[data-per-day]", "perDay"], ["[data-bonus]", "bonus"]].forEach(([selector, field]) => {
      const input = node.querySelector(selector);
      input.value = spell[field];
      input.addEventListener("input", () => {
        state.spells[index][field] = numeric(input.value);
        autoSave();
      });
    });
    const list = node.querySelector("[data-spells-list]");
    list.value = spell.spellsList;
    list.addEventListener("input", () => {
      state.spells[index].spellsList = list.value;
      autoSave();
    });
    root.appendChild(node);
  });
}

function renderGear() {
  const root = document.getElementById("gear-items");
  const template = document.getElementById("gear-template");
  root.replaceChildren();
  state.gear.forEach((item, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const description = node.querySelector("[data-gear-description]");
    const weight = node.querySelector("[data-gear-weight]");
    const removeButton = node.querySelector("[data-remove-gear]");
    description.value = item.description;
    weight.value = item.weight;
    description.addEventListener("input", () => {
      state.gear[index].description = description.value;
      autoSave();
    });
    weight.addEventListener("input", () => {
      state.gear[index].weight = weight.value;
      updateDerivedFields();
      autoSave();
    });
    removeButton.addEventListener("click", () => {
      state.gear.splice(index, 1);
      if (!state.gear.length) state.gear.push({ description: "", weight: "" });
      renderGear();
      updateDerivedFields();
      autoSave();
    });
    root.appendChild(node);
  });
}

function renderFeats() {
  const root = document.getElementById("feat-items");
  const template = document.getElementById("feat-template");
  root.replaceChildren();
  state.feats.forEach((feat, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const name = node.querySelector("[data-feat-name]");
    const removeButton = node.querySelector("[data-remove-feat]");
    name.value = feat.name;
    name.addEventListener("input", () => {
      state.feats[index].name = name.value;
      autoSave();
    });
    removeButton.addEventListener("click", () => {
      state.feats.splice(index, 1);
      if (!state.feats.length) state.feats.push({ name: "" });
      renderFeats();
      autoSave();
    });
    root.appendChild(node);
  });
}

function hydrateSimpleFields() {
  document.querySelectorAll("[data-field]").forEach((input) => {
    if ([
      "initiativeTotal",
      "combatStrMod",
      "combatDexMod",
      "combatConMod",
      "combatIntMod",
      "combatWisMod",
      "combatChaMod",
      "combatFortitudeTotal",
      "combatReflexTotal",
      "combatWillTotal",
      "lightLoad",
      "mediumLoad",
      "heavyLoad",
      "liftOverHead",
      "liftOffGround",
      "pushOrDrag",
      "coinWeight",
      "gearWeightCarried",
      "totalWeightCarried",
      "loadMaxDex",
      "loadCheckPenalty",
      "runMultiplier",
    ].includes(input.dataset.field)) return;
    input.value = state[input.dataset.field] ?? "";
  });
}

function serialize() {
  return JSON.stringify(state, null, 2);
}

function mergeState(source) {
  Object.assign(state, source);
  state.abilities = { ...createDefaultAbilities(), ...(source.abilities || {}) };
  state.saves = { ...createDefaultSaves(), ...(source.saves || {}) };
  state.attacks = Array.isArray(source.attacks) && source.attacks.length ? source.attacks : createDefaultAttacks();
  state.skills = Array.isArray(source.skills) && source.skills.length ? source.skills : createDefaultSkills();
  state.spells = Array.isArray(source.spells) && source.spells.length ? source.spells : createDefaultSpells();
  state.customSkills = Array.isArray(source.customSkills) ? source.customSkills : [];
  state.gear = Array.isArray(source.gear) && source.gear.length ? source.gear : createDefaultGear();
  state.feats = Array.isArray(source.feats) && source.feats.length ? source.feats : createDefaultFeats();

  if (!source.customSkills && Array.isArray(source.skills) && source.skills.length > SKILLS.length) {
    state.customSkills = source.skills.slice(SKILLS.length).map((skill) => ({
      name: skill.name || "",
      ability: skill.ability || "int",
      classSkill: Boolean(skill.classSkill),
      total: numeric(skill.total),
      ranks: numeric(skill.ranks),
      misc: numeric(skill.misc),
    }));
    state.skills = source.skills.slice(0, SKILLS.length);
  }

  state.skills = state.skills.map((skill, index) => ({
    ...createDefaultSkills()[index],
    ...skill,
    editableName: /\d$/.test(SKILLS[index]?.[0] || ""),
  }));
}

function autoSave() {
  localStorage.setItem(STORAGE_KEY, serialize());
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    mergeState(JSON.parse(raw));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function resetSheet() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function attachToolbar() {
  document.getElementById("new-sheet").addEventListener("click", () => {
    if (window.confirm("Clear the current sheet and start fresh?")) resetSheet();
  });

  document.getElementById("save-sheet").addEventListener("click", () => {
    autoSave();
    window.alert("Character sheet saved in this browser.");
  });

  document.getElementById("load-sheet").addEventListener("click", () => {
    location.reload();
  });

  document.getElementById("export-sheet").addEventListener("click", () => {
    const name = state.characterName?.trim() || "character-sheet";
    download(`${name.replace(/\s+/g, "-").toLowerCase()}.json`, serialize());
  });

  document.getElementById("import-sheet").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      localStorage.setItem(STORAGE_KEY, text);
      location.reload();
    } catch {
      window.alert("Unable to import that JSON file.");
    }
  });
}

function attachInventoryControls() {
  document.getElementById("add-gear-item").addEventListener("click", () => {
    state.gear.push({ description: "", weight: "" });
    renderGear();
    updateDerivedFields();
    autoSave();
  });
}

function attachFeatControls() {
  document.getElementById("add-feat-item").addEventListener("click", () => {
    state.feats.push({ name: "" });
    renderFeats();
    autoSave();
  });
}

function attachCustomSkillControls() {
  document.getElementById("add-custom-skill-item").addEventListener("click", () => {
    state.customSkills.push({ name: "", ability: "int", classSkill: false, total: 0, ranks: 0, misc: 0 });
    renderCustomSkills();
    updateDerivedFields();
    autoSave();
  });
}

function setListEditingMode(listName, isEditing) {
  const list = document.getElementById(`${listName}-list`);
  const button = document.getElementById(`toggle-${listName}-edit`);
  const addButton = document.getElementById(`add-${listName}-item`);
  if (!list || !button) return;
  list.classList.toggle("is-editing", isEditing);
  button.classList.toggle("is-editing-trigger", isEditing);
  button.textContent = isEditing ? "Done" : "Edit";
  if (addButton) addButton.classList.toggle("is-visible", isEditing);
  const modes = JSON.parse(localStorage.getItem(LIST_EDIT_MODE_KEY) || "{}");
  modes[listName] = isEditing;
  localStorage.setItem(LIST_EDIT_MODE_KEY, JSON.stringify(modes));
}

function attachListEditControls() {
  ["gear", "feat", "custom-skill"].forEach((listName) => {
    const button = document.getElementById(`toggle-${listName}-edit`);
    button.addEventListener("click", () => {
      const list = document.getElementById(`${listName}-list`);
      setListEditingMode(listName, !list.classList.contains("is-editing"));
    });
  });

  const modes = JSON.parse(localStorage.getItem(LIST_EDIT_MODE_KEY) || "{}");
  setListEditingMode("gear", Boolean(modes.gear));
  setListEditingMode("feat", Boolean(modes.feat));
  setListEditingMode("custom-skill", Boolean(modes["custom-skill"]));
}

function activateTab(tabName) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.tabPanel === tabName);
  });
  localStorage.setItem(ACTIVE_TAB_KEY, tabName);
}

function attachTabs() {
  const buttons = document.querySelectorAll("[data-tab]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
  const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
  const defaultTab = savedTab && document.querySelector(`[data-tab="${savedTab}"]`) ? savedTab : "overview";
  activateTab(defaultTab);
}

function init() {
  loadFromStorage();
  renderAbilities();
  renderSaves();
  renderAttacks();
  renderSkills();
  renderCustomSkills();
  renderSpells();
  renderGear();
  renderFeats();
  bindSimpleFields();
  hydrateSimpleFields();
  updateDerivedFields();
  attachToolbar();
  attachInventoryControls();
  attachFeatControls();
  attachCustomSkillControls();
  attachListEditControls();
  attachThemeToggle();
  attachTempStatsToggle();
  attachTabs();
}

init();
