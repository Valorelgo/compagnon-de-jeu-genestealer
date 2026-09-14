// fighter-skills-tactics.js (5/5 - issu de l'ancien app.js)
// Rôle : compétences du combattant, sauvegarde/retour de la fiche d'édition,
// export/import de gang au format JSON, cartes tactiques du gang, et
// l'initialisation automatique de l'application (point d'entrée initApp()).
// Dépendances : les 4 fichiers précédents. Doit rester le DERNIER fichier issu
// de l'ancien app.js à charger : c'est lui qui déclenche initApp() au chargement.

// ==========================================
// GESTION DES COMPÉTENCES (CRÉATION)
// ==========================================
function openSkillModal() {
    if (!tempFighter) return;
    const char = db.characters.find(c => c.id === tempFighter.charId);
    if (!char) return;

    let types = (char.type || []).map(t => t.toLowerCase());
    let isLeaderOrChampion = types.includes("leader") || types.includes("champion");
    let isProspectOrBeast = types.includes("prospect") || types.includes("bête") || types.includes("bette");
    let isSpecialist = types.includes("spécialiste") || types.includes("specialiste");

    const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    let primaryCats = (char.primary_skills || []).map(s => norm(s));
    let secondaryCats = (char.secondary_skills || []).map(s => norm(s));

    const specialistSkillIds = [
        "sk_biceps_saillants", "sk_tir_hanche", "sk_pistolero", "sk_grimper",
        "sk_tir_precision", "sk_berserker", "sk_soin", "sk_munitions"
    ];

    let html = `<div style="max-height:60vh; overflow-y:auto;">`;

    if (isProspectOrBeast) {
        html += `<p style="color:var(--accent-purple); padding:10px; background:#111; border-radius:5px; border:1px solid #333;">
            ⚠️ Les Prospects et Bêtes n'ont pas accès à la sélection de compétences à la création (uniquement leur compétence de départ).
        </p>`;
    } else if (isSpecialist) {
        html += `<p style="color:var(--accent-cyan); margin-bottom:10px;">
            🎯 <strong>Spécialiste :</strong> Choisissez 1 compétence parmi les 8 spécialités ci-dessous :
        </p>`;

        for (let cat in db.skills) {
            db.skills[cat].forEach(s => {
                if (specialistSkillIds.includes(s.id)) {
                    let isChecked = tempFighter.skills.some(sk => sk.id === s.id);
                    html += `
                        <div class="skill-checkbox-group" style="margin-bottom:8px; padding:6px; background:#181818; border-radius:4px; border:1px solid #333;">
                            <input type="checkbox" id="sk-${s.id}" ${isChecked ? 'checked' : ''} onchange="toggleSpecialistSkill('${s.id}', '${cat}')">
                            <label for="sk-${s.id}"><strong>${s.name}</strong> (${cat.toUpperCase()}) : ${s.desc}</label>
                        </div>
                    `;
                }
            });
        }
    } else {
        for (let cat in db.skills) {
            let catNorm = norm(cat);
            let isPrimary = primaryCats.includes(catNorm);
            let isSecondary = secondaryCats.includes(catNorm);
            
            let isAllowed = true;
            if (isLeaderOrChampion) {
                isAllowed = isPrimary;
            }

            html += `
                <div class="skill-category" style="margin-bottom:12px; ${isAllowed ? '' : 'opacity:0.35; pointer-events:none; filter:grayscale(1);'}">
                    <h4 style="margin-bottom:6px; color:${isPrimary ? 'var(--accent-cyan)' : (isSecondary ? 'var(--accent-purple)' : '#888')};">
                        Catégorie : ${cat.toUpperCase()} ${isPrimary ? '(Primaire)' : (isSecondary ? '(Secondaire)' : (isLeaderOrChampion ? '(Inaccessible)' : ''))}
                    </h4>
            `;

            db.skills[cat].forEach(s => {
                if (s.specific_to) {
                    let matchChar = tempFighter && tempFighter.charId === s.specific_to;
                    let matchType = tempFighter && tempFighter.type && tempFighter.type.some(t => String(t).toLowerCase() === s.specific_to.toLowerCase());
                    if (!matchChar && !matchType) return; // Réservé exclusivement (ex: Lands on their feet, Juggernaut pour Brute)
                }
                let isChecked = tempFighter.skills.some(sk => sk.id === s.id);
                html += `
                    <div class="skill-checkbox-group" style="margin-bottom:4px;">
                        <input type="checkbox" id="sk-${s.id}" ${isChecked ? 'checked' : ''} ${isAllowed ? '' : 'disabled'} onchange="toggleSkill('${cat}', '${s.id}')">
                        <label for="sk-${s.id}"><strong>${s.name}</strong> : ${s.desc}</label>
                    </div>
                `;
            });

            html += `</div>`;
        }
    }

    html += `</div><br><button class="btn" onclick="closeModal()">Fermer</button>`;
    openModal("Menu des Compétences (Création)", html);
}

