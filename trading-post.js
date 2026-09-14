// trading-post.js (3/4 - issu de l'ancien postbattle.js)
// Rôle : le Trading Post du post-cycle (achat d'armes/équipement/grenades hors
// liste de clan). Contient les filtres de recherche par mots-clés/type ajoutés
// sur ces 3 listes, sur le même modèle que weapons-equipment.js.
// Dépendances : postcycle-core.js (tradingPostSession), core-state.js
// (weaponMatchesKeywordList, buildKeywordFilterBarHTML, itemMatchesSearch...).

// ==========================================
// TRADING POST
// ==========================================
let tradingPostSession = {
    selectedFighterIds: [],
    availableTP: 0,
    tpLog: []
};

// État des filtres de recherche du Trading Post (séparé de la fiche de combattant).
let tpWeaponKeywordFilters = [];  // Armes du Marché
let tpWeaponSearchText = '';
let tpGrenadeKeywordFilters = []; // Grenades & Explosifs
let tpGrenadeSearchText = '';
let tpArmorTypeFilters = [];      // Armures
let tpArmorSearchText = '';
let tpPersonalTypeFilters = [];   // Équipement Personnel
let tpPersonalSearchText = '';
let tpAccessoryTypeFilters = [];  // Accessoires d'Arme
let tpAccessorySearchText = '';

function toggleTpWeaponKeywordFilter(id) {
    let idx = tpWeaponKeywordFilters.indexOf(id);
    if (idx >= 0) tpWeaponKeywordFilters.splice(idx, 1); else tpWeaponKeywordFilters.push(id);
    renderTradingPostView();
}
function setTpWeaponSearchText(value) {
    tpWeaponSearchText = value;
    renderTradingPostView();
    refocusSearchInput('tpWeapon');
}
function resetTpWeaponKeywordFilters() {
    tpWeaponKeywordFilters = [];
    tpWeaponSearchText = '';
    renderTradingPostView();
}

function toggleTpGrenadeKeywordFilter(id) {
    let idx = tpGrenadeKeywordFilters.indexOf(id);
    if (idx >= 0) tpGrenadeKeywordFilters.splice(idx, 1); else tpGrenadeKeywordFilters.push(id);
    renderTradingPostView();
}
function setTpGrenadeSearchText(value) {
    tpGrenadeSearchText = value;
    renderTradingPostView();
    refocusSearchInput('tpGrenade');
}
function resetTpGrenadeKeywordFilters() {
    tpGrenadeKeywordFilters = [];
    tpGrenadeSearchText = '';
    renderTradingPostView();
}

function toggleTpArmorTypeFilter(t) {
    let idx = tpArmorTypeFilters.indexOf(t);
    if (idx >= 0) tpArmorTypeFilters.splice(idx, 1); else tpArmorTypeFilters.push(t);
    renderTradingPostView();
}
function setTpArmorSearchText(value) {
    tpArmorSearchText = value;
    renderTradingPostView();
    refocusSearchInput('tpArmor');
}
function resetTpArmorTypeFilters() {
    tpArmorTypeFilters = [];
    tpArmorSearchText = '';
    renderTradingPostView();
}

function toggleTpPersonalTypeFilter(t) {
    let idx = tpPersonalTypeFilters.indexOf(t);
    if (idx >= 0) tpPersonalTypeFilters.splice(idx, 1); else tpPersonalTypeFilters.push(t);
    renderTradingPostView();
}
function setTpPersonalSearchText(value) {
    tpPersonalSearchText = value;
    renderTradingPostView();
    refocusSearchInput('tpPersonal');
}
function resetTpPersonalTypeFilters() {
    tpPersonalTypeFilters = [];
    tpPersonalSearchText = '';
    renderTradingPostView();
}

