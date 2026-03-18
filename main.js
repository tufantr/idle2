// THE SINGLE STATE OBJECT
const state = {
    resources: {
        gold: 0, 
        // Ores
        copper: 0, iron: 0, coal: 0, silver_ore: 0, gold_ore: 0, mithril: 0, adamant: 0, runite: 0,
        // Bars
        copper_bar: 0, iron_bar: 0, silver_bar: 0, gold_bar: 0, mithril_bar: 0, adamant_bar: 0, runite_bar: 0,
        // Gems
        amethyst: 0, topaz: 0, sapphire: 0, emerald: 0, ruby: 0, diamond: 0,
        // Wood
        normal_wood: 0, oak_wood: 0, willow_wood: 0, maple_wood: 0, yew_wood: 0, magic_wood: 0,
        // Meat (Hunting)
        raw_rabbit: 0, raw_fox: 0, raw_boar: 0, raw_deer: 0, raw_bear: 0, raw_drake: 0, raw_dragon: 0,
        cooked_rabbit: 0, cooked_fox: 0, cooked_boar: 0, cooked_deer: 0, cooked_bear: 0, cooked_drake: 0, cooked_dragon: 0,
        // Herbs & Potions
        guam_leaf: 0, marrentill_leaf: 0, tarromin_leaf: 0, harralander_leaf: 0,
        accuracy_potion: 0, defense_potion: 0, evasion_potion: 0, health_potion: 0
    },
    inventory: [],
    equipped: {
        Head: null, Body: null, Legs: null, Boots: null, Gloves: null,
        Weapon: null, Shield: null, Ring1: null, Ring2: null, Neck: null, Ear1: null, Ear2: null
    },
    stats: { atk: 0, def: 0, critChance: 0.05, critDmg: 1.5, dodgeChance: 0.0, attackSpeed: 1500 },
    achievements: [],
    skills: {
        mining: { level: 1, xp: 0, nextXp: 100 },
        woodcutting: { level: 1, xp: 0, nextXp: 100 },
        hunting: { level: 1, xp: 0, nextXp: 100 },
        cooking: { level: 1, xp: 0, nextXp: 100 },
        alchemy: { level: 1, xp: 0, nextXp: 100 }
    },
    action: { type: null, id: null, progress: 0 },
    combat: {
        isActive: false,
        highestPrestigeStage: 0,
        stage: 1, maxStage: 1, 
        tokens: 0, 
        playerHp: 100,
        playerAttackTimer: 0,
        enemyAttackTimer: 0,
        enemy: { name: "Goblin", hp: 10, maxHp: 10, atk: 1, attackSpeed: 2000, dodgeChance: 0.0 },
        autoEatRule: 'none',
        activePotion: 'none',
        potionTimer: 0,
        skillPoints: 0,
        lastSpStage: 0
    },
    unlocks: {
        mining: false, shop: false,
        smithing: false, woodcutting: false,
        crafting: false, hunting: false,
        cooking: false, alchemy: false,
        achievements: false
    },
    flags: {
        lastSaveTime: Date.now(),
        lastDailyClaim: 0,
        tutorialStep: 0,
        prestigeCount: 0
    },
    shop: {
        upgrades: {
            atkMultiplier: 0,
            defMultiplier: 0,
            miningSpeed: 0,
            bookOfShadows: 0
        },
        skills: {
            knight: 0,
            warlord: 0,
            rogue: 0
        }
    },
    idCounter: 0
};

// PROCEDURAL TIER DEFINITIONS
const BARS = [
    { id: 'copper_bar', name: 'Copper', power: 1, color: '#b87333' },
    { id: 'iron_bar', name: 'Iron', power: 3, color: '#cbd5e1' },
    { id: 'silver_bar', name: 'Silver', power: 2, color: '#e2e8f0' },
    { id: 'gold_bar', name: 'Gold', power: 2, color: '#fbbf24' },
    { id: 'mithril_bar', name: 'Mithril', power: 8, color: '#3b82f6' },
    { id: 'adamant_bar', name: 'Adamant', power: 20, color: '#10b981' },
    { id: 'runite_bar', name: 'Runite', power: 50, color: '#06b6d4' }
];

const GEMS = [
    { id: 'amethyst', name: 'Amethyst', power: 1, color: '#a855f7' },
    { id: 'topaz', name: 'Topaz', power: 2, color: '#facc15' },
    { id: 'sapphire', name: 'Sapphire', power: 6, color: '#3b82f6' },
    { id: 'emerald', name: 'Emerald', power: 15, color: '#10b981' },
    { id: 'ruby', name: 'Ruby', power: 35, color: '#ef4444' },
    { id: 'diamond', name: 'Diamond', power: 80, color: '#e2e8f0' }
];

const EQUIP_MULTIPLIERS = {
    Weapon: { atk: 3, def: 0 }, Shield: { atk: 0, def: 3 },
    Head: { atk: 0, def: 1.5 }, Body: { atk: 0, def: 2.5 },
    Legs: { atk: 0, def: 2 }, Boots: { atk: 0, def: 1 },
    Gloves: { atk: 0.5, def: 1 }, Ring: { atk: 1.5, def: 1.5 },
    Neck: { atk: 2.5, def: 1 }, Ear: { atk: 1, def: 1.5 }
};

const TYPE_NAMES = {
    Weapon: 'Sword', Shield: 'Buckler', Head: 'Helm', Body: 'Plate', 
    Legs: 'Greaves', Boots: 'Sabatons', Gloves: 'Gauntlets',
    Ring: 'Ring', Neck: 'Amulet', Ear: 'Earring'
};

const FOOD_HP = {
    raw_rabbit: 5, raw_fox: 15, raw_boar: 30, raw_deer: 50, raw_bear: 100, raw_drake: 200, raw_dragon: 400,
    cooked_rabbit: 25, cooked_fox: 75, cooked_boar: 150, cooked_deer: 250, cooked_bear: 500, cooked_drake: 1000, cooked_dragon: 2000
};

const SMITHING_TYPES = ['Weapon', 'Shield', 'Head', 'Body', 'Legs', 'Boots', 'Gloves'];
const CRAFTING_TYPES = ['Ring', 'Neck', 'Ear'];

const SMELTING_RECIPES = [
    { id: 'copper_bar', name: 'Smelt Copper', req: { copper: 1 }, gives: 'copper_bar' },
    { id: 'iron_bar', name: 'Smelt Iron', req: { iron: 1, coal: 1 }, gives: 'iron_bar' },
    { id: 'silver_bar', name: 'Smelt Silver', req: { silver_ore: 1 }, gives: 'silver_bar' },
    { id: 'gold_bar', name: 'Smelt Gold', req: { gold_ore: 1 }, gives: 'gold_bar' },
    { id: 'mithril_bar', name: 'Smelt Mithril', req: { mithril: 1, coal: 2 }, gives: 'mithril_bar' },
    { id: 'adamant_bar', name: 'Smelt Adamant', req: { adamant: 1, coal: 3 }, gives: 'adamant_bar' },
    { id: 'runite_bar', name: 'Smelt Runite', req: { runite: 1, coal: 4 }, gives: 'runite_bar' }
];

