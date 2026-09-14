// xp-advancement.js (issu de postcycle-progression.js)
// Rôle : montée de niveau et avancées de combattant (jet de 2D6 du joueur,
// application des paliers de la table d'avancement, tirage aléatoire ou choix
// manuel de compétences selon le résultat retenu).
// Dépendances : core-state.js (safeSave, showToast, openModal, closeModal,
// escapeHtml, escapeForJsStr), game-state-scenarios.js (getFighterXP,
// getFighterRank, getPendingAdvances, applyStatUpgrade), postbattle-sequence.js
// (safeSave), postcycle-core.js (renderPostCycleView). Peut être chargé à
// n'importe quel moment après ces fichiers ; rien ici n'exécute de code au
// chargement (uniquement des déclarations de fonctions/constantes).

// ==========================================
// MONTÉE DE NIVEAU & AVANCÉES
// ==========================================
// Table des avancées d'expérience (2D6). Chaque entrée décrit le coût fixe en
// crédits (ajouté à la valeur du combattant) et les choix disponibles pour ce
// résultat. Un choix est soit une statistique (+1 direct), soit une compétence
// à tirer au hasard dans un arbre choisi ("skill_random"), soit une compétence
// à choisir manuellement dans un ou plusieurs arbres ("skill_pick").
const XP_ADVANCE_TIER_3_4 = { cost: 5, choices: [{ type: 'stat', stat: 'Cl' }, { type: 'stat', stat: 'Wil' }] };
const XP_ADVANCE_TIER_7_8 = { cost: 15, choices: [{ type: 'skill_pick', mode: 'secondary' }] };
const XP_ADVANCE_TABLE = {
    2: { cost: 5, choices: [{ type: 'stat', stat: 'Ld' }, { type: 'stat', stat: 'Int' }, { type: 'skill_random', mode: 'primary' }] },
    3: XP_ADVANCE_TIER_3_4,
    4: XP_ADVANCE_TIER_3_4,
    5: { cost: 10, choices: [{ type: 'skill_pick', mode: 'primary' }, { type: 'skill_random', mode: 'secondary' }] },
    6: { cost: 10, choices: [{ type: 'stat', stat: 'I' }, { type: 'stat', stat: 'M' }] },
    7: XP_ADVANCE_TIER_7_8,
    8: XP_ADVANCE_TIER_7_8,
    9: { cost: 15, choices: [{ type: 'stat', stat: 'WS' }, { type: 'stat', stat: 'BS' }] },
    10: { cost: 20, choices: [{ type: 'stat', stat: 'S' }, { type: 'stat', stat: 'T' }] },
    11: { cost: 20, choices: [{ type: 'stat', stat: 'W' }, { type: 'stat', stat: 'A' }, { type: 'stat', stat: 'Sv' }] },
    12: { cost: 30, choices: [{ type: 'skill_pick', mode: 'any' }] }
};

const XP_SKILL_MODE_LABELS = { primary: 'primaire', secondary: 'secondaire', any: "n'importe laquelle" };