function toggleTpAccessoryTypeFilter(t) {
    let idx = tpAccessoryTypeFilters.indexOf(t);
    if (idx >= 0) tpAccessoryTypeFilters.splice(idx, 1); else tpAccessoryTypeFilters.push(t);
    renderTradingPostView();
}
function setTpAccessorySearchText(value) {
    tpAccessorySearchText = value;
    renderTradingPostView();
    refocusSearchInput('tpAccessory');
}
function resetTpAccessoryTypeFilters() {
    tpAccessoryTypeFilters = [];
    tpAccessorySearchText = '';
    renderTradingPostView();
}

function openTradingPostSetupModal() {
    if (!currentGang) return;
    tradingPostSession.selectedFighterIds = [];
    tradingPostSession.availableTP = 0;
    tradingPostSession.tpLog = [];

    let eligibleFighters = (currentGang.members || []).filter(m => {
        let types = (m.type || []).map(t => t.toLowerCase());
        let isLeaderOrChamp = types.includes("leader") || types.includes("champion");
        let hasConnected = (m.skills || []).some(s => (typeof s === 'string' ? s : s.name).toLowerCase() === "connected");
        return isLeaderOrChamp || hasConnected;
    });

    let html = `
        <div style="max-height:60vh; overflow-y:auto;">
            <p><small>Sélectionnez les combattants qui se rendent au Trading Post :</small></p>
            <p><small style="color:#e74c3c;">⚠️ Règle : 1 seule action post-cycle par guerrier.</small></p>
            <hr style="margin:10px 0; border-color:#333;">
    `;

    if (eligibleFighters.length === 0) {
        html += `<p style="color:#888;">Aucun Leader, Champion ou membre avec la compétence "Connected" disponible.</p>`;
    } else {
        eligibleFighters.forEach(m => {
            let types = (m.type || []).map(t => t.toLowerCase());
            let isLeader = types.includes("leader");
            let isChampion = types.includes("champion");
            let hasConnected = (m.skills || []).some(s => (typeof s === 'string' ? s : s.name).toLowerCase() === "connected");

            let busyReason = isFighterBusy(m.id);
            let isBusyOther = busyReason && busyReason !== 'Trading Post';
            let isSelected = busyReason === 'Trading Post';

            let infoParts = [];
            if (isLeader) infoParts.push("Leader: 2 TP");
            else if (isChampion) infoParts.push("Champion: 1 TP");
            if (hasConnected) infoParts.push("Connected: +1 TP");

            html += `
                <div style="background:#111; border:1px solid #333; padding:8px; border-radius:5px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; ${isBusyOther ? 'opacity:0.4;' : ''}">
                    <div>
                        <strong style="color:var(--accent-cyan);">${m.customName || m.charName}</strong> 
                        <small style="color:#aaa;">(${infoParts.join(' | ')})</small>
                        ${isBusyOther ? `<br><small style="color:#e74c3c;">Occupé : ${busyReason}</small>` : ''}
                    </div>
                    <input type="checkbox" id="tp-fighter-${m.id}" ${isSelected ? 'checked' : ''} ${isBusyOther ? 'disabled' : ''} onchange="toggleTradingPostFighter('${m.id}')" style="transform:scale(1.2); cursor:pointer;">
                </div>
            `;
        });
    }

    let techBazaarCount = (currentGang.territories || []).filter(t => t.toLowerCase() === "tech bazaar" || t.toLowerCase() === "ter_tech_bazaar").length;
    if (techBazaarCount > 0) {
        html += `<p style="color:var(--accent-purple); font-size:12px; margin-top:10px;">🚩 Territoires Tech Bazaar (${techBazaarCount}) : +${techBazaarCount} TP automatique(s).</p>`;
    }

    html += `
        </div><br>
        <button class="btn btn-cyan" onclick="confirmTradingPostFixedTP()">Calculer les TP et ouvrir le marché</button>
        <button class="btn" onclick="closeModal()">Annuler</button>
    `;

    if (typeof openModal === 'function') openModal("🏬 Visite au Trading Post", html);
}

