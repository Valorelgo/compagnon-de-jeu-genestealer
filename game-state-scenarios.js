// game-state-scenarios.js (1/3 - issu de l'ancien game.js)
// Rôle : état de la partie en cours (roster, score, tour, cartes tactiques),
// utilitaires de partie (rang, avancées, réputation), et la préparation de
// scénario (mise en place, renforts, sélection initiale des combattants).
// Dépendances : les fichiers issus de l'ancien app.js (currentGang, saveGangs,
// db, openModal, showToast...).

let currentGameRoster = [];
let gameTactics = [];
let gameScores = {
    myScore: 0,
    opponentScore: 0,
    priority: 'À déterminer',
    previousPriority: null,
    round: 1,
    bottleCheckRequired: false,
    bottleCheckDoneThisRound: false,
    isBottledOut: false
};

const CUMULATIVE_CONDITIONS = [
    "Blessé", "Folie", "Entoilé", "Fearsome", "Frénésie", "Haine", "Intoxiqué", "Terrifying"
];

// Table des Blessures Permanentes (D66, Out of Action). Chaque entrée a un
// identifiant stable (id) utilisé pour le déclenchement de l'effet dans
// applyInjury(), indépendant du libellé affiché (label) — un futur changement
// de texte n'a donc plus besoin de toucher à la logique de jeu.
// statKey/statLabel : pour les résultats "Recovery & -1 XX", la statistique
// concernée (appliquée immédiatement et de façon permanente via applyStatDowngrade).
const PERMANENT_INJURIES = [
    { id: 'xp1',         label: '+1 XP' },
    { id: 'xp2',         label: '+2 XP' },
    { id: 'xp3',         label: '+3 XP' },
    { id: 'haine',       label: 'Haine' },
    { id: 'fearsome',    label: 'Gagne Fearsome' },
    { id: 'ld_bonus',    label: '+1 Ld' },
    { id: 'none',        label: 'Aucun effet' },
    { id: 'recovery',    label: 'Le guerrier part en recovery' },
    { id: 'recovery_bs', label: 'Le guerrier part en recovery et perd 1 en BS', statKey: 'BS', statLabel: 'BS' },
    { id: 'recovery_ws', label: 'Le guerrier part en recovery et perd 1 en WS', statKey: 'WS', statLabel: 'WS' },
    { id: 'recovery_m',  label: 'Le guerrier part en recovery et perd 1 en M',  statKey: 'M',  statLabel: 'M' },
    { id: 'recovery_s',  label: 'Le guerrier part en recovery et perd 1 en S',  statKey: 'S',  statLabel: 'S' },
    { id: 'recovery_t',  label: 'Le guerrier part en recovery et perd 1 en T',  statKey: 'T',  statLabel: 'T' },
    { id: 'recovery_ld', label: 'Le guerrier part en recovery et perd 1 en Ld', statKey: 'Ld', statLabel: 'Ld' },
    { id: 'captured',    label: 'Capturé' },
    { id: 'critical',    label: 'Blessure critique' },
    { id: 'dead',        label: 'Mort' }
];

// Retrouve la définition d'une blessure permanente par son id (valeur du <select>)
// ou par son libellé exact (utile pour interpréter un ancien historique).
function getPermanentInjuryDef(idOrLabel) {
    return PERMANENT_INJURIES.find(d => d.id === idOrLabel) ||
           PERMANENT_INJURIES.find(d => d.label === idOrLabel);
}

// Une fois qu'un guerrier n'est PLUS en Recovery (post-cycle validé, ou soin
// bionique payé), nettoie son historique de blessures :
// - "Le guerrier part en recovery" (sans malus) disparaît : ce n'était qu'une
//   information temporaire, sans séquelle à conserver.
// - "Le guerrier part en recovery et perd 1 en XX" devient "Séquelle : -1 XX" :
//   le malus est définitif et déjà appliqué à la statistique, seule la mention
//   "part en recovery" (qui n'est plus vraie) doit disparaître de l'affichage.
// - Les entrées "Capturé (... - Convalescence)" perdent leur mention de
//   convalescence désormais obsolète, sans perdre la trace de la capture.
// Ne fait rien tant que m.recovery est vrai (le guerrier est encore concerné).
function resolveEndedRecoveryInjuries(m) {
    if (!m || m.recovery || !m.injuries || !Array.isArray(m.injuries)) return;

    m.injuries = m.injuries
        .map(inj => {
            if (typeof inj !== 'string') return inj;
            let def = getPermanentInjuryDef(inj);
            if (def && def.statKey) return `Séquelle : -1 ${def.statLabel}`;
            if (inj.includes(' - Convalescence)')) return inj.replace(' - Convalescence)', ')');
            return inj;
        })
        .filter(inj => {
            if (typeof inj !== 'string') return true;
            return inj !== 'Le guerrier part en recovery';
        });
}

function getTerritoryDef(terId) {
    if (typeof db === 'undefined' || !db.territories) return null;
    return db.territories.find(t => t.id === terId || t.name === terId);
}

function getFighterRank(xp) {
    if (xp < 1) return 0;
    if (xp <= 3) return 1;
    if (xp <= 6) return 2;
    if (xp <= 9) return 3;
    if (xp <= 12) return 4;
    if (xp <= 18) return 5;
    if (xp <= 24) return 6;
    if (xp <= 30) return 7;
    if (xp <= 36) return 8;
    if (xp <= 48) return 9;
    if (xp <= 60) return 10;
    if (xp <= 72) return 11;
    if (xp <= 84) return 12;
    if (xp <= 96) return 13;
    if (xp <= 108) return 14;
    if (xp <= 120) return 15;
    if (xp <= 132) return 16;
    if (xp <= 156) return 17;
    if (xp <= 180) return 18;
    if (xp <= 204) return 19;
    if (xp <= 228) return 20;
    return 21;
}

function getPendingAdvances(m) {
    let currentXP = getFighterXP(m);
    let currentRank = getFighterRank(currentXP);
    if (m.startingRank === undefined) {
        let charDef = (typeof db !== 'undefined' && db.characters) ? db.characters.find(c => c.id === m.charId) : null;
        let startXP = charDef ? (charDef.starting_xp || 0) : 0;
        m.startingRank = getFighterRank(startXP);
    }
    let taken = m.advancesCount || 0;
    let pending = currentRank - m.startingRank - taken;
    return Math.max(0, pending);
}

function applyStatUpgrade(m, statKey) {
    if (!m.stats) m.stats = {};
    let cur = m.stats[statKey];

    if (cur === undefined || cur === null || cur === '-' || cur === '') {
        if (['WS', 'BS', 'I', 'Sv', 'Ld', 'Cl', 'Wil', 'Int'].includes(statKey)) {
            m.stats[statKey] = '6+';
        } else if (statKey === 'M') {
            m.stats[statKey] = '5"';
        } else {
            m.stats[statKey] = 1;
        }
        return;
    }

    let str = cur.toString().trim();
    let hasQuote = str.endsWith('"');
    let hasPlus = str.endsWith('+');
    let num = parseInt(str);

    if (isNaN(num)) {
        m.stats[statKey] = str + ' (+1)';
        return;
    }

    if (hasPlus) {
        let newNum = Math.max(1, num - 1);
        m.stats[statKey] = newNum + '+';
    } else if (hasQuote) {
        let newNum = num + 1;
        m.stats[statKey] = newNum + '"';
    } else {
        m.stats[statKey] = num + 1;
    }
}

