// postcycle-progression.js (4/4 - issu de l'ancien postbattle.js)
// Rôle : gestion du stash (réserve du gang) et gestion des territoires.
// La montée de niveau et les avancées de combattant ont été déplacées dans
// leur propre fichier (xp-advancement.js) pour garder ce fichier raisonnable.
// Dépendances : les 3 fichiers précédents + xp-advancement.js. Dernier
// fichier chargé par l'appli.
// ==========================================
// GESTION DU STASH (RÉSERVE) & REVENTE
// ==========================================
function calculateResellPrice(cost) {
    if (!cost || cost <= 0) return 0;
    return Math.ceil((cost / 2) / 5) * 5;
}

function openStashModal() {
    if (!currentGang) return;
    if (!currentGang.stash) currentGang.stash = [];

    let inventoryMap = {};

    (currentGang.members || []).forEach(m => {
        (m.weapons || []).forEach(w => {
            let wName = w.name;
            if (!inventoryMap[wName]) inventoryMap[wName] = { type: 'Arme', equipped: 0, stash: 0, cost: w.cost || w.cost_credits || 0 };
            inventoryMap[wName].equipped++;

            if (w.accessory && w.accessory.name) {
                let accName = w.accessory.name;
                if (!inventoryMap[accName]) inventoryMap[accName] = { type: 'Accessoire', equipped: 0, stash: 0, cost: w.accessory.cost || 0 };
                inventoryMap[accName].equipped++;
            }
        });

        if (m.armor && m.armor.name) {
            let aName = m.armor.name;
            if (!inventoryMap[aName]) inventoryMap[aName] = { type: 'Armure', equipped: 0, stash: 0, cost: m.armor.cost || 0 };
            inventoryMap[aName].equipped++;
        }

        (m.equipment || []).forEach(e => {
            let eName = e.name;
            if (!inventoryMap[eName]) inventoryMap[eName] = { type: 'Équipement', equipped: 0, stash: 0, cost: e.cost || e.cost_credits || 0 };
            inventoryMap[eName].equipped++;
        });
    });

    (currentGang.stash || []).forEach(item => {
        let name = typeof item === 'string' ? item : item.name;
        let type = (typeof item === 'object' && item.type) ? item.type : 'Matériel';
        let cost = (typeof item === 'object') ? (item.cost || item.cost_credits || item.price || 0) : 0;
        
        if (!inventoryMap[name]) {
            inventoryMap[name] = { type: type, equipped: 0, stash: 0, cost: cost };
        }
        inventoryMap[name].stash++;
        if (cost > 0 && !inventoryMap[name].cost) inventoryMap[name].cost = cost;
    });

    let html = `
        <div style="max-height:60vh; overflow-y:auto;">
            <p><small>Format <strong>X/Y</strong> : <strong>X</strong> = Équipés sur guerriers / <strong>Y</strong> = Total possédés par le gang. Revente à la moitié (arrondie aux 5 cr supérieurs).</small></p>
            <p style="font-size:11px; color:#aaa; margin-top:3px;"><em>Règle accessoire : Si une arme est déséquipée et envoyée dans le stash, son accessoire y est également envoyé.</em></p>
            <p style="font-size:11px; color:#2ecc71; margin-top:3px;"><em>Tout ce qui est "En Stock" peut être équipé gratuitement sur un combattant éligible (ni mercenaire, ni bête/familier). Les accessoires d'arme s'équipent depuis la fiche du combattant (bouton "+ Ajouter un accessoire").</em></p>
            <hr style="margin:10px 0; border-color:#333;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid var(--accent-purple, #9b59b6);">
                        <th style="padding:6px;">Objet / Équipement</th>
                        <th style="padding:6px;">Type</th>
                        <th style="padding:6px; text-align:center;">Équipés / Total (X/Y)</th>
                        <th style="padding:6px; text-align:center;">En Stock</th>
                        <th style="padding:6px; text-align:right;">Action</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let eligibleFighters = (currentGang.members || []).filter(m => !isMercOrBeastProfile(m));

    let itemKeys = Object.keys(inventoryMap).sort();
    if (itemKeys.length === 0) {
        html += `<tr><td colspan="5" style="padding:15px; text-align:center; color:#888;">Le gang ne possède aucun matériel.</td></tr>`;
    } else {
        itemKeys.forEach((itemName, rowIdx) => {
            let data = inventoryMap[itemName];
            let X = data.equipped;
            let stashCount = data.stash;
            let Y = X + stashCount;
            let sellPrice = calculateResellPrice(data.cost);
            let cleanName = escapeForJsStr(itemName);
            let isAccessory = (data.type || '').toLowerCase().includes('accessoire');
            let canQuickEquip = stashCount > 0 && !isAccessory;

            html += `
                <tr style="border-bottom:1px solid #222;">
                    <td style="padding:6px;"><strong>${itemName}</strong></td>
                    <td style="padding:6px;"><small style="color:#aaa;">${data.type}</small></td>
                    <td style="padding:6px; text-align:center;"><strong style="color:var(--accent-cyan, #00d2d3);">${X}/${Y}</strong></td>
                    <td style="padding:6px; text-align:center;">
                        ${stashCount > 0 ? `<span style="color:#2ecc71;">${stashCount} dispo</span>` : `<span style="color:#888;">0 dispo</span>`}
                    </td>
                    <td style="padding:6px; text-align:right;">
                        <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center; flex-wrap:wrap;">
                        ${canQuickEquip ? (eligibleFighters.length > 0 ? `
                            <select id="quickequip-target-${rowIdx}" style="padding:2px 4px; font-size:11px; background:#1a1a1a; color:#fff; border:1px solid #444; border-radius:3px;">
                                ${eligibleFighters.map(f => `<option value="${f.id}">${f.customName}</option>`).join('')}
                            </select>
                            <button class="btn-cyan" style="padding:2px 8px; font-size:11px;" onclick="quickEquipStashItem('${cleanName}', document.getElementById('quickequip-target-${rowIdx}').value)">Équiper</button>
                        ` : `<small style="color:#888;">Aucun combattant éligible</small>`) : ''}
                        ${stashCount > 0
                            ? `<button class="btn btn-cyan" style="padding:2px 8px; font-size:11px;" onclick="sellStashItem('${cleanName}', ${sellPrice})">💰 Vendre (${sellPrice} cr)</button>`
                            : (!canQuickEquip ? `<span style="color:#555; font-size:11px;">—</span>` : '')}
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
        <br>
        <button class="btn" onclick="closeModal()">Fermer</button>
    `;

    if (typeof openModal === 'function') openModal("📦 Réserve du Gang (Stash)", html);
}

// Équipe gratuitement un objet du stash sur un combattant, directement depuis la
// vue d'ensemble de la réserve (sans passer par la fiche complète du combattant).
// Couvre armes, armures, équipement et grenades ; les accessoires d'arme
// nécessitent de choisir une arme cible et restent gérés depuis la fiche du
// combattant (bouton "+ Ajouter un accessoire").
function quickEquipStashItem(itemName, fighterId) {
    if (!currentGang || !currentGang.stash) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return showToast("Combattant introuvable.", "error");
    if (isMercOrBeastProfile(m)) return showToast("Ce combattant ne peut pas recevoir de matériel de la réserve.", "error");

    let sIdx = currentGang.stash.findIndex(item => (typeof item === 'string' ? item : item.name) === itemName);
    if (sIdx < 0) return showToast("Cet objet n'est plus disponible dans la réserve.", "error");

    let stItem = currentGang.stash[sIdx];
    let itemType = (typeof stItem === 'object' && stItem.type) ? stItem.type : '';
    let isGrenade = (typeof stItem === 'object' && (stItem.type === 'Grenade' || stItem.counts_as_equip || (stItem.id && ((stItem.id.startsWith('wpn_grenade_') && stItem.id !== 'wpn_grenade_launcher') || stItem.id === 'wpn_charge_demo'))));
    let isWeapon = itemType === 'Arme' && !isGrenade;

    if (isWeapon) {
        let usedSlots = (m.weapons || []).reduce((sum, w) => sum + getWeaponSlotCost(w), 0);
        let slotsNeeded = (itemName && itemName.includes('*')) ? 2 : 1;
        if (usedSlots + slotsNeeded > 3) {
            return showToast(`${m.customName} n'a pas assez d'emplacements d'arme disponibles (${usedSlots}/3 utilisés).`, "error");
        }
        let foundDbW = (typeof db !== 'undefined' && db.weapons) ? db.weapons.find(w => w.name === itemName) : null;
        let mountedRestrictionError = (typeof checkMountedWeaponRestriction === 'function') ? checkMountedWeaponRestriction(m, foundDbW || stItem) : null;
        if (mountedRestrictionError) return showToast(mountedRestrictionError, "error");

        currentGang.stash.splice(sIdx, 1);
        let newWeapon = foundDbW ? JSON.parse(JSON.stringify(foundDbW)) : JSON.parse(JSON.stringify(stItem));
        newWeapon.accessory = null;
        newWeapon.fromStash = true;
        if (!m.weapons) m.weapons = [];
        m.weapons.push(newWeapon);
    } else {
        let foundDbE = (typeof db !== 'undefined' && db.equipment) ? db.equipment.find(e => e.name === itemName) : null;
        if (!foundDbE && typeof db !== 'undefined' && db.weapons) foundDbE = db.weapons.find(w => w.name === itemName);
        let previewE = foundDbE || stItem;
        let armorError = checkArmorSlotLimit(m, previewE);
        if (armorError) return showToast(armorError, "error");

        currentGang.stash.splice(sIdx, 1);
        let newE = foundDbE ? JSON.parse(JSON.stringify(foundDbE)) : JSON.parse(JSON.stringify(stItem));
        if (isGrenade) {
            newE.type = "Grenade";
            newE.counts_as_equip = true;
            if (!newE.profiles && typeof db !== 'undefined' && db.weapons) {
                let wRef = db.weapons.find(w => w.name === itemName || w.id === newE.id);
                if (wRef && wRef.profiles) newE.profiles = wRef.profiles;
            }
        }
        newE.fromStash = true;
        if (!m.equipment) m.equipment = [];
        m.equipment.push(newE);
    }

    saveGangs();
    showToast(`"${itemName}" équipé sur ${m.customName} (gratuit, depuis la réserve).`, "success");
    openStashModal();
}

