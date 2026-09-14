// weapons-equipment.js (4/5 - issu de l'ancien app.js)
// Rôle : sélection/achat d'armes, accessoires d'armes, armures et équipement
// (dont les grenades) pour la fiche de combattant en cours d'édition. Contient
// les filtres de recherche par mots-clés/type ajoutés sur ces listes d'achat.
// Dépendances : core-state.js (weaponMatchesKeywordList, buildKeywordFilterBarHTML,
// itemMatchesSearch...), fighter-recruit.js (tempFighter, renderFighterEdit).

// ==========================================
// SELECTION ET GESTION DES ARMES
// ==========================================
function openWeaponSelectModal() {
    let usedSlots = tempFighter.weapons.reduce((sum, w) => sum + getWeaponSlotCost(w), 0);
    let maxWeaponSlots = (typeof getMaxWeaponSlots === 'function') ? getMaxWeaponSlots(tempFighter) : 3;
    let html = `<p>Emplacements utilisés : ${usedSlots} / ${maxWeaponSlots}</p><br>`;

    const isCampaign = currentGang && currentGang.isEstablished;
    let isMercOrBeast = isMercOrBeastProfile(tempFighter);
    let isHiveScum = tempFighter.charId === "merc_hive_scum";
    const charDef = db.characters.find(c => c.id === tempFighter.charId);

    if (isCampaign && !isHiveScum && !isMercOrBeast) {
        html += `<h4 style="color:var(--accent-cyan);">1. Réserve du Gang (Stash) :</h4>`;
        if (!currentGang.stash) currentGang.stash = [];

        let availableWeapons = currentGang.stash.filter(item => {
            let itemType = (typeof item === 'object' && item.type) ? item.type : 'Arme';
            let isGrenade = (typeof item === 'object' && (item.counts_as_equip || item.type === 'Grenade' || (item.id && ((item.id.startsWith('wpn_grenade_') && item.id !== 'wpn_grenade_launcher') || item.id === 'wpn_charge_demo'))));
            return itemType === 'Arme' && !isGrenade;
        });

        if (availableWeapons.length === 0) {
            html += `<p style="color:#888; font-size:12px;">Aucune arme ou amélioration disponible pour ce combattant.</p>`;
        } else {
            availableWeapons.forEach(w => {
                let slotsNeeded = (w.name && w.name.includes('*')) ? 2 : 1;
                let isAvailable = (usedSlots + slotsNeeded <= maxWeaponSlots);
                
                let statsText = weaponAllProfilesText(w);
                let cleanName = escapeForJsStr(w.name || '');

                html += `
                    <div class="fighter-item ${!isAvailable ? 'disabled' : ''}">
                        <div>
                            <strong>${w.name}</strong> (${w.cost_credits||0}c) ${slotsNeeded === 2 ? '<em>(2 emplacements)</em>' : ''}
                            ${statsText ? `<br><small style="color:#aaa; font-size:11px;">${statsText}</small>` : ''}
                        </div>
                        ${isAvailable ? `<button class="btn-cyan" onclick="addWeaponFromStash('${cleanName}')">Équiper (Gratuit)</button>` : '<small>Emplacements insuffisants</small>'}
                    </div>
                `;
            });
        }
        html += `<hr style="margin:15px 0; border-color:#333;"><h4 style="color:var(--accent-purple);">2. Acheter sur la Liste de Clan :</h4>`;
    }

    if (charDef && charDef.allowed_merc_weapons) {
        html += `<h4 style="color:var(--accent-purple);">Options Mercenaire / Échanges d'armes :</h4>`;
        let count = 0;
        charDef.allowed_merc_weapons.forEach(opt => {
            let wObj = db.weapons.find(w => w.id === opt.id || w.name === opt.id);
            if (!wObj) return;

            let cost = opt.cost_credits !== undefined ? opt.cost_credits : (wObj.cost_credits || 0);

            if (opt.replaces) {
                let replaceWpn = db.weapons.find(w => w.id === opt.replaces || w.name === opt.replaces);
                let replaceName = replaceWpn ? replaceWpn.name : opt.replaces;
                let hasWeaponToReplace = tempFighter.weapons.some(w => w.id === opt.replaces || w.name === replaceName);

                if (hasWeaponToReplace) {
                    count++;
                    html += `
                        <div class="fighter-item">
                            <span>Échanger <strong>${replaceName}</strong> ➔ <strong>${wObj.name}</strong> (${cost}c)</span>
                            <button onclick="swapMercWeapon('${opt.id}', '${opt.replaces}', ${cost})">Échanger</button>
                        </div>
                    `;
                }
            } else {
                let slotsNeeded = wObj.name.includes('*') ? 2 : 1;
                let isAvailable = (usedSlots + slotsNeeded <= maxWeaponSlots);
                count++;
                html += `
                    <div class="fighter-item ${!isAvailable ? 'disabled' : ''}">
                        <span>Ajouter <strong>${wObj.name}</strong> (${cost}c) ${slotsNeeded === 2 ? '<em>(2 emplacements)</em>' : ''}</span>
                        ${isAvailable ? `<button onclick="addMercWeapon('${opt.id}', ${cost})">${isCampaign ? 'Acheter' : 'Ajouter'}</button>` : '<small>Emplacements insuffisants</small>'}
                    </div>
                `;
            }
        });

        if (count === 0) {
            html += `<p style="color:#888; font-size:12px;">Toutes les options disponibles pour ce mercenaire ont déjà été appliquées ou ne sont plus disponibles.</p>`;
        }
    } else {
        const availableWeapons = db.weapons.filter(w => {
            if (w.counts_as_equip || w.type === "Grenade" || (w.id && ((w.id.startsWith('wpn_grenade_') && w.id !== 'wpn_grenade_launcher') || w.id === 'wpn_charge_demo'))) return false;
            if (w.requires_equip) {
                let hasReq = tempFighter.equipment.some(e => e.id === w.requires_equip || e.name === w.requires_equip);
                if (!hasReq) return false;
            }

            if (isMercOrBeast) return w.specific_to === tempFighter.charId;
            if (isHiveScum) return w.is_hive_scum === true;
            if (w.is_merc_weapon) return false;
            if (w.default_for) return false;
            if (w.specific_to && w.specific_to !== tempFighter.charId) return false;

            if (appState.returnTo === 'post-cycle' && appState.editTarget !== null) {
                return w.is_gang_weapon === true || w.is_gang === true;
            }

            let isAllowedExclusive = charDef && charDef.allowed_weapons_exclusive && charDef.allowed_weapons_exclusive.includes(w.id);
            return w.is_gang_weapon === true || w.specific_to === tempFighter.charId || isAllowedExclusive;
        });

        if (availableWeapons.length === 0) {
            html += `<p style="color:#888; font-size:12px;">Aucune arme ou amélioration disponible pour ce combattant.</p>`;
        } else {
            const filteredWeapons = availableWeapons.filter(w =>
                itemMatchesSearch(w, weaponSearchText) && weaponMatchesKeywordList(w, weaponKeywordFilters)
            );

            html += buildKeywordFilterBarHTML(
                weaponKeywordFilters, 'toggleWeaponKeywordFilter', 'resetWeaponKeywordFilters',
                weaponSearchText, 'setWeaponSearchText', filteredWeapons.length, availableWeapons.length, 'weapon'
            );

            if (filteredWeapons.length === 0) {
                html += `<p style="color:#888; font-size:12px;">Aucune arme ne correspond aux filtres sélectionnés.</p>`;
            } else {
                filteredWeapons.forEach(w => {
                    let slotsNeeded = w.name.includes('*') ? 2 : 1;
                    let isAvailable = (usedSlots + slotsNeeded <= maxWeaponSlots);

                    let statsText = weaponAllProfilesText(w);

                    html += `
                        <div class="fighter-item ${!isAvailable ? 'disabled' : ''}">
                            <div>
                                <strong>${w.name}</strong> (${w.cost_credits||0}c) ${slotsNeeded === 2 ? '<em>(2 emplacements)</em>' : ''}
                                ${statsText ? `<br><small style="color:#aaa; font-size:11px;">${statsText}</small>` : ''}
                            </div>
                            ${isAvailable ? `<button onclick="addWeapon('${w.id}')">${isCampaign ? 'Acheter' : 'Ajouter'}</button>` : '<small>Emplacements insuffisants</small>'}
                        </div>
                    `;
                });
            }
        }
    }

    openModal("Sélection d'Arme / Option", html);
}