function toggleTradingPostFighter(fId) {
    let idx = tradingPostSession.selectedFighterIds.indexOf(fId);
    if (idx >= 0) {
        tradingPostSession.selectedFighterIds.splice(idx, 1);
    } else {
        tradingPostSession.selectedFighterIds.push(fId);
    }
}

function confirmTradingPostFixedTP() {
    let totalTP = 0;
    let log = [];

    Object.keys(postCycleSession.assignments).forEach(fId => {
        if (postCycleSession.assignments[fId] === 'Trading Post') {
            delete postCycleSession.assignments[fId];
        }
    });

    tradingPostSession.selectedFighterIds.forEach(fId => {
        let m = currentGang.members.find(x => x.id === fId);
        if (!m) return;

        postCycleSession.assignments[m.id] = 'Trading Post';

        let types = (m.type || []).map(t => t.toLowerCase());
        let isLeader = types.includes("leader");
        let isChampion = types.includes("champion");
        let hasConnected = (m.skills || []).some(s => (typeof s === 'string' ? s : s.name).toLowerCase() === "connected");

        let fighterTP = 0;
        let details = [];

        if (isLeader) { fighterTP += 2; details.push("+2 TP Leader"); }
        else if (isChampion) { fighterTP += 1; details.push("+1 TP Champion"); }
        if (hasConnected) { fighterTP += 1; details.push("+1 TP Connected"); }

        totalTP += fighterTP;
        log.push(`${m.customName || m.charName} : ${fighterTP} TP (${details.join(', ')})`);
    });

    let techBazaarCount = (currentGang.territories || []).filter(t => t.toLowerCase() === "tech bazaar" || t.toLowerCase() === "ter_tech_bazaar").length;
    if (techBazaarCount > 0) {
        totalTP += techBazaarCount;
        log.push(`Territoire(s) Tech Bazaar : +${techBazaarCount} TP`);
    }

    tradingPostSession.availableTP = totalTP;
    tradingPostSession.tpLog = log;

    closeModal();
    renderTradingPostView();
}

// Génère le HTML d'une catégorie d'équipement du Trading Post (Armures,
// Équipement Personnel, Accessoires...) : barre de filtre/recherche + cartes
// d'achat. Factorisé pour éviter de tripler cette carte pour chaque catégorie.
function renderTpEquipCategoryHTML(items, typeFilters, searchText, toggleFnName, resetFnName, searchFnName, panelKey) {
    if (items.length === 0) {
        return `<p style="color:#888; font-size:12px;">Aucun objet disponible dans cette catégorie.</p>`;
    }

    let types = [...new Set(items.map(e => e.type || 'Équipement'))];
    let filtered = items.filter(e =>
        itemMatchesSearch(e, searchText) && (typeFilters.length === 0 || typeFilters.includes(e.type || 'Équipement'))
    );

    let html = buildTypeFilterBarHTML(types, typeFilters, toggleFnName, resetFnName, searchText, searchFnName, filtered.length, items.length, panelKey);

    if (filtered.length === 0) {
        html += `<p style="color:#888; font-size:12px;">Aucun objet ne correspond aux filtres sélectionnés.</p>`;
    } else {
        filtered.forEach(e => {
            let tpCost = e.cost_tp !== undefined ? e.cost_tp : (e.rarity || 0);
            let credCost = e.cost_credits || e.cost || e.price || 0;
            let canAfford = (currentGang.credits || 0) >= credCost && tradingPostSession.availableTP >= tpCost;
            let cleanName = escapeForJsStr(e.name);
            let rawType = e.type || 'Équipement';
            let cleanType = escapeForJsStr(rawType);

            html += `
                <div style="background:#1a1a1a; border:1px solid #333; padding:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center; ${!canAfford ? 'opacity:0.5;' : ''}">
                    <div>
                        <strong style="color:#fff;">${e.name}</strong> <small style="color:#888;">(${rawType})</small><br>
                        <small style="color:#aaa;">Coût : ${credCost} cr | Rareté : <span style="color:var(--accent-cyan); font-weight:bold;">${tpCost} TP</span></small>
                        ${e.effect ? `<br><small style="color:#888; font-size:11px;">${e.effect}</small>` : ''}
                    </div>
                    <button class="${canAfford ? 'btn btn-cyan' : 'btn'}" ${!canAfford ? 'disabled' : ''} style="padding:4px 10px; font-size:12px;" onclick="buyTradingPostItem('${cleanType}', '${cleanName}', ${credCost}, ${tpCost})">Acheter</button>
                </div>
            `;
        });
    }
    return html;
}