// GENERIC SKILL ACTION NODES
const SKILLS_DATA = {
    mining: {
        name: 'Mining', color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)',
        nodes: [
            { id: 'copper', name: 'Copper Vein', levelReq: 1, baseTime: 2000, xp: 5, produces: 'copper', consumes: null, amount: 1 },
            { id: 'amethyst', name: 'Amethyst Geode', levelReq: 1, baseTime: 3000, xp: 10, produces: 'amethyst', consumes: null, amount: 1 },
            { id: 'iron', name: 'Iron Vein', levelReq: 5, baseTime: 4000, xp: 15, produces: 'iron', consumes: null, amount: 1 },
            { id: 'coal', name: 'Coal Rock', levelReq: 5, baseTime: 4000, xp: 15, produces: 'coal', consumes: null, amount: 1 },
            { id: 'topaz', name: 'Topaz Geode', levelReq: 10, baseTime: 5000, xp: 25, produces: 'topaz', consumes: null, amount: 1 },
            { id: 'silver', name: 'Silver Vein', levelReq: 20, baseTime: 6000, xp: 30, produces: 'silver_ore', consumes: null, amount: 1 },
            { id: 'sapphire', name: 'Sapphire Core', levelReq: 25, baseTime: 9000, xp: 60, produces: 'sapphire', consumes: null, amount: 1 },
            { id: 'mithril', name: 'Mithril Deposit', levelReq: 30, baseTime: 8000, xp: 45, produces: 'mithril', consumes: null, amount: 1 },
            { id: 'emerald', name: 'Emerald Vault', levelReq: 35, baseTime: 18000, xp: 150, produces: 'emerald', consumes: null, amount: 1 },
            { id: 'gold', name: 'Gold Vein', levelReq: 40, baseTime: 10000, xp: 65, produces: 'gold_ore', consumes: null, amount: 1 },
            { id: 'adamant', name: 'Adamantite Rock', levelReq: 50, baseTime: 15000, xp: 100, produces: 'adamant', consumes: null, amount: 1 },
            { id: 'ruby', name: 'Ruby Vein', levelReq: 60, baseTime: 36000, xp: 350, produces: 'ruby', consumes: null, amount: 1 },
            { id: 'runite', name: 'Runite Spire', levelReq: 75, baseTime: 30000, xp: 250, produces: 'runite', consumes: null, amount: 1 },
            { id: 'diamond', name: 'Diamond Block', levelReq: 85, baseTime: 60000, xp: 800, produces: 'diamond', consumes: null, amount: 1 }
        ]
    },
    woodcutting: {
        name: 'Woodcutting', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)',
        nodes: [
            { id: 'normal_tree', name: 'Normal Tree', levelReq: 1, baseTime: 3000, xp: 10, produces: 'normal_wood', consumes: null, amount: 1 },
            { id: 'oak_tree', name: 'Oak Tree', levelReq: 10, baseTime: 5000, xp: 25, produces: 'oak_wood', consumes: null, amount: 1 },
            { id: 'willow_tree', name: 'Willow Tree', levelReq: 25, baseTime: 8000, xp: 60, produces: 'willow_wood', consumes: null, amount: 1 },
            { id: 'maple_tree', name: 'Maple Tree', levelReq: 45, baseTime: 12000, xp: 120, produces: 'maple_wood', consumes: null, amount: 1 },
            { id: 'yew_tree', name: 'Yew Tree', levelReq: 60, baseTime: 20000, xp: 250, produces: 'yew_wood', consumes: null, amount: 1 },
            { id: 'magic_tree', name: 'Magic Tree', levelReq: 75, baseTime: 35000, xp: 500, produces: 'magic_wood', consumes: null, amount: 1 }
        ]
    },
    hunting: {
        name: 'Hunting', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)',
        nodes: [
            { id: 'hunt_rabbit', name: 'Hunt Rabbit', levelReq: 1, baseTime: 3000, xp: 15, produces: 'raw_rabbit', consumes: null, amount: 1 },
            { id: 'hunt_fox', name: 'Hunt Fox', levelReq: 10, baseTime: 6000, xp: 45, produces: 'raw_fox', consumes: null, amount: 1 },
            { id: 'hunt_boar', name: 'Hunt Boar', levelReq: 25, baseTime: 10000, xp: 90, produces: 'raw_boar', consumes: null, amount: 1 },
            { id: 'hunt_deer', name: 'Hunt Deer', levelReq: 40, baseTime: 18000, xp: 200, produces: 'raw_deer', consumes: null, amount: 1 },
            { id: 'hunt_bear', name: 'Hunt Bear', levelReq: 60, baseTime: 30000, xp: 400, produces: 'raw_bear', consumes: null, amount: 1 },
            { id: 'hunt_drake', name: 'Hunt Drake', levelReq: 75, baseTime: 45000, xp: 800, produces: 'raw_drake', consumes: null, amount: 1 },
            { id: 'hunt_dragon', name: 'Hunt Dragon', levelReq: 90, baseTime: 80000, xp: 1500, produces: 'raw_dragon', consumes: null, amount: 1 }
        ]
    },
    cooking: {
        name: 'Cooking', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.1)',
        nodes: [
            { id: 'cook_rabbit', name: 'Roast Rabbit', levelReq: 1, baseTime: 2500, xp: 20, produces: 'cooked_rabbit', consumes: { raw_rabbit: 1 }, amount: 1 },
            { id: 'cook_fox', name: 'Roast Fox', levelReq: 10, baseTime: 5000, xp: 60, produces: 'cooked_fox', consumes: { raw_fox: 1 }, amount: 1 },
            { id: 'cook_boar', name: 'Roast Boar', levelReq: 25, baseTime: 8000, xp: 120, produces: 'cooked_boar', consumes: { raw_boar: 1 }, amount: 1 },
            { id: 'cook_deer', name: 'Roast Deer', levelReq: 40, baseTime: 15000, xp: 250, produces: 'cooked_deer', consumes: { raw_deer: 1 }, amount: 1 },
            { id: 'cook_bear', name: 'Roast Bear', levelReq: 60, baseTime: 25000, xp: 500, produces: 'cooked_bear', consumes: { raw_bear: 1 }, amount: 1 },
            { id: 'cook_drake', name: 'Roast Drake', levelReq: 75, baseTime: 35000, xp: 1000, produces: 'cooked_drake', consumes: { raw_drake: 1 }, amount: 1 },
            { id: 'cook_dragon', name: 'Roast Dragon', levelReq: 90, baseTime: 60000, xp: 2500, produces: 'cooked_dragon', consumes: { raw_dragon: 1 }, amount: 1 }
        ]
    },
    alchemy: {
        name: 'Alchemy', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)',
        nodes: [
            { id: 'gather_guam', name: 'Forage Herb', levelReq: 1, baseTime: 4000, xp: 12, produces: 'guam_leaf', consumes: null, amount: 1 },
            { id: 'brew_acc', name: 'Accuracy Potion', levelReq: 2, baseTime: 6000, xp: 35, produces: 'accuracy_potion', consumes: { guam_leaf: 1, copper: 1 }, amount: 1 },
            { id: 'gather_marrentill', name: 'Forage Root', levelReq: 15, baseTime: 8000, xp: 40, produces: 'marrentill_leaf', consumes: null, amount: 1 },
            { id: 'brew_def', name: 'Defense Potion', levelReq: 20, baseTime: 10000, xp: 80, produces: 'defense_potion', consumes: { marrentill_leaf: 1, oak_wood: 1 }, amount: 1 },
            { id: 'gather_tarromin', name: 'Forage Spore', levelReq: 35, baseTime: 15000, xp: 100, produces: 'tarromin_leaf', consumes: null, amount: 1 },
            { id: 'brew_eva', name: 'Evasion Potion', levelReq: 40, baseTime: 18000, xp: 180, produces: 'evasion_potion', consumes: { tarromin_leaf: 1, raw_fox: 1 }, amount: 1 },
            { id: 'gather_harralander', name: 'Forage Lotus', levelReq: 55, baseTime: 20000, xp: 150, produces: 'harralander_leaf', consumes: null, amount: 1 },
            { id: 'brew_heal', name: 'Health Potion', levelReq: 60, baseTime: 25000, xp: 280, produces: 'health_potion', consumes: { harralander_leaf: 1, cooked_rabbit: 1 }, amount: 1 }
        ]
    }
};

let activeSmeltingId = 'copper_bar';
let activeSmithingBar = 'copper_bar';
let activeCraftingBar = 'silver_bar';
let activeCraftingGem = 'amethyst';

// NAVIGATION
function switchTab(tabId, btnElement) {
    const contents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active-tab');
    }
    const btns = document.getElementsByClassName('nav-btn');
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
    }
    
    document.getElementById(`tab-${tabId}`).classList.add('active-tab');
    if (btnElement) btnElement.classList.add('active');
}

// ACTION LOGIC
function startAction(skillKey, nodeId) {
    const node = SKILLS_DATA[skillKey].nodes.find(n => n.id === nodeId);
    if (!node || state.skills[skillKey].level < node.levelReq) return;
    
    if (state.action.type === skillKey && state.action.id === nodeId) {
        state.action.type = null;
        state.action.id = null;
        state.action.progress = 0;
    } else {
        state.action.type = skillKey;
        state.action.id = nodeId;
        state.action.progress = 0;
    }
    updateUI();
}

function grantXp(skillKey, amount) {
    state.skills[skillKey].xp += amount;
    let leveledUp = false;
    while (state.skills[skillKey].xp >= state.skills[skillKey].nextXp) {
        state.skills[skillKey].xp -= state.skills[skillKey].nextXp;
        state.skills[skillKey].level++;
        state.skills[skillKey].nextXp = Math.floor(state.skills[skillKey].nextXp * 1.5);
        leveledUp = true;
    }
    if (leveledUp) {
        updateUI(); 
    }
}

// PERSISTENCE & OFFLINE ENGINE

async function saveGame() {
    state.flags.lastSaveTime = Date.now();
    localStorage.setItem('fantasyIdleSaveLocal', JSON.stringify(state));
}

async function loadGame() {
    const token = localStorage.getItem('fantasy_jwt');
    if (!token) {
        const modal = document.getElementById('auth-modal');
        if(modal) modal.classList.add('active');
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const profileEl = document.getElementById('user-profile');
        if(profileEl) profileEl.style.display = 'flex';
        const userEl = document.getElementById('auth-username');
        if(userEl) userEl.innerText = payload.username;
    } catch(e) {
        console.error("JWT Decode failed", e);
    }
    
    const localSaveStr = localStorage.getItem('fantasyIdleSaveLocal');
    if (localSaveStr) {
        try {
            const saved = JSON.parse(localSaveStr);
            mergeState(state, saved);
            
            const reqSkills = ['mining','woodcutting','hunting','cooking','alchemy','smithing','crafting'];
            reqSkills.forEach(sk => { if(!state.skills[sk]) state.skills[sk] = {level:1, xp:0, nextXp:100}; });
            
            if (!state.unlocks.hasOwnProperty('achievements')) {
                state.unlocks.achievements = false;
                state.achievements = [];
            }
            if (state.flags.prestigeCount === undefined) state.flags.prestigeCount = 0;
            
            state.flags.lastSaveTime = saved.flags?.lastSaveTime || Date.now();
        } catch (e) {
            console.error("Local save corrupted", e);
        }
    }
    
    const modal = document.getElementById('auth-modal');
    if(modal) modal.classList.remove('active');
    
    parseOfflineProgress();
    spawnEnemy();
    updateUI();
}