// Retourne les clés d'arbres de compétences (db.skills) éligibles pour ce
// combattant selon le mode : 'primary'/'secondary' (arbres du profil du
// combattant) ou 'any' (tous les arbres, y compris générique).
function getEligibleSkillTreeKeys(m, mode) {
    if (mode === 'any') return Object.keys(db.skills || {});
    let charDef = (typeof db !== 'undefined' && db.characters) ? db.characters.find(c => c.id === m.charId) : null;
    if (!charDef) return [];
    const norm = s => String(s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    let list = (mode === 'primary' ? charDef.primary_skills : charDef.secondary_skills) || [];
    let listNorm = list.map(norm);
    return Object.keys(db.skills || {}).filter(k => listNorm.includes(norm(k)));
}

// Une compétence "specific_to" n'est proposée qu'au combattant/type concerné
// (ex: Juggernaut réservé aux brutes, Lands on their feet au Phyrr Cat).
function isSkillEligibleForFighter(m, skillDef) {
    if (!skillDef || !skillDef.specific_to) return true;
    if (skillDef.specific_to === m.charId) return true;
    let types = (m.type || []).map(t => String(t || '').toLowerCase());
    return types.includes(String(skillDef.specific_to).toLowerCase());
}

// Compétences non encore possédées par ce combattant, dans les arbres donnés.
// Sur un résultat de 12 (n'importe quelle compétence), la restriction
// "specific_to" (ex: Juggernaut réservé aux brutes) ne s'applique PAS : ce
// résultat donne vraiment accès à l'intégralité des compétences du jeu.
// unrestricted=true désactive donc ce filtre.
function getUnownedSkillsInTrees(m, treeKeys, unrestricted) {
    let owned = (m.skills || []).map(s => (typeof s === 'string' ? s : s.name));
    let result = [];
    (treeKeys || []).forEach(catKey => {
        (db.skills[catKey] || []).forEach(sk => {
            let name = typeof sk === 'string' ? sk : sk.name;
            if (owned.includes(name)) return;
            if (!unrestricted && typeof sk === 'object' && !isSkillEligibleForFighter(m, sk)) return;
            result.push({ catKey, skill: sk, name });
        });
    });
    return result;
}

// Tirage aléatoire à probabilité égale parmi une liste (compétences restantes).
function pickRandomFromList(list) {
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
}

// Applique une compétence (objet ou simple nom) au combattant et met à jour son
// coût, comme le fait déjà confirmStatLevelUp() pour les statistiques.
function applySkillToFighter(m, skillDefOrName, cost) {
    if (!m.skills) m.skills = [];
    let toAdd = (typeof skillDefOrName === 'object') ? JSON.parse(JSON.stringify(skillDefOrName)) : skillDefOrName;
    m.skills.push(toAdd);
    m.advancesCost = (m.advancesCost || 0) + cost;
    m.totalCost = (m.totalCost || m.cost || 0) + cost;
    m.advancesCount = (m.advancesCount || 0) + 1;
    safeSave();
}

// Après l'application d'un choix d'avancée : ré-ouvre la montée de niveau s'il
// reste des avancées à choisir, sinon referme et rafraîchit la vue.
function afterLevelUpChoiceApplied(fighterId) {
    xpWizardState = null;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (m && getPendingAdvances(m) > 0) {
        openLevelUpModal(fighterId);
    } else {
        closeModal();
        refreshCurrentView();
    }
}

// ---- Étape 1 : lancer 2D6 -------------------------------------------------
function openLevelUpModal(fighterId) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    let xp = getFighterXP(m);
    let rank = getFighterRank(xp);
    let pending = getPendingAdvances(m);

    if (pending <= 0) return showToast("Aucune montée de niveau disponible pour ce guerrier.", "error");

    let html = `
        <div style="max-height:65vh; overflow-y:auto; padding-right:5px;">
            <p>Combattant : <strong style="color:var(--accent-cyan);">${m.customName}</strong> (${m.charName})</p>
            <p>XP : <strong>${xp}</strong> | Rang : <strong>${rank}</strong> | Avancées à choisir : <strong style="color:var(--accent-purple); font-size:16px;">${pending}</strong></p>
            <div style="background:#111318; border:1px solid #333; border-radius:6px; padding:10px 14px; margin:10px 0; font-size:13px; color:#ddd; line-height:1.5;">
                Jeter 2D6 et reporter le résultat. On peut prendre un résultat inférieur au jet de dé.
            </div>
            <div style="background:#111; padding:14px; border-radius:5px; border:1px solid #333;">
                <label style="display:block; margin-bottom:8px; font-size:13px;">Résultat de votre jet de 2D6 (2 à 12) :</label>
                <input type="number" id="levelup-manual-roll" min="2" max="12" step="1" style="width:100%; padding:8px; font-size:16px; text-align:center; margin-bottom:10px;" placeholder="Ex : 8">
                <button class="btn btn-cyan" style="width:100%; font-weight:bold;" onclick="submitLevelUpManualRoll('${m.id}')">Valider le jet</button>
            </div>
        </div>
        <br>
        <button class="btn" onclick="closeModal()">Fermer</button>
    `;
    if (typeof openModal === 'function') openModal("⭐ Montée de Niveau", html);
}

// Le jet de 2D6 est fait par le joueur avec ses propres dés physiques : le
// programme ne simule aucun lancer, il se contente d'enregistrer le résultat
// qu'il indique et de proposer, ensuite, d'en retenir un inférieur si souhaité.
function submitLevelUpManualRoll(fighterId) {
    let input = document.getElementById('levelup-manual-roll');
    if (!input) return;
    let total = parseInt(input.value, 10);
    if (isNaN(total) || total < 2 || total > 12) {
        return showToast("Veuillez entrer un résultat de 2D6 valide (entre 2 et 12).", "error");
    }
    renderLevelUpRollResult(fighterId, total);
}