// Applique un malus permanent d'1 point sur une statistique (blessures permanentes
// avec perte de caractéristique). Symétrique de applyStatUpgrade : pour les
// statistiques au format "X+" (WS, BS, Ld...), un malus AUGMENTE le nombre
// (ex: 4+ devient 5+, plus difficile à réussir).
function applyStatDowngrade(m, statKey) {
    if (!m.stats) return;
    let cur = m.stats[statKey];
    if (cur === undefined || cur === null || cur === '-' || cur === '') return;

    let str = cur.toString().trim();
    let hasQuote = str.endsWith('"');
    let hasPlus = str.endsWith('+');
    let num = parseInt(str);

    if (isNaN(num)) {
        m.stats[statKey] = str + ' (-1)';
        return;
    }

    if (hasPlus) {
        m.stats[statKey] = (num + 1) + '+';
    } else if (hasQuote) {
        m.stats[statKey] = Math.max(1, num - 1) + '"';
    } else {
        m.stats[statKey] = Math.max(1, num - 1);
    }
}

// Applique les corrections de statistiques repérées par la migration vers le
// schéma v3 (voir core-state.js) : des blessures permanentes "Recovery & -1 XX"
// enregistrées avant cette version n'appliquaient jamais réellement le malus.
// Placé ici (et non dans core-state.js) car applyStatDowngrade() n'existe qu'à
// partir de ce fichier, chargé après core-state.js.
if (typeof _pendingInjuryStatFixes !== 'undefined' && _pendingInjuryStatFixes.length > 0) {
    _pendingInjuryStatFixes.forEach(fix => {
        let gang = savedGangs[fix.gangName];
        let m = gang && gang.members && gang.members.find(x => x.id === fix.memberId);
        if (m) {
            applyStatDowngrade(m, fix.statKey);
            _injuryStatFixCount++;
        }
    });
    if (_injuryStatFixCount > 0) saveGangs();
    _pendingInjuryStatFixes = [];
}

function calculateGangReputation(gang) {
    if (!gang) return 1;
    let baseRep = (gang.reputation !== undefined) ? gang.reputation : 1;
    let territoryBonus = 0;

    if (gang.territories && Array.isArray(gang.territories)) {
        gang.territories.forEach(terId => {
            let tDef = getTerritoryDef(terId);
            if (tDef) {
                if (tDef.reputationBonus) {
                    territoryBonus += tDef.reputationBonus;
                } else if (tDef.desc) {
                    let match = tDef.desc.match(/\+(\d+)\s*(?:points?\s*de\s*)?réputation/i);
                    if (match) territoryBonus += parseInt(match[1]);
                }
            }
        });
    }
    return Math.max(1, baseRep + territoryBonus);
}

function updateGameTopBar() {
    updateTopBar();
}

function setGameHeaderVisibility(inGame) {
    const topBar = document.getElementById('top-bar');
    if (topBar) {
        if (inGame) {
            topBar.classList.add('hidden');
            topBar.style.display = 'none';
        } else {
            topBar.classList.remove('hidden');
            topBar.style.display = 'block';
            updateTopBar();
        }
    }
}

function safeSave() {
    if (typeof appState !== 'undefined' && appState.isQuickMatch) return;
    if (typeof saveGangs === 'function') saveGangs();
    updateTopBar();
}

function safeNavigate(target) {
    if (typeof closeModal === 'function') closeModal();
    const topBar = document.getElementById('top-bar');
    if (topBar) {
        topBar.innerHTML = '';
        topBar.classList.add('hidden');
        topBar.style.display = 'none';
    }
    if (typeof appState !== 'undefined') appState.view = target;
    if (typeof navigate === 'function') navigate(target);
}

function getFighterXP(fighter) {
    if (!fighter) return 0;
    if (fighter.xp !== undefined) return fighter.xp;
    let charDef = db.characters ? db.characters.find(c => c.id === fighter.charId) : null;
    return charDef ? (charDef.starting_xp || 0) : 0;
}

// Promotion Ganger -> Champion à 37 XP (rang 9, cf. getFighterRank). Le type
// "ganger" est remplacé par "champion" (tous les autres types du combattant
// sont conservés), et les compétences de Champion (Inspirant, Sous-chef) sont
// accordées s'il ne les a pas déjà. Générique : ne dépend que du tag "ganger"
// dans le type et du seuil d'XP, valable pour n'importe quel clan/personnage.
// À appeler après toute modification de l'XP d'un combattant (voir tous les
// endroits qui font m.xp = ... dans le projet).
function checkGangerPromotion(m) {
    if (!m || !m.type || !Array.isArray(m.type)) return;
    if (!m.type.some(t => normalizeTypeKey(t) === 'ganger')) return;
    if (getFighterXP(m) < 37) return;

    m.type = m.type.filter(t => normalizeTypeKey(t) !== 'ganger');
    if (!m.type.some(t => normalizeTypeKey(t) === 'champion')) {
        m.type.push('champion');
    }

    if (!m.skills) m.skills = [];
    const hasSkill = (...names) => m.skills.some(s => {
        let sName = (typeof s === 'string' ? s : (s.name || '')).toLowerCase();
        return names.includes(sName);
    });

    if (!hasSkill('inspirant', 'inspiring')) {
        let inspSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_inspirant' || s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')
            : null;
        m.skills.push(inspSkill ? JSON.parse(JSON.stringify(inspSkill)) : {
            id: "sk_inspirant", name: "Inspirant",
            desc: "Peut faire l'action d'activation de groupe en action gratuite."
        });
    }

    if (!hasSkill('sous-chef', 'sous chef')) {
        let sousChefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_sous_chef' || s.name.toLowerCase() === 'sous-chef' || s.name.toLowerCase() === 'sous chef')
            : null;
        m.skills.push(sousChefSkill ? JSON.parse(JSON.stringify(sousChefSkill)) : {
            id: "sk_sous_chef", name: "Sous-chef",
            desc: "Tous les alliés dans les 6\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
        });
    }

    if (typeof showToast === 'function') {
        showToast(`🎖️ ${m.customName || m.charName} est promu Champion (37 XP atteints) ! Gagne Inspirant et Sous-chef.`, "success");
    }
}

// Les 8 compétences de spécialiste (identiques à celles déjà proposées à la
// création dans openSkillModal() pour un personnage tagué "spécialiste").
const PROSPECT_SPECIALIST_SKILL_IDS = [
    "sk_biceps_saillants", "sk_tir_hanche", "sk_pistolero", "sk_grimper",
    "sk_tir_precision", "sk_berserker", "sk_soin", "sk_munitions"
];

// File d'attente des combattants qui viennent de devenir Spécialiste et
// doivent choisir leur compétence : nécessaire car la promotion peut se
// produire en pleine boucle sur plusieurs guerriers (ex: valider
// l'Entraînement de plusieurs Prospects à la fois), et la fonction appelante
// referme parfois la modale juste après (voir processPendingSpecialistChoices,
// à appeler en tout dernier par chaque endroit qui octroie de l'XP).
let pendingSpecialistChoiceQueue = [];

// Promotion Prospect -> Ganger (+ Spécialiste) à 13 XP. Contrairement aux
// avancées normales, cette étape ne fait PAS lancer 2D6 : le combattant reçoit
// directement +15 crédits de valeur (l'avancée de ce rang est "consommée"
// sans jet, voir advancesCount) et devra choisir une des 8 compétences de
// spécialiste (mise en file, voir pendingSpecialistChoiceQueue). Tous les
// autres types du combattant sont conservés.
function checkProspectPromotion(m) {
    if (!m || !m.type || !Array.isArray(m.type)) return;
    if (!m.type.some(t => normalizeTypeKey(t) === 'prospect')) return;
    if (getFighterXP(m) < 13) return;

    m.type = m.type.filter(t => normalizeTypeKey(t) !== 'prospect');
    if (!m.type.some(t => normalizeTypeKey(t) === 'ganger')) m.type.push('ganger');
    if (!m.type.some(t => normalizeTypeKey(t) === 'spécialiste' || normalizeTypeKey(t) === 'specialiste')) m.type.push('spécialiste');

    m.advancesCost = (m.advancesCost || 0) + 15;
    m.totalCost = (m.totalCost || m.cost || 0) + 15;
    m.advancesCount = (m.advancesCount || 0) + 1;

    if (typeof showToast === 'function') {
        showToast(`🎖️ ${m.customName || m.charName} devient Ganger et Spécialiste (13 XP atteints) ! +15 cr de valeur.`, "success");
    }

    pendingSpecialistChoiceQueue.push(m.id);
}