function sellStashItem(itemName, sellPrice) {
    if (!currentGang || !currentGang.stash) return;

    let idx = currentGang.stash.findIndex(item => (typeof item === 'string' ? item : item.name) === itemName);
    if (idx === -1) return;

    showConfirmModal(
        "Vendre un objet de la réserve",
        `Vendre 1x <strong>"${itemName}"</strong> pour <strong>+${sellPrice} crédits</strong> ?`,
        "Vendre",
        () => {
            let itemIdx = currentGang.stash.findIndex(item => (typeof item === 'string' ? item : item.name) === itemName);
            if (itemIdx === -1) return;

            currentGang.stash.splice(itemIdx, 1);
            currentGang.credits = (currentGang.credits || 0) + sellPrice;

            safeSave();
            openStashModal();
            showToast(`1x ${itemName} vendu pour +${sellPrice} cr !`, "success");

            if (typeof appState !== 'undefined' && appState.view === 'post-cycle') {
                renderPostCycleView(document.getElementById('main-content'));
            }
        }
    );
}

// ==========================================
// GESTION DES TERRITOIRES
// ==========================================
function openTerritoriesModal() {
    if (!currentGang) return;
    if (!currentGang.territories) currentGang.territories = [];

    let dbTerritories = (typeof db !== 'undefined' && db.territories) ? db.territories : [];

    let html = `
        <div style="max-height:60vh; overflow-y:auto;">
            <h4>Territoires Contrôlés (${currentGang.territories.length})</h4>
            <hr style="margin:8px 0; border-color:#333;">
    `;

    if (currentGang.territories.length === 0) {
        html += `<p style="color:#888;">Aucun territoire contrôlé.</p>`;
    } else {
        html += `<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">`;
        currentGang.territories.forEach((tName, idx) => {
            let tData = getTerritoryDef(tName);
            let descText = tData ? tData.desc : 'Revenu : +15 cr';
            html += `
                <div style="background:#111; border:1px solid var(--accent-purple); padding:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:var(--accent-cyan);">${tName}</strong><br>
                        <small style="color:#bbb;">${descText}</small>
                    </div>
                    <button class="btn btn-danger" style="padding:2px 8px; font-size:11px;" onclick="removeGangTerritoryFromModal(${idx})">Perdre</button>
                </div>
            `;
        });
        html += `</div>`;
    }

    html += `
            <h4>Acquérir un nouveau Territoire</h4>
            <hr style="margin:8px 0; border-color:#333;">
            <div style="display:grid; grid-template-columns:1fr; gap:8px; margin-bottom:12px;">
    `;

    dbTerritories.forEach(t => {
        let count = currentGang.territories.filter(x => x === t.name || x === t.id).length;
        let cleanName = escapeForJsStr(t.name);
        html += `
            <div style="border:1px solid #444; padding:8px; border-radius:5px; background:#1a1a1a;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#fff;">${t.name}</strong>
                        ${count > 0 ? `<span style="color:#2ecc71; font-size:11px; margin-left:8px;">(Possédé x${count})</span>` : ''}
                    </div>
                    <button class="btn btn-cyan" style="padding:2px 8px; font-size:11px;" onclick="addTerritoryToGang('${cleanName}')">+ Prendre</button>
                </div>
                <small style="color:#aaa;">${t.desc}</small>
            </div>
        `;
    });

    html += `
            </div>
            <button class="btn" onclick="openAddCustomTerritoryPrompt()">+ Territoire Personnalisé</button>
        </div>
        <br>
        <button class="btn" onclick="closeModal()">Fermer</button>
    `;

    if (typeof openModal === 'function') openModal("🚩 Gestion des Territoires", html);
}