function renderTradingPostView() {
    let dbWeapons = (typeof db !== 'undefined' && db.weapons) ? db.weapons.filter(w => 
        !w.is_merc_weapon && !w.default_for && !w.specific_to && !w.requires_equip && !w.counts_as_equip && w.type !== "Grenade" && !w.is_gang_weapon && !w.is_gang
    ) : [];

    let dbGrenades = (typeof db !== 'undefined' && db.weapons) ? db.weapons.filter(w => 
        (w.counts_as_equip || w.type === "Grenade") && !w.specific_to && !w.requires_equip && !w.is_gang_weapon && !w.is_gang
    ) : [];
    
    let dbEquip = (typeof db !== 'undefined' && db.equipment) ? db.equipment.filter(e => 
        !e.specific_to && !e.is_gang && !e.is_gang_weapon
    ) : [];

    let html = `
        <div style="background:#111; padding:10px; border-radius:5px; border:1px solid var(--accent-purple); margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>Crédits :</strong> <span style="color:#2ecc71; font-size:16px;">${currentGang.credits || 0} cr</span> | 
                <strong>TP disponibles :</strong> <span style="color:var(--accent-cyan); font-size:16px;">${tradingPostSession.availableTP} TP</span>
            </div>
            <button class="btn btn-cyan" onclick="openTradingPostSetupModal()">🔄 Modifier les envoyés</button>
        </div>
    `;

    if (tradingPostSession.tpLog.length > 0) {
        html += `
            <details style="margin-bottom:15px; background:#181818; padding:8px; border-radius:4px; font-size:12px;">
                <summary style="cursor:pointer; color:#aaa;">Détails des TP générés</summary>
                <ul style="margin-top:5px; padding-left:15px; color:#bbb;">
                    ${tradingPostSession.tpLog.map(l => `<li>${l}</li>`).join('')}
                </ul>
            </details>
        `;
    }

    html += `
        <div style="max-height:50vh; overflow-y:auto; padding-right:5px;">
            <h4>Armes du Marché</h4>
            <div style="display:grid; grid-template-columns:1fr; gap:8px; margin-bottom:20px;">
    `;

    if (dbWeapons.length === 0) {
        html += `<p style="color:#888; font-size:12px;">Aucune arme disponible au marché.</p>`;
    } else {
        let filteredDbWeapons = dbWeapons.filter(w =>
            itemMatchesSearch(w, tpWeaponSearchText) && weaponMatchesKeywordList(w, tpWeaponKeywordFilters)
        );

        html += buildKeywordFilterBarHTML(
            tpWeaponKeywordFilters, 'toggleTpWeaponKeywordFilter', 'resetTpWeaponKeywordFilters',
            tpWeaponSearchText, 'setTpWeaponSearchText', filteredDbWeapons.length, dbWeapons.length, 'tpWeapon'
        );

        if (filteredDbWeapons.length === 0) {
            html += `<p style="color:#888; font-size:12px;">Aucune arme ne correspond aux filtres sélectionnés.</p>`;
        } else {
            filteredDbWeapons.forEach(w => {
                let tpCost = w.cost_tp !== undefined ? w.cost_tp : (w.rarity || 0);
                let credCost = w.cost_credits || w.cost || w.price || 0;
                let canAfford = (currentGang.credits || 0) >= credCost && tradingPostSession.availableTP >= tpCost;
                let cleanName = escapeForJsStr(w.name);

                let statsText = weaponAllProfilesText(w);

                html += `
                    <div style="background:#1a1a1a; border:1px solid #333; padding:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center; ${!canAfford ? 'opacity:0.5;' : ''}">
                        <div>
                            <strong style="color:#fff;">${w.name}</strong><br>
                            <small style="color:#aaa;">Coût : ${credCost} cr | Rareté : <span style="color:var(--accent-cyan); font-weight:bold;">${tpCost} TP</span></small>
                            ${statsText ? `<br><small style="color:#888; font-size:11px;">${statsText}</small>` : ''}
                        </div>
                        <button class="${canAfford ? 'btn btn-cyan' : 'btn'}" ${!canAfford ? 'disabled' : ''} style="padding:4px 10px; font-size:12px;" onclick="buyTradingPostItem('Arme', '${cleanName}', ${credCost}, ${tpCost})">Acheter</button>
                    </div>
                `;
            });
        }
    }

    html += `
            </div>
            <h4>Armures</h4>
            <div style="display:grid; grid-template-columns:1fr; gap:8px; margin-bottom:20px;">
                ${renderTpEquipCategoryHTML(
                    dbEquip.filter(e => e.type === 'Armure'),
                    tpArmorTypeFilters, tpArmorSearchText,
                    'toggleTpArmorTypeFilter', 'resetTpArmorTypeFilters', 'setTpArmorSearchText', 'tpArmor'
                )}
            </div>
            <h4>Équipement Personnel</h4>
            <div style="display:grid; grid-template-columns:1fr; gap:8px; margin-bottom:20px;">
                ${renderTpEquipCategoryHTML(
                    dbEquip.filter(e => e.type !== 'Armure' && e.type !== 'Accessoire'),
                    tpPersonalTypeFilters, tpPersonalSearchText,
                    'toggleTpPersonalTypeFilter', 'resetTpPersonalTypeFilters', 'setTpPersonalSearchText', 'tpPersonal'
                )}
            </div>
            <h4>Accessoires d'Arme</h4>
            <p style="font-size:11px; color:#aaa; margin-top:-4px;"><em>Un accessoire acheté ici rejoint la réserve du gang ; il s'équipe ensuite sur une arme précise depuis la fiche du combattant.</em></p>
            <div style="display:grid; grid-template-columns:1fr; gap:8px; margin-bottom:15px;">
                ${renderTpEquipCategoryHTML(
                    dbEquip.filter(e => e.type === 'Accessoire'),
                    tpAccessoryTypeFilters, tpAccessorySearchText,
                    'toggleTpAccessoryTypeFilter', 'resetTpAccessoryTypeFilters', 'setTpAccessorySearchText', 'tpAccessory'
                )}
            </div>`;

    html += `
            </div>
            <h4>Grenades & Explosifs (Équipement)</h4>
            <div style="display:grid; grid-template-columns:1fr; gap:8px; margin-bottom:15px;">
    `;

    if (dbGrenades.length === 0) {
        html += `<p style="color:#888; font-size:12px;">Aucune grenade disponible au marché.</p>`;
    } else {
        let filteredDbGrenades = dbGrenades.filter(g =>
            itemMatchesSearch(g, tpGrenadeSearchText) && weaponMatchesKeywordList(g, tpGrenadeKeywordFilters)
        );

        html += buildKeywordFilterBarHTML(
            tpGrenadeKeywordFilters, 'toggleTpGrenadeKeywordFilter', 'resetTpGrenadeKeywordFilters',
            tpGrenadeSearchText, 'setTpGrenadeSearchText', filteredDbGrenades.length, dbGrenades.length, 'tpGrenade'
        );

        if (filteredDbGrenades.length === 0) {
            html += `<p style="color:#888; font-size:12px;">Aucune grenade ne correspond aux filtres sélectionnés.</p>`;
        } else {
            filteredDbGrenades.forEach(g => {
                let tpCost = g.cost_tp !== undefined ? g.cost_tp : (g.rarity || 0);
                let credCost = g.cost_credits || g.cost || g.price || 0;
                let canAfford = (currentGang.credits || 0) >= credCost && tradingPostSession.availableTP >= tpCost;
                let cleanName = escapeForJsStr(g.name);
                let statsText = weaponAllProfilesText(g);

                html += `
                    <div style="background:#1a1a1a; border:1px solid #333; padding:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center; ${!canAfford ? 'opacity:0.5;' : ''}">
                        <div>
                            <strong style="color:#fff;">${g.name}</strong> <small style="color:var(--accent-purple);">(Grenade - Équipement)</small><br>
                            <small style="color:#aaa;">Coût : ${credCost} cr | Rareté : <span style="color:var(--accent-cyan); font-weight:bold;">${tpCost} TP</span></small>
                            ${statsText ? `<br><small style="color:#888; font-size:11px;">${statsText}</small>` : ''}
                        </div>
                        <button class="${canAfford ? 'btn btn-cyan' : 'btn'}" ${!canAfford ? 'disabled' : ''} style="padding:4px 10px; font-size:12px;" onclick="buyTradingPostItem('Grenade', '${cleanName}', ${credCost}, ${tpCost})">Acheter</button>
                    </div>
                `;
            });
        }
    }

    html += `
            </div>
        </div>
        <br>
        <button class="btn" onclick="closeModal()">Fermer le Trading Post</button>
    `;

    if (typeof openModal === 'function') openModal("🏬 Trading Post du Sous-Monde", html);
}