function mergeState(base, added) {
    for (let key in added) {
        if (typeof added[key] === 'object' && added[key] !== null && !Array.isArray(added[key])) {
            if (!base[key]) base[key] = {};
            mergeState(base[key], added[key]);
        } else {
            base[key] = added[key];
        }
    }
}

function wipeSave() {
    if(confirm("Are you sure you want to completely wipe your save? This cannot be undone.")) {
        localStorage.removeItem('fantasyIdleSave');
        location.reload();
    }
}

function logout() {
    localStorage.removeItem('fantasy_jwt');
    location.reload();
}

function parseOfflineProgress() {
    const now = Date.now();
    const timeDiff = now - state.flags.lastSaveTime;
    if (timeDiff < 60000) return; // Ignore drops under 1 minute

    let msg = `You were offline for ${Math.floor(timeDiff / 60000)} minutes.\n`;
    let itemsGained = false;

    if (state.action.type && state.action.id) {
        const skillKey = state.action.type;
        const node = SKILLS_DATA[skillKey].nodes.find(n => n.id === state.action.id);
        
        if (node) {
            const speedMult = 1 + (state.shop.upgrades.miningSpeed * 0.10) + (state.shop.skills.rogue * 0.05);
            const actualTime = node.baseTime / speedMult;
            
            let maxActions = Math.floor(timeDiff / actualTime);
            let actualActions = maxActions;

            // Enforce consumptions
            if (node.consumes) {
                for (const [res, qty] of Object.entries(node.consumes)) {
                    const limit = Math.floor(state.resources[res] / qty);
                    if (limit < actualActions) actualActions = limit;
                }
                for (const [res, qty] of Object.entries(node.consumes)) {
                    state.resources[res] -= qty * actualActions;
                }
            }

            if (actualActions > 0) {
                state.resources[node.produces] += node.amount * actualActions;
                grantXp(skillKey, node.xp * actualActions);
                
                msg += `\nYour hero safely gathered continuously while you were away!`;
                msg += `\n\nEarned ${actualActions * node.amount}x ${formatResName(node.produces)}`;
                msg += `\nGained ${actualActions * node.xp} XP in ${SKILLS_DATA[skillKey].name}`;
                itemsGained = true;
            } else {
                msg += `\nYour hero stopped working because you ran out of required materials for ${node.name}.`;
            }
        }
    } else {
        msg += "\nYour hero rested safely at the camp since no skill was active.";
    }

    state.flags.lastSaveTime = now;
    
    const offlineModal = document.getElementById('offline-modal');
    if (offlineModal) {
        document.getElementById('offline-modal-text').innerText = msg;
        offlineModal.classList.add('active');
    }
}

// TUTORIAL PROGRESSION
function updateTutorialUnlocks() {
    // DEVELOPER OVERRIDE: Force unlock all systems immediately
    const keys = ['mining', 'shop', 'achievements', 'smithing', 'woodcutting', 'crafting', 'hunting', 'cooking', 'alchemy'];
    keys.forEach(k => state.unlocks[k] = true);

    const banner = document.getElementById('tutorial-banner');
    if (banner) banner.style.display = 'none';

    const applyUnlock = (key, isHeader = false) => {
        const el = document.getElementById(isHeader ? `nav-header-${key}` : `nav-${key}`);
        if (el) el.style.display = '';
    };
    
    keys.forEach(k => applyUnlock(k));
    
    const ncHeader = document.getElementById('nav-header-noncombat');
    if (ncHeader) ncHeader.style.display = '';
    const procHeader = document.getElementById('nav-header-processing');
    if (procHeader) procHeader.style.display = '';
}

// FORMAT RESOURCE NAMES
function formatResName(str) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// COMBAT SYSTEM
function getPlayerMaxHp() {
    let base = 100 + (state.stats.def * 10);
    let mult = 1 + (state.shop.skills.warlord * 0.1);
    if (state.combat.activePotion === 'health_potion' && state.combat.potionTimer > 0) {
        mult += 0.5; // +50% max HP
    }
    return Math.floor(base * mult);
}

function spawnEnemy() {
    const stage = state.combat.stage;
    const hp = Math.floor(10 * Math.pow(1.15, stage - 1));
    const atk = Math.floor(1 * Math.pow(1.1, stage - 1));
    const isBoss = stage % 10 === 0;
    
    const MONSTER_NAMES = ["Slime", "Goblin", "Dire Wolf", "Bandit", "Skeleton", "Orc", "Troll", "Golem", "Drake", "Demon"];
    const nameIndex = (stage - 1) % MONSTER_NAMES.length;
    let baseName = MONSTER_NAMES[nameIndex];
    if (isBoss) baseName = `King ${baseName}`;

    state.combat.enemy = {
        name: isBoss ? `Boss Stage ${stage} - ${baseName}` : `${baseName} (Lv ${stage})`,
        hp: isBoss ? hp * 5 : hp,
        maxHp: isBoss ? hp * 5 : hp,
        atk: isBoss ? atk * 2 : atk,
        attackSpeed: isBoss ? 2000 : (1800 - Math.min(600, stage * 5)),
        dodgeChance: isBoss ? Math.min(0.2, stage * 0.005) : 0
    };
    
    state.combat.playerAttackTimer = 0;
    state.combat.enemyAttackTimer = 0;
    state.combat.playerHp = getPlayerMaxHp();
    updateCombatUI();
}

function calculatePrestigeTokens() {
    let base = Math.floor(Math.pow(Math.max(0, state.combat.maxStage - 1) / 10, 1.5));
    let mult = 1 + (state.shop.upgrades.bookOfShadows * 0.20); 
    return Math.floor(base * mult);
}

function getCombatLevel() {
    if (state.combat.highestPrestigeStage > 0) {
        return state.combat.highestPrestigeStage;
    }
    return 1 + Math.floor((state.stats.atk + state.stats.def) / 5);
}

function openPrestigeModal() {
    const modal = document.getElementById('prestige-modal');
    if (modal) {
        modal.classList.add('active');
        const tokens = calculatePrestigeTokens();
        document.getElementById('modal-tokens-gain').innerText = `+${tokens} Prestige Tokens`;
        
        let bos = state.shop.upgrades.bookOfShadows;
        if(bos > 0) {
            document.getElementById('modal-bos-bonus').innerText = `(Includes +${bos * 20}% BoS Bonus)`;
        } else {
            document.getElementById('modal-bos-bonus').innerText = '';
        }

        let currentRunSp = 0;
        let nextThresh = state.combat.lastSpStage;
        while(nextThresh + 50 <= state.combat.maxStage) {
            currentRunSp++;
            nextThresh += 50;
        }

        document.getElementById('modal-sp-gain').innerText = `+${currentRunSp} Skill Points`;
        
        let absoluteMax = Math.max(state.combat.highestPrestigeStage, state.combat.maxStage);
        let targetAdvStart = Math.max(1, Math.floor(absoluteMax * 0.25));
        document.getElementById('modal-advance-start').innerText = `Advance Start: Stage ${targetAdvStart}`;
    }
}

function closePrestigeModal() {
    const modal = document.getElementById('prestige-modal');
    if (modal) modal.classList.remove('active');
}

function confirmPrestige() {
    prestige();
    closePrestigeModal();
}

function prestige() {
    const earnedTokens = calculatePrestigeTokens();
    if (earnedTokens <= 0 && state.combat.maxStage < 50) {
        if (!confirm("You haven't reached a high enough stage to earn Prestige Tokens or Skill Points. Are you sure you want to reset your run for 0 rewards?")) {
            return;
        }
    }

    if (state.combat.maxStage > state.combat.highestPrestigeStage) {
        state.combat.highestPrestigeStage = state.combat.maxStage;
    }

    let currentRunSp = 0;
    while(state.combat.lastSpStage + 50 <= state.combat.maxStage) {
        currentRunSp++;
        state.combat.lastSpStage += 50;
    }
    state.combat.skillPoints += currentRunSp;
    state.combat.tokens += earnedTokens;
    
    let advStart = Math.max(1, Math.floor(state.combat.highestPrestigeStage * 0.25));
    state.combat.stage = advStart;
    state.combat.maxStage = advStart;
    
    state.resources.gold = 0;
    state.combat.isActive = false;
    spawnEnemy();
    updateUI();
}

function toggleCombat() {
    state.combat.isActive = !state.combat.isActive;
    if (state.combat.isActive && state.combat.playerHp <= 0) {
        state.combat.playerHp = getPlayerMaxHp();
    }
    updateCombatUI();
}

function changeAutoEat(val) {
    state.combat.autoEatRule = val;
}

function changeActivePotion(val) {
    state.combat.activePotion = val;
    state.combat.potionTimer = 0;
    updateUI();
}

function playerClickAttack() {
    if (!state.combat.isActive) return;
    
    if (!state.combat.combo) state.combat.combo = 0;
    
    let increment = 1.0 / (1 + (state.combat.combo / 40));
    state.combat.combo += increment;
    state.combat.lastComboTime = Date.now();
    
    const flash = document.getElementById('combat-impact-flash');
    if (flash) {
        flash.classList.remove('active');
        void flash.offsetWidth;
        flash.classList.add('active');
    }
    
    executePlayerAttack(null, 0.5);
    updateCombatUI();
}