function swapMercWeapon(newWpnId, replaceWpnId, cost) {
    let repIdx = tempFighter.weapons.findIndex(w => w.id === replaceWpnId || w.name === replaceWpnId);
    if (repIdx >= 0) {
        let oldWpn = tempFighter.weapons[repIdx];
        if (currentGang && currentGang.isEstablished && oldWpn && oldWpn.accessory) {
            if (!currentGang.stash) currentGang.stash = [];
            currentGang.stash.push({ name: oldWpn.accessory.name, type: "Accessoire", cost: oldWpn.accessory.cost_credits || oldWpn.accessory.cost || 0 });
            showToast(`Accessoire "${oldWpn.accessory.name}" envoyé dans la réserve.`);
        }
        tempFighter.weapons.splice(repIdx, 1);
    }

    let wObj = db.weapons.find(w => w.id === newWpnId || w.name === newWpnId);
    if (wObj) {
        let item = JSON.parse(JSON.stringify(wObj));
        item.cost_credits = cost;
        item.isDefault = false;
        item.replaces = replaceWpnId;
        tempFighter.weapons.push(item);
    }

    closeModal();
    renderFighterEdit(document.getElementById('main-content'));
}

function addMercWeapon(wId, cost) {
    let wObj = db.weapons.find(w => w.id === wId || w.name === wId);
    if (wObj) {
        let item = JSON.parse(JSON.stringify(wObj));
        item.cost_credits = cost;
        item.isDefault = false;
        tempFighter.weapons.push(item);
    }
    closeModal();
    renderFighterEdit(document.getElementById('main-content'));
}

function addWeapon(wId) {
    const w = db.weapons.find(item => item.id === wId);
    let mountedRestrictionError = checkMountedWeaponRestriction(tempFighter, w);
    if (mountedRestrictionError) return showToast(mountedRestrictionError, "error");

    let newWeapon = JSON.parse(JSON.stringify(w));
    newWeapon.accessory = null;

    if (w.requires_equip === "eq_escher_cutter") {
        tempFighter.weapons = tempFighter.weapons.filter(existing => {
            if (existing.requires_equip === "eq_escher_cutter") {
                if (currentGang && currentGang.isEstablished && existing.accessory) {
                    if (!currentGang.stash) currentGang.stash = [];
                    currentGang.stash.push({ name: existing.accessory.name, type: "Accessoire", cost: existing.accessory.cost_credits || existing.accessory.cost || 0 });
                }
                return false;
            }
            return true;
        });
    }

    if (w.upgrades_from) {
        tempFighter.weapons = tempFighter.weapons.filter(existing => {
            let dbWeapon = db.weapons.find(dw => dw.name === existing.name || dw.id === existing.id);
            let isMatch = (dbWeapon && (dbWeapon.id === w.upgrades_from || dbWeapon.name === w.upgrades_from));
            if (isMatch) {
                if (currentGang && currentGang.isEstablished) {
                    if (!currentGang.stash) currentGang.stash = [];
                    if (existing.accessory) {
                        currentGang.stash.push({ name: existing.accessory.name, type: "Accessoire", cost: existing.accessory.cost_credits || existing.accessory.cost || 0 });
                    }
                    currentGang.stash.push({ name: existing.name, type: "Arme", cost: existing.cost_credits || 0 });
                }
                return false;
            }
            return true;
        });
    }

    tempFighter.weapons.push(newWeapon);
    closeModal();
    renderFighterEdit(document.getElementById('main-content'));
}