function toggleSpecialistSkill(skillId, cat) {
    const skillObj = db.skills[cat].find(s => s.id === skillId);
    if (!skillObj) return;

    const specialistSkillIds = [
        "sk_biceps_saillants", "sk_tir_hanche", "sk_pistolero", "sk_grimper",
        "sk_tir_precision", "sk_berserker", "sk_soin", "sk_munitions"
    ];

    tempFighter.skills = tempFighter.skills.filter(s => !specialistSkillIds.includes(s.id));

    let checkbox = document.getElementById(`sk-${skillId}`);
    if (checkbox && checkbox.checked) {
        tempFighter.skills.push(JSON.parse(JSON.stringify(skillObj)));
    }

    openSkillModal();
}

function toggleSkill(cat, skillId) {
    const skillObj = db.skills[cat].find(s => s.id === skillId);
    const existingIdx = tempFighter.skills.findIndex(s => s.id === skillId);
    
    if (existingIdx >= 0) {
        tempFighter.skills.splice(existingIdx, 1);
    } else {
        tempFighter.skills.push(JSON.parse(JSON.stringify(skillObj)));
    }
}

function removeSkill(idx) {
    tempFighter.skills.splice(idx, 1);
    renderFighterEdit(document.getElementById('main-content'));
}

// Genestealer Cults : case à cocher "Extra arm" (+20 pts) des profils
// can_take_extra_arm (Hybrid acolyte, Neophyte hybrid, Hybrid initiate).
// Ajoute/retire ensemble la compétence Extra arm et l'arme Clawed arm (dont le
// coût de 20 cr, non-défaut, est ce qui matérialise le "+20 points" — voir
// calculateFighterCost, non modifié). La capacité d'armes portées suit
// automatiquement via getMaxWeaponSlots (gang-views.js).
function toggleExtraArmOption() {
    if (!tempFighter) return;
    let hasExtraArm = (tempFighter.skills || []).some(s => (s.id === 'sk_extra_arm') || (typeof s === 'string' && s.toLowerCase() === 'extra arm'));

    if (hasExtraArm) {
        tempFighter.skills = (tempFighter.skills || []).filter(s => s.id !== 'sk_extra_arm');
        tempFighter.weapons = (tempFighter.weapons || []).filter(w => !(w.id === 'wpn_clawed_arm' && !w.isDefault));
        tempFighter.extraArmPurchased = false;
    } else {
        let eaSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_extra_arm')
            : null;
        tempFighter.skills.push(eaSkill ? JSON.parse(JSON.stringify(eaSkill)) : {
            id: "sk_extra_arm",
            name: "Extra arm",
            desc: "Le guerrier peut prendre une arme en plus et considère les braced shot comme des actions simples plutôt que doubles. Il ne peut néanmoins pas se déplacer ou faire un autre tir. Donne l'arme Clawed arm."
        });

        if (!tempFighter.weapons.some(w => w.id === 'wpn_clawed_arm')) {
            let clawObj = (typeof db !== 'undefined' && db.weapons) ? db.weapons.find(w => w.id === 'wpn_clawed_arm') : null;
            let item = clawObj ? JSON.parse(JSON.stringify(clawObj)) : {
                id: "wpn_clawed_arm", name: "Clawed arm",
                profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "attaques additionnelles (1), melee, déchirant (6+)" }],
                cost_credits: 0
            };
            item.isDefault = false;
            tempFighter.weapons.push(item);
        }
        // Le coût affiché de Clawed arm est 0 (arme naturelle) : le "+20 points"
        // de la case à cocher est appliqué séparément par calculateFighterCost
        // via ce flag (voir core-state.js).
        tempFighter.extraArmPurchased = true;
    }
    renderFighterEdit(document.getElementById('main-content'));
}