// Ouvre le choix de compétence de spécialiste pour le prochain combattant en
// attente dans la file (s'il y en a un). À appeler en tout dernier par chaque
// fonction qui octroie de l'XP, une fois ses propres fermetures/rendus faits,
// pour que cette fenêtre ne soit jamais écrasée.
function processPendingSpecialistChoices() {
    if (pendingSpecialistChoiceQueue.length === 0) return;
    let nextId = pendingSpecialistChoiceQueue.shift();
    if (typeof openProspectSpecialistChoice === 'function') openProspectSpecialistChoice(nextId);
}

function openProspectSpecialistChoice(fighterId) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    let html = `
        <div style="padding:2px;">
            <p style="color:var(--accent-cyan); margin-bottom:10px;">
                🎯 <strong>${m.customName}</strong> devient Spécialiste : choisissez 1 compétence parmi les 8 spécialités :
            </p>
            <div style="max-height:55vh; overflow-y:auto;">
    `;
    for (let cat in db.skills) {
        db.skills[cat].forEach(s => {
            if (PROSPECT_SPECIALIST_SKILL_IDS.includes(s.id)) {
                html += `
                    <button class="btn" style="display:block; width:100%; text-align:left; padding:8px; margin:4px 0;" onclick="confirmProspectSpecialistSkill('${m.id}', '${s.id}', '${cat}')">
                        <strong>${s.name}</strong> <small style="color:#888;">(${cat.toUpperCase()})</small><br>
                        <small style="color:#aaa;">${s.desc}</small>
                    </button>
                `;
            }
        });
    }
    html += `</div></div>`;
    if (typeof openModal === 'function') openModal("🎯 Choix de la Spécialité", html);
}

function confirmProspectSpecialistSkill(fighterId, skillId, cat) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;
    const skillObj = db.skills[cat] && db.skills[cat].find(s => s.id === skillId);
    if (!skillObj) return;

    if (!m.skills) m.skills = [];
    m.skills.push(JSON.parse(JSON.stringify(skillObj)));
    safeSave();
    showToast(`Compétence de spécialiste "${skillObj.name}" choisie pour ${m.customName} !`, "success");

    if (pendingSpecialistChoiceQueue.length > 0) {
        processPendingSpecialistChoices();
    } else {
        closeModal();
        if (typeof refreshCurrentView === 'function') refreshCurrentView();
    }
}

// ==========================================
// LEADER UNIQUE DU GANG (une fois établi, il en faut toujours un et un seul)
// ==========================================
// À appeler après tout départ définitif d'un combattant (licenciement, mort...)
// une fois le gang établi. Si plus personne n'a le type "leader", déclenche la
// sélection automatique d'un remplaçant (voir selectNewLeader). Ne fait rien
// pendant la création initiale du gang : c'est au joueur de recruter son
// premier leader lui-même à ce moment-là.
function ensureGangHasLeader() {
    if (!currentGang || !currentGang.isEstablished || !currentGang.members || currentGang.members.length === 0) return;
    let hasLeader = currentGang.members.some(m => (m.type || []).some(t => normalizeTypeKey(t) === 'leader'));
    if (hasLeader) return;
    selectNewLeader();
}

// Sélectionne automatiquement le nouveau leader selon l'ordre de priorité :
// 1) Champion non-Solitaire, 2) Champion Solitaire, 3) n'importe quel guerrier
// qui n'est ni Bête, ni Brute, ni Familier, ni Soutien. En cas d'égalité de
// priorité, c'est l'XP le plus élevé qui l'emporte ; en cas d'égalité d'XP,
// le joueur choisit parmi les guerriers à égalité.
function selectNewLeader() {
    if (!currentGang || !currentGang.members || currentGang.members.length === 0) return;

    const isType = (m, key) => (m.type || []).some(t => normalizeTypeKey(t) === key);
    const isChampion = m => isType(m, 'champion');
    const isSolitaire = m => isType(m, 'solitaire');
    const isTier3Excluded = m => ['bete', 'brute', 'familier', 'soutien'].some(key => isType(m, key));

    let tier1 = currentGang.members.filter(m => isChampion(m) && !isSolitaire(m));
    let tier2 = currentGang.members.filter(m => isChampion(m) && isSolitaire(m));
    let tier3 = currentGang.members.filter(m => !isTier3Excluded(m));

    let pool = tier1.length > 0 ? tier1 : (tier2.length > 0 ? tier2 : tier3);
    if (pool.length === 0) {
        showToast("⚠️ Aucun combattant du gang n'est éligible pour devenir Leader !", "error");
        return;
    }

    let maxXP = Math.max(...pool.map(m => getFighterXP(m)));
    let candidates = pool.filter(m => getFighterXP(m) === maxXP);

    if (candidates.length === 1) {
        promoteToLeader(candidates[0].id);
    } else {
        openLeaderTieBreakModal(candidates.map(m => m.id), maxXP);
    }
}

function openLeaderTieBreakModal(candidateIds, xpValue) {
    if (!currentGang) return;
    let candidates = candidateIds.map(id => currentGang.members.find(m => m.id === id)).filter(Boolean);
    if (candidates.length === 0) return;

    let html = `
        <div style="padding:2px;">
            <p style="color:var(--accent-cyan); margin-bottom:10px;">
                👑 Le gang doit avoir un Leader. Plusieurs guerriers sont à égalité de priorité et d'XP (${xpValue} XP) : choisissez lequel devient Leader :
            </p>
            ${candidates.map(m => `
                <button class="btn" style="display:block; width:100%; text-align:left; padding:10px; margin:5px 0;" onclick="promoteToLeader('${m.id}')">
                    <strong>${m.customName}</strong> (${m.charName}) — ${getFighterXP(m)} XP
                </button>
            `).join('')}
        </div>
    `;
    if (typeof openModal === 'function') openModal("👑 Choix du nouveau Leader", html);
}