function updateComboUI() {
    const container = document.getElementById('combo-container');
    const textEl = document.getElementById('combo-text');
    const buffEl = document.getElementById('combo-buffs');
    
    if (!container || !state.combat.isActive) return;
    
    let combo = state.combat.combo || 0;
    if (combo <= 0.1) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    let comboInt = Math.floor(combo);
    textEl.innerText = comboInt + 'x';
    
    let col = '#e2e8f0';
    let buffs = '';
    if (combo >= 30) {
        col = '#a855f7';
        buffs = '⚡ +10% Crit | 🩸 Lifesteal | ⚔️ Echo Strike';
    } else if (combo >= 20) {
        col = '#ef4444';
        buffs = '⚡ +10% Crit | 🩸 15% Lifesteal';
    } else if (combo >= 10) {
        col = '#f97316';
        buffs = '⚡ +10% Critical Chance';
    } else if (combo >= 5) {
        col = '#eab308';
    }
    
    textEl.style.color = col;
    buffEl.innerText = buffs;
    
    textEl.classList.remove('combo-pump');
    void textEl.offsetWidth;
    textEl.classList.add('combo-pump');
}

function processCombatBuffs() {
    if (state.combat.autoEatRule !== 'none') {
        const foodId = state.combat.autoEatRule;
        const maxHp = getPlayerMaxHp();
        if (state.combat.playerHp < maxHp / 2 && state.combat.playerHp > 0) {
            if (state.resources[foodId] > 0) {
                state.resources[foodId]--;
                state.combat.playerHp = Math.min(maxHp, state.combat.playerHp + FOOD_HP[foodId]);
                renderResources(); 
            }
        }
    }

    let activeBuff = null;
    if (state.combat.activePotion !== 'none') {
        if (state.combat.potionTimer <= 0) {
            if (state.resources[state.combat.activePotion] > 0) {
                state.resources[state.combat.activePotion]--;
                state.combat.potionTimer = 10;
                activeBuff = state.combat.activePotion;
            } else {
                state.combat.activePotion = 'none';
                const el = document.getElementById('active-potion-select');
                if(el) el.value = 'none';
            }
            renderResources();
        } else {
            activeBuff = state.combat.activePotion;
        }
    }

    let pEl = document.getElementById('potion-status-text');
    if (pEl) {
        if (activeBuff) pEl.innerText = `Active! (Consumes next in ${state.combat.potionTimer} actions)`;
        else pEl.innerText = '';
    }
    return activeBuff;
}

function executePlayerAttack(activeBuff, manualMultiplier = 1) {
    if (activeBuff) state.combat.potionTimer--;
    
    let combo = state.combat.combo || 0;
    let comboDmgMult = 1 + (combo * 0.05);
    
    let finalAtk = state.stats.atk;
    if (activeBuff === 'accuracy_potion') finalAtk = Math.floor(finalAtk * 1.2);
    
    let finalCritChance = state.stats.critChance;
    if (combo >= 10) finalCritChance += 0.10;
    
    let isCrit = Math.random() < finalCritChance;
    let dmg = Math.max(1, finalAtk);
    if (isCrit) dmg = Math.floor(dmg * state.stats.critDmg);

    let totalDmg = Math.floor(dmg * comboDmgMult * manualMultiplier);
    state.combat.enemy.hp -= totalDmg;

    if (combo >= 20) {
        let heal = Math.floor(totalDmg * 0.15);
        state.combat.playerHp = Math.min(getPlayerMaxHp(), state.combat.playerHp + heal);
    }
    
    if (combo >= 30 && manualMultiplier === 1) {
        if (Math.random() < 0.20) {
            setTimeout(() => {
                if (state.combat.isActive && state.combat.enemy.hp > 0) {
                    executePlayerAttack(null, 0.5);
                    updateCombatUI();
                }
            }, 200);
        }
    }
    
    if (state.combat.enemy.hp <= 0) {
        state.combat.stage++;
        if (state.combat.stage > state.combat.maxStage) {
            state.combat.maxStage = state.combat.stage;
        }
        spawnEnemy();
    }
}

function executeEnemyAttack(activeBuff) {
    if (state.combat.enemy.hp <= 0) return;
    
    let isDodge = Math.random() < state.stats.dodgeChance;
    if (isDodge) return; 
    
    let finalDef = state.stats.def;
    if (activeBuff === 'defense_potion') finalDef = Math.floor(finalDef * 1.2);
    
    let enemyDmgMult = 1;
    if (activeBuff === 'evasion_potion') enemyDmgMult = 0.85;

    const enemyDmg = Math.max(0, Math.floor(state.combat.enemy.atk * enemyDmgMult) - finalDef);
    state.combat.playerHp -= enemyDmg;
    
    if (state.combat.playerHp <= 0) {
        if (state.combat.stage > 1) {
            state.combat.stage--;
        }
        state.combat.isActive = false;
        spawnEnemy();
    }
}

// SHOP SYSTEM
const TOKEN_UPGRADES = [
    { id: 'atkMultiplier', name: 'Blade of Damocles (ATK Mode)', desc: '+10% Base ATK per level', baseCost: 1, costMult: 2 },
    { id: 'defMultiplier', name: 'Heroic Shield (DEF Mode)', desc: '+10% Base DEF per level', baseCost: 1, costMult: 2 },
    { id: 'miningSpeed', name: 'Ring of Gathering', desc: '+10% Gathering Speed', baseCost: 2, costMult: 2 },
    { id: 'bookOfShadows', name: 'Book of Shadows', desc: '+20% Prestige Tokens per level', baseCost: 5, costMult: 2.5 }
];

function getUpgradeCost(id) {
    const upg = TOKEN_UPGRADES.find(u => u.id === id);
    return Math.floor(upg.baseCost * Math.pow(upg.costMult, state.shop.upgrades[id]));
}

function buyTokenUpgrade(id) {
    const cost = getUpgradeCost(id);
    if (state.combat.tokens >= cost) {
        state.combat.tokens -= cost;
        state.shop.upgrades[id]++;
        updateUI();
    } else {
        alert("Not enough Prestige Tokens!");
    }
}

function buySkillPoint(type) {
    if (state.combat.skillPoints > 0) {
        state.combat.skillPoints--;
        state.shop.skills[type]++;
        updateUI();
    } else {
        alert("No Unspent Skill Points! Push max stages further (+1 SP every 50 stages).");
    }
}

function buyGoldBoost(type) {
    if (type === 'iron' && state.resources.gold >= 500) {
        state.resources.gold -= 500;
        state.resources.iron += 50;
    } else if (type === 'coal' && state.resources.gold >= 250) {
        state.resources.gold -= 250;
        state.resources.coal += 100;
    } else if (type === 'heal' && state.resources.gold >= 250) {
        state.resources.gold -= 250;
        state.combat.playerHp = getPlayerMaxHp();
    } else {
        alert("Not enough Gold!");
        return;
    }
    updateUI();
}