function addWeaponFromStash(itemName) {
    if (!currentGang || !currentGang.stash) return;

    let sIdx = currentGang.stash.findIndex(item => (typeof item === 'string' ? item : item.name) === itemName);
    if (sIdx >= 0) {
        let stItem = currentGang.stash[sIdx];
        let foundDbW = db.weapons.find(w => w.name === itemName);
        let previewW = foundDbW || (typeof stItem === 'object' ? stItem : { name: itemName });
        let mountedRestrictionError = checkMountedWeaponRestriction(tempFighter, previewW);
        if (mountedRestrictionError) {
            showToast(mountedRestrictionError, "error");
            renderFighterEdit(document.getElementById('main-content'));
            return;
        }

        currentGang.stash.splice(sIdx, 1);
        let newWeapon = foundDbW ? JSON.parse(JSON.stringify(foundDbW)) : { name: itemName, cost_credits: 0 };
        newWeapon.accessory = null;
        newWeapon.fromStash = true;
        tempFighter.weapons.push(newWeapon);
        saveGangs();
    }
    closeModal();
    renderFighterEdit(document.getElementById('main-content'));
}

// Débloque une option payante sur une arme précise (ex: Photon flash ou
// Fumigène sur un Grenade launcher). Ne touche pas directement aux crédits du
// gang : comme pour l'achat normal d'une arme, le coût est ajouté à la valeur
// du combattant (calculateFighterCost) et réellement déduit à la validation de
// la fiche (saveFighter), pour rester cohérent avec le reste du système d'achat
// différé — et pour que "Annuler" n'ait rien à rembourser.
function buyWeaponOption(weaponIndex, optionName) {
    let w = tempFighter.weapons[weaponIndex];
    if (!w || !w.optional_profiles) return;
    let opt = w.optional_profiles.find(op => op.name === optionName);
    if (!opt) return;

    if (!w.unlockedOptions) w.unlockedOptions = [];
    if (w.unlockedOptions.includes(optionName)) return;

    w.unlockedOptions.push(optionName);
    showToast(`Option "${optionName}" ajoutée sur ${w.name} (+${opt.extra_cost || 0} cr à payer à la validation).`, "success");
    renderFighterEdit(document.getElementById('main-content'));
}

function removeWeapon(idx) {
    let w = tempFighter.weapons[idx];
    const isMercOrBeast = isMercOrBeastProfile(tempFighter);
    const isCutterWpn = w.requires_equip === "eq_escher_cutter";

    if (currentGang && currentGang.isEstablished && !isMercOrBeast && !isCutterWpn) {
        if (!currentGang.stash) currentGang.stash = [];
        let accInfo = '';
        if (w.accessory) {
            currentGang.stash.push({ name: w.accessory.name, type: "Accessoire", cost: w.accessory.cost_credits || w.accessory.cost || 0 });
            accInfo = ` et son accessoire (${w.accessory.name})`;
        }
        currentGang.stash.push({ name: w.name, type: "Arme", cost: w.cost_credits || 0 });
        saveGangs();
        showToast(`Arme "${w.name}"${accInfo} envoyée(s) dans la réserve (stash).`);
    }

    if (w.replaces) {
        let repWpn = db.weapons.find(dw => dw.id === w.replaces || dw.name === w.replaces);
        if (repWpn) {
            let restored = JSON.parse(JSON.stringify(repWpn));
            restored.isDefault = true;
            tempFighter.weapons.splice(idx, 1, restored);
        } else {
            tempFighter.weapons.splice(idx, 1);
        }
    } else if (isCutterWpn && w.id !== "wpn_cutter_grenade_launcher" && tempFighter.equipment.some(e => e.id === "eq_escher_cutter" || e.name === "Escher cutter")) {
        let gl = db.weapons.find(dw => dw.id === "wpn_cutter_grenade_launcher");
        if (gl) {
            let restored = JSON.parse(JSON.stringify(gl));
            restored.isDefault = true;
            tempFighter.weapons.splice(idx, 1, restored);
        } else {
            tempFighter.weapons.splice(idx, 1);
        }
    } else {
        tempFighter.weapons.splice(idx, 1);
    }

    renderFighterEdit(document.getElementById('main-content'));
}