// Applique la promotion Leader à ce combattant : retire Solitaire/Champion/
// Ganger/Prospect s'il les avait, ajoute Leader, et accorde Inspirant et Chef
// s'il ne les avait pas déjà.
function promoteToLeader(fighterId) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    m.type = (m.type || []).filter(t => !['solitaire', 'champion', 'ganger', 'prospect'].includes(normalizeTypeKey(t)));
    if (!m.type.some(t => normalizeTypeKey(t) === 'leader')) m.type.push('leader');

    if (!m.skills) m.skills = [];
    const hasSkill = (...names) => m.skills.some(s => names.includes((typeof s === 'string' ? s : (s.name || '')).toLowerCase()));

    if (!hasSkill('inspirant', 'inspiring')) {
        let inspSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_inspirant' || s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')
            : null;
        m.skills.push(inspSkill ? JSON.parse(JSON.stringify(inspSkill)) : {
            id: "sk_inspirant", name: "Inspirant",
            desc: "Peut faire l'action d'activation de groupe en action gratuite."
        });
    }

    if (!hasSkill('chef')) {
        let chefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_chef' || s.name.toLowerCase() === 'chef')
            : null;
        m.skills.push(chefSkill ? JSON.parse(JSON.stringify(chefSkill)) : {
            id: "sk_chef", name: "Chef",
            desc: "Tous les alliés dans les 12\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
        });
    }

    safeSave();
    if (typeof refreshCurrentView === 'function') refreshCurrentView();
    showToast(`👑 ${m.customName} devient le nouveau Leader du gang !`, "success");

    // Fenêtre de confirmation systématique (auto-sélection ou après un choix
    // à égalité) : l'information est trop importante pour reposer sur le seul
    // toast, qui pourrait passer inaperçu après un licenciement ou une mort.
    let html = `
        <div style="text-align:center; padding:10px 4px;">
            <div style="font-size:40px; margin-bottom:8px;">👑</div>
            <p style="font-size:16px; color:#eee; margin-bottom:6px;">
                <strong style="color:var(--accent-cyan); font-size:18px;">${m.customName}</strong> (${m.charName})
            </p>
            <p style="font-size:14px; color:#aaa;">devient le nouveau Leader du gang.</p>
            <div style="background:#111; border:1px solid #333; border-radius:6px; padding:10px; margin-top:12px; text-align:left; font-size:13px; color:#ccc;">
                Gagne le type <strong style="color:var(--accent-cyan);">Leader</strong>, et les compétences <strong>Inspirant</strong> et <strong>Chef</strong> (si non déjà acquises).
            </div>
        </div>
        <br>
        <button class="btn btn-cyan" style="width:100%;" onclick="closeModal()">Compris</button>
    `;
    if (typeof openModal === 'function') openModal("👑 Nouveau Leader du Gang", html);
}

// ==========================================
// SCÉNARIOS & PRÉPARATION DE PARTIE
// ==========================================
const SCENARIO_TYPES = {
    intensification: {
        name: "Intensification de la bataille",
        desc: "Choisissez 3 guerriers. Le programme tirera 1 à 3 guerriers aléatoires. Vous pourrez ensuite choisir jusqu'à 5 renforts."
    },
    donnez_tout: {
        name: "Donnez tout !",
        desc: "Choisissez jusqu'à 10 guerriers dans votre liste."
    },
    patrouille: {
        name: "Patrouille",
        desc: "Choisissez 3 guerriers. Le programme ajoutera 4 guerriers au hasard."
    },
    attaque_surprise: {
        name: "Attaque surprise !",
        desc: "Attaquant (4 choisis + 4 au hasard) | Défenseur (3 choisis + jusqu'à 7 renforts)."
    },
    force_intervention: {
        name: "Force d'intervention",
        desc: "Choisissez jusqu'à 5 guerriers dans votre liste."
    },
    force_reconnaissance: {
        name: "Force de reconnaissance",
        desc: "Le programme détermine un nombre (1 à 3) de guerriers à choisir, puis ajoute 5 guerriers au hasard."
    }
};

let setupState = {
    scenarioKey: 'intensification',
    role: 'attacker',
    step: 1,
    reconCount: Math.floor(Math.random() * 3) + 1,
    initialPickedIds: [],
    randomDrawnIds: [],
    reinforcementPickedIds: [],
    selectedTacticsIds: [],
    tacticsInitialized: false,
    mountedOptOutIds: []
};

let setupTacticsShowAll = false;
let quickMatchSelectedFighterIds = [];
let quickMatchTacticsIds = [];
let quickMatchShowAllTactics = false;
let quickMatchInitialized = false;

function resetSetupState() {
    setupState = {
        scenarioKey: 'intensification',
        role: 'attacker',
        step: 1,
        reconCount: Math.floor(Math.random() * 3) + 1,
        initialPickedIds: [],
        randomDrawnIds: [],
        reinforcementPickedIds: [],
        selectedTacticsIds: [],
        tacticsInitialized: false,
        mountedOptOutIds: []
    };
    setupTacticsShowAll = false;
    quickMatchInitialized = false;
    quickMatchTacticsIds = [];
    quickMatchSelectedFighterIds = [];
    quickMatchShowAllTactics = false;
}

// Un guerrier équipé d'un Escher cutter ou d'un Dirt bike (les deux seuls
// objets qui donnent le type dynamique "Monté", cf. getEffectiveFighterTypes)
// peut choisir de laisser cette monture au dépôt pour une partie précise, sans
// jamais la retirer définitivement de sa fiche.
function hasMountedEquipment(m) {
    return !!(m && (m.equipment || []).some(e => e && (e.id === 'eq_dirt_bike' || e.id === 'eq_escher_cutter')));
}

// Génère le petit bouton "Avec/Sans monture" à côté d'un guerrier monté dans
// les écrans de sélection de combattants pour un scénario. Purement une
// bascule d'intention pour CETTE partie (voir setupState.mountedOptOutIds,
// appliqué au clone du roster par startGame() -> applyMountedOptOutToRosterMember).
function buildMountedToggleHTML(m) {
    if (!hasMountedEquipment(m)) return '';
    let optedOut = setupState.mountedOptOutIds.includes(m.id);
    return `
        <button type="button" class="btn ${optedOut ? '' : 'btn-cyan'}" style="padding:3px 8px; font-size:11px; margin:0 0 0 8px;" onclick="event.stopPropagation(); toggleMountedOptOut('${m.id}')" title="Choisir si ${m.customName} joue cette partie avec ou sans sa monture (Escher cutter/Dirt bike). Ne change rien à sa fiche définitive.">
            ${optedOut ? '🚶 Sans monture' : '🐎 Avec monture'}
        </button>
    `;
}

function toggleMountedOptOut(id) {
    let idx = setupState.mountedOptOutIds.indexOf(id);
    if (idx >= 0) setupState.mountedOptOutIds.splice(idx, 1);
    else setupState.mountedOptOutIds.push(id);
    renderGameSetup(document.getElementById('main-content'));
}

function getGangTacticsList(showAll) {
    let allPool = (typeof db !== 'undefined' && db.tactics) ? db.tactics : [];
    if (!showAll && currentGang && currentGang.tactics && currentGang.tactics.length > 0) {
        return currentGang.tactics.map(gt => {
            let id = (typeof gt === 'string') ? gt : gt.id;
            let full = allPool.find(t => t.id === id);
            if (full) return full;
            return (typeof gt === 'object') ? gt : { id: gt, name: gt, timing: '', effect: '' };
        });
    }
    return allPool;
}

function initCampaignTactics() {
    if (setupState.tacticsInitialized) return;
    setupState.selectedTacticsIds = [];
    setupTacticsShowAll = !(currentGang && currentGang.tactics && currentGang.tactics.length > 0);
    setupState.tacticsInitialized = true;
}

function initQuickMatchSetup() {
    initCampaignTactics();
    quickMatchInitialized = true;
}

function toggleTacticSelect(tacticId, context) {
    if (!setupState.selectedTacticsIds) setupState.selectedTacticsIds = [];
    let idx = setupState.selectedTacticsIds.indexOf(tacticId);
    if (idx >= 0) {
        setupState.selectedTacticsIds.splice(idx, 1);
    } else {
        setupState.selectedTacticsIds.push(tacticId);
    }
    quickMatchTacticsIds = setupState.selectedTacticsIds;
    renderGameSetup(document.getElementById('main-content'));
}

function toggleTacticsPool(context) {
    setupTacticsShowAll = !setupTacticsShowAll;
    quickMatchShowAllTactics = setupTacticsShowAll;
    renderGameSetup(document.getElementById('main-content'));
}