function renderShopUI() {
    const container = document.getElementById('token-shop-items');
    if (!container) return;
    
    let html = '';
    TOKEN_UPGRADES.forEach(upg => {
        const level = state.shop.upgrades[upg.id];
        const cost = getUpgradeCost(upg.id);
        
        let shadow = '';
        if(upg.id === 'bookOfShadows') {
            shadow = 'box-shadow: 0 0 15px rgba(251, 191, 36, 0.2); border-color: rgba(251, 191, 36, 0.5);';
        }

        html += `
            <div class="shop-item" style="${shadow}">
                <div class="shop-item-info">
                    <span class="shop-item-name" style="${upg.id==='bookOfShadows'? 'color:#fbbf24;':''}">${upg.name} (Lv ${level})</span>
                    <span class="shop-item-desc">${upg.desc}</span>
                </div>
                <button onclick="buyTokenUpgrade('${upg.id}')" class="shop-btn">${cost} Tokens</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// GAME LOOP
let lastTime = Date.now();
let combatTimer = 0;
let saveTimer = 0;

setInterval(() => {
    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;

    // Actions Loop
    if (state.action.type) {
        const skillKey = state.action.type;
        let isWorkshop = ['smelting', 'smithing', 'crafting'].includes(skillKey);
        
        const node = SKILLS_DATA[skillKey]?.nodes.find(n => n.id === state.action.id);
        
        if (node || isWorkshop) {
            const speedMult = 1 + (state.shop.upgrades.miningSpeed * 0.10) + (state.shop.skills.rogue * 0.05);
            const act = isWorkshop ? state.action : node;
            const actualTime = (act.baseTime / speedMult) || 2000;

            let canProcess = true;
            if (act.consumes) {
                for (const [res, qty] of Object.entries(act.consumes)) {
                    if ((state.resources[res] || 0) < qty) {
                        canProcess = false;
                        break;
                    }
                }
            }

            if (canProcess) {
                state.action.progress += dt;
                
                if (state.action.progress >= actualTime) {
                    state.action.progress -= actualTime;
                    
                    if (act.consumes) {
                        for (const [res, qty] of Object.entries(act.consumes)) {
                            state.resources[res] -= qty;
                        }
                    }
                    
                    if (isWorkshop) {
                        if (skillKey === 'smelting') {
                            state.resources[state.action.produces] += 1;
                            grantXp('smithing', state.action.xp);
                        } else if (skillKey === 'smithing') {
                            const newItem = generateProceduralEquipment('smithing', state.action.id, state.action.barId);
                            state.inventory.push(newItem);
                            grantXp('smithing', state.action.xp);
                        } else if (skillKey === 'crafting') {
                            const newItem = generateProceduralJewelry(state.action.id, state.action.barId, state.action.gemId);
                            state.inventory.push(newItem);
                            grantXp('crafting', state.action.xp);
                        }
                        updateUI();
                    } else {
                        state.resources[node.produces] += node.amount;
                        grantXp(skillKey, node.xp);
                        updateGenericSkillUI(skillKey);
                    }
                    
                    renderResources(); 
                } else {
                    const fillId = isWorkshop ? `progress-fill-${skillKey}-${state.action.id}` : `progress-fill-${node.id}`;
                    const fill = document.getElementById(fillId);
                    if (fill) fill.style.width = (state.action.progress / actualTime * 100) + '%';
                }
            } else {
                const fillId = isWorkshop ? `progress-fill-${skillKey}-${state.action.id}` : `progress-fill-${node.id}`;
                const fill = document.getElementById(fillId);
                if (fill) fill.style.background = '#ef4444'; 
            }
        }
    }
    
    if (state.combat.isActive) {
        // Combo Decay Logic
        if (state.combat.combo > 0) {
            let timeSinceClick = now - (state.combat.lastComboTime || now);
            if (timeSinceClick > 1500) {
                let decayRate = 0.05 + (state.combat.combo / 100);
                state.combat.combo = Math.max(0, state.combat.combo - decayRate);
                updateComboUI();
            }
        }
        
        state.combat.playerAttackTimer += dt;
        state.combat.enemyAttackTimer += dt;
        
        let pSpeed = Math.max(500, state.stats.attackSpeed);
        let eSpeed = Math.max(800, state.combat.enemy.attackSpeed || 2000);
        let actionOccurred = false;
        let baseBuff = null;

        if (state.combat.playerAttackTimer >= pSpeed) {
            state.combat.playerAttackTimer -= pSpeed;
            baseBuff = processCombatBuffs();
            executePlayerAttack(baseBuff);
            actionOccurred = true;
        }

        if (state.combat.enemy && state.combat.enemy.hp > 0 && state.combat.enemyAttackTimer >= eSpeed) {
            state.combat.enemyAttackTimer -= eSpeed;
            if (!baseBuff) baseBuff = processCombatBuffs();
            executeEnemyAttack(baseBuff);
            actionOccurred = true;
        }

        if (actionOccurred) {
            updateCombatUI();
        }
    } else {
        if (state.combat.combo > 0) {
            state.combat.combo = 0;
            updateComboUI();
        }
    }

    saveTimer += dt;
    if (saveTimer >= 10000) { // Auto-save every 10s
        saveGame();
        saveTimer -= 10000;
    }

    updateTutorialUnlocks();
    checkAchievements();
    checkDailyReward();

}, 50);

function updateGenericSkillUI(skillKey) {
    const el = document.getElementById(`${skillKey}-level-display`);
    if (!el) return;
    el.innerText = `Level ${state.skills[skillKey].level}`;
    document.getElementById(`${skillKey}-xp-display`).innerText = `${state.skills[skillKey].xp} / ${state.skills[skillKey].nextXp} XP`;
    const xpPercent = (state.skills[skillKey].xp / state.skills[skillKey].nextXp) * 100;
    document.getElementById(`${skillKey}-xp-fill`).style.width = Math.min(100, xpPercent) + '%';
    renderActionNodes(skillKey);
}

function renderActionNodes(skillKey) {
    const container = document.getElementById(`${skillKey}-nodes`);
    if (!container) return;
    
    const speedMult = 1 + (state.shop.upgrades.miningSpeed * 0.10) + (state.shop.skills.rogue * 0.05);
    const conf = SKILLS_DATA[skillKey];
    let newHTML = '';

    conf.nodes.forEach(node => {
        const isUnlocked = state.skills[skillKey].level >= node.levelReq;
        const isActive = state.action.type === skillKey && state.action.id === node.id;
        const actualTime = node.baseTime / speedMult;
        const progressPercent = isActive ? (state.action.progress / actualTime * 100) : 0;
        
        let consumeText = '';
        if (node.consumes) {
            let reqs = [];
            for (const [res, qty] of Object.entries(node.consumes)) {
                const hasEnough = state.resources[res] >= qty;
                reqs.push(`<span style="color: ${hasEnough ? '#22c55e' : '#ef4444'}">${qty}x ${formatResName(res)}</span>`);
            }
            consumeText = `<div style="font-size:0.75rem; text-align:center; margin-top:0.2rem;">Requires: ${reqs.join(', ')}</div>`;
        } else {
            consumeText = `<div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">Base drops: ${node.amount}x ${formatResName(node.produces)}</div>`;
        }

        newHTML += `
            <div class="mining-card ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}" onclick="${isUnlocked ? `startAction('${skillKey}', '${node.id}')` : ''}" style="${isActive ? `border-color: ${conf.color}; box-shadow: 0 0 15px ${conf.color}40; background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, ${conf.color}20 100%);` : ''}">
                <div class="node-name" style="${!isUnlocked ? 'color: var(--text-muted);' : ''}">${node.name}</div>
                ${!isUnlocked ? `<div style="font-size:0.8rem; font-weight:bold; color:#ef4444; margin-top:0.2rem;">Requires Lv. ${node.levelReq}</div>` : ''}
                <div style="${!isUnlocked ? 'opacity: 0.6;' : ''}">
                    ${consumeText}
                </div>
                ${isUnlocked ? `
                <div class="node-stats">
                    <span class="node-stat-item">✨ ${node.xp} XP</span>
                    <span class="node-stat-item">⏱️ ${(actualTime / 1000).toFixed(1)}s</span>
                </div>
                <div class="action-progress-container">
                    <div class="action-progress-fill" id="progress-fill-${node.id}" style="width: ${progressPercent}%; ${isActive ? `background: linear-gradient(90deg, ${conf.color}, ${conf.color}dd); box-shadow: 0 0 10px ${conf.color};` : ''}"></div>
                </div>
                ` : ''}
            </div>
        `;
    });
    container.innerHTML = newHTML;
}

function renderResources() {
    const banner = document.getElementById('resources-banner');
    if (!banner) return;
    let html = `<div class="resource"><span style="color:var(--gold-color)">Gold:</span> <span>${state.resources.gold}</span></div>`;
    
    for (const [res, qty] of Object.entries(state.resources)) {
        if (res === 'gold' || qty <= 0) continue;
        
        let color = '#f8fafc';
        if (res.includes('wood')) color = '#4ade80';
        else if (res.includes('leaf') || res.includes('potion')) color = '#10b981';
        else if (res.includes('raw_') || res.includes('cooked_')) color = '#38bdf8';
        else if (res.includes('bar')) {
            const b = BARS.find(x=>x.id===res);
            if(b) color = b.color;
        } else {
            const gem = GEMS.find(g=>g.id===res);
            if(gem) color = gem.color;
            else color = '#cbd5e1'; 
        }

        html += `<div class="resource"><span style="color:${color}">${formatResName(res)}:</span> <span>${qty}</span></div>`;
    }
    banner.innerHTML = html;
}

// ACHIEVEMENTS & DAILY
const ACHIEVEMENTS = [
    { id: 'slayer1', name: 'Monster Hunter I', desc: 'Defeat 50 Monsters', requirement: () => state.combat.maxStage >= 50, reward: 'Gain +10% Max HP globally' },
    { id: 'slayer2', name: 'Monster Hunter II', desc: 'Defeat 150 Monsters', requirement: () => state.combat.maxStage >= 150, reward: 'Gain +25% Max HP globally' },
    { id: 'miner1', name: 'The Excavator', desc: 'Reach Mining Level 25', requirement: () => state.skills.mining.level >= 25, reward: 'Gain +15% Global Mining Speed' },
    { id: 'prestige1', name: 'Eternity', desc: 'Prestige 5 times', requirement: () => state.flags.prestigeCount >= 5, reward: 'Gain +20% more Prestige Tokens' },
    { id: 'rich1', name: 'Capitalist', desc: 'Amass 100,000 Gold', requirement: () => state.resources.gold >= 100000, reward: '+5% Shop Discount' }
];

function checkAchievements() {
    if (!state.unlocks.achievements) return;
    
    let unlockedAny = false;
    ACHIEVEMENTS.forEach(ach => {
        if (!state.achievements.includes(ach.id) && ach.requirement()) {
            state.achievements.push(ach.id);
            unlockedAny = true;
            
            const achAlert = document.getElementById('nav-ach-alert');
            if (achAlert) achAlert.innerText = '(!)';
        }
    });
    
    if (unlockedAny) renderAchievementsUI();
}