// ==========================================
// SAUVEGARDE ET RENVOI DU COMBATTANT
// ==========================================
function saveFighter() {
    if (!tempFighter.customName.trim()) return showToast("Veuillez saisir un nom pour le combattant.", "error");
    
    if (tempFighter.charId === 'merc_hive_scum') {
        let wCost = (tempFighter.weapons || []).reduce((sum, w) => sum + (w.isDefault ? 0 : (w.cost_credits || 0)), 0);
        let eCost = (tempFighter.equipment || []).reduce((sum, e) => sum + (e.isDefault ? 0 : (e.cost_credits || 0)), 0);
        if (wCost + eCost > 60) {
            return showToast(`Dépassement de limite ! Le matériel du Hive Scum ne peut pas dépasser 60 crédits au total (Actuel : ${wCost + eCost} cr).`, "error");
        }
    }

    tempFighter.totalCost = calculateFighterCost(tempFighter);

    if (!currentGang.isEstablished) {
        let oldCost = 0;
        if (appState.editTarget !== null) {
            oldCost = currentGang.members[appState.editTarget].totalCost;
        }
        let diff = tempFighter.totalCost - oldCost;
        if (currentGang.credits - diff < 0) return showToast("Crédits insuffisants !", "error");
        currentGang.credits -= diff;
    } else {
        let creditsToPay = 0;

        if (appState.editTarget === null) {
            const charDef = db.characters.find(c => c.id === tempFighter.charId);
            creditsToPay += (charDef ? charDef.cost : 0);

            (tempFighter.weapons || []).forEach(w => {
                if (!w.fromStash && !w.isDefault) creditsToPay += (w.cost_credits || 0);
                if (w.accessory && !w.accessory.fromStash && !w.accessory.isDefault) creditsToPay += (w.accessory.cost_credits || 0);
            });
            (tempFighter.equipment || []).forEach(e => {
                if (!e.fromStash && !e.isDefault && !e.costPrepaid) creditsToPay += (e.cost_credits || 0);
            });
        } else {
            let origFighter = currentGang.members[appState.editTarget];
            
            const countNewItems = (tempList, origList, getItemName, getAcc) => {
                let tempCounts = {};
                (tempList || []).forEach(item => {
                    if (getAcc) item = item.accessory;
                    if (!item) return;
                    if (!item.fromStash && !item.isDefault && !item.costPrepaid) {
                        let n = getItemName(item);
                        let cost = item.cost_credits || item.cost || 0;
                        if (!tempCounts[n]) tempCounts[n] = { count: 0, cost: cost };
                        tempCounts[n].count++;
                    }
                });

                let origCounts = {};
                (origList || []).forEach(item => {
                    if (getAcc) item = item.accessory;
                    if (!item) return;
                    if (!item.fromStash && !item.isDefault && !item.costPrepaid) {
                        let n = getItemName(item);
                        if (!origCounts[n]) origCounts[n] = 0;
                        origCounts[n]++;
                    }
                });

                let totalNewCost = 0;
                for (let n in tempCounts) {
                    let diff = tempCounts[n].count - (origCounts[n] || 0);
                    if (diff > 0) {
                        totalNewCost += diff * tempCounts[n].cost;
                    }
                }
                return totalNewCost;
            };

            creditsToPay += countNewItems(tempFighter.weapons, origFighter.weapons, w => w.name, false);
            creditsToPay += countNewItems(tempFighter.weapons, origFighter.weapons, acc => acc.name, true);
            creditsToPay += countNewItems(tempFighter.equipment, origFighter.equipment, e => e.name, false);
        }

        // Options d'armes nouvellement débloquées (ex: Photon flash/Fumigène sur
        // un Grenade launcher) : chacune coûte son propre extra_cost, en plus du
        // prix de l'arme. Comparé à la fiche d'origine (aucune si nouvelle recrue)
        // pour ne facturer que les options ajoutées durant cette session d'édition.
        let origFighterForOptions = (appState.editTarget !== null) ? currentGang.members[appState.editTarget] : null;
        (tempFighter.weapons || []).forEach((w, wIdx) => {
            if (!w.optional_profiles || !w.unlockedOptions || w.unlockedOptions.length === 0) return;
            let origWeapon = origFighterForOptions ? (origFighterForOptions.weapons || [])[wIdx] : null;
            let origUnlocked = (origWeapon && origWeapon.unlockedOptions) || [];
            w.unlockedOptions.forEach(optName => {
                if (!origUnlocked.includes(optName)) {
                    let opt = w.optional_profiles.find(op => op.name === optName);
                    if (opt) creditsToPay += (opt.extra_cost || 0);
                }
            });
        });

        if (creditsToPay > 0) {
            if (currentGang.credits < creditsToPay) {
                return showToast(`Crédits insuffisants ! Requis : ${creditsToPay} cr | Disponibles : ${currentGang.credits} cr.`, "error");
            }
            currentGang.credits -= creditsToPay;
        }
    }
    
    // Champ technique de suivi (familiers achetés/adoptés durant cette session
    // d'édition, voir buyFamiliarForFighter/cancelFighterEdit) : ne doit pas
    // persister sur la fiche définitive du combattant une fois sauvegardée.
    delete tempFighter._newFamiliarIds;

    let wasRecruiting = (appState.editTarget === null);
    let recruitedFighter = tempFighter;
    let isPostCycle = (appState.returnTo === 'post-cycle');

    if (appState.editTarget === null) {
        currentGang.members.push(tempFighter);
    } else {
        currentGang.members[appState.editTarget] = tempFighter;
    }
    
    if (typeof ensureInnateFighterSkills === 'function') {
        ensureInnateFighterSkills(currentGang);
    }
    calculateGangRating(currentGang);
    saveGangs();

    if (isPostCycle) {
        appState.returnTo = null;
        appState.view = 'post-cycle';
        if (typeof renderPostCycleView === 'function') {
            renderPostCycleView(document.getElementById('main-content'));
        } else {
            navigate('gang-manage');
        }
    } else {
        navigate('gang-manage');
    }

    if (wasRecruiting) {
        handleRecruitTactics(recruitedFighter, isPostCycle);
    } else {
        if (typeof showToast === 'function') {
            showToast(`Équipement mis à jour (${creditsToPay || 0} cr) !`, "success");
        }
    }
}