// ---- Étape 2 : une seule fenêtre qui se déploie au fil des choix ----------
// Plutôt que d'enchaîner des fenêtres séparées, tout se passe dans LA MÊME
// modale : cliquer sur une compétence déplie son choix d'arbre puis la liste
// juste en dessous, sans rien remplacer autour. Cliquer à nouveau sur ce même
// choix (ou sur un autre) le replie/change — c'est ça qui sert de "retour
// en arrière" naturel, sans bouton dédié à chaque étape.
// Regroupement des paliers par plage de résultat (labels du tableau : 2, 3-4,
// 5, 6, 7-8, 9, 10, 11, 12).
const XP_ADVANCE_RANGES = [
    { min: 2, max: 2, label: '2', tier: XP_ADVANCE_TABLE[2] },
    { min: 3, max: 4, label: '3-4', tier: XP_ADVANCE_TIER_3_4 },
    { min: 5, max: 5, label: '5', tier: XP_ADVANCE_TABLE[5] },
    { min: 6, max: 6, label: '6', tier: XP_ADVANCE_TABLE[6] },
    { min: 7, max: 8, label: '7-8', tier: XP_ADVANCE_TIER_7_8 },
    { min: 9, max: 9, label: '9', tier: XP_ADVANCE_TABLE[9] },
    { min: 10, max: 10, label: '10', tier: XP_ADVANCE_TABLE[10] },
    { min: 11, max: 11, label: '11', tier: XP_ADVANCE_TABLE[11] },
    { min: 12, max: 12, label: '12', tier: XP_ADVANCE_TABLE[12] }
];

// État du "dépliage" en cours : quel choix (palier + index) est actuellement
// ouvert, et quel arbre de compétences a été sélectionné dans ce choix.
// Remis à zéro à chaque nouveau jet et une fois une avancée appliquée.
let xpWizardState = null;

function renderLevelUpRollResult(fighterId, total) {
    xpWizardState = { fighterId, total, activeRangeIdx: null, activeChoiceIdx: null, treeKey: null };
    renderXpWizardView();
}

function renderXpWizardView() {
    if (!currentGang || !xpWizardState) return;
    let m = currentGang.members.find(x => x.id === xpWizardState.fighterId);
    if (!m) return;

    let xp = getFighterXP(m);
    let rank = getFighterRank(xp);
    let pending = getPendingAdvances(m);
    let total = xpWizardState.total;

    let rangesHTML = XP_ADVANCE_RANGES
        .filter(r => r.min <= total)
        .map((r, rangeIdx) => buildRangeBlockHTML(m, r, rangeIdx))
        .join('');

    let html = `
        <div style="max-height:68vh; overflow-y:auto; padding-right:5px;">
            <p>Combattant : <strong style="color:var(--accent-cyan);">${m.customName}</strong> (${m.charName})</p>
            <p>XP : <strong>${xp}</strong> | Rang : <strong>${rank}</strong> | Avancées à choisir : <strong style="color:var(--accent-purple); font-size:16px;">${pending}</strong></p>
            <div style="text-align:center; padding:8px 0; background:#111; border-radius:6px; border:1px solid #333; margin-bottom:10px;">
                <div style="font-size:12px; color:#aaa;">Votre jet</div>
                <div style="font-size:26px; font-weight:bold; color:var(--accent-cyan); line-height:1.2;">${total}</div>
                <button class="btn" style="margin-top:4px; padding:3px 10px; font-size:11px;" onclick="openLevelUpModal('${m.id}')">✏️ Corriger le résultat saisi</button>
            </div>
            <div style="background:#111318; border:1px solid #333; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:12px; color:#aaa;">
                Toutes les avancées pour ${total} et moins sont proposées ci-dessous. Pour une compétence, cliquez pour déplier le choix de l'arbre puis de la compétence ; recliquez dessus (ou sur un autre choix) pour revenir en arrière.
            </div>
            <hr style="margin:10px 0; border-color:#333;">
            ${rangesHTML}
        </div>
        <br>
        <button class="btn" onclick="closeModal()">Fermer</button>
    `;
    if (typeof openModal === 'function') openModal("⭐ Montée de Niveau — Choix de l'avancée", html);
}