function renderAchievementsUI() {
    const achContainer = document.getElementById('achievements-list');
    if (!achContainer) return;
    
    achContainer.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
        const isUnlocked = state.achievements.includes(ach.id);
        const color = isUnlocked ? '#34d399' : '#64748b';
        const bg = isUnlocked ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.05)';
        const border = isUnlocked ? '#34d399' : 'rgba(255,255,255,0.1)';
        
        achContainer.innerHTML += `
            <div style="background: ${bg}; border: 1px solid ${border}; padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: bold; color: ${color}; font-size: 1.1rem; margin-bottom: 0.25rem;">${ach.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">${ach.desc}</div>
                    <div style="font-size: 0.75rem; color: #fbbf24;">Reward: ${ach.reward}</div>
                </div>
                <div>
                    ${isUnlocked ? '<span style="color:#34d399; font-weight:bold; font-size:1.5rem;">✓</span>' : '<span style="color:#64748b; font-size:1rem;">🔒 Locked</span>'}
                </div>
            </div>
        `;
    });
}

function checkDailyReward() {
    const now = Date.now();
    const msInDay = 86400000;
    
    if (now - state.flags.lastDailyClaim >= msInDay && state.flags.tutorialStep >= 2) {
        const goldReward = 50 * Math.max(1, state.combat.maxStage);
        const tokenReward = Math.max(1, Math.floor((state.combat.highestPrestigeStage || 1) * 0.5));
        
        state.resources.gold += goldReward;
        state.combat.tokens += tokenReward;
        state.flags.lastDailyClaim = now;
        
        const modalText = `🎉 Daily Login Reward Claimed!\n\nYou've received:\n💰 ${goldReward} Gold\n✨ ${tokenReward} Artifact Tokens`;
        
        const offlineModal = document.getElementById('offline-modal');
        if (offlineModal && !offlineModal.classList.contains('active')) {
            const txt = document.getElementById('offline-modal-text');
            if(txt) txt.innerText = modalText;
            offlineModal.classList.add('active');
        } else if (offlineModal && offlineModal.classList.contains('active')) {
            const txt = document.getElementById('offline-modal-text');
            if(txt) txt.innerText += `\n\n${modalText}`;
        }
    }
}

const RARITIES = [
    { id: 'common', name: 'Common', mult: 1, color: '#e2e8f0', weight: 100 },
    { id: 'uncommon', name: 'Uncommon', mult: 1.5, color: '#22c55e', weight: 40 },
    { id: 'rare', name: 'Rare', mult: 2.5, color: '#3b82f6', weight: 15 },
    { id: 'epic', name: 'Epic', mult: 4, color: '#a855f7', weight: 5 },
    { id: 'legendary', name: 'Legendary', mult: 8, color: '#f59e0b', weight: 1 }
];

function getRandomRarity() {
    let total = RARITIES.reduce((sum, r => sum + r.weight), 0);
    let roll = Math.random() * total;
    for (let r of RARITIES) {
        if (roll < r.weight) return r;
        roll -= r.weight;
    }
    return RARITIES[0];
}

function generateProceduralEquipment(category, targetType, barId) {
    let material = BARS.find(m => m.id === barId);
    let rarity = getRandomRarity();
    
    let pwr = material.power * rarity.mult;
    let mult = EQUIP_MULTIPLIERS[targetType];
    
    let variance = 0.9 + (Math.random() * 0.2);
    let baseAtk = Math.round(pwr * mult.atk * variance);
    let baseDef = Math.round(pwr * mult.def * variance);
    let value = Math.round(pwr * 15 * variance);

    let critChance = 0; let critDmg = 0; let dodgeChance = 0; let speedBonus = 0;
    if (rarity.id !== 'common') {
        if (Math.random() > 0.5) critChance = parseFloat((Math.random() * 0.02 * rarity.mult).toFixed(3));
        if (Math.random() > 0.5) critDmg = parseFloat((Math.random() * 0.1 * rarity.mult).toFixed(3));
        if (Math.random() > 0.5) dodgeChance = parseFloat((Math.random() * 0.01 * rarity.mult).toFixed(3));
        if (Math.random() > 0.5 && targetType === 'Weapon') speedBonus = Math.floor(Math.random() * 100 * rarity.mult);
    }

    let lvl = Math.max(1, Math.floor(pwr / 5) + Math.floor(Math.random() * 3));

    return {
        id: state.idCounter++,
        name: `[${rarity.name}] ${material.name} ${TYPE_NAMES[targetType]} (Lv ${lvl})`,
        type: targetType,
        atk: Math.floor(baseAtk * rarity.mult),
        def: Math.floor(baseDef * rarity.mult),
        critChance, critDmg, dodgeChance, speedBonus,
        value: value,
        costType: category,
        color: rarity.color
    };
}

function generateProceduralJewelry(type, barId, gemId) {
    let bar = BARS.find(m => m.id === barId);
    let gem = GEMS.find(g => g.id === gemId);
    let rarity = getRandomRarity();
    
    let pwr = (bar.power + gem.power) * rarity.mult;
    let mult = EQUIP_MULTIPLIERS[type];
    
    let variance = 0.9 + (Math.random() * 0.2);
    let baseAtk = Math.round(pwr * mult.atk * variance);
    let baseDef = Math.round(pwr * mult.def * variance);
    let value = Math.round(pwr * 25 * variance);

    let critChance = 0; let critDmg = 0; let dodgeChance = 0; let speedBonus = 0;
    if (rarity.id !== 'common') {
        if (Math.random() > 0.3) critChance = parseFloat((Math.random() * 0.03 * rarity.mult).toFixed(3));
        if (Math.random() > 0.3) critDmg = parseFloat((Math.random() * 0.15 * rarity.mult).toFixed(3));
        if (Math.random() > 0.3) dodgeChance = parseFloat((Math.random() * 0.02 * rarity.mult).toFixed(3));
        if (Math.random() > 0.5) speedBonus = Math.floor(Math.random() * 50 * rarity.mult);
    }

    let baseVal = baseAtk + baseDef; // Use a combined value for jewelry level
    let lvl = Math.max(1, Math.floor(baseVal / 20) + Math.floor(Math.random() * 2));
    
    return {
        id: state.idCounter++,
        type: type,
        name: `[${rarity.name}] ${gem.name} ${TYPE_NAMES[type]} (Lv ${lvl})`,
        atk: Math.floor(baseAtk * rarity.mult),
        def: Math.floor(baseDef * rarity.mult),
        critChance, critDmg, dodgeChance, speedBonus,
        value: value,
        costType: 'crafting',
        color: rarity.color
    };
}

function changeSmeltingMaterial(mat) { activeSmeltingId = mat; renderWorkshopUI(); }
function changeSmithingMaterial(mat) { activeSmithingBar = mat; renderWorkshopUI(); }
function changeCraftingBar(mat) { activeCraftingBar = mat; renderWorkshopUI(); }
function changeCraftingGem(mat) { activeCraftingGem = mat; renderWorkshopUI(); }

function smeltActiveBar() {
    const rc = SMELTING_RECIPES.find(r => r.id === activeSmeltingId);
    let canProcess = true;
    for(let [k,v] of Object.entries(rc.req)) { if((state.resources[k] || 0) < v) canProcess = false; }
    
    if(!canProcess) {
        alert("Not enough materials to smelt " + rc.name);
        return;
    }

    state.action = {
        type: 'smelting',
        id: rc.id,
        baseTime: 2000,
        progress: 0,
        consumes: rc.req,
        produces: rc.gives,
        xp: 15
    };
    renderWorkshopUI();
}

function smithSpecificItem(type) {
    let cost = 5;
    if ((state.resources[activeSmithingBar] || 0) < cost) {
        alert(`Not enough ${formatResName(activeSmithingBar)}! (Need ${cost})`);
        return;
    }

    state.action = {
        type: 'smithing',
        id: type,
        barId: activeSmithingBar,
        baseTime: 4000,
        progress: 0,
        consumes: { [activeSmithingBar]: cost },
        xp: 50
    };
    renderWorkshopUI();
}

function craftSpecificItem(type) {
    let barCost = 1;
    let gemCost = 1;
    if ((state.resources[activeCraftingBar] || 0) < barCost || (state.resources[activeCraftingGem] || 0) < gemCost) {
        alert(`Not enough materials! (Need 1x Bar and 1x Gem)`);
        return;
    }

    state.action = {
        type: 'crafting',
        id: type,
        barId: activeCraftingBar,
        gemId: activeCraftingGem,
        baseTime: 5000,
        progress: 0,
        consumes: { [activeCraftingBar]: barCost, [activeCraftingGem]: gemCost },
        xp: 75
    };
    renderWorkshopUI();
}