function removeFighter(idx) {
    const m = currentGang.members[idx];
    if (!m) return;

    const gearVanishes = shouldFighterGearVanish(m);

    showConfirmModal(
        "Licencier le combattant",
        `Voulez-vous vraiment licencier <strong>${m.customName}</strong> (${m.charName}) ?<br><br>
        <small style="color:#aaa; font-size:13px;">${gearVanishes
            ? `Mercenaire, familier, bête ou brute : son équipement et ses armes disparaissent avec lui/elle.`
            : `Ses armes et équipements rejoindront automatiquement la réserve du gang (Stash).`}</small><br>
        <small style="color:#e74c3c; font-size:12px;">Son coût (${m.totalCost||0} cr) n'est pas remboursé : il/elle quitte simplement le gang.</small>`,
        "Licencier",
        () => {
            performRemoveFighter(idx);
        }
    );
}

function performRemoveFighter(idx) {
    const m = currentGang.members[idx];
    if (!m) return;

    transferFighterGearToStash(m);

    currentGang.members.splice(idx, 1);
    calculateGangRating(currentGang);
    saveGangs();
    renderGangManage(document.getElementById('main-content'));
    showToast(`${m.customName} a été licencié(e). ${shouldFighterGearVanish(m) ? "Son équipement a disparu avec lui/elle." : "Ses armes et équipements ont rejoint la réserve du gang."}`);
    if (typeof ensureGangHasLeader === 'function') ensureGangHasLeader();
}

// ==========================================
// MODALE & UTILS EXPORT
// ==========================================
function openModal(title, content, isLandscape = false) {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.querySelector('.modal-content');
    const modalFooter = document.getElementById('modal-footer');

    if (modalTitle) modalTitle.innerText = title;
    if (modalBody) modalBody.innerHTML = content;
    
    if (modalContent) {
        if (isLandscape) {
            modalContent.classList.add('modal-landscape');
        } else {
            modalContent.classList.remove('modal-landscape');
        }
    }

    if (modalFooter && modalBody) {
        // Détecte si le contenu injecté possède déjà son propre bouton de fermeture / annulation (appelant closeModal)
        // afin d'éviter tout doublon (un seul bouton en bas suffit)
        const hasExistingCloseBtn = modalBody.querySelector('button[onclick*="closeModal"]') !== null;
        modalFooter.style.display = hasExistingCloseBtn ? 'none' : 'flex';
    }

    if (modalOverlay) {
        modalOverlay.classList.remove('hidden');
        modalOverlay.style.display = 'flex';
    }
}