// Un bloc = un résultat (ou une plage, ex "3-4") avec ses boutons de choix.
function buildRangeBlockHTML(m, range, rangeIdx) {
    let tier = range.tier;
    let choicesHTML = tier.choices.map((choice, choiceIdx) => buildChoiceButtonHTML(m, tier, choice, rangeIdx, choiceIdx)).join('');
    return `
        <div style="margin-bottom:12px;">
            <div style="font-size:12px; color:#aaa; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
                Résultat ${range.label}
            </div>
            ${choicesHTML}
        </div>
    `;
}

// Un choix "stat" s'applique directement (pas de dépliage nécessaire). Un
// choix "compétence" est un bouton dépliant : cliqué, il ouvre juste en
// dessous de lui le choix de l'arbre puis la liste des compétences.
function buildChoiceButtonHTML(m, tier, choice, rangeIdx, choiceIdx) {
    if (choice.type === 'stat') {
        return `
            <button class="btn" style="display:block; width:100%; padding:9px; font-size:13px; margin:4px 0; text-align:left;" onclick="confirmStatLevelUp('${m.id}', '${choice.stat}', ${tier.cost})">
                <strong>+1 ${choice.stat}</strong> <span style="color:#2ecc71;">(+${tier.cost} cr)</span>
            </button>
        `;
    }

    let isActive = xpWizardState.activeRangeIdx === rangeIdx && xpWizardState.activeChoiceIdx === choiceIdx;
    let label = choice.type === 'skill_random'
        ? `🎲 Compétence ${XP_SKILL_MODE_LABELS[choice.mode]} aléatoire`
        : (choice.mode === 'any' ? "Choisir n'importe quelle compétence" : `Choisir une compétence ${XP_SKILL_MODE_LABELS[choice.mode]}`);

    let buttonHTML = `
        <button class="btn ${isActive ? 'btn-cyan' : ''}" style="display:block; width:100%; padding:9px; font-size:13px; margin:4px 0; text-align:left;" onclick="toggleXpChoiceExpansion(${rangeIdx}, ${choiceIdx})">
            ${isActive ? '▾' : '▸'} <strong>${label}</strong> <span style="color:#2ecc71;">(+${tier.cost} cr)</span>
        </button>
    `;

    if (isActive) {
        buttonHTML += buildChoiceExpansionHTML(m, choice, tier);
    }

    return buttonHTML;
}

// Ouvre/referme le dépliage d'un choix de compétence. Cliquer sur le choix
// déjà ouvert le referme (retour en arrière) ; cliquer sur un autre choix y
// bascule directement. Change de choix = on oublie l'arbre précédemment
// sélectionné (on repart du début pour ce nouveau choix).
function toggleXpChoiceExpansion(rangeIdx, choiceIdx) {
    if (!xpWizardState) return;
    if (xpWizardState.activeRangeIdx === rangeIdx && xpWizardState.activeChoiceIdx === choiceIdx) {
        xpWizardState.activeRangeIdx = null;
        xpWizardState.activeChoiceIdx = null;
    } else {
        xpWizardState.activeRangeIdx = rangeIdx;
        xpWizardState.activeChoiceIdx = choiceIdx;
    }
    xpWizardState.treeKey = null;
    renderXpWizardView();
}

// Change l'arbre sélectionné pour le choix actuellement déplié (reste dans
// la même fenêtre, remplace juste la liste de compétences affichée).
function selectXpTree(treeKey) {
    if (!xpWizardState) return;
    xpWizardState.treeKey = treeKey;
    renderXpWizardView();
}