function cancelFighterEdit() {
    if (tempFighter && currentGang) {
        let origFighter = (appState.editTarget !== null && currentGang.members[appState.editTarget]) ? currentGang.members[appState.editTarget] : null;
        if (!currentGang.stash) currentGang.stash = [];

        (tempFighter.weapons || []).forEach(w => {
            let wasOnOrig = origFighter && (origFighter.weapons || []).some(ow => ow.name === w.name);
            if (w.fromStash && !wasOnOrig) {
                currentGang.stash.push({ name: w.name, type: "Arme", cost: w.cost_credits || w.cost || 0 });
            }
            if (w.accessory) {
                let wasAccOnOrig = origFighter && (origFighter.weapons || []).some(ow => ow.accessory && ow.accessory.name === w.accessory.name);
                if (w.accessory.fromStash && !wasAccOnOrig) {
                    currentGang.stash.push({ name: w.accessory.name, type: "Accessoire", cost: w.accessory.cost_credits || w.accessory.cost || 0 });
                }
            }
        });

        (tempFighter.equipment || []).forEach(e => {
            let wasOnOrig = origFighter && (origFighter.equipment || []).some(oe => oe.name === e.name);
            if (e.fromStash && !wasOnOrig && !e.familiarMemberId) {
                currentGang.stash.push({ name: e.name, type: e.type || "Équipement", cost: e.cost_credits || e.cost || 0 });
            }
        });

        // Les familiers achetés/adoptés PENDANT cette session d'édition doivent
        // être défaits si on annule : l'achat était immédiat (voir
        // buyFamiliarForFighter), donc rien de tout ça n'a été validé.
        (tempFighter._newFamiliarIds || []).forEach(famId => {
            let refItem = (tempFighter.equipment || []).find(e => e.familiarMemberId === famId);
            currentGang.members = currentGang.members.filter(fm => fm.id !== famId);
            if (refItem) {
                if (refItem.fromStash) {
                    // Adoption depuis la réserve annulée : le familier y retourne.
                    currentGang.stash.push({ name: refItem.name, type: 'Familier', cost: refItem.cost_credits || 0, familiarCharId: refItem.familiarCharId });
                } else if (refItem.costPrepaid) {
                    // Achat annulé : les crédits déjà déduits sont remboursés.
                    currentGang.credits = (currentGang.credits || 0) + (refItem.cost_credits || 0);
                }
            }
        });

        saveGangs();
    }
    if (appState.returnTo === 'post-cycle') {
        appState.returnTo = null;
        if (typeof renderPostCycleView === 'function') {
            renderPostCycleView(document.getElementById('main-content'));
        } else {
            navigate('gang-manage');
        }
    } else {
        navigate('gang-manage');
    }
}

// ==========================================
// GESTION DES ACCESSOIRES D'ARMES
// ==========================================
function openWeaponAccessoryModal(weaponIdx) {
    const weapon = tempFighter.weapons[weaponIdx];
    if (!weapon) return;

    let html = `
        <p>Arme concernée : <strong>${weapon.name}</strong></p>
        <p style="font-size:12px; color:#aaa; margin-top:2px; margin-bottom:12px;"><em>Règle : Chaque arme ne peut recevoir qu'un seul accessoire. Si une arme est déséquipée et envoyée dans le stash, son accessoire aussi.</em></p>
    `;

    if (weapon.accessory) {
        html += `
            <div style="background:#221818; border:1px solid #c0392b; border-radius:4px; padding:12px; margin-bottom:15px;">
                <p style="color:#e74c3c; font-weight:bold; margin-bottom:6px;">⚠️ Cette arme possède déjà un accessoire équipé :</p>
                <p style="margin-left:10px;">• <strong>${weapon.accessory.name}</strong> ${weapon.accessory.effect ? `— <small style="color:#aaa;">${weapon.accessory.effect}</small>` : ''}</p>
                <p style="font-size:12px; color:#ccc; margin-top:8px;">Chaque arme ne peut recevoir qu'un seul accessoire (si l'arme est envoyée dans le stash, son accessoire y est également envoyé). Vous devez d'abord retirer l'accessoire existant pour pouvoir en choisir un autre.</p>
                <button class="btn-danger" style="margin-top:10px; padding:5px 12px;" onclick="removeWeaponAccessory(${weaponIdx}); openWeaponAccessoryModal(${weaponIdx});">Retirer l'accessoire actuel</button>
            </div>
        `;
        openModal(`Accessoire pour ${weapon.name}`, html);
        return;
    }

    const isCampaign = currentGang && currentGang.isEstablished;
    let isMercOrBeast = isMercOrBeastProfile(tempFighter);
    let isHiveScum = tempFighter.charId === "merc_hive_scum";

    if (!currentGang.stash) currentGang.stash = [];

    let stashAccessories = currentGang.stash.filter(item => {
        let itemName = typeof item === 'string' ? item : item.name;
        let itemType = (typeof item === 'object' && item.type) ? item.type : '';
        let lowerType = itemType.toLowerCase();
        let foundDb = db.equipment.find(e => e.name === itemName);
        let isAccessoryType = lowerType.includes('accessoire') || (foundDb && foundDb.type && foundDb.type.toLowerCase().includes('accessoire'));
        if (!isAccessoryType) return false;
        let accId = (typeof item === 'object' && item.id) ? item.id : (foundDb ? foundDb.id : null);
        return isAccessoryCompatibleWithWeapon(accId, weapon);
    });

    if (stashAccessories.length > 0 || isCampaign) {
        html += `<h4 style="color:var(--accent-cyan);">1. Réserve du Gang (Stash / Trading Post) :</h4>`;
        if (stashAccessories.length === 0) {
            html += `<p style="color:#888; font-size:12px; margin-bottom:10px;">Aucun accessoire disponible dans la réserve.</p>`;
        } else {
            stashAccessories.forEach(stItem => {
                let itemName = typeof stItem === 'string' ? stItem : stItem.name;
                let cleanName = escapeForJsStr(itemName);
                html += `
                    <div class="fighter-item">
                        <span><strong>${itemName}</strong> <small style="color:#2ecc71;">(Réserve - 0 cr)</small></span>
                        <button class="btn-cyan" onclick="addWeaponAccessoryFromStash(${weaponIdx}, '${cleanName}')">Équiper (Gratuit)</button>
                    </div>
                `;
            });
        }
        html += `<hr style="margin:15px 0; border-color:#333;"><h4 style="color:var(--accent-purple);">2. Acheter sur la Liste de Clan :</h4>`;
    }

    let availableAccessories = db.equipment.filter(e => {
        let eType = (e.type || '').toLowerCase();
        if (!eType.includes('accessoire')) return false;
        if (!isAccessoryCompatibleWithWeapon(e.id, weapon)) return false;
        if (isMercOrBeast) return e.specific_to === tempFighter.charId;
        if (isHiveScum) return e.is_hive_scum === true;
        if (e.specific_to && e.specific_to !== tempFighter.charId) return false;
        return e.is_gang === true;
    });

    if (availableAccessories.length === 0) {
        html += `<p style="color:#888; font-size:12px;">Aucun accessoire de base disponible sur la liste de ce gang.</p>`;
    } else {
        availableAccessories.forEach(acc => {
            let cost = acc.cost_credits || 0;
            let canAfford = !isCampaign || ((currentGang.credits || 0) >= cost);
            html += `
                <div class="fighter-item ${!canAfford ? 'disabled' : ''}">
                    <span><strong>${acc.name}</strong> (${cost}c) - <small style="color:#aaa;">${acc.effect || ''}</small></span>
                    ${canAfford ? 
                        `<button onclick="addWeaponAccessory(${weaponIdx}, '${acc.id}')">${isCampaign ? `Acheter (${cost}c)` : 'Équiper'}</button>` : 
                        `<small style="color:#e74c3c;">Crédits insuffisants</small>`
                    }
                </div>
            `;
        });
    }

    openModal(`Accessoire pour ${weapon.name}`, html);
}