function buyTradingPostItem(category, itemName, credCost, tpCost) {
    if (!currentGang) return;
    if (!currentGang.stash) currentGang.stash = [];

    if ((currentGang.credits || 0) < credCost) return showToast("Crédits insuffisants !", "error");
    if (tradingPostSession.availableTP < tpCost) return showToast("Points de TP insuffisants !", "error");

    currentGang.credits -= credCost;
    tradingPostSession.availableTP -= tpCost;

    let itemDef = null;
    if (typeof db !== 'undefined') {
        if ((category === 'Arme' || category === 'Grenade') && db.weapons) {
            itemDef = db.weapons.find(w => w.name === itemName);
        } else if (db.equipment) {
            itemDef = db.equipment.find(e => e.name === itemName);
            if (!itemDef && db.weapons) {
                itemDef = db.weapons.find(w => w.name === itemName);
            }
        }
    }

    let stashItem = itemDef ? JSON.parse(JSON.stringify(itemDef)) : { name: itemName, cost: credCost };
    stashItem.cost = credCost;

    let lowerCat = (category || '').toLowerCase();
    let lowerName = (itemName || '').toLowerCase();

    if (category === 'Grenade' || stashItem.counts_as_equip || (stashItem.id && ((stashItem.id.startsWith('wpn_grenade_') && stashItem.id !== 'wpn_grenade_launcher') || stashItem.id === 'wpn_charge_demo'))) {
        stashItem.type = "Grenade";
        stashItem.counts_as_equip = true;
    } else if (lowerCat.includes('accessoire') || lowerName.includes('lunette') || lowerName.includes('viseur') || lowerName.includes('silencieux')) {
        stashItem.type = "Accessoire d'arme";
    } else if (lowerCat.includes('armure')) {
        stashItem.type = "Armure";
    } else if (category === 'Arme') {
        stashItem.type = "Arme";
    } else {
        stashItem.type = stashItem.type || category || "Équipement";
    }

    currentGang.stash.push(stashItem);

    safeSave();
    renderTradingPostView();
}