// Contenu déplié sous un choix de compétence : le choix de l'arbre (si plus
// d'un arbre possible), puis le tirage aléatoire ou la liste de compétences.
function buildChoiceExpansionHTML(m, choice, tier) {
    let treeKeys = getEligibleSkillTreeKeys(m, choice.mode);
    if (treeKeys.length === 0) {
        return `<div style="margin:4px 0 10px 16px; padding:8px 10px; background:#0d0e13; border-left:3px solid var(--accent-cyan); border-radius:0 4px 4px 0; font-size:12px; color:#888;">Aucun arbre de compétences disponible pour ce guerrier.</div>`;
    }

    let unrestricted = (choice.mode === 'any');
    let needsTreePick = treeKeys.length > 1 && choice.mode !== 'any';

    let html = `<div style="margin:4px 0 10px 16px; padding:10px; background:#0d0e13; border-left:3px solid var(--accent-cyan); border-radius:0 4px 4px 0;">`;

    let effectiveTreeKeys = null;
    if (!needsTreePick) {
        effectiveTreeKeys = treeKeys;
    } else {
        html += `
            <div style="font-size:12px; color:#aaa; margin-bottom:6px;">Choisissez un arbre :</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
                ${treeKeys.map(k => `
                    <button class="btn ${xpWizardState.treeKey === k ? 'btn-cyan' : ''}" style="padding:5px 10px; font-size:12px; margin:0;" onclick="selectXpTree('${k}')">
                        ${k}${xpWizardState.treeKey === k ? ' ✓' : ''}
                    </button>
                `).join('')}
            </div>
        `;
        if (xpWizardState.treeKey) effectiveTreeKeys = [xpWizardState.treeKey];
    }

    if (effectiveTreeKeys) {
        let keysLiteral = `[${effectiveTreeKeys.map(k => `'${k}'`).join(',')}]`;
        if (choice.type === 'skill_random') {
            html += `<button class="btn btn-cyan" style="width:100%; font-weight:bold; margin:0;" onclick="applyRandomSkillFromTrees('${m.id}', ${keysLiteral}, ${tier.cost}, ${unrestricted})">🎲 Tirer une compétence au hasard</button>`;
        } else {
            html += buildInlineSkillListHTML(m, effectiveTreeKeys, tier.cost, unrestricted);
        }
    }

    html += `</div>`;
    return html;
}

// Liste de compétences non possédées, cliquables directement, groupées par
// arbre quand plusieurs sont affichés ensemble (cas du résultat 12).
function buildInlineSkillListHTML(m, treeKeys, cost, unrestricted) {
    let candidates = getUnownedSkillsInTrees(m, treeKeys, unrestricted);
    if (candidates.length === 0) {
        return `<p style="color:#888; font-size:12px; margin:0;">Aucune compétence disponible (déjà toutes acquises).</p>`;
    }

    let byTree = {};
    candidates.forEach(c => {
        if (!byTree[c.catKey]) byTree[c.catKey] = [];
        byTree[c.catKey].push(c);
    });
    let showTreeLabel = Object.keys(byTree).length > 1;

    return Object.keys(byTree).map(catKey => `
        <div style="margin-bottom:8px;">
            ${showTreeLabel ? `<strong style="color:var(--accent-purple); text-transform:uppercase; font-size:11px;">${catKey}</strong>` : ''}
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:4px;">
                ${byTree[catKey].map(c => `
                    <button class="btn" style="padding:6px; font-size:12px; text-align:left; margin:0;" onclick="applyPickedSkill('${m.id}', '${escapeForJsStr(c.name)}', ${cost})" title="${escapeHtml(c.skill.desc || '')}">
                        ${escapeHtml(c.name)}
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function confirmStatLevelUp(fighterId, statKey, cost) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    applyStatUpgrade(m, statKey);
    m.advancesCost = (m.advancesCost || 0) + cost;
    m.totalCost = (m.totalCost || m.cost || 0) + cost;
    m.advancesCount = (m.advancesCount || 0) + 1;
    safeSave();

    showToast(`Statistique ${statKey} augmentée (+${cost} cr) !`, "success");
    afterLevelUpChoiceApplied(fighterId);
}

function applyRandomSkillFromTrees(fighterId, treeKeys, cost, unrestricted) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    let candidates = getUnownedSkillsInTrees(m, treeKeys, unrestricted);
    if (candidates.length === 0) {
        return showToast("Toutes les compétences de cet arbre sont déjà acquises.", "error");
    }

    let picked = pickRandomFromList(candidates);
    applySkillToFighter(m, picked.skill, cost);
    showToast(`Compétence tirée au hasard : ${picked.name} (+${cost} cr) !`, "success");
    afterLevelUpChoiceApplied(fighterId);
}

function applyPickedSkill(fighterId, skillName, cost) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    let foundObj = null;
    if (typeof db !== 'undefined' && db.skills) {
        for (let cat in db.skills) {
            let match = db.skills[cat].find(sk => (typeof sk === 'string' ? sk : sk.name) === skillName);
            if (match) { foundObj = match; break; }
        }
    }

    applySkillToFighter(m, foundObj || skillName, cost);
    showToast(`Compétence ${skillName} choisie (+${cost} cr) !`, "success");
    afterLevelUpChoiceApplied(fighterId);
}

function refreshCurrentView() {
    let container = document.getElementById('main-content');
    if (typeof appState !== 'undefined' && appState.view === 'post-battle') {
        renderPostBattleView(container);
    } else {
        renderPostCycleView(container);
    }
}