function renderTacticsSelectionHTML(selectedIds = [], context = 'campaign') {
    let showAll = setupTacticsShowAll;
    let pool = getGangTacticsList(showAll);
    let hasGangDeck = (currentGang && currentGang.tactics && currentGang.tactics.length > 0);
    let currentSelected = (setupState.selectedTacticsIds && setupState.selectedTacticsIds.length > 0) ? setupState.selectedTacticsIds : selectedIds;

    return `
        <div style="background:#14151f; border:1px solid var(--accent-purple); border-radius:8px; padding:12px; margin:14px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <strong style="color:var(--accent-cyan); font-size:14px;">🎴 Sélection des Cartes Tactiques</strong>
                    <span style="background:${selectedIds.length > 0 ? 'var(--accent-purple)' : '#333'}; color:#fff; font-size:11px; padding:2px 8px; border-radius:10px; font-weight:bold;">
                        ${selectedIds.length} sélectionnée${selectedIds.length > 1 ? 's' : ''}
                    </span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                    ${hasGangDeck ? `
                        <button type="button" class="btn" style="padding:3px 8px; font-size:11px; margin:0; color:var(--accent-cyan);" onclick="toggleTacticsPool('${context}')">
                            ${showAll ? `📁 Deck gang (${currentGang.tactics.length})` : `🌐 Toutes (18)`}
                        </button>
                    ` : ''}
                </div>
            </div>

            <p style="font-size:12px; color:#aaa; margin-bottom:10px;">
                Sélectionnez les cartes qui seront jouées pendant ce combat (visibles directement sur l'écran de combat et grisées une fois utilisées) :
            </p>

            ${pool.length === 0 ? `
                <p style="color:#888; font-style:italic; font-size:12px;">Aucune carte tactique disponible.</p>
            ` : `
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:8px; max-height:260px; overflow-y:auto; padding:4px; border:1px solid #222; border-radius:6px; background:#0b0b10;">
                    ${pool.map(t => {
                        let isSelected = selectedIds.includes(t.id);
                        return `
                            <div onclick="toggleTacticSelect('${t.id}', '${context}')"
                                 style="
                                    border: 1px solid ${isSelected ? 'var(--accent-cyan)' : '#282833'};
                                    background: ${isSelected ? '#142033' : '#111116'};
                                    border-radius: 6px;
                                    padding: 8px 10px;
                                    cursor: pointer;
                                    user-select: none;
                                    transition: all 0.15s ease;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: space-between;
                                 ">
                                <div>
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; gap:6px;">
                                        <strong style="color:${isSelected ? 'var(--accent-cyan)' : '#ffffff'}; font-size:13px;">
                                            ${t.name}
                                        </strong>
                                        <input type="checkbox" 
                                               ${isSelected ? 'checked' : ''} 
                                               style="transform:scale(1.2); margin-left:6px; cursor:pointer;"
                                               onclick="event.stopPropagation(); toggleTacticSelect('${t.id}', '${context}')">
                                    </div>
                                    ${t.timing ? `<div style="font-size:11px; color:#c084fc; margin-bottom:3px;"><strong>Timing :</strong> ${t.timing}</div>` : ''}
                                    <div style="font-size:11px; color:#bbb; line-height:1.35;">
                                        <strong>Effet :</strong> ${t.effect || t.desc || ''}
                                    </div>
                                </div>
                                <div style="margin-top:6px; font-size:10px; color:${isSelected ? 'var(--accent-cyan)' : '#666'}; text-align:right;">
                                    ${isSelected ? '✅ Sélectionnée pour la partie' : 'Cliquer pour sélectionner'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
}

function isProspect(m) {
    if (!m || !m.type) return false;
    let types = m.type.map(t => t.toLowerCase());
    return types.includes('prospect') || types.includes('juve') || (m.charId && (m.charId.includes('wyld') || m.charId.includes('little_sister')));
}

function getRandomFighters(availableList, count) {
    let pool = [...availableList];
    let picked = [];
    let numToPick = Math.min(count, pool.length);
    for (let i = 0; i < numToPick; i++) {
        let randIdx = Math.floor(Math.random() * pool.length);
        picked.push(pool[randIdx]);
        pool.splice(randIdx, 1);
    }
    return picked;
}

function renderGameSetup(container) {
    setGameHeaderVisibility(false);

    if (!currentGang) {
        container.innerHTML = `<div class="card"><p>Aucun gang sélectionné.</p><button onclick="safeNavigate('gang-manage')">Retour</button></div>`;
        return;
    }

    let isQuick = typeof appState !== 'undefined' && appState.isQuickMatch;
    let currentScenario = SCENARIO_TYPES[setupState.scenarioKey];
    // Les familiers ne se sélectionnent jamais manuellement pour une partie : ils
    // suivent automatiquement leur propriétaire (voir startGame()), sans compter
    // dans les limites de guerriers ni dans les renforts.
    let availableMembers = (currentGang.members || []).filter(m => !m.recovery && !m.critInj && !m.isFamiliar);
    let recoveryMembers = (currentGang.members || []).filter(m => m.recovery && !m.critInj && !m.isFamiliar);
    let critMembers = (currentGang.members || []).filter(m => m.critInj && !m.isFamiliar);

    let html = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                <h2 style="margin:0;">Préparation de la Partie ${isQuick ? '(⚡ Partie Rapide)' : '(⚔️ Campagne)'}</h2>
                <span style="font-size:12px; background:${isQuick ? '#152b3c; color:var(--accent-cyan); border:1px solid var(--accent-cyan)' : '#2d1b33; color:var(--accent-purple); border:1px solid var(--accent-purple)'}; padding:4px 10px; border-radius:12px; font-weight:bold;">
                    ${isQuick ? '⚡ Partie Rapide Amicale' : '⚔️ Partie Officielle de Campagne'}
                </span>
            </div>
            ${isQuick ? `<p style="color:#aaa; font-size:13px; margin-bottom:12px;">Même sélection de scénarios, règles de recrutement d'escouade et cartes tactiques que le mode campagne, sans impact sur les crédits, XP ni blessures permanentes du gang.</p>` : ''}
            
            <div style="margin-bottom:12px;">
                <label style="font-weight:bold;">Type de recrutement / Scénario :</label>
                <select id="scenario-select" style="width:100%; padding:8px; margin-top:4px; background:#222; color:#fff; border:1px solid var(--accent-purple);" onchange="changeScenario(this.value)">
                    ${Object.keys(SCENARIO_TYPES).map(key => `
                        <option value="${key}" ${setupState.scenarioKey === key ? 'selected' : ''}>${SCENARIO_TYPES[key].name}</option>
                    `).join('')}
                </select>
            </div>

            <div style="background:#181824; border:1px solid var(--accent-purple); padding:10px; border-radius:5px; margin-bottom:12px; font-size:13px;">
                <strong style="color:var(--accent-cyan);">${currentScenario.name}</strong><br>
                <span>${currentScenario.desc}</span>
            </div>

            ${critMembers.length > 0 ? `
                <div style="background:#2d0a0f; border:1px solid #e74c3c; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:12px; color:#ff6b6b;">
                    ⚠️ <strong>Combattant(s) en Blessure Critique (Indisponible) :</strong> ${critMembers.map(m => `<strong>${m.customName}</strong>`).join(', ')}<br>
                    <small style="color:#ddd;">Ces guerriers ne peuvent pas participer aux combats. Ils doivent impérativement recevoir une Escorte Médicale (30 cr) durant le Post-Cycle sous peine de succomber définitivement !</small>
                </div>
            ` : ''}

            ${recoveryMembers.length > 0 ? `
                <div style="background:#221008; border:1px solid #e67e22; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:12px; color:#f39c12;">
                    🩹 <strong>Combattant(s) en convalescence (Recovery) :</strong> ${recoveryMembers.map(m => `<strong>${m.customName}</strong>`).join(', ')}<br>
                    <small style="color:#bbb;">Ces guerriers sont indisponibles tant qu'un Post-Cycle n'a pas été validé.</small>
                </div>
            ` : ''}

            ${setupState.scenarioKey === 'attaque_surprise' ? `
                <div style="margin-bottom:12px; background:#111; padding:8px; border-radius:5px;">
                    <label style="font-weight:bold; margin-right:10px;">Rôle :</label>
                    <label style="margin-right:15px; cursor:pointer;">
                        <input type="radio" name="role" value="attacker" ${setupState.role === 'attacker' ? 'checked' : ''} onchange="changeRole('attacker')"> Attaquant
                    </label>
                    <label style="cursor:pointer;">
                        <input type="radio" name="role" value="defender" ${setupState.role === 'defender' ? 'checked' : ''} onchange="changeRole('defender')"> Défenseur
                    </label>
                </div>
            ` : ''}

            <hr style="border-color:#333; margin:15px 0;">
    `;

    if (setupState.step === 1) {
        html += renderStep1View(availableMembers);
    } else {
        html += renderStep2View(availableMembers);
    }

    html += `
        <br>
        <button class="btn-danger" style="margin-top:10px;" onclick="resetSetupState(); if(typeof appState !== 'undefined') appState.isQuickMatch = false; safeNavigate('gang-manage');">Annuler</button>
    </div>`;

    container.innerHTML = html;
}

function renderStep1View(availableMembers) {
    let isQuick = typeof appState !== 'undefined' && appState.isQuickMatch;
    let key = setupState.scenarioKey;
    let maxSelect = 0;
    let labelHelp = "";

    if (key === 'intensification') {
        let req = Math.min(3, availableMembers.length);
        maxSelect = req;
        labelHelp = (availableMembers.length < 3) ? `Choisissez ${req} guerrier(s) (effectif disponible : ${availableMembers.length}).` : "Choisissez exactement 3 guerriers.";
    }
    else if (key === 'donnez_tout') {
        maxSelect = 10;
        labelHelp = "Choisissez jusqu'à 10 guerriers.";
    }
    else if (key === 'patrouille') {
        let req = Math.min(3, availableMembers.length);
        maxSelect = req;
        labelHelp = (availableMembers.length < 3) ? `Choisissez ${req} guerrier(s) (effectif disponible : ${availableMembers.length}).` : "Choisissez exactement 3 guerriers.";
    }
    else if (key === 'attaque_surprise') {
        let target = (setupState.role === 'attacker') ? 4 : 3;
        let req = Math.min(target, availableMembers.length);
        maxSelect = req;
        labelHelp = (availableMembers.length < target) ? `Choisissez ${req} guerrier(s) (effectif disponible : ${availableMembers.length}).` : ((setupState.role === 'attacker') ? "Choisissez 4 guerriers." : "Choisissez 3 guerriers.");
    }
    else if (key === 'force_intervention') {
        maxSelect = 5;
        labelHelp = "Choisissez jusqu'à 5 guerriers.";
    }
    else if (key === 'force_reconnaissance') { 
        let req = Math.min(setupState.reconCount, availableMembers.length);
        maxSelect = req;
        labelHelp = `🎲 Tirage Force de reconnaissance : vous devez choisir ${req} guerrier(s).`; 
    }

    let html = `
        <h3>Étape 1 : Choix initial des combattants</h3>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
            <p style="color:var(--accent-cyan); font-size:13px; margin:0;">${labelHelp}</p>
            <span id="initial-picked-count" style="background:#222; color:var(--accent-cyan); font-size:12px; padding:2px 8px; border-radius:10px; font-weight:bold;">
                ${setupState.initialPickedIds.length} sélectionné(s)
            </span>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; max-height:40vh; overflow-y:auto; margin-bottom:15px;">
    `;

    availableMembers.forEach(m => {
        let isChecked = setupState.initialPickedIds.includes(m.id);
        html += `
            <div class="fighter-item" style="background:#111; padding:6px 10px;">
                <div>
                    <strong>${m.customName}</strong> (${m.charName})<br>
                    <small style="color:#aaa;">${(m.type || []).join(', ')} - Coût : ${m.totalCost || 0}c</small>
                </div>
                <div style="display:flex; align-items:center;">
                    ${buildMountedToggleHTML(m)}
                    <input id="initial-fighter-${m.id}" type="checkbox" style="transform:scale(1.3); margin-left:8px;" ${isChecked ? 'checked' : ''} onchange="toggleInitialPick('${m.id}', ${maxSelect})">
                </div>
            </div>
        `;
    });

    html += `</div>`;

    if (key === 'donnez_tout' || key === 'force_intervention') {
        initCampaignTactics();
        html += renderTacticsSelectionHTML(setupState.selectedTacticsIds, isQuick ? 'quick' : 'campaign');
        html += `<button id="launch-game-direct-btn" class="btn btn-cyan" onclick="startGame()">${isQuick ? '⚡ Lancer la Partie Rapide' : '⚔️ Lancer la Partie'} (${setupState.initialPickedIds.length} guerriers)</button>`;
    } else {
        html += `<button class="btn btn-cyan" onclick="validateStep1()">🎲 Valider l'étape 1 et procéder aux tirages/renforts</button>`;
    }

    return html;
}

function renderStep2View(availableMembers) {
    let isQuick = typeof appState !== 'undefined' && appState.isQuickMatch;
    let key = setupState.scenarioKey;
    let initialFighters = availableMembers.filter(m => setupState.initialPickedIds.includes(m.id));
    let randomFighters = availableMembers.filter(m => setupState.randomDrawnIds.includes(m.id));

    let html = `
        <h3>Étape 2 : Validation de l'escouade</h3>
        <div style="margin-bottom:10px;">
            <strong>Guerriers sélectionnés :</strong> ${initialFighters.map(m => m.customName).join(', ')}
        </div>
    `;

    if (randomFighters.length > 0) {
        html += `
            <div style="margin-bottom:10px; background:#181824; padding:8px; border-radius:5px; border:1px solid var(--accent-purple);">
                <strong style="color:var(--accent-purple);">🎲 Guerriers ajoutés au hasard :</strong> ${randomFighters.map(m => m.customName).join(', ')}
            </div>
        `;
    }

    if (key === 'intensification' || (key === 'attaque_surprise' && setupState.role === 'defender')) {
        let maxReinf = (key === 'intensification') ? 5 : 7;
        let remainingPool = availableMembers.filter(m => 
            !setupState.initialPickedIds.includes(m.id) && 
            !setupState.randomDrawnIds.includes(m.id)
        );

        html += `
            <hr style="border-color:#333; margin:10px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <h4 style="margin:0;">Sélection des Renforts (Jusqu'à ${maxReinf})</h4>
                <span id="reinf-picked-count" style="background:#222; color:var(--accent-purple); font-size:12px; padding:2px 8px; border-radius:10px; font-weight:bold;">
                    ${setupState.reinforcementPickedIds.length} renfort(s) sélectionné(s)
                </span>
            </div>
            <p style="font-size:12px; color:#aaa; margin:4px 0 8px 0;">Ces combattants entreront en jeu plus tard et seront grisés avec la mention [RENFORT].</p>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:30vh; overflow-y:auto; margin:10px 0;">
        `;

        remainingPool.forEach(m => {
            let isChecked = setupState.reinforcementPickedIds.includes(m.id);
            html += `
                <div class="fighter-item" style="background:#111; padding:6px 10px;">
                    <div><strong>${m.customName}</strong> (${m.charName})</div>
                    <div style="display:flex; align-items:center;">
                        ${buildMountedToggleHTML(m)}
                        <input id="reinf-fighter-${m.id}" type="checkbox" style="transform:scale(1.3); margin-left:8px;" ${isChecked ? 'checked' : ''} onchange="toggleReinforcementPick('${m.id}', ${maxReinf})">
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    }

    initCampaignTactics();
    html += renderTacticsSelectionHTML(setupState.selectedTacticsIds, isQuick ? 'quick' : 'campaign');

    html += `
        <br>
        <button class="btn btn-cyan" onclick="startGame()">${isQuick ? '⚡ Lancer la Partie Rapide avec ce Roster' : '⚔️ Lancer la Partie avec ce Roster'}</button>
        <button class="btn" style="margin-left:10px;" onclick="setupState.step = 1; renderGameSetup(document.getElementById('main-content'));">← Modifier étape 1</button>
    `;

    return html;
}

function changeScenario(key) {
    resetSetupState();
    setupState.scenarioKey = key;
    renderGameSetup(document.getElementById('main-content'));
}

function changeRole(role) {
    setupState.role = role;
    setupState.initialPickedIds = [];
    renderGameSetup(document.getElementById('main-content'));
}

function toggleInitialPick(id, maxLimit) {
    let idx = setupState.initialPickedIds.indexOf(id);
    if (idx >= 0) {
        setupState.initialPickedIds.splice(idx, 1);
    } else {
        if (setupState.initialPickedIds.length >= maxLimit) {
            showToast(`Limite atteinte pour cette étape (${maxLimit} guerriers max).`, "error");
            let chk = document.getElementById('initial-fighter-' + id);
            if (chk) chk.checked = false;
            return;
        }
        setupState.initialPickedIds.push(id);
    }

    let countBadge = document.getElementById('initial-picked-count');
    if (countBadge) {
        countBadge.innerText = `${setupState.initialPickedIds.length} sélectionné(s)`;
    }

    let btn = document.getElementById('launch-game-direct-btn');
    if (btn) {
        let isQuick = typeof appState !== 'undefined' && appState.isQuickMatch;
        btn.innerHTML = `${isQuick ? '⚡ Lancer la Partie Rapide' : '⚔️ Lancer la Partie'} (${setupState.initialPickedIds.length} guerriers)`;
    }
}

function toggleReinforcementPick(id, maxLimit) {
    let idx = setupState.reinforcementPickedIds.indexOf(id);
    if (idx >= 0) {
        setupState.reinforcementPickedIds.splice(idx, 1);
    } else {
        if (setupState.reinforcementPickedIds.length >= maxLimit) {
            showToast(`Limite atteinte (${maxLimit} renforts max).`, "error");
            let chk = document.getElementById('reinf-fighter-' + id);
            if (chk) chk.checked = false;
            return;
        }
        setupState.reinforcementPickedIds.push(id);
    }

    let countBadge = document.getElementById('reinf-picked-count');
    if (countBadge) {
        countBadge.innerText = `${setupState.reinforcementPickedIds.length} renfort(s) sélectionné(s)`;
    }
}

function validateStep1() {
    let key = setupState.scenarioKey;
    let availableMembers = (currentGang.members || []).filter(m => !m.recovery && !m.critInj && !m.isFamiliar);
    let remainingPool = availableMembers.filter(m => 
        !setupState.initialPickedIds.includes(m.id)
    );

    if (key === 'intensification') {
        let req = Math.min(3, availableMembers.length);
        if (setupState.initialPickedIds.length !== req) return showToast(`Veuillez choisir exactement ${req} guerrier(s).`, "error");
        let nbRandom = Math.floor(Math.random() * 3) + 1;
        let drawn = getRandomFighters(remainingPool, nbRandom);
        setupState.randomDrawnIds = drawn.map(m => m.id);
    } 
    else if (key === 'patrouille') {
        let req = Math.min(3, availableMembers.length);
        if (setupState.initialPickedIds.length !== req) return showToast(`Veuillez choisir exactement ${req} guerrier(s).`, "error");
        let drawn = getRandomFighters(remainingPool, 4);
        setupState.randomDrawnIds = drawn.map(m => m.id);
    }
    else if (key === 'attaque_surprise') {
        if (setupState.role === 'attacker') {
            let req = Math.min(4, availableMembers.length);
            if (setupState.initialPickedIds.length !== req) return showToast(`Veuillez choisir exactement ${req} guerrier(s).`, "error");
            let drawn = getRandomFighters(remainingPool, 4);
            setupState.randomDrawnIds = drawn.map(m => m.id);
        } else {
            let req = Math.min(3, availableMembers.length);
            if (setupState.initialPickedIds.length !== req) return showToast(`Veuillez choisir exactement ${req} guerrier(s).`, "error");
        }
    }
    else if (key === 'force_reconnaissance') {
        let req = Math.min(setupState.reconCount, availableMembers.length);
        if (setupState.initialPickedIds.length !== req) return showToast(`Veuillez choisir exactement ${req} guerrier(s).`, "error");
        let drawn = getRandomFighters(remainingPool, 5);
        setupState.randomDrawnIds = drawn.map(m => m.id);
    }

    setupState.step = 2;
    renderGameSetup(document.getElementById('main-content'));
}

function startGame() {
    let isQuick = typeof appState !== 'undefined' && appState.isQuickMatch;

    let totalInitial = setupState.initialPickedIds.length;
    if (totalInitial === 0 && setupState.randomDrawnIds.length === 0) {
        return showToast("Veuillez sélectionner au moins un combattant.", "error");
    }

    currentGameRoster = [];
    gameScores = {
        myScore: 0,
        opponentScore: 0,
        priority: 'À déterminer',
        previousPriority: null,
        round: 1,
        bottleCheckRequired: false,
        bottleCheckDoneThisRound: false,
        isBottledOut: false
    };

    // Ajoute un guerrier au roster de jeu ET, automatiquement, le(s) familier(s)
    // qui lui sont rattachés (même statut renfort/non-renfort que lui : un
    // familier ne compte jamais séparément dans les limites de sélection ni
    // dans le quota de renforts, il suit simplement son propriétaire).
    function addFighterWithFamiliars(id, isReinforcement) {
        let m = currentGang.members.find(x => x.id === id);
        if (!m) return;
        addFighterToGameRoster(m, isReinforcement);
        if (typeof getFamiliarsOfFighter === 'function') {
            getFamiliarsOfFighter(m.id).forEach(fam => addFighterToGameRoster(fam, isReinforcement));
        }
    }

    setupState.initialPickedIds.forEach(id => addFighterWithFamiliars(id, false));

    setupState.randomDrawnIds.forEach(id => addFighterWithFamiliars(id, false));

    setupState.reinforcementPickedIds.forEach(id => addFighterWithFamiliars(id, true));

    let allPool = (typeof db !== 'undefined' && db.tactics) ? db.tactics : [];
    gameTactics = (setupState.selectedTacticsIds || []).map(id => {
        let t = allPool.find(x => x.id === id);
        if (!t && currentGang && currentGang.tactics) {
            let gt = currentGang.tactics.find(x => (x.id || x) === id);
            if (gt) t = (typeof gt === 'string') ? allPool.find(x => x.id === gt) : gt;
        }
        return t ? { ...JSON.parse(JSON.stringify(t)), used: false } : null;
    }).filter(Boolean);

    if (typeof appState !== 'undefined') appState.view = 'game-view';
    renderGameView(document.getElementById('main-content'));
    showToast(isQuick ? "Partie rapide lancée ! Bonne chance !" : "Partie de campagne lancée ! Bonne chance !", "success");
}

function startCampaignGame() {
    startGame();
}

function addFighterToGameRoster(memberObj, isReinforcement) {
    let m = JSON.parse(JSON.stringify(memberObj));
    m.currentHP = parseInt(m.stats ? m.stats.W : 1) || 1;
    m.status = 'Prêt';
    m.activated = false;
    m.suppressed = false;
    m.isReinforcement = isReinforcement;
    m.conditions = {};

    // Le guerrier a choisi de laisser sa monture au dépôt pour cette partie
    // précise (voir toggleMountedOptOut) : elle est simplement absente de ce
    // clone de jeu, sans jamais être retirée de sa fiche définitive (memberObj,
    // dans currentGang.members, n'est pas modifié).
    if (typeof setupState !== 'undefined' && setupState.mountedOptOutIds && setupState.mountedOptOutIds.includes(memberObj.id)) {
        m.equipment = (m.equipment || []).filter(e => !(e && (e.id === 'eq_dirt_bike' || e.id === 'eq_escher_cutter')));
    }

    m.liveXP = {
        assistance: 0,
        objective: 0,
        seriouslyInjured: 0,
        scenario: 0,
        ooaKills: 0
    };

    const hasFearsomeSkill = (m.skills || []).some(s => {
        let sName = (typeof s === 'string' ? s : (s.name || '')).toLowerCase();
        let sId = (typeof s === 'object' && s.id) ? s.id : '';
        return sId === 'sk_redoutable' || sName.includes('fearsome') || sName.includes('redoutable');
    });
    const hasFearsomeInjury = (m.injuries || []).some(inj => {
        let low = (typeof inj === 'string' ? inj : '').toLowerCase();
        return low.includes('fearsome') || low.includes('redoutable');
    });
    if (hasFearsomeSkill || hasFearsomeInjury) m.conditions['Fearsome'] = true;

    // Blessure permanente "Haine" (12-14) : la condition est réactivée à chaque
    // partie et la cible notée lors du jet de blessure est reportée sur la fiche
    // (voir applyInjury() et le champ "Cible" affiché à côté de la case Haine).
    const hasHatredInjury = (m.injuries || []).some(inj => (typeof inj === 'string' ? inj : '').toLowerCase().includes('haine'));
    if (hasHatredInjury || m.hatredTarget) m.conditions['Haine'] = true;

    const hasBerserkerSkill = (m.skills || []).some(s => {
        let sName = (typeof s === 'string' ? s : (s.name || '')).toLowerCase();
        let sId = (typeof s === 'object' && s.id) ? s.id : '';
        return sId === 'sk_berserker' || sName.includes('berserker');
    });
    if (hasBerserkerSkill) m.conditions['Frénésie'] = true;

    // Brute -> Juggernaut automatique
    const isBruteFighter = (m.type && Array.isArray(m.type) && m.type.some(t => String(t).toLowerCase() === 'brute')) ||
                           (m.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === m.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'brute')));
    if (isBruteFighter) {
        if (!m.skills) m.skills = [];
        const hasJugg = m.skills.some(s => {
            let n = (typeof s === 'string' ? s : s.name) || '';
            return n.toLowerCase() === 'juggernaut' || (s.id && s.id === 'sk_juggernaut');
        });
        if (!hasJugg) {
            let juggSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                ? db.skills.generique.find(s => s.id === 'sk_juggernaut' || s.name.toLowerCase() === 'juggernaut')
                : null;
            m.skills.push(juggSkill ? JSON.parse(JSON.stringify(juggSkill)) : {
                id: "sk_juggernaut",
                name: "Juggernaut",
                desc: "Si touché au tir, suppressed uniquement si PV perdu ou effet du dé de blessure.",
                specific_to: "brute"
            });
        }
    }

    // Leader -> Inspirant et Chef automatiques
    const isLeaderFighter = (m.type && Array.isArray(m.type) && m.type.some(t => String(t).toLowerCase() === 'leader')) ||
                            (m.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === m.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'leader')));
    if (isLeaderFighter) {
        if (!m.skills) m.skills = [];
        const hasInsp = m.skills.some(s => {
            let n = (typeof s === 'string' ? s : (s.name || '')).toLowerCase();
            return n === 'inspirant' || n === 'inspiring' || (s.id && s.id === 'sk_inspirant');
        });
        if (!hasInsp) {
            let inspSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                ? db.skills.generique.find(s => s.id === 'sk_inspirant' || s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')
                : null;
            m.skills.push(inspSkill ? JSON.parse(JSON.stringify(inspSkill)) : {
                id: "sk_inspirant",
                name: "Inspirant",
                desc: "Peut faire l'action d'activation de groupe en action gratuite."
            });
        }
        const hasChef = m.skills.some(s => {
            let n = (typeof s === 'string' ? s : (s.name || '')).toLowerCase();
            return n === 'chef' || (s.id && s.id === 'sk_chef');
        });
        if (!hasChef) {
            let chefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                ? db.skills.generique.find(s => s.id === 'sk_chef' || s.name.toLowerCase() === 'chef')
                : null;
            m.skills.push(chefSkill ? JSON.parse(JSON.stringify(chefSkill)) : {
                id: "sk_chef",
                name: "Chef",
                desc: "Tous les alliés dans les 12\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
            });
        }
    }

    // Champion -> Inspirant et Sous-chef automatiques
    const isChampionFighter = (m.type && Array.isArray(m.type) && m.type.some(t => String(t).toLowerCase() === 'champion')) ||
                              (m.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === m.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'champion')));
    if (isChampionFighter) {
        if (!m.skills) m.skills = [];
        const hasInsp = m.skills.some(s => {
            let n = (typeof s === 'string' ? s : (s.name || '')).toLowerCase();
            return n === 'inspirant' || n === 'inspiring' || (s.id && s.id === 'sk_inspirant');
        });
        if (!hasInsp) {
            let inspSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                ? db.skills.generique.find(s => s.id === 'sk_inspirant' || s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')
                : null;
            m.skills.push(inspSkill ? JSON.parse(JSON.stringify(inspSkill)) : {
                id: "sk_inspirant",
                name: "Inspirant",
                desc: "Peut faire l'action d'activation de groupe en action gratuite."
            });
        }
        const hasSousChef = m.skills.some(s => {
            let n = (typeof s === 'string' ? s : (s.name || '')).toLowerCase();
            return n === 'sous-chef' || n === 'sous chef' || (s.id && s.id === 'sk_sous_chef');
        });
        if (!hasSousChef) {
            let sousChefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                ? db.skills.generique.find(s => s.id === 'sk_sous_chef' || s.name.toLowerCase() === 'sous-chef' || s.name.toLowerCase() === 'sous chef')
                : null;
            m.skills.push(sousChefSkill ? JSON.parse(JSON.stringify(sousChefSkill)) : {
                id: "sk_sous_chef",
                name: "Sous-chef",
                desc: "Tous les alliés dans les 6\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
            });
        }
    }

    if (m.weapons) {
        m.weapons.forEach(w => {
            w.outOfAmmo = false;
            w.jammed = false;
        });
    }

    currentGameRoster.push(m);
}

function toggleQuickFighter(id) {
    toggleInitialPick(id, 10);
}

function renderQuickMatchSetup(container) {
    renderGameSetup(container);
}

function startQuickGame() {
    startGame();
}

function deployReinforcement(idx) {
    if (currentGameRoster[idx]) {
        currentGameRoster[idx].isReinforcement = false;
        renderGameView(document.getElementById('main-content'));
    }
}

function adjLiveXP(fighterIdx, key, delta) {
    let m = currentGameRoster[fighterIdx];
    if (!m) return;
    if (!m.liveXP) {
        m.liveXP = { assistance: 0, objective: 0, seriouslyInjured: 0, scenario: 0, ooaKills: 0 };
    }
    m.liveXP[key] = Math.max(0, (m.liveXP[key] || 0) + delta);
    renderGameView(document.getElementById('main-content'));
}

function getFighterBattleXP(m) {
    if (!m) return 1;
    let lx = m.liveXP || { assistance: 0, objective: 0, seriouslyInjured: 0, scenario: 0, ooaKills: 0 };
    return 1 + (lx.assistance || 0) + (lx.objective || 0) + (lx.seriouslyInjured || 0) + (lx.scenario || 0) + ((lx.ooaKills || 0) * 2);
}