function addTerritoryToGang(name) {
    if (!currentGang) return;
    if (!currentGang.territories) currentGang.territories = [];
    currentGang.territories.push(name);
    safeSave();
    openTerritoriesModal();
}

function removeGangTerritoryFromModal(index) {
    if (!currentGang || !currentGang.territories) return;
    currentGang.territories.splice(index, 1);
    safeSave();
    openTerritoriesModal();
}

function openAddCustomTerritoryPrompt() {
    let name = prompt("Nom du territoire personnalisé :");
    if (name) {
        addTerritoryToGang(name);
    }
}

// Bonus de crédits basé sur la réputation du gang (10x sa valeur effective,
// territoires inclus). Une seule récolte par cycle, comme la collecte des
// territoires : verrouillé tant que le Post-Cycle n'a pas été validé.
function actionReputationBonus() {
    if (!currentGang) return;
    if (postCycleSession.reputationBonusUsed) {
        return showToast("Le bonus de réputation a déjà été récolté ce cycle.", "error");
    }

    let rep = (typeof calculateGangReputation === 'function') ? calculateGangReputation(currentGang) : (currentGang.reputation || 1);
    let bonus = rep * 10;

    currentGang.credits = (currentGang.credits || 0) + bonus;
    postCycleSession.reputationBonusUsed = true;
    safeSave();

    showToast(`Réputation du gang (${rep}) x10 : +${bonus} crédits ajoutés aux caisses du gang !`, "success");
    renderPostCycleView(document.getElementById('main-content'));
}