function renderWorkshopUI() {
    const smeltSelect = document.getElementById('smelting-mat-select');
    if (smeltSelect && smeltSelect.children.length === 0) {
        SMELTING_RECIPES.forEach(r => smeltSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`);
    }
    const smeltContainer = document.getElementById('smelting-items');
    if (smeltContainer) {
        const rc = SMELTING_RECIPES.find(r=>r.id===activeSmeltingId);
        let reqs = [];
        for(let [k,v] of Object.entries(rc.req)) {
            const has = state.resources[k] >= v;
            reqs.push(`<span style="color: ${has ? '#22c55e' : '#ef4444'}">${v}x ${formatResName(k)}</span>`);
        }
        const isSmeltingThis = state.action.type === 'smelting' && state.action.id === activeSmeltingId;
        const smeltProg = isSmeltingThis ? `<div class="action-progress-container"><div class="action-progress-fill" id="progress-fill-smelting-${activeSmeltingId}" style="width:0%; background:#ef4444;"></div></div>` : '';
        
        smeltContainer.innerHTML = `
            <div class="workshop-card ${isSmeltingThis ? 'active' : ''}" style="border-color: #ef444450;">
                <div class="workshop-type" style="color:#f8fafc;">${rc.name}</div>
                <div style="font-size:0.75rem; text-align:center; padding-bottom:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05);">${reqs.join(' + ')}</div>
                <div class="workshop-actions" style="margin-top:0.5rem;">
                    <button class="smith-btn" onclick="smeltActiveBar()" style="justify-content:center; background: rgba(239, 68, 68, 0.1);">${isSmeltingThis ? 'Smelting...' : 'Smelt 1 Bar'}</button>
                </div>
                ${smeltProg}
            </div>
        `;
    }

    const smithSelect = document.getElementById('smithing-bar-select');
    if (smithSelect && smithSelect.children.length === 0) {
        BARS.forEach(b => smithSelect.innerHTML += `<option value="${b.id}">${b.name} Bar</option>`);
    }
    const smithContainer = document.getElementById('smithing-items');
    if (smithContainer) {
        smithContainer.innerHTML = '';
        SMITHING_TYPES.forEach(type => {
            const isSmithingThis = state.action.type === 'smithing' && state.action.id === type && state.action.barId === activeSmithingBar;
            const smithProg = isSmithingThis ? `<div class="action-progress-container"><div class="action-progress-fill" id="progress-fill-smithing-${type}" style="width:0%; background:#34d399;"></div></div>` : '';
            
            smithContainer.innerHTML += `
                <div class="workshop-card ${isSmithingThis ? 'active' : ''}">
                    <div class="workshop-type">${type}</div>
                    <div class="workshop-actions">
                        <button class="smith-btn" onclick="smithSpecificItem('${type}')">
                            <span>${isSmithingThis ? 'Smithing...' : 'Smith'}</span>
                            <span style="color:var(--text-muted); font-size: 0.7rem;">5 ${formatResName(activeSmithingBar)}</span>
                        </button>
                    </div>
                    ${smithProg}
                </div>
            `;
        });
    }
    
    const gemSelect = document.getElementById('crafting-gem-select');
    if (gemSelect && gemSelect.children.length === 0) {
        GEMS.forEach(g => gemSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`);
    }
    const craftContainer = document.getElementById('crafting-items');
    if (craftContainer) {
        craftContainer.innerHTML = '';
        CRAFTING_TYPES.forEach(type => {
            const isCraftingThis = state.action.type === 'crafting' && state.action.id === type && state.action.barId === activeCraftingBar && state.action.gemId === activeCraftingGem;
            const craftProg = isCraftingThis ? `<div class="action-progress-container"><div class="action-progress-fill" id="progress-fill-crafting-${type}" style="width:0%; background:#a855f7;"></div></div>` : '';

            craftContainer.innerHTML += `
                <div class="workshop-card ${isCraftingThis ? 'active' : ''}" style="border-color: rgba(232, 121, 249, 0.3);">
                    <div class="workshop-type" style="color: var(--gem-color);">${type}</div>
                    <div class="workshop-actions">
                        <button class="craft-btn" onclick="craftSpecificItem('${type}')">
                            <span>${isCraftingThis ? 'Crafting...' : 'Craft'}</span>
                            <span style="color:var(--text-muted); font-size: 0.7rem;">1 Bar + 1 Gem</span>
                        </button>
                    </div>
                    ${craftProg}
                </div>
            `;
        });
    }
}

function equipItem(id) {
    const itemIndex = state.inventory.findIndex(i => i.id === id);
    if (itemIndex > -1) {
        const item = state.inventory[itemIndex];
        
        let targetSlot = item.type;
        if (item.type === 'Ring') {
            if (!state.equipped.Ring1) targetSlot = 'Ring1';
            else if (!state.equipped.Ring2) targetSlot = 'Ring2';
            else targetSlot = 'Ring1';
        } else if (item.type === 'Ear') {
            if (!state.equipped.Ear1) targetSlot = 'Ear1';
            else if (!state.equipped.Ear2) targetSlot = 'Ear2';
            else targetSlot = 'Ear1';
        }

        if (state.equipped[targetSlot]) {
            state.inventory.push(state.equipped[targetSlot]);
        }
        state.equipped[targetSlot] = item;
        state.inventory.splice(itemIndex, 1);
        
        updateUI();
    }
}

function unequipItem(slot) {
    if (state.equipped[slot]) {
        state.inventory.push(state.equipped[slot]);
        state.equipped[slot] = null;
        updateUI();
    }
}

function sellItem(id) {
    const itemIndex = state.inventory.findIndex(i => i.id === id);
    if (itemIndex > -1) {
        const item = state.inventory[itemIndex];
        state.resources.gold += item.value;
        state.inventory.splice(itemIndex, 1);
        updateUI();
    }
}

function updateCombatUI() {
    const playerMax = getPlayerMaxHp();
    const stEl = document.getElementById('combat-stage');
    if (stEl) {
        stEl.innerText = state.combat.stage;
        document.getElementById('prestige-tokens').innerText = state.combat.tokens;
        document.getElementById('enemy-name').innerText = state.combat.enemy.name;
        
        const pFill = Math.max(0, (state.combat.playerHp / playerMax) * 100);
        document.getElementById('stat-hp').innerText = `${Math.floor(state.combat.playerHp)} / ${playerMax}`;
        document.getElementById('combat-player-hp').innerText = `${Math.floor(state.combat.playerHp)} / ${playerMax}`;
        document.getElementById('combat-player-fill').style.width = pFill + '%';
        
        const eFill = Math.max(0, (state.combat.enemy.hp / state.combat.enemy.maxHp) * 100);
        document.getElementById('combat-enemy-hp').innerText = `${Math.floor(state.combat.enemy.hp)} / ${state.combat.enemy.maxHp}`;
        document.getElementById('combat-enemy-fill').style.width = eFill + '%';

        const toggleBtn = document.getElementById('combat-toggle-btn');
        if (toggleBtn) {
            toggleBtn.innerText = state.combat.isActive ? 'Leave Combat' : 'Enter Combat';
            toggleBtn.style.background = state.combat.isActive ? 'rgba(239, 68, 68, 0.2)' : '';
        }

        const alertEl = document.getElementById('nav-combat-alert');
        if (alertEl) {
            alertEl.innerText = state.combat.isActive ? '(Active)' : '';
        }
        
        const combatLvDisplay = document.getElementById('combat-level-display');
        if (combatLvDisplay) {
            combatLvDisplay.innerText = getCombatLevel();
        }

        document.getElementById('unspent-sp').innerText = state.combat.skillPoints;
        document.getElementById('knight-lv').innerText = state.shop.skills.knight;
        document.getElementById('warlord-lv').innerText = state.shop.skills.warlord;
        document.getElementById('rogue-lv').innerText = state.shop.skills.rogue;

        const gearContainer = document.getElementById('combat-gear-display');
        if (gearContainer) {
            let gearHtml = `<div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.75rem; justify-content:center; margin-bottom: 0.5rem;">`;
            for (const slot in state.equipped) {
                if (state.equipped[slot]) {
                    gearHtml += `<span style="background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border: 1px solid ${state.equipped[slot].color || '#fff'}40; color:${state.equipped[slot].color || '#e2e8f0'}">${state.equipped[slot].name}</span>`;
                }
            }
            if (gearHtml === `<div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.75rem; justify-content:center; margin-bottom: 0.5rem;">`) {
                gearHtml += `<span style="color:var(--text-muted)">No gear equipped</span>`;
            }
            gearHtml += `</div>`;
            
            gearHtml += `<div style="display:flex; gap: 1rem; justify-content:center; font-size: 0.8rem;">`;
            if (state.combat.autoEatRule !== 'none') {
                const fCount = Math.floor(state.resources[state.combat.autoEatRule] || 0);
                gearHtml += `<span style="color:#fbbf24;">🍔 Food: <strong>${fCount}</strong></span>`;
            } else {
                gearHtml += `<span style="color:var(--text-muted);">🍔 Food: None</span>`;
            }
            
            if (state.combat.activePotion !== 'none') {
                const pCount = Math.floor(state.resources[state.combat.activePotion] || 0);
                gearHtml += `<span style="color:#a78bfa;">🧪 Potion: <strong>${pCount}</strong></span>`;
            } else {
                gearHtml += `<span style="color:var(--text-muted);">🧪 Potion: None</span>`;
            }
            gearHtml += `</div>`;
            
            gearContainer.innerHTML = gearHtml;
        }
        
        updateComboUI();
    }
}