function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.querySelector('.modal-content');
    if (modalOverlay) {
        modalOverlay.classList.add('hidden');
        modalOverlay.style.display = 'none';
    }
    if (modalContent) modalContent.classList.remove('modal-landscape');

    if (window._onConfirmCancel) {
        const cancelFn = window._onConfirmCancel;
        window._onConfirmCancel = null;
        cancelFn();
    }
    window._onConfirmAction = null;

    if (appState.view === 'fighter-edit') {
        renderFighterEdit(document.getElementById('main-content'));
    }
}

function triggerConfirmAction() {
    const fn = window._onConfirmAction;
    window._onConfirmAction = null;
    window._onConfirmCancel = null;

    closeModal();

    if (typeof fn === 'function') {
        fn();
    }
}

// Notifications toast non-bloquantes (idéal pour iframe sandboxed)
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : (type === 'success' ? 'toast-success' : '')}`;
    toast.innerHTML = `<span>${message}</span><span style="cursor:pointer; margin-left:10px; font-weight:bold; opacity:0.8;" onclick="this.parentElement.remove()">✕</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 3800);
}

// Filet de sécurité : window.alert() et window.confirm() sont bloqués dans l'iframe
// d'hébergement. Tout le code appelle désormais showToast()/showConfirmModal()
// directement ; ce remplacement reste en place pour intercepter un éventuel alert()
// oublié plutôt que de bloquer silencieusement l'interface.
window.alert = function(msg) {
    showToast(msg, 'info');
};

// Modale de confirmation personnalisée pour remplacer confirm() bloqué en iframe
function showConfirmModal(title, message, confirmText, onConfirm, cancelText = "Annuler", onCancel = null) {
    window._onConfirmAction = onConfirm;
    window._onConfirmCancel = onCancel;

    const html = `
        <div style="padding: 10px 0;">
            <div style="font-size: 15px; margin-bottom: 22px; line-height: 1.5; color: #eee;">${message}</div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; flex-wrap:wrap;">
                <button class="btn" style="padding: 8px 16px; margin:0;" onclick="closeModal();">${cancelText}</button>
                <button class="btn btn-cyan" style="padding: 8px 20px; font-weight: bold; margin:0;" onclick="triggerConfirmAction();">${confirmText}</button>
            </div>
        </div>
    `;
    openModal(title, html);
}


function exportGang(name) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedGangs[name], null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Gang_${name.replace(/\s+/g, '_')}.json`);
    dlAnchorElem.click();
}

function importGang() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const gang = JSON.parse(event.target.result);

                if (!gang || typeof gang !== 'object' || !gang.name || !Array.isArray(gang.members)) {
                    showToast("Fichier JSON invalide : structure de gang non reconnue.", "error");
                    return;
                }

                // Ce programme ne gère que des listes Genestealer : on rejette tout fichier
                // explicitement tagué pour une autre faction (Delaque, Genestealer,
                // Cawdor...). Un fichier SANS tag (export fait avant l'ajout de cette
                // protection) est accepté et tagué Genestealer, par compatibilité.
                if (gang.faction && gang.faction !== APP_GANG_FACTION) {
                    showToast(`Ce fichier est une liste "${gang.faction}", pas une liste Genestealer. Ce programme n'importe que des listes Genestealer.`, "error");
                    return;
                }
                gang.faction = APP_GANG_FACTION;

                savedGangs[gang.name] = gang;
                saveGangs();
                showToast("Gang Genestealer importé avec succès !", "success");
                navigate('gang-select');
            } catch(err) { showToast("Fichier JSON invalide.", "error"); }
        };
        reader.readAsText(file);
    };
    input.click();
}

function deleteGang(name) {
    showConfirmModal(
        "Supprimer définitivement le gang",
        `Êtes-vous sûr de vouloir supprimer définitivement le gang <strong>${name}</strong> ?<br><br><small style="color:#e74c3c;">Cette action effacera toutes les fiches de combattants et l'historique associé.</small>`,
        "Supprimer",
        () => {
            delete savedGangs[name];
            saveGangs();
            renderGangSelect(document.getElementById('main-content'));
            showToast(`Le gang ${name} a été supprimé.`, "info");
        }
    );
}