function collectAllTerritoryIncome() {
    if (!currentGang || !currentGang.territories) return;
    if (!postCycleSession.territoryUsed) postCycleSession.territoryUsed = {};

    let totalIncome = 0;
    let collectedCount = 0;

    currentGang.territories.forEach((terId, idx) => {
        if (postCycleSession.territoryUsed[idx]) return;

        let tDef = getTerritoryDef(terId);
        if (tDef && tDef.income) {
            totalIncome += tDef.income;
            postCycleSession.territoryUsed[idx] = 'credits';
            collectedCount++;
        }
    });

    if (collectedCount > 0) {
        currentGang.credits += totalIncome;
        showToast(`Récolte effectuée (${collectedCount} territoire(s)) : +${totalIncome} crédits ajoutés aux caisses du gang !`, "success");
        safeSave();
        renderPostCycleView(document.getElementById('main-content'));
    } else {
        showToast("Aucun territoire disponible pour la récolte (tous déjà exploités ce cycle).", "error");
    }
}

function addEquipmentToStash(itemName, defaultCost = 15, count = 1) {
    if (!currentGang) return;
    if (!currentGang.stash) currentGang.stash = [];

    let equipDef = (typeof db !== 'undefined' && db.equipment) 
        ? db.equipment.find(e => e.name.toLowerCase().includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(e.name.toLowerCase())) 
        : null;

    let finalName = equipDef ? equipDef.name : itemName;
    let finalCost = equipDef ? (equipDef.cost_credits || equipDef.cost || equipDef.price || defaultCost) : defaultCost;

    for (let i = 0; i < count; i++) {
        currentGang.stash.push({
            name: finalName,
            type: "Équipement",
            cost: finalCost
        });
    }
}