function addWeaponAccessory(weaponIdx, accId) {
    if (!tempFighter || !tempFighter.weapons || !tempFighter.weapons[weaponIdx]) return;
    if (tempFighter.weapons[weaponIdx].accessory) {
        showToast("Chaque arme ne peut recevoir qu'un seul accessoire. Veuillez retirer l'accessoire actuel avant d'en équiper un nouveau.", "error");
        return;
    }

    const acc = db.equipment.find(e => e.id === accId || e.name === accId);
    if (!acc) return;

    let newAcc = JSON.parse(JSON.stringify(acc));
    newAcc.fromStash = false;
    tempFighter.weapons[weaponIdx].accessory = newAcc;
    closeModal();
    renderFighterEdit(document.getElementById('main-content'));
}

function addWeaponAccessoryFromStash(weaponIdx, itemName) {
    if (!currentGang || !currentGang.stash || !tempFighter || !tempFighter.weapons || !tempFighter.weapons[weaponIdx]) return;
    if (tempFighter.weapons[weaponIdx].accessory) {
        showToast("Chaque arme ne peut recevoir qu'un seul accessoire. Veuillez retirer l'accessoire actuel avant d'en équiper un nouveau.", "error");
        return;
    }

    let sIdx = currentGang.stash.findIndex(item => (typeof item === 'string' ? item : item.name) === itemName);
    if (sIdx >= 0) {
        currentGang.stash.splice(sIdx, 1);
        let foundAcc = db.equipment.find(e => e.name === itemName);
        let newAcc = foundAcc ? JSON.parse(JSON.stringify(foundAcc)) : { name: itemName, cost_credits: 0, type: "Accessoire" };
        newAcc.fromStash = true;
        tempFighter.weapons[weaponIdx].accessory = newAcc;
        saveGangs();
    }
    closeModal();
    renderFighterEdit(document.getElementById('main-content'));
}

function removeWeaponAccessory(weaponIdx) {
    let weapon = tempFighter.weapons[weaponIdx];
    if (!weapon || !weapon.accessory) return;

    let acc = weapon.accessory;
    let origFighter = (appState.editTarget !== null && currentGang.members[appState.editTarget]) ? currentGang.members[appState.editTarget] : null;
    let wasOnOrig = origFighter && (origFighter.weapons || []).some(ow => ow.accessory && ow.accessory.name === acc.name);

    if (acc.fromStash || (currentGang && currentGang.isEstablished && wasOnOrig && !acc.isDefault)) {
        if (!currentGang.stash) currentGang.stash = [];
        currentGang.stash.push({ name: acc.name, type: "Accessoire", cost: acc.cost_credits || acc.cost || 0 });
        saveGangs();
    }

    weapon.accessory = null;
    renderFighterEdit(document.getElementById('main-content'));
}

// ==========================================
// SELECTION ET GESTION DES ARMURES & EQUIPEMENTS
// ==========================================
// Génère le HTML d'une catégorie d'équipement achetable (Armures, Équipement
// Personnel...) sur la fiche du combattant : barre de filtre/recherche + cartes
// d'achat. Factorisé pour éviter de dupliquer cette carte par catégorie.
function renderEquipCategoryCardsHTML(items, typeFilters, searchText, toggleFnName, resetFnName, searchFnName, panelKey, isCampaignFlag) {
    if (items.length === 0) return '';

    let types = [...new Set(items.map(e => e.type))];
    let filtered = items.filter(e =>
        itemMatchesSearch(e, searchText) && (typeFilters.length === 0 || typeFilters.includes(e.type))
    );

    let html = buildTypeFilterBarHTML(types, typeFilters, toggleFnName, resetFnName, searchText, searchFnName, filtered.length, items.length, panelKey);

    if (filtered.length === 0) {
        html += `<p style="color:#888; font-size:12px;">Aucun équipement ne correspond aux filtres sélectionnés.</p>`;
    } else {
        filtered.forEach(e => {
            html += `
                <div class="fighter-item">
                    <div>
                        <strong>${e.name}</strong> (${e.cost_credits||0}c) - <small style="color:var(--accent-purple);">${e.type}</small>
                        ${e.effect ? `<br><small style="color:#aaa; font-size:11px;">${e.effect}</small>` : ''}
                    </div>
                    <button onclick="addEquipment('${e.id}')">${isCampaignFlag ? 'Acheter' : 'Équiper'}</button>
                </div>
            `;
        });
    }
    return html;
}