// ==========================================
// GESTION DES CARTES TACTIQUES (AUTOMATIQUE & CONSULTATION)
// ==========================================
function ensureNoDuplicateTactics(gang) {
    if (!gang || !gang.tactics) return;
    let seen = new Set();
    let clean = [];
    let allPool = (typeof db !== 'undefined' && db.tactics) ? db.tactics : [];
    gang.tactics.forEach(t => {
        let id = typeof t === 'string' ? t : (t && t.id ? t.id : null);
        if (id && !seen.has(id)) {
            seen.add(id);
            let full = allPool.find(x => x.id === id);
            if (full) {
                clean.push(JSON.parse(JSON.stringify(full)));
            } else if (typeof t === 'object') {
                clean.push(t);
            } else {
                clean.push({ id, name: id, timing: '', effect: '' });
            }
        }
    });
    gang.tactics = clean;
}

function getFighterTacticsCardCount(fighter) {
    if (!fighter) return 0;
    let types = (fighter.type || []).map(t => String(t || '').trim().toLowerCase());
    if (types.includes("leader")) return 2;
    if (types.includes("champion")) return 1;

    if (fighter.charId && typeof db !== 'undefined' && db.characters) {
        let charDef = db.characters.find(c => c.id === fighter.charId);
        if (charDef) {
            let charTypes = (charDef.type || []).map(t => String(t || '').trim().toLowerCase());
            if (charTypes.includes("leader")) return 2;
            if (charTypes.includes("champion")) return 1;
            if (charDef.tactics_cards) return charDef.tactics_cards;
        }
    }
    return 0;
}

function drawRandomTacticsForGang(gang, count) {
    if (!gang || count <= 0) return [];
    if (!gang.tactics) gang.tactics = [];
    ensureNoDuplicateTactics(gang);

    let ownedIds = gang.tactics.map(t => (typeof t === 'string' ? t : t.id));
    let allPool = (typeof db !== 'undefined' && db.tactics) ? db.tactics : [];
    let availablePool = allPool.filter(t => !ownedIds.includes(t.id));

    let drawn = [];
    for (let i = 0; i < count && availablePool.length > 0; i++) {
        let randIdx = Math.floor(Math.random() * availablePool.length);
        let picked = availablePool.splice(randIdx, 1)[0];
        let cardCopy = JSON.parse(JSON.stringify(picked));
        gang.tactics.push(cardCopy);
        drawn.push(cardCopy);
    }
    return drawn;
}