function claimTerritoryOption(terId, idx) {
    if (!currentGang) return;
    if (!postCycleSession.territoryUsed) postCycleSession.territoryUsed = {};

    if (postCycleSession.territoryUsed[idx]) {
        return showToast("Ce territoire a déjà été exploité pendant ce cycle.", "error");
    }

    let tDef = getTerritoryDef(terId);
    let terKey = (tDef ? (tDef.id || tDef.name) : terId).toLowerCase();
    let optType = (tDef && tDef.optionType) ? tDef.optionType.toLowerCase() : '';

    if (optType === 'free_respirator' || optType === 'add_respirator' || terKey.includes('mine') || terKey.includes('respirat')) {
        addEquipmentToStash('Respirateur', 15, 2);
        postCycleSession.territoryUsed[idx] = 'option';
        safeSave();
        showToast("2 Respirateurs ont été ajoutés à la réserve du gang !", "success");
        renderPostCycleView(document.getElementById('main-content'));
        return;
    }

    if (optType === 'free_hazmat' || optType === 'add_hazmat' || optType === 'free_promethium' || terKey.includes('promethium') || terKey.includes('hazmat')) {
        addEquipmentToStash('Hazard suit', 15, 3);
        postCycleSession.territoryUsed[idx] = 'option';
        safeSave();
        showToast("3 Hazard suits ont été ajoutées à la réserve du gang !", "success");
        renderPostCycleView(document.getElementById('main-content'));
        return;
    }

    const mercDiscountMap = {
        'discount_doc': { charId: 'merc_rogue_doc', discount: 30 },
        'discount_ammojack': { charId: 'merc_ammo_jack', discount: 30 },
        'discount_slopper': { charId: 'merc_slopper', discount: 30 },
        'discount_watcher': { charId: 'merc_hive_watcher', discount: 30 },
        'discount_runner': { charId: 'merc_dome_runner', discount: 30 }
    };

    if (optType === 'discount_ganger') {
        let gangGangers = (typeof db !== 'undefined' && db.characters) ? db.characters.filter(c => 
            !c.id.startsWith('merc_') && 
            (c.type || []).some(t => t.toLowerCase() === 'ganger')
        ) : [];

        if (gangGangers.length === 0) {
            return showToast("Aucun profil de Ganger trouvé dans ce gang.", "error");
        }

        if (gangGangers.length === 1) {
            executeDiscountRecruitment(gangGangers[0], 25, idx);
        } else {
            let html = `<h3>Recruter un Ganger (Ristourne Settlement -25c)</h3><br>`;
            gangGangers.forEach(g => {
                let finalCost = Math.max(0, g.cost - 25);
                html += `
                    <div class="fighter-item">
                        <span><strong>${g.name}</strong> — Coût réduit : ${finalCost}c <small style="text-decoration:line-through; color:#888;">(${g.cost}c)</small></span>
                        <button class="btn btn-cyan" onclick="executeDiscountRecruitmentById('${g.id}', 25, ${idx})">Recruter</button>
                    </div>
                `;
            });
            openModal("Choix du Ganger à recruter", html);
        }
    } 
    else if (mercDiscountMap[optType]) {
        let targetInfo = mercDiscountMap[optType];
        let charDef = (typeof db !== 'undefined' && db.characters) ? db.characters.find(c => c.id === targetInfo.charId) : null;
        if (!charDef) return showToast("Profil introuvable.", "error");

        executeDiscountRecruitment(charDef, targetInfo.discount, idx);
    } else {
        showToast("Aucune option particulière configurée pour ce territoire.", "error");
    }
}

function executeDiscountRecruitmentById(charId, discount, territoryIdx) {
    closeModal();
    let charDef = db.characters.find(c => c.id === charId);
    if (charDef) executeDiscountRecruitment(charDef, discount, territoryIdx);
}