function openEquipSelectModal() {
    const isCampaign = currentGang && currentGang.isEstablished;
    let isMercOrBeast = isMercOrBeastProfile(tempFighter);
    let isHiveScum = tempFighter.charId === "merc_hive_scum";
    let html = ``;

    if (isCampaign && !isHiveScum && !isMercOrBeast) {
        html += `<h4 style="color:var(--accent-cyan);">1. Réserve du Gang (Stash) :</h4>`;
        if (!currentGang.stash) currentGang.stash = [];
        let availableEquip = currentGang.stash.filter(item => {
            let itemType = (typeof item === 'object' && item.type) ? item.type : '';
            return itemType === 'Armure' || itemType === 'Équipement' || itemType === 'Personnel' || itemType === 'Grenade' || itemType === 'Familier' || (typeof item === 'object' && item.counts_as_equip);
        });

        if (availableEquip.length === 0) {
            html += `<p style="color:#888; font-size:12px; margin-bottom:10px;">Aucun équipement disponible dans la réserve.</p>`;
        } else {
            availableEquip.forEach(stItem => {
                let itemName = typeof stItem === 'string' ? stItem : stItem.name;
                let isFamiliarItem = (typeof stItem === 'object' && stItem.type === 'Familier');
                let isGrenade = !isFamiliarItem && (typeof stItem === 'object' && (stItem.type === 'Grenade' || stItem.counts_as_equip || (stItem.id && ((stItem.id.startsWith('wpn_grenade_') && stItem.id !== 'wpn_grenade_launcher') || stItem.id === 'wpn_charge_demo'))));
                let itemType = isFamiliarItem ? 'Familier' : (isGrenade ? 'Grenade' : ((typeof stItem === 'object' && stItem.type) ? stItem.type : 'Matériel'));

                let profSource = (typeof stItem === 'object') ? stItem : null;
                if ((!profSource || !profSource.profiles || profSource.profiles.length === 0) && isGrenade && typeof db !== 'undefined' && db.weapons) {
                    let fW = db.weapons.find(w => w.name === itemName || w.id === stItem.id);
                    if (fW && fW.profiles) profSource = fW;
                }
                let statsText = isFamiliarItem ? '' : weaponAllProfilesText(profSource);

                html += `
                    <div class="fighter-item">
                        <div>
                            <strong>${itemName}</strong> <small style="color:${isFamiliarItem ? 'var(--accent-purple)' : (isGrenade ? 'var(--accent-purple)' : '#aaa')};">(${itemType})</small> <small style="color:#2ecc71;">(Réserve - 0 cr)</small>
                            ${statsText ? `<br><small style="color:#aaa; font-size:11px;">${statsText}</small>` : ''}
                        </div>
                        ${isFamiliarItem
                            ? `<button class="btn-cyan" onclick="adoptFamiliarFromStash('${escapeForJsStr(itemName)}', '${stItem.familiarCharId}')">Reprendre (Stash)</button>`
                            : `<button class="btn-cyan" onclick="addEquipmentFromStash('${itemName}')">Équiper (Stash)</button>`}
                    </div>
                `;
            });
        }
        html += `<hr style="margin:15px 0; border-color:#333;"><h4 style="color:var(--accent-purple);">2. Acheter sur la Liste :</h4>`;
    }

    let generalEquipments = db.equipment.filter(e => {
        if (e.type === "Accessoire") return false;
        if (isMercOrBeast) return e.specific_to === tempFighter.charId;
        if (isHiveScum) return e.is_hive_scum === true;
        if (e.specific_to && e.specific_to !== tempFighter.charId) return false;
        return e.is_gang === true;
    });
    let armorEquipments = generalEquipments.filter(e => e.type === "Armure");
    let personalEquipments = generalEquipments.filter(e => e.type !== "Armure");

    // Familiers non-mercenaires : achetables comme équipement, uniquement s'ils
    // ont le tag is_gang (générique et automatique, valable pour tout clan).
    // Les mercs/bêtes/hive scum n'en achètent pas pour un autre familier.
    let availableFamiliars = (!isMercOrBeast && !isHiveScum && typeof db !== 'undefined' && db.characters)
        ? db.characters.filter(c => typeof isNonMercFamiliarCharDef === 'function' && isNonMercFamiliarCharDef(c) && c.is_gang === true)
        : [];

    let availableGrenades = (typeof db !== 'undefined' && db.weapons) ? db.weapons.filter(w => {
        if (!w.counts_as_equip && w.type !== "Grenade") return false;
        if (isMercOrBeast) return false;
        if (isHiveScum) return w.is_hive_scum === true;
        return w.is_gang === true || w.is_gang_weapon === true;
    }) : [];

    if (generalEquipments.length === 0 && availableGrenades.length === 0 && availableFamiliars.length === 0) {
        html += `<p style="color:#888; font-size:12px;">Aucun équipement disponible pour ce combattant.</p>`;
    } else {
        if (armorEquipments.length > 0) {
            html += `<h5 style="color:var(--accent-purple); margin:10px 0 6px 0; font-size:13px; text-transform:uppercase;">🛡️ Armures :</h5>`;
            html += renderEquipCategoryCardsHTML(
                armorEquipments, equipArmorTypeFilters, equipArmorSearchText,
                'toggleEquipArmorTypeFilter', 'resetEquipArmorTypeFilters', 'setEquipArmorSearchText', 'equipArmor', isCampaign
            );
        }

        if (personalEquipments.length > 0) {
            html += `<h5 style="color:var(--accent-purple); margin:16px 0 6px 0; font-size:13px; text-transform:uppercase;">🎒 Équipement Personnel :</h5>`;
            html += renderEquipCategoryCardsHTML(
                personalEquipments, equipPersonalTypeFilters, equipPersonalSearchText,
                'toggleEquipTypeFilter', 'resetEquipTypeFilters', 'setEquipTypeSearchText', 'equipPersonal', isCampaign
            );
        }

        if (availableFamiliars.length > 0) {
            html += `<h5 style="color:var(--accent-purple); margin:16px 0 6px 0; font-size:13px; text-transform:uppercase;">🐾 Familiers :</h5>`;
            availableFamiliars.forEach(fc => {
                html += `
                    <div class="fighter-item">
                        <div>
                            <strong>${fc.name}</strong> (${fc.cost}c) - <small style="color:var(--accent-purple);">Familier</small>
                        </div>
                        <button onclick="buyFamiliarForFighter('${fc.id}')">${isCampaign ? 'Acheter' : 'Équiper'}</button>
                    </div>
                `;
            });
        }

        if (availableGrenades.length > 0) {
            html += `<h5 style="color:var(--accent-purple); margin:16px 0 6px 0; font-size:13px; text-transform:uppercase;">💣 Grenades & Explosifs (Équipement) :</h5>`;

            let filteredGrenades = availableGrenades.filter(g =>
                itemMatchesSearch(g, equipGrenadeSearchText) && weaponMatchesKeywordList(g, equipGrenadeKeywordFilters)
            );

            html += buildKeywordFilterBarHTML(
                equipGrenadeKeywordFilters, 'toggleEquipGrenadeKeywordFilter', 'resetEquipGrenadeKeywordFilters',
                equipGrenadeSearchText, 'setEquipGrenadeSearchText', filteredGrenades.length, availableGrenades.length, 'equipGrenade'
            );

            if (filteredGrenades.length === 0) {
                html += `<p style="color:#888; font-size:12px;">Aucune grenade ne correspond aux filtres sélectionnés.</p>`;
            } else {
                filteredGrenades.forEach(g => {
                    let statsText = weaponAllProfilesText(g);
                    html += `
                        <div class="fighter-item">
                            <div>
                                <strong>${g.name}</strong> (${g.cost_credits||0}c) - <small style="color:var(--accent-purple);">Grenade</small>
                                ${statsText ? `<br><small style="color:#aaa; font-size:11px;">${statsText}</small>` : ''}
                            </div>
                            <button onclick="addEquipment('${g.id}')">${isCampaign ? 'Acheter' : 'Équiper'}</button>
                        </div>
                    `;
                });
            }
        }
    }

    openModal("Sélection Armure / Équipement", html);
}