function handleRecruitTactics(fighter, isPostCycle) {
    if (!currentGang || !fighter) return;
    if (!currentGang.tactics) currentGang.tactics = [];
    ensureNoDuplicateTactics(currentGang);

    let count = getFighterTacticsCardCount(fighter);
    let allPool = (typeof db !== 'undefined' && db.tactics) ? db.tactics : [];
    let ownedIdsBefore = currentGang.tactics.map(t => (typeof t === 'string' ? t : t.id));
    let availablePool = allPool.filter(t => !ownedIdsBefore.includes(t.id));

    let drawnCards = [];
    if (count > 0) {
        drawnCards = drawRandomTacticsForGang(currentGang, count);
        saveGangs();
    }

    let isLeader = count === 2;
    let isChampion = count === 1;
    let fName = fighter.customName || fighter.charName || 'Combattant';
    let fRole = fighter.charName || (isLeader ? 'Leader' : (isChampion ? 'Champion' : 'Guerrier'));

    let modalTitle = "";
    let html = "";

    if (drawnCards.length > 0) {
        modalTitle = "🎴 Nouvelles Cartes Tactiques Débloquées";
        html = `
            <div style="padding:4px;">
                <div style="background:#11131c; border:1px solid #282b42; border-radius:6px; padding:12px; margin-bottom:14px;">
                    <div style="font-size:14px; color:#fff; margin-bottom:4px;">
                        Combattant recruté : <strong style="color:var(--accent-cyan); font-size:16px;">${fName}</strong> 
                        <span style="color:#aaa;">(${fRole})</span>
                    </div>
                    <div style="font-size:13px; color:var(--accent-purple); font-weight:bold;">
                        ⭐ Rôle : ${isLeader ? 'Leader' : 'Champion'} ➔ +${drawnCards.length} carte(s) tactique(s) générée(s) aléatoirement !
                    </div>
                </div>

                <p style="font-size:13px; color:#ccc; margin-bottom:10px;">
                    Voici les cartes tactiques uniques tirées sans doublon qui rejoignent immédiatement le deck de votre gang :
                </p>

                <div style="max-height:48vh; overflow-y:auto; margin-bottom:14px;">
                    ${drawnCards.map((card, idx) => `
                        <div style="background:#111; border:1px solid #444; border-left:4px solid var(--accent-cyan); border-radius:6px; padding:10px 12px; margin-bottom:10px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <strong style="color:var(--accent-cyan); font-size:15px;">${card.name}</strong>
                                <span style="font-size:11px; color:#aaa; background:#1e1e2f; padding:2px 8px; border-radius:4px;">Carte ${idx + 1}/${drawnCards.length}</span>
                            </div>
                            <div style="font-size:12px; color:#c084fc; margin-bottom:4px;">
                                <strong>Timing :</strong> ${card.timing || 'N/A'}
                            </div>
                            <div style="font-size:12px; color:#ddd; line-height:1.4;">
                                <strong>Effet :</strong> ${card.effect || 'N/A'}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div style="background:#151515; border-radius:6px; padding:8px 12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#aaa;">
                    <span>Deck total du gang : <strong style="color:#fff;">${currentGang.tactics.length}</strong> / ${allPool.length} cartes</span>
                    <span style="color:#2ecc71;">✓ Garanti sans doublon</span>
                </div>

                <button class="btn btn-cyan" style="width:100%; padding:10px; font-weight:bold;" onclick="closeModal()">
                    Continuer
                </button>
            </div>
        `;
    } else if (count > 0 && availablePool.length === 0) {
        modalTitle = "🎴 Deck Tactique Déjà Complet";
        html = `
            <div style="padding:4px;">
                <div style="background:#11131c; border:1px solid #282b42; border-radius:6px; padding:12px; margin-bottom:14px;">
                    <div style="font-size:14px; color:#fff; margin-bottom:4px;">
                        Combattant recruté : <strong style="color:var(--accent-cyan); font-size:16px;">${fName}</strong> 
                        <span style="color:#aaa;">(${fRole})</span>
                    </div>
                    <div style="font-size:13px; color:var(--accent-purple); font-weight:bold;">
                        ⭐ Rôle : ${isLeader ? 'Leader (+2 cartes)' : 'Champion (+1 carte)'}
                    </div>
                </div>
                <div style="background:#111; border:1px solid #444; border-radius:6px; padding:12px; margin-bottom:14px; color:#ccc; font-size:13px;">
                    <p style="margin:0; color:#f39c12; font-weight:bold; margin-bottom:6px;">⚠️ Toutes les cartes sont déjà possédées !</p>
                    Toutes les cartes tactiques du jeu (${allPool.length} / ${allPool.length}) font déjà partie du deck de votre gang. Aucune nouvelle carte supplémentaire ne peut être tirée.
                </div>
                <button class="btn btn-cyan" style="width:100%; padding:10px; font-weight:bold;" onclick="closeModal()">
                    Continuer
                </button>
            </div>
        `;
    } else {
        // Les guerriers qui ne sont ni Leader ni Champion ne génèrent aucune
        // carte tactique : pas besoin de fenêtre pour eux, juste un toast discret.
        if (typeof showToast === 'function') {
            showToast(`${fName} a rejoint le gang !`, "success");
        }
        return;
    }

    if (typeof openModal === 'function') {
        openModal(modalTitle, html);
    }
}

function openGangTacticsModal() {
    if (!currentGang) return;
    if (!currentGang.tactics) currentGang.tactics = [];
    ensureNoDuplicateTactics(currentGang);

    let allPool = (typeof db !== 'undefined' && db.tactics) ? db.tactics : [];
    let ownedCards = currentGang.tactics.map(gt => {
        let id = (typeof gt === 'string') ? gt : gt.id;
        let full = allPool.find(t => t.id === id);
        if (full) return full;
        return (typeof gt === 'object') ? gt : { id, name: id, timing: '', effect: '' };
    });

    let html = `
        <div style="background:#11131c; border:1px solid #282b42; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:13px; color:#ccc;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <span>Cartes possédées : <strong style="color:var(--accent-cyan); font-size:15px;">${ownedCards.length}</strong> / ${allPool.length}</span>
                <span style="font-size:11px; color:#2ecc71;">✓ Garanti sans doublon</span>
            </div>
            <p style="margin-top:6px; margin-bottom:0; font-size:12px; color:#888; line-height:1.4;">
                💡 Les cartes tactiques sont acquises automatiquement lors du recrutement d'un <strong>Leader (+2 cartes)</strong> ou d'un <strong>Champion (+1 carte)</strong>, ainsi que par l'action de <strong>Développement Tactique</strong> en post-cycle. Elles ne peuvent pas être ajoutées ou retirées manuellement.
            </p>
        </div>
        <div style="max-height:55vh; overflow-y:auto;">
    `;

    if (ownedCards.length === 0) {
        html += `
            <div style="padding:24px 16px; text-align:center; color:#aaa; background:#111; border:1px dashed #444; border-radius:6px;">
                <p style="margin:0 0 6px 0; font-size:15px; color:#eee;">Aucune carte tactique possédée pour le moment.</p>
                <small style="color:#777;">Recrutez un Leader ou un Champion pour générer automatiquement vos premières cartes tactiques !</small>
            </div>
        `;
    } else {
        ownedCards.forEach((t, idx) => {
            html += `
                <div style="border:1px solid #333; padding:10px 12px; margin-bottom:8px; border-radius:6px; background:#111; border-left:4px solid var(--accent-purple);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <strong style="color:var(--accent-cyan); font-size:15px;">${t.name}</strong>
                        <span style="font-size:11px; color:#777; background:#181818; padding:2px 6px; border-radius:3px;">#${idx + 1}</span>
                    </div>
                    <div style="font-size:12px; color:#c084fc; margin-bottom:4px;">
                        <strong>Timing :</strong> ${t.timing || 'N/A'}
                    </div>
                    <div style="font-size:12px; color:#ddd; line-height:1.4;">
                        <strong>Effet :</strong> ${t.effect || 'N/A'}
                    </div>
                </div>
            `;
        });
    }

    html += `</div><br><button class="btn btn-cyan" style="width:100%; padding:10px; font-weight:bold;" onclick="closeModal()">Fermer</button>`;
    openModal(`🎴 Cartes Tactiques du Gang (${ownedCards.length})`, html);
}

function toggleGangTactic() {
    showToast("Les cartes tactiques ne peuvent pas être modifiées manuellement. Elles sont obtenues automatiquement lors du recrutement d'un Leader (+2) ou d'un Champion (+1), ou via le Développement Tactique en post-cycle.", "info");
}

// ==========================================
// INITIALISATION AUTOMATIQUE DE L'APPLICATION
// ==========================================
function initApp() {
    const container = document.getElementById('main-content');
    if (container && (!container.innerHTML || container.innerHTML.trim() === '')) {
        navigate('menu');
    }
    // Prévient l'utilisateur si des listes d'une autre faction ont été détectées et
    // retirées de cette appli au chargement (voir quarantineForeignFactionGangs
    // dans core-state.js). Fait ici plutôt qu'au chargement des données car
    // showToast n'est défini que dans ce fichier, chargé après core-state.js.
    if (typeof _quarantinedGangsCount !== 'undefined' && _quarantinedGangsCount > 0) {
        const n = _quarantinedGangsCount;
        showToast(`${n} liste${n > 1 ? 's' : ''} d'une autre faction que Genestealer détectée${n > 1 ? 's' : ''} et retirée${n > 1 ? 's' : ''} de cette appli (conservée${n > 1 ? 's' : ''}, non affichée${n > 1 ? 's' : ''} ici).`, "info");
        _quarantinedGangsCount = 0;
    }
    // Prévient l'utilisateur si d'anciennes blessures permanentes ont été corrigées
    // rétroactivement (le malus de statistique n'était pas appliqué avant cette
    // mise à jour, voir migrateSavedGangsIfNeeded et le fichier game-state-scenarios.js).
    if (typeof _injuryStatFixCount !== 'undefined' && _injuryStatFixCount > 0) {
        const n = _injuryStatFixCount;
        showToast(`Correctif appliqué : ${n} malus de blessure${n > 1 ? 's' : ''} permanente${n > 1 ? 's' : ''} (statistique) qui n'${n > 1 ? 'étaient' : 'était'} pas actif${n > 1 ? 's' : ''} ${n > 1 ? 'ont' : 'a'} été appliqué${n > 1 ? 's' : ''} rétroactivement.`, "info");
        _injuryStatFixCount = 0;
    }
}

window.ensureNoDuplicateTactics = ensureNoDuplicateTactics;
window.getFighterTacticsCardCount = getFighterTacticsCardCount;
window.drawRandomTacticsForGang = drawRandomTacticsForGang;
window.handleRecruitTactics = handleRecruitTactics;
window.openGangTacticsModal = openGangTacticsModal;
window.openRecruitModal = openRecruitModal;
window.selectRecruitProfile = selectRecruitProfile;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