function executeDiscountRecruitment(charDef, discount, territoryIdx) {
    let finalCost = Math.max(0, charDef.cost - discount);

    if (currentGang.credits < finalCost) {
        return showToast(`Crédits insuffisants. Requis : ${finalCost}c | Disponible : ${currentGang.credits}c`, "error");
    }

    let defaultWeapons = [];
    if (charDef.default_weapons) {
        charDef.default_weapons.forEach(wId => {
            let wObj = db.weapons.find(w => w.id === wId);
            if (wObj) defaultWeapons.push(JSON.parse(JSON.stringify(wObj)));
        });
    }

    let defaultEquip = [];
    if (charDef.default_equipment) {
        charDef.default_equipment.forEach(eId => {
            let eObj = db.equipment.find(e => e.id === eId);
            if (eObj) defaultEquip.push(JSON.parse(JSON.stringify(eObj)));
        });
    }

    let defaultSkills = [];
    if (charDef.starting_skill && charDef.starting_skill.trim() !== "" && !charDef.starting_skill.includes("choix") && !charDef.starting_skill.includes("selon")) {
        const norm = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        let skillNames = charDef.starting_skill.split(/\s+et\s+|,\s*|\/\s*/i);

        skillNames.forEach(rawName => {
            let cleanRaw = rawName.trim();
            if (!cleanRaw) return;

            let normRaw = norm(cleanRaw);
            let foundSkill = null;

            if (typeof db !== 'undefined' && db.skills) {
                for (let cat in db.skills) {
                    let match = db.skills[cat].find(s => {
                        let normS = norm(s.name);
                        if (normS === normRaw) return true;
                        if (normRaw.startsWith("leash") && normS.startsWith("leash")) return true;
                        return false;
                    });
                    if (match) {
                        foundSkill = JSON.parse(JSON.stringify(match));
                        if (normRaw.startsWith("leash")) {
                            foundSkill.name = cleanRaw.charAt(0).toUpperCase() + cleanRaw.slice(1);
                        }
                        break;
                    }
                }
            }

            if (foundSkill) {
                defaultSkills.push(foundSkill);
            } else {
                defaultSkills.push({
                    id: "sk_start_" + generateId(),
                    name: cleanRaw.charAt(0).toUpperCase() + cleanRaw.slice(1),
                    desc: "Compétence de départ"
                });
            }
        });
    }

    let isBruteChar = (charDef.type && Array.isArray(charDef.type) && charDef.type.some(t => String(t).toLowerCase() === 'brute')) ||
                      (charDef.starting_skill && charDef.starting_skill.toLowerCase().includes("juggernaut"));
    if (isBruteChar) {
        let juggSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_juggernaut' || s.name.toLowerCase() === 'juggernaut')
            : null;
        if (!juggSkill) {
            juggSkill = {
                id: "sk_juggernaut",
                name: "Juggernaut",
                desc: "Si touché au tir, suppressed uniquement si PV perdu ou effet du dé de blessure.",
                specific_to: "brute"
            };
        }
        if (!defaultSkills.some(s => (s.id === 'sk_juggernaut' || ((typeof s === 'object' ? s.name : s) && (typeof s === 'object' ? s.name : s).toLowerCase() === 'juggernaut')))) {
            defaultSkills.push(JSON.parse(JSON.stringify(juggSkill)));
        }
    }

    let isLeaderChar = (charDef.type && Array.isArray(charDef.type) && charDef.type.some(t => String(t).toLowerCase() === 'leader')) ||
                       (charDef.id === "char_reine_de_gang");
    if (isLeaderChar) {
        let inspSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_inspirant' || s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')
            : null;
        let inspirantObj = inspSkill ? JSON.parse(JSON.stringify(inspSkill)) : {
            id: "sk_inspirant",
            name: "Inspirant",
            desc: "Peut faire l'action d'activation de groupe en action gratuite."
        };
        let chefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_chef' || s.name.toLowerCase() === 'chef')
            : null;
        let chefObj = chefSkill ? JSON.parse(JSON.stringify(chefSkill)) : {
            id: "sk_chef",
            name: "Chef",
            desc: "Tous les alliés dans les 12\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
        };
        if (!defaultSkills.some(s => s.id === 'sk_inspirant' || ((typeof s === 'object' ? s.name : s) && (typeof s === 'object' ? s.name : s).toLowerCase() === 'inspirant'))) {
            defaultSkills.push(JSON.parse(JSON.stringify(inspirantObj)));
        }
        if (!defaultSkills.some(s => s.id === 'sk_chef' || ((typeof s === 'object' ? s.name : s) && (typeof s === 'object' ? s.name : s).toLowerCase() === 'chef'))) {
            defaultSkills.push(JSON.parse(JSON.stringify(chefObj)));
        }
    }

    let isChampionChar = (charDef.type && Array.isArray(charDef.type) && charDef.type.some(t => String(t).toLowerCase() === 'champion')) ||
                         (charDef.id === "char_matriarche" || charDef.id === "char_death_maiden");
    if (isChampionChar) {
        let inspSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_inspirant' || s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')
            : null;
        let inspirantObj = inspSkill ? JSON.parse(JSON.stringify(inspSkill)) : {
            id: "sk_inspirant",
            name: "Inspirant",
            desc: "Peut faire l'action d'activation de groupe en action gratuite."
        };
        let sousChefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_sous_chef' || s.name.toLowerCase() === 'sous-chef' || s.name.toLowerCase() === 'sous chef')
            : null;
        let sousChefObj = sousChefSkill ? JSON.parse(JSON.stringify(sousChefSkill)) : {
            id: "sk_sous_chef",
            name: "Sous-chef",
            desc: "Tous les alliés dans les 6\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
        };
        if (!defaultSkills.some(s => s.id === 'sk_inspirant' || ((typeof s === 'object' ? s.name : s) && (typeof s === 'object' ? s.name : s).toLowerCase() === 'inspirant'))) {
            defaultSkills.push(JSON.parse(JSON.stringify(inspirantObj)));
        }
        if (!defaultSkills.some(s => s.id === 'sk_sous_chef' || ((typeof s === 'object' ? s.name : s) && (typeof s === 'object' ? s.name : s).toLowerCase() === 'sous-chef'))) {
            defaultSkills.push(JSON.parse(JSON.stringify(sousChefObj)));
        }
    }

    let newFighter = {
        id: generateId(),
        charId: charDef.id,
        charName: charDef.name,
        customName: charDef.name,
        type: charDef.type,
        stats: JSON.parse(JSON.stringify(charDef.stats)),
        weapons: defaultWeapons,
        equipment: defaultEquip,
        skills: defaultSkills,
        totalCost: charDef.cost
    };

    currentGang.credits -= finalCost;
    currentGang.members.push(newFighter);
    if (typeof ensureInnateFighterSkills === 'function') {
        ensureInnateFighterSkills(currentGang);
    }

    if (!postCycleSession.territoryUsed) postCycleSession.territoryUsed = {};
    if (territoryIdx !== undefined && territoryIdx !== null) {
        postCycleSession.territoryUsed[territoryIdx] = 'option';
    }

    safeSave();
    if (typeof handleRecruitTactics === 'function') {
        handleRecruitTactics(newFighter, true);
    } else {
        showToast(`${charDef.name} a été recruté pour ${finalCost}c (réduction de ${discount}c appliquée) !`, "success");
    }
    renderPostCycleView(document.getElementById('main-content'));
}