// Construit la fiche complète d'un nouveau familier (mêmes règles que le
// recrutement normal, via buildInitialFighterState) et l'attache au
// combattant en cours d'édition (tempFighter) comme propriétaire. Le familier
// devient un membre du gang à part entière (roster, carte en partie...), mais
// sa valeur est comptée comme équipement chez son propriétaire plutôt que
// séparément (totalCost: 0), pour ne pas la compter deux fois.
function createFamiliarMemberObject(charDef, ownerId) {
    let { initSkills, initWeapons, initEquip } = buildInitialFighterState(charDef);
    return {
        id: generateId(),
        charId: charDef.id,
        charName: charDef.name,
        customName: charDef.name,
        type: charDef.type,
        stats: JSON.parse(JSON.stringify(charDef.stats)),
        weapons: initWeapons,
        equipment: initEquip,
        skills: initSkills,
        totalCost: 0,
        xp: charDef.starting_xp || 0,
        isFamiliar: true,
        ownerId: ownerId
    };
}

// Achat d'un familier depuis la catégorie "Familiers" de la fiche du
// combattant. Action immédiate (pas différée comme le reste de l'achat
// d'équipement) : le familier doit exister tout de suite en tant que membre
// du gang pour apparaître dans le résumé et avoir sa propre carte en partie.
// Les crédits dépensés ici ne seront donc PAS redemandés à la validation de
// la fiche (voir le flag costPrepaid, exclu du recalcul dans saveFighter()).
function buyFamiliarForFighter(charId) {
    if (!currentGang) return;
    const charDef = db.characters.find(c => c.id === charId);
    if (!charDef) return;

    const cost = charDef.cost || 0;
    if ((currentGang.credits || 0) < cost) {
        return showToast(`Crédits insuffisants pour ce familier (${cost} cr requis).`, "error");
    }

    currentGang.credits -= cost;

    let familiarMember = createFamiliarMemberObject(charDef, tempFighter.id);
    currentGang.members.push(familiarMember);

    if (!tempFighter._newFamiliarIds) tempFighter._newFamiliarIds = [];
    tempFighter._newFamiliarIds.push(familiarMember.id);

    if (!tempFighter.equipment) tempFighter.equipment = [];
    tempFighter.equipment.push({
        id: 'famref_' + familiarMember.id,
        name: charDef.name,
        type: 'Familier',
        cost_credits: cost,
        familiarMemberId: familiarMember.id,
        familiarCharId: charDef.id,
        costPrepaid: true
    });

    saveGangs();
    showToast(`${charDef.name} rejoint le gang, rattaché à ${tempFighter.customName || tempFighter.charName} (-${cost} cr) !`, "success");
    renderFighterEdit(document.getElementById('main-content'));
}

// Reprise d'un familier disponible dans la réserve (son précédent propriétaire
// a quitté le gang) : gratuit, comme n'importe quel autre objet du stash.
function adoptFamiliarFromStash(itemName, familiarCharId) {
    if (!currentGang || !currentGang.stash) return;
    const charDef = db.characters.find(c => c.id === familiarCharId);
    if (!charDef) return;

    let sIdx = currentGang.stash.findIndex(item => (typeof item === 'string' ? item : item.name) === itemName && (typeof item === 'object' ? item.familiarCharId === familiarCharId : true));
    if (sIdx < 0) return;
    currentGang.stash.splice(sIdx, 1);

    let familiarMember = createFamiliarMemberObject(charDef, tempFighter.id);
    currentGang.members.push(familiarMember);

    if (!tempFighter._newFamiliarIds) tempFighter._newFamiliarIds = [];
    tempFighter._newFamiliarIds.push(familiarMember.id);

    if (!tempFighter.equipment) tempFighter.equipment = [];
    tempFighter.equipment.push({
        id: 'famref_' + familiarMember.id,
        name: charDef.name,
        type: 'Familier',
        cost_credits: charDef.cost || 0,
        familiarMemberId: familiarMember.id,
        familiarCharId: charDef.id,
        costPrepaid: true,
        fromStash: true
    });

    saveGangs();
    showToast(`${charDef.name} (repris de la réserve) est rattaché à ${tempFighter.customName || tempFighter.charName} !`, "success");
    renderFighterEdit(document.getElementById('main-content'));
}