function updateUI() {
    let baseAtk = 0; let baseDef = 0;
    let critChanceBonus = 0; let critDmgBonus = 0; let dodgeChanceBonus = 0; let speedMod = 0;

    for (const slot in state.equipped) {
        const item = state.equipped[slot];
        if (item) {
            baseAtk += item.atk || 0;
            baseDef += item.def || 0;
            critChanceBonus += item.critChance || 0;
            critDmgBonus += item.critDmg || 0;
            dodgeChanceBonus += item.dodgeChance || 0;
            if(item.speedBonus) speedMod += item.speedBonus;
        }
    }

    state.stats.critChance = Math.min(0.8, 0.05 + critChanceBonus);
    state.stats.critDmg = 1.5 + critDmgBonus;
    state.stats.dodgeChance = Math.min(0.75, 0.0 + dodgeChanceBonus);
    state.stats.attackSpeed = Math.max(500, 1500 - speedMod);
        
    state.stats.atk = Math.floor(baseAtk * (1 + (state.shop.upgrades.atkMultiplier * 0.1)) * (1 + (state.shop.skills.knight * 0.05)));
    state.stats.def = Math.floor(baseDef * (1 + (state.shop.upgrades.defMultiplier * 0.1)));

    renderResources();
    Object.keys(SKILLS_DATA).forEach(key => updateGenericSkillUI(key));
    renderWorkshopUI();
    renderShopUI();
    renderAchievementsUI();
    updateCombatUI();

    const hpEl = document.getElementById('stat-hp');
    if (hpEl) hpEl.innerText = `${Math.floor(state.combat.playerHp)} / ${getPlayerMaxHp()}`;
    const atkEl = document.getElementById('stat-atk');
    if (atkEl) atkEl.innerText = state.stats.atk;
    const defEl = document.getElementById('stat-def');
    if (defEl) defEl.innerText = state.stats.def;

    const statsExtended = document.getElementById('stats-extended');
    if (statsExtended) {
        statsExtended.innerHTML = `
            <div title="Critical Strike Chance">🎯 Crit: ${(state.stats.critChance * 100).toFixed(1)}%</div>
            <div title="Critical Damage">💥 Crit DMG: ${state.stats.critDmg.toFixed(1)}x</div>
            <div title="Dodge Chance">💨 Dodge: ${(state.stats.dodgeChance * 100).toFixed(1)}%</div>
            <div title="Attack Speed">⚡ Atk Spd: ${(1000 / state.stats.attackSpeed).toFixed(2)} /s</div>
        `;
    }

    const eqContainer = document.getElementById('equipment-slots');
    if (eqContainer) {
        eqContainer.innerHTML = '';
        Object.keys(state.equipped).forEach(slot => {
            const item = state.equipped[slot];
            if (item) {
                let sStats = '';
                if(item.critChance) sStats += `<span style="color:#facc15" title="Crit Chance">+${(item.critChance*100).toFixed(1)}% CRIT </span>`;
                if(item.critDmg) sStats += `<span style="color:#f87171" title="Crit DMG">+${item.critDmg}x DMG </span>`;
                if(item.dodgeChance) sStats += `<span style="color:#60a5fa" title="Dodge">+${(item.dodgeChance*100).toFixed(1)}% EVA </span>`;
                if(item.speedBonus) sStats += `<span style="color:#34d399" title="SpeedBonus">+${item.speedBonus} SPD</span>`;

                eqContainer.innerHTML += `
                    <div class="slot equipped" style="border-color: ${item.color || '#fff'}; background: linear-gradient(135deg, ${item.color}15 0%, transparent 100%);">
                        <div class="slot-info">
                            <span class="slot-name">${slot}</span>
                            <div class="item-details">
                                <span class="item-name" style="color: ${item.color || '#e2e8f0'}">${item.name}</span>
                                <div class="item-stats">
                                    ${item.atk ? `<span class="item-atk">⚔️ ${item.atk}</span>` : ''}
                                    ${item.def ? `<span class="item-def">🛡️ ${item.def}</span>` : ''}
                                </div>
                                <div style="font-size:0.65rem; color:var(--text-muted);">${sStats}</div>
                            </div>
                        </div>
                        <button class="unequip-btn" onclick="unequipItem('${slot}')">Unequip</button>
                    </div>
                `;
            } else {
                eqContainer.innerHTML += `
                    <div class="slot">
                        <div class="slot-info">
                            <span class="slot-name">${slot}</span>
                            <span class="item-name" style="color: var(--text-muted); font-style: italic; font-weight: normal;">Empty</span>
                        </div>
                    </div>
                `;
            }
        });
    }

    const invContainer = document.getElementById('inventory-list');
    if (invContainer) {
        invContainer.innerHTML = '';
        let hasAnyItem = false;
        
        // Render Equipment Data
        state.inventory.forEach(item => {
            hasAnyItem = true;
            let sStats = '';
            if(item.critChance) sStats += `<span style="color:#facc15" title="Crit Chance">+${(item.critChance*100).toFixed(1)}% CRIT </span>`;
            if(item.critDmg) sStats += `<span style="color:#f87171" title="Crit DMG">+${item.critDmg}x DMG </span>`;
            if(item.dodgeChance) sStats += `<span style="color:#60a5fa" title="Dodge">+${(item.dodgeChance*100).toFixed(1)}% EVA </span>`;
            if(item.speedBonus) sStats += `<span style="color:#34d399" title="SpeedBonus">+${item.speedBonus} SPD</span>`;
            
            invContainer.innerHTML += `
                <div class="inv-item" style="border-color: ${item.color}40; background: linear-gradient(to right, ${item.color}10, transparent);">
                    <div class="inv-header">
                        <span class="item-name" style="color: ${item.color}">${item.name}</span>
                        <span class="inv-type">${item.type}</span>
                    </div>
                    <div class="inv-stats-row">
                        <div class="item-stats" style="margin: 0; gap: 0.5rem; flex-direction: column;">
                            <div>
                                ${item.atk ? `<span class="item-atk">⚔️ ${item.atk}</span>` : ''}
                                ${item.def ? `<span class="item-def">🛡️ ${item.def}</span>` : ''}
                            </div>
                            <div style="font-size: 0.65rem;">${sStats}</div>
                            ${!item.atk && !item.def && !sStats ? '<span style="color:var(--text-muted)">No combat metrics</span>' : ''}
                        </div>
                        <span class="inv-value">💰 ${item.value}</span>
                    </div>
                    <div class="inv-actions">
                        <button class="equip-btn" style="background:${item.color}20; color:${item.color}; border-color:${item.color}50;" onclick="equipItem(${item.id})">Equip</button>
                        <button class="sell-btn" onclick="sellItem(${item.id})">Sell</button>
                    </div>
                </div>
            `;
        });
        
        // Render Raw Materials / Consumables / Gold into the same list
        const skipKeys = ['token'];
        for (const [res, qty] of Object.entries(state.resources)) {
            if (qty > 0 && !skipKeys.includes(res)) {
                hasAnyItem = true;
                const formattedName = res.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                
                let resColor = '#e2e8f0';
                if (res === 'gold') resColor = '#fbbf24';
                else if (res.includes('wood')) resColor = '#22c55e';
                else if (res.includes('potion')) resColor = '#a855f7';
                else if (res.includes('bar')) resColor = '#cbd5e1';
                
                invContainer.innerHTML += `
                    <div class="inv-item" style="border-color: ${resColor}40; background: linear-gradient(to right, ${resColor}10, transparent); display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 0.8rem;">
                        <div style="display:flex; flex-direction:column;">
                            <span class="item-name" style="color: ${resColor}; font-size: 1rem;">${formattedName}</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">Stackable Resource</span>
                        </div>
                        <div style="font-size: 1.1rem; font-family: monospace; font-weight: bold; color: #f8fafc;">
                            x${Math.floor(qty).toLocaleString()}
                        </div>
                    </div>
                `;
            }
        }
        
        if (!hasAnyItem) {
            invContainer.innerHTML = '<div class="empty-state">Inventory is empty.<br>Start mining or hunting to collect items!</div>';
        }
    }
}

async function handleAuth(type) {
    let user = document.getElementById('auth-user').value;
    const errText = document.getElementById('auth-error');
    
    if (!user) user = "LocalPlayer";
    
    const payload = { username: user };
    const mockToken = "mock." + btoa(JSON.stringify(payload)) + ".mock";
    localStorage.setItem('fantasy_jwt', mockToken);
    
    if (errText) errText.innerText = 'Local Login Success! Loading...';
    setTimeout(() => {
        location.reload();
    }, 500);
}

window.switchTab = switchTab;
window.startAction = startAction;
window.changeSmeltingMaterial = changeSmeltingMaterial;
window.changeSmithingMaterial = changeSmithingMaterial;
window.changeCraftingBar = changeCraftingBar;
window.changeCraftingGem = changeCraftingGem;
window.smeltActiveBar = smeltActiveBar;
window.smithSpecificItem = smithSpecificItem;
window.craftSpecificItem = craftSpecificItem;
window.equipItem = equipItem;
window.unequipItem = unequipItem;
window.sellItem = sellItem;
window.prestige = prestige;
window.toggleCombat = toggleCombat;
window.changeAutoEat = changeAutoEat;
window.changeActivePotion = changeActivePotion;
window.buyTokenUpgrade = buyTokenUpgrade;
window.buyGoldBoost = buyGoldBoost;
window.openPrestigeModal = openPrestigeModal;
window.closePrestigeModal = closePrestigeModal;
window.confirmPrestige = confirmPrestige;
window.buySkillPoint = buySkillPoint;
window.wipeSave = wipeSave;
window.handleAuth = handleAuth;
window.logout = logout;
window.playerClickAttack = playerClickAttack;

loadGame();