function showConditionDetails(condName) {
    let desc = "Description non renseignée.";
    if (typeof db !== 'undefined' && db.conditions) {
        let key = Object.keys(db.conditions).find(k => k.toLowerCase() === condName.toLowerCase() || condName.toLowerCase().startsWith(k.toLowerCase()));
        if (key) desc = db.conditions[key];
    }
    openModal(`Condition : ${condName}`, `<p style="padding:10px; font-size:14px; line-height:1.5;">${desc}</p>`);
}

function openPdfModal(title, url) {
    let pdfUrl = `${url}#navpanes=0&toolbar=0&view=FitH`;
    let html = `
        <div style="height:85vh; width:100%;">
            <iframe src="${pdfUrl}" style="width:100%; height:100%; border:none;"></iframe>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
            <button class="btn btn-cyan" onclick="window.open('${url}', '_blank')">↗️ Ouvrir en grand (Onglet)</button>
            <button class="btn" onclick="closeModal()">Fermer</button>
        </div>
    `;
    openModal(title, html);
}

function saveMatchToHistory() {
    if (!currentGang) return;

    let opponentName = document.getElementById('hist-opponent-name')?.value.trim() || 'Inconnu';
    let opponentGang = document.getElementById('hist-opponent-gang')?.value.trim() || 'Inconnu';
    let result = document.getElementById('hist-result')?.value || 'Égalité';

    let credPrimary = parseInt(document.getElementById('hist-cred-primary')?.value) || 0;
    let credSecondary = parseInt(document.getElementById('hist-cred-secondary')?.value) || 0;
    let totalCredits = credPrimary + credSecondary;

    let repChange = parseInt(document.getElementById('hist-rep')?.value) || 0;

    let gainedTer = document.getElementById('hist-ter-gained')?.value || '';
    let lostTerIdx = document.getElementById('hist-ter-lost')?.value;

    let territorySummary = 'Aucun';
    if (!currentGang.territories) currentGang.territories = [];

    if (gainedTer !== '') {
        currentGang.territories.push(gainedTer);
        territorySummary = `+ ${gainedTer}`;
    } else if (lostTerIdx !== undefined && lostTerIdx !== '') {
        let idx = parseInt(lostTerIdx);
        if (!isNaN(idx) && idx >= 0 && idx < currentGang.territories.length) {
            let removed = currentGang.territories.splice(idx, 1)[0];
            territorySummary = `- ${removed}`;
        }
    }

    currentGang.credits = (currentGang.credits || 0) + totalCredits;
    if (repChange !== 0) {
        currentGang.reputation = Math.max(1, (currentGang.reputation || 1) + repChange);
    }

    if (!currentGang.history) currentGang.history = [];
    currentGang.history.push({
        id: generateId(),
        date: new Date().toLocaleDateString('fr-FR'),
        opponentName: opponentName,
        opponentGang: opponentGang,
        result: result,
        primaryCredits: credPrimary,
        secondaryCredits: credSecondary,
        totalCredits: totalCredits,
        repChange: repChange,
        territory: territorySummary
    });

    safeSave();
    updateGameTopBar();
    renderPostBattleView(document.getElementById('main-content'));
}