function addEquipment(eId) {
    let e = db.equipment.find(item => item.id === eId);
    if (!e && db.weapons) {
        e = db.weapons.find(item => item.id === eId);
    }
    if (!e) return;

    let armorError = checkArmorSlotLimit(tempFighter, e);
    if (armorError) return showToast(armorError, "error");

    let newE = JSON.parse(JSON.stringify(e));
    if (newE.counts_as_equip || newE.type === 'Grenade' || (newE.id && ((newE.id.startsWith('wpn_grenade_') && newE.id !== 'wpn_grenade_launcher') || newE.id === 'wpn_charge_demo'))) {
        newE.type = "Grenade";
        newE.counts_as_equip = true;
    }
    tempFighter.equipment.push(newE);

    if (e.id === "eq_escher_cutter") {
        let gl = db.weapons.find(w => w.id === "wpn_cutter_grenade_launcher");
        if (gl && !tempFighter.weapons.some(w => w.requires_equip === "eq_escher_cutter")) {
            let glItem = JSON.parse(JSON.stringify(gl));
            glItem.isDefault = true;
            tempFighter.weapons.push(glItem);
        }
    }

    closeModal();
    renderFighterEdit(document.getElementById('main-content'));
}

function addEquipmentFromStash(itemName) {
    if (!currentGang || !currentGang.stash) return;

    let sIdx = currentGang.stash.findIndex(item => (typeof item === 'string' ? item : item.name) === itemName);
    if (sIdx >= 0) {
        let stItem = currentGang.stash[sIdx];
        let foundDbE = db.equipment.find(e => e.name === itemName);
        if (!foundDbE && db.weapons) {
            foundDbE = db.weapons.find(w => w.name === itemName);
        }
        let previewE = foundDbE || (typeof stItem === 'object' ? stItem : { name: itemName, type: 'Équipement' });
        let armorError = checkArmorSlotLimit(tempFighter, previewE);
        if (armorError) {
            showToast(armorError, "error");
            renderFighterEdit(document.getElementById('main-content'));
            return;
        }

        currentGang.stash.splice(sIdx, 1);
        let newE = foundDbE ? JSON.parse(JSON.stringify(foundDbE)) : (typeof stItem === 'object' ? JSON.parse(JSON.stringify(stItem)) : { name: itemName, cost_credits: 0 });
        if (newE.counts_as_equip || newE.type === 'Grenade' || (newE.id && ((newE.id.startsWith('wpn_grenade_') && newE.id !== 'wpn_grenade_launcher') || newE.id === 'wpn_charge_demo')) || (typeof stItem === 'object' && stItem.type === 'Grenade')) {
            newE.type = "Grenade";
            newE.counts_as_equip = true;
            if (!newE.profiles && typeof db !== 'undefined' && db.weapons) {
                let wRef = db.weapons.find(w => w.name === itemName || w.id === newE.id);
                if (wRef && wRef.profiles) newE.profiles = wRef.profiles;
            }
        }
        newE.fromStash = true;
        tempFighter.equipment.push(newE);

        if (newE.id === "eq_escher_cutter" || newE.name === "Escher cutter") {
            let gl = db.weapons.find(w => w.id === "wpn_cutter_grenade_launcher");
            if (gl && !tempFighter.weapons.some(w => w.requires_equip === "eq_escher_cutter")) {
                let glItem = JSON.parse(JSON.stringify(gl));
                glItem.isDefault = true;
                tempFighter.weapons.push(glItem);
            }
        }

        saveGangs();
    }
    closeModal();
    renderFighterEdit(document.getElementById('main-content'));
}

function removeEquipment(idx) {
    let eq = tempFighter.equipment[idx];
    const isMercOrBeast = isMercOrBeastProfile(tempFighter);

    if (currentGang && currentGang.isEstablished && !isMercOrBeast) {
        if (!currentGang.stash) currentGang.stash = [];
        let stashItem = JSON.parse(JSON.stringify(eq));
        stashItem.cost = eq.cost_credits || eq.cost || 0;
        stashItem.type = eq.type || (eq.counts_as_equip ? "Grenade" : "Équipement");
        currentGang.stash.push(stashItem);
        saveGangs();
        showToast(`"${eq.name}" envoyé(e) dans la réserve (stash).`);
    }

    // Un familier déséquipé n'a plus de propriétaire : sa fiche de combattant
    // (roster, carte en partie) est retirée. S'il a rejoint la réserve
    // ci-dessus, n'importe quel autre guerrier pourra le reprendre depuis la
    // même catégorie d'équipement "Familiers" (une fiche neuve sera recréée).
    if (eq.familiarMemberId && currentGang) {
        currentGang.members = currentGang.members.filter(fm => fm.id !== eq.familiarMemberId);
        if (tempFighter._newFamiliarIds) {
            tempFighter._newFamiliarIds = tempFighter._newFamiliarIds.filter(id => id !== eq.familiarMemberId);
        }
    }

    if (eq.id === "eq_escher_cutter" || eq.name === "Escher cutter") {
        tempFighter.weapons = tempFighter.weapons.filter(w => w.requires_equip !== "eq_escher_cutter");
    }

    tempFighter.equipment.splice(idx, 1);
    renderFighterEdit(document.getElementById('main-content'));
}