function openMatchHistoryModal() {
    if (!currentGang) return;
    let history = currentGang.history || [];

    if (history.length === 0) {
        return openModal("📜 Historique des Parties", "<p style='color:#888;'>Aucune partie enregistrée pour ce gang.</p>");
    }

    let html = `
        <div style="max-height:60vh; overflow-y:auto; padding-right:5px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:12px;">
                <thead>
                    <tr style="border-bottom:2px solid var(--accent-purple, #9b59b6); background:#111;">
                        <th style="padding:6px;">Date</th>
                        <th style="padding:6px;">Adversaire</th>
                        <th style="padding:6px; text-align:center;">Résultat</th>
                        <th style="padding:6px; text-align:center;">Crédits</th>
                        <th style="padding:6px; text-align:center;">Rép.</th>
                        <th style="padding:6px;">Territoire</th>
                    </tr>
                </thead>
                <tbody>
    `;

    history.slice().reverse().forEach(item => {
        let resColor = item.result === 'Victoire' ? '#2ecc71' : (item.result === 'Défaite' ? '#e74c3c' : '#f1c40f');
        let repText = (item.repChange > 0) ? `+${item.repChange}` : `${item.repChange || 0}`;

        html += `
            <tr style="border-bottom:1px solid #222;">
                <td style="padding:6px;">${item.date}</td>
                <td style="padding:6px;"><strong>${item.opponentName || 'Inconnu'}</strong><br><small style="color:#aaa;">${item.opponentGang || '-'}</small></td>
                <td style="padding:6px; text-align:center; color:${resColor}; font-weight:bold;">${item.result || 'Égalité'}</td>
                <td style="padding:6px; text-align:center; color:var(--accent-cyan, #00d2d3);">+${item.totalCredits || 0} cr</td>
                <td style="padding:6px; text-align:center;">${repText}</td>
                <td style="padding:6px;"><small style="color:#ddd;">${item.territory || 'Aucun'}</small></td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <br>
        <button class="btn" onclick="closeModal()">Fermer</button>
    `;

    if (typeof openModal === 'function') openModal("📜 Historique des Parties", html);
}
