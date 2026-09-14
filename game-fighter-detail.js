// game-fighter-detail.js (3/3 - issu de l'ancien game.js)
// Rôle : fiche détaillée plein écran/paysage d'un combattant pendant la partie
// (compétences, armes, traits, conditions).
// Dépendances : game-state-scenarios.js, game-roster-view.js.

// ==========================================
// FICHE DÉTAILLÉE DU COMBATTANT (MODALE PLEIN ÉCRAN / PAYSAGE)
// ==========================================
function openFighterDetailModal(idx) {
    const m = currentGameRoster[idx];
    if (!m) return;

    // 1. COMPÉTENCES AVEC LEURS DESCRIPTIONS
    let skillsDetailsHTML = '';
    if (m.skills && m.skills.length > 0) {
        skillsDetailsHTML = m.skills.map(s => {
            let name = typeof s === 'string' ? s : (s.name || s);
            let desc = (typeof s === 'object' && s.desc) ? s.desc : '';
            if (!desc && typeof db !== 'undefined' && db.skills) {
                for (let cat in db.skills) {
                    let match = db.skills[cat].find(sk => sk.name.toLowerCase() === name.toLowerCase() || sk.id === (s.id || ''));
                    if (match) { desc = match.desc; break; }
                }
            }
            if (!desc) desc = 'Pas de description répertoriée.';
            return `<div class="description-block"><strong>${name} :</strong> ${desc}</div>`;
        }).join('');
    } else {
        skillsDetailsHTML = '<p style="font-size:12px; color:#777; font-style:italic;">Aucune compétence pour ce guerrier.</p>';
    }

    // 2. ARMES, GRENADES ET LEURS TRAITS ASSOCIÉS AVEC LEURS DESCRIPTIONS
    let combatItems = [];
    (m.weapons || []).forEach((w, wIdx) => {
        combatItems.push({
            item: w,
            isGrenade: false,
            listType: 'weapons',
            itemIndex: wIdx
        });
    });
    (m.equipment || []).forEach((e, eIdx) => {
        let isGrenade = e.counts_as_equip || e.type === 'Grenade' || (e.id && ((e.id.startsWith('wpn_grenade_') && e.id !== 'wpn_grenade_launcher') || e.id === 'wpn_charge_demo')) || (e.profiles && e.profiles.length > 0);
        if (isGrenade) {
            let itemCopy = JSON.parse(JSON.stringify(e));
            if (!itemCopy.profiles && typeof db !== 'undefined' && db.weapons) {
                let foundW = db.weapons.find(w => w.id === e.id || w.name === e.name);
                if (foundW && foundW.profiles) itemCopy.profiles = foundW.profiles;
            }
            combatItems.push({
                item: itemCopy,
                isGrenade: true,
                listType: 'equipment',
                itemIndex: eIdx
            });
        }
    });

    let traitDescriptionsHTML = '';
    let processedTraits = new Set();
    
    if (combatItems.length > 0) {
        combatItems.forEach(({ item: w }) => {
            if (w.accessory && w.accessory.effect) {
                traitDescriptionsHTML += `<div class="description-block trait-block"><strong>Accessoire — ${w.accessory.name} (${w.name}) :</strong> ${w.accessory.effect}</div>`;
            }
            
            // Toutes les armes à profils multiples (fusil à pompe, lance-grenades...)
            // peuvent avoir des traits différents par profil (ex: Knockback
            // seulement sur le profil "Concentré") : il faut les collecter tous,
            // pas juste ceux du premier profil, pour que la règle soit expliquée.
            let allProfiles = (w.profiles || []).concat(w.optional_profiles || []);
            allProfiles.forEach(p => {
                if (!p || !p.traits) return;
                let traitsList = p.traits.split(',');

                traitsList.forEach(t => {
                    let rawTrait = t.trim();
                    if (!rawTrait) return;

                    let baseKey = rawTrait.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();

                    if (!processedTraits.has(baseKey)) {
                        processedTraits.add(baseKey);

                        let foundTrait = null;
                        if (typeof db !== 'undefined' && db.weapon_traits) {
                            foundTrait = db.weapon_traits.find(dt =>
                                dt.name.toLowerCase().replace(/\s*\(.*?\)/g, '').trim() === baseKey
                            );
                        }

                        if (foundTrait) {
                            traitDescriptionsHTML += `<div class="description-block trait-block"><strong>${foundTrait.name} :</strong> ${foundTrait.desc}</div>`;
                        } else {
                            traitDescriptionsHTML += `<div class="description-block trait-block"><strong>${rawTrait} :</strong> Effet standard de cette arme.</div>`;
                        }
                    }
                });
            });
        });
    }

    if (!traitDescriptionsHTML) {
        traitDescriptionsHTML = '<p style="font-size:12px; color:#777; font-style:italic;">Aucun trait spécifique associé aux armes équipées.</p>';
    }

    // 3. ÉQUIPEMENTS & ARMURES (COLONNE GAUCHE)
    let equipmentDetailsHTML = '';
    let nonGrenadeEquip = (m.equipment || []).filter(e => !(e.counts_as_equip || e.type === 'Grenade' || (e.id && ((e.id.startsWith('wpn_grenade_') && e.id !== 'wpn_grenade_launcher') || e.id === 'wpn_charge_demo'))));
    let grenadeEquip = (m.equipment || []).filter(e => e.counts_as_equip || e.type === 'Grenade' || (e.id && ((e.id.startsWith('wpn_grenade_') && e.id !== 'wpn_grenade_launcher') || e.id === 'wpn_charge_demo')));

    if (m.equipment && m.equipment.length > 0) {
        equipmentDetailsHTML = `
            <div style="margin-top:12px;">
                <h4 style="color:var(--accent-purple); font-size:13px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Armures & Équipements</h4>
                ${nonGrenadeEquip.map(e => `
                    <div class="description-block" style="border-left-color:var(--accent-purple);">
                        <strong>${e.name} :</strong> ${e.effect || e.type || 'Équipement standard.'}
                    </div>
                `).join('')}
                ${grenadeEquip.length > 0 ? `
                    <div class="description-block" style="border-left-color:var(--accent-cyan); font-size:12px; color:#bbb;">
                        <strong>Grenades (${grenadeEquip.length}) :</strong> ${grenadeEquip.map(g => g.name).join(', ')} <br><em style="color:#888; font-size:11px;">(Profils d'attaque et traits affichés dans la colonne de droite)</em>
                    </div>
                ` : ''}
            </div>
        `;
    }

    let st = m.stats || {};
    let armorDeltas = getArmorStatDeltas(m);

    // 4. MISE EN PAGE PAYSAGE : 2 COLONNES (GAUCHE = CARACTÉRISTIQUES + COMPÉTENCES / DROITE = ARMES + TRAITS)
    let html = `
        <div class="landscape-card" style="border:none; padding:0;">
            
            <!-- BANDEAU SUPÉRIEUR AVEC NOM, STATUT, PV ET BOUTON FERMER EN HAUT -->
            <div class="card-section-top" style="background:#141414; padding:10px 14px; border-radius:6px; border:1px solid #333; margin-bottom:12px;">
                <div>
                    <h3 style="margin:0; font-size:18px; color:var(--accent-cyan); display:inline-block;">${m.customName}</h3>
                    <span style="color:#aaa; font-size:13px; margin-left:8px;">(${m.charName} — ${buildFighterTypeBadgesHTML(getEffectiveFighterTypes(m))})</span>
                    ${m.status === 'Fuyard' ? (m.wasSeriouslyInjuredWhenFled ? `<span style="background:#c0392b; color:#fff; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:8px; letter-spacing:0.5px;">🏃 FUYARD (Sér. blessé — blessure requise)</span>` : `<span style="background:#57606f; color:#ecf0f1; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:8px; letter-spacing:0.5px;">🏃 FUYARD (Protégé)</span>`) : ''}
                </div>

                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                    <!-- PV -->
                    <div style="display:flex; align-items:center; gap:4px; background:#222; padding:3px 8px; border-radius:4px; border:1px solid #444;">
                        <span style="font-size:12px; font-weight:bold;">PV :</span>
                        <button class="btn" style="padding:1px 6px; font-weight:bold; margin:0;" onclick="adjHP(${idx}, -1)">-</button>
                        <strong style="font-size:15px; margin:0 4px; color:#2ecc71; min-width:18px; text-align:center;">${m.currentHP}</strong>
                        <span style="color:#888;">/ ${m.stats ? m.stats.W : 1}</span>
                        <button class="btn" style="padding:1px 6px; font-weight:bold; margin:0;" onclick="adjHP(${idx}, 1)">+</button>
                    </div>

                    <!-- STATUT -->
                    <div style="display:flex; align-items:center; gap:6px;">
                        <label style="font-size:12px; font-weight:bold;">Statut :</label>
                        <select style="width:auto; margin:0; padding:4px 8px; background:#222; font-size:12px;" onchange="updateFighterStatus(${idx}, this.value)">
                            <option value="Prêt" ${m.status === 'Prêt' ? 'selected' : ''}>Prêt</option>
                            <option value="Engagé" ${m.status === 'Engagé' ? 'selected' : ''}>Engagé</option>
                            <option value="Pilonné" ${m.status === 'Pilonné' ? 'selected' : ''}>Pilonné</option>
                            <option value="Sérieusement blessé" ${m.status === 'Sérieusement blessé' ? 'selected' : ''}>Sérieusement blessé</option>
                            <option value="Out of action" ${m.status === 'Out of action' ? 'selected' : ''}>Out of action</option>
                            <option value="Fuyard" ${m.status === 'Fuyard' ? 'selected' : ''}>🏃 Fuyard</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- GRILLE 2 COLONNES FORMAT PAYSAGE -->
            <div class="landscape-columns-grid">
                
                <!-- COLONNE DE GAUCHE : CARACTÉRISTIQUES DU GUERRIER + COMPÉTENCES -->
                <div class="card-section-left">
                    <div style="background:#181818; padding:12px; border-radius:6px; border:1px solid #333;">
                        <h4 style="color:var(--accent-cyan); font-size:13px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                            📊 Caractéristiques du Guerrier
                        </h4>
                        <div style="overflow-x:auto;">
                            <table style="margin:0;">
                                <thead>
                                    <tr>
                                        <th>M</th><th>WS</th><th>BS</th><th>S</th><th>T</th>
                                        <th>W</th><th>I</th><th>A</th><th>Sv</th><th>Ld</th>
                                        <th>Cl</th><th>Wil</th><th>Int</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="font-weight:bold; color:#fff;">
                                        <td>${formatMovementWithMount(m)}</td><td>${st.WS||'-'}</td><td>${st.BS||'-'}</td>
                                        <td>${st.S||'-'}</td><td>${st.T||'-'}</td><td>${st.W||'-'}</td>
                                        <td>${armorDeltas && armorDeltas.I !== undefined ? formatStatWithArmorDelta(st.I, armorDeltas.I) : (st.I||'-')}</td>
                                        <td>${st.A||'-'}</td>
                                        <td>${armorDeltas && armorDeltas.Sv !== undefined ? formatStatWithArmorDelta(st.Sv, armorDeltas.Sv) : (st.Sv||'-')}</td>
                                        <td>${st.Ld||'-'}</td><td>${st.Cl||'-'}</td><td>${st.Wil||'-'}</td>
                                        <td>${st.Int||'-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="background:#181818; padding:12px; border-radius:6px; border:1px solid #333;">
                        <h4 style="color:var(--accent-cyan); font-size:13px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                            ⚡ Compétences & Capacités
                        </h4>
                        ${skillsDetailsHTML}
                        ${equipmentDetailsHTML}
                    </div>

                    <div style="background:#181818; padding:12px; border-radius:6px; border:1px solid #333;">
                        <h4 style="color:#f39c12; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                            Conditions Cumulables
                        </h4>
                        <div class="conditions-grid">
                            ${CUMULATIVE_CONDITIONS.map(cond => `
                                <div class="condition-item">
                                    <input type="checkbox" id="cond-${cond}" ${m.conditions && m.conditions[cond] ? 'checked' : ''} onchange="toggleCondition(${idx}, '${cond}')">
                                    <label for="cond-${cond}">${cond}</label>
                                    ${cond === 'Haine' ? `<input type="text" placeholder="Cible" title="Cible de la Haine (reportée depuis la blessure permanente si renseignée)" value="${escapeHtml(m.hatredTarget || '')}" style="width:64px; margin:0 0 0 4px; padding:2px 4px; font-size:11px;" onchange="updateHatredTarget(${idx}, this.value)">` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- COLONNE DE DROITE : ARMES + TRAITS ASSOCIÉS -->
                <div class="card-section-right">
                    <div style="background:#181818; padding:12px; border-radius:6px; border:1px solid #333;">
                        <h4 style="color:var(--accent-cyan); font-size:13px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                            ⚔️ Armes Équipées
                        </h4>
                        <div style="overflow-x:auto;">
                            <table style="margin:0;">
                                <thead>
                                    <tr>
                                        <th style="width: 28%; text-align:left; padding-left:6px;">Arme</th>
                                        <th style="width: 8%;">SR</th>
                                        <th style="width: 8%;">LR</th>
                                        <th style="width: 8%;">S</th>
                                        <th style="width: 8%;">AP</th>
                                        <th style="width: 8%;">D</th>
                                        <th style="width: 20%;">Traits</th>
                                        <th style="width: 16%;">Munitions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${combatItems.length === 0 ? `
                                        <tr><td colspan="8" style="padding:10px; color:#888; text-align:center;">Aucune arme ou grenade équipée.</td></tr>
                                    ` : combatItems.map(({ item: w, isGrenade, listType, itemIndex }) => {
                                        // Une arme à profils multiples (fusil à pompe, lance-grenades...) affiche
                                        // une ligne de tableau par profil, avec le nom de l'arme et les contrôles
                                        // de munitions/enrayement fusionnés sur toutes ces lignes (rowspan) : ils
                                        // sont partagés par l'arme entière, pas propres à un profil.
                                        let profiles = (w.profiles && w.profiles.length > 0) ? w.profiles : [{ SR:'-', LR:'-', S:'-', AP:'-', L:'-', traits:'' }];
                                        if (w.optional_profiles && w.unlockedOptions && w.unlockedOptions.length > 0) {
                                            profiles = profiles.concat(w.optional_profiles.filter(op => w.unlockedOptions.includes(op.name)));
                                        }
                                        const hasMultipleProfiles = profiles.length > 1;
                                        const isMelee = profiles.every(p => (p.traits || '').toLowerCase().includes('melee'));
                                        const accText = w.accessory ? ` <br><small style="color:var(--accent-cyan)">[${w.accessory.name}]</small>` : '';
                                        const badge = isGrenade ? ` <span style="font-size:10px; color:var(--accent-purple); font-weight:bold; background:rgba(155,89,182,0.2); padding:1px 4px; border-radius:3px;">Grenade</span>` : '';
                                        const munitionsHTML = isMelee ? '<span style="color:#666;">CàC</span>' : `
                                            <div style="display:flex; gap:3px; justify-content:center;">
                                                <button class="btn-ammo ${w.outOfAmmo ? 'out' : ''}" style="margin:0; padding:2px 5px; font-size:10px;" onclick="toggleCombatAmmo(${idx}, '${listType}', ${itemIndex})">
                                                    ${w.outOfAmmo ? 'À COURT' : 'OK'}
                                                </button>
                                                <button class="btn-jam ${w.jammed ? 'jammed' : ''}" style="margin:0; padding:2px 5px; font-size:10px;" onclick="toggleCombatJam(${idx}, '${listType}', ${itemIndex})">
                                                    ${w.jammed ? 'ENRAYÉ' : 'Jam'}
                                                </button>
                                            </div>
                                        `;

                                        return profiles.map((prof, pIdx) => {
                                            const profLabel = (hasMultipleProfiles && prof.name && prof.name.toLowerCase() !== 'unique')
                                                ? `<br><small style="color:#aaa;">- ${prof.name}</small>` : '';
                                            return `
                                            <tr>
                                                ${pIdx === 0 ? `<td rowspan="${profiles.length}" style="text-align:left; padding-left:6px; vertical-align:top;"><strong>${w.name}</strong>${badge}${accText}</td>` : ''}
                                                <td>${prof.SR}${profLabel}</td>
                                                <td>${prof.LR}</td>
                                                <td>${prof.S}</td>
                                                <td>${prof.AP}</td>
                                                <td>${prof.L}</td>
                                                <td><small style="color:#ddd;">${prof.traits || '-'}</small></td>
                                                ${pIdx === 0 ? `<td rowspan="${profiles.length}" style="vertical-align:middle;">${munitionsHTML}</td>` : ''}
                                            </tr>
                                        `;
                                        }).join('');
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="background:#181818; padding:12px; border-radius:6px; border:1px solid #333;">
                        <h4 style="color:var(--accent-cyan); font-size:13px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                            🎯 Traits d'Armes Associés
                        </h4>
                        ${traitDescriptionsHTML}
                    </div>
                </div>

            </div>

            <!-- BOUTON FERMER EN BAS -->
            <div style="margin-top:15px; padding-top:10px; border-top:1px solid #333; display:flex; justify-content:flex-end;">
                <button class="btn-danger" style="padding:8px 22px; font-size:13px; font-weight:bold;" onclick="closeModal()">
                    Fermer la fiche
                </button>
            </div>
        </div>
    `;

    // Utilisation du mode Paysage Plein Écran (isLandscape = true)
    if (typeof openModal === 'function') {
        openModal(`Fiche : ${m.customName}`, html, true);
    }
}

function adjHP(idx, amount) {
    let m = currentGameRoster[idx];
    if (m) {
        m.currentHP = Math.max(0, m.currentHP + amount);
        let modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay && !modalOverlay.classList.contains('hidden')) {
            openFighterDetailModal(idx);
        }
        renderGameView(document.getElementById('main-content'));
    }
}

function updateFighterStatus(idx, val) {
    if (currentGameRoster[idx]) {
        let prevStatus = currentGameRoster[idx].status;
        let isFamiliarFighter = !!currentGameRoster[idx].isFamiliar;

        if (!gameScores) {
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
        }

        if (val === 'Fuyard') {
            if (prevStatus === 'Sérieusement blessé') {
                currentGameRoster[idx].wasSeriouslyInjuredWhenFled = true;
            } else if (prevStatus !== 'Fuyard') {
                currentGameRoster[idx].wasSeriouslyInjuredWhenFled = false;
            }
            currentGameRoster[idx].activated = true;
        } else if (prevStatus === 'Fuyard') {
            delete currentGameRoster[idx].wasSeriouslyInjuredWhenFled;
        }

        if (val === 'Out of action') {
            currentGameRoster[idx].activated = true;
            // Un familier mis Hors de Combat ne déclenche jamais de Bottle check
            // pour le gang (il n'est pas compté comme une perte de combattant).
            if (!isFamiliarFighter && prevStatus !== 'Out of action' && !gameScores.bottleCheckDoneThisRound && !gameScores.isBottledOut) {
                gameScores.bottleCheckRequired = true;
            }
        }

        currentGameRoster[idx].status = val;
        currentGameRoster[idx].suppressed = (val === 'Pilonné');

        // Si le combattant n'est plus OOA, et qu'aucun autre (hors familiers) n'est
        // OOA, recalculer bottleCheckRequired
        if (val !== 'Out of action' && prevStatus === 'Out of action') {
            let anyOtherOOA = currentGameRoster.some(m => m.status === 'Out of action' && !m.isFamiliar);
            if (!anyOtherOOA && gameScores) {
                gameScores.bottleCheckRequired = false;
            }
        }

        // Si le propriétaire d'un familier passe Hors de Combat, le familier fuit
        // avec lui (Fuyard) et se retrouve grisé comme n'importe quel Fuyard.
        if (val === 'Out of action' && prevStatus !== 'Out of action' && !isFamiliarFighter) {
            let ownerId = currentGameRoster[idx].id;
            currentGameRoster.forEach(f => {
                if (f.isFamiliar && f.ownerId === ownerId && f.status !== 'Out of action' && f.status !== 'Fuyard') {
                    f.status = 'Fuyard';
                    f.activated = true;
                }
            });
        }

        let modalOverlay = document.getElementById('modal-overlay');
        let isModalOpen = (modalOverlay && !modalOverlay.classList.contains('hidden'));

        if (isModalOpen) {
            openFighterDetailModal(idx);
        }
        renderGameView(document.getElementById('main-content'));

        // Pop-up d'alerte immédiate dès qu'un combattant passe Out of Action
        // (jamais pour un familier : il ne déclenche ni test de nerf, ni bottlecheck)
        if (val === 'Out of action' && prevStatus !== 'Out of action' && !isFamiliarFighter) {
            triggerOutOfActionAlert(currentGameRoster[idx], isModalOpen ? idx : null);
        }
    }
}

function toggleCombatAmmo(fIdx, listType, itemIndex) {
    if (currentGameRoster[fIdx]) {
        let list = (listType === 'equipment') ? currentGameRoster[fIdx].equipment : currentGameRoster[fIdx].weapons;
        if (list && list[itemIndex]) {
            list[itemIndex].outOfAmmo = !list[itemIndex].outOfAmmo;
            openFighterDetailModal(fIdx);
        }
    }
}

function toggleCombatJam(fIdx, listType, itemIndex) {
    if (currentGameRoster[fIdx]) {
        let list = (listType === 'equipment') ? currentGameRoster[fIdx].equipment : currentGameRoster[fIdx].weapons;
        if (list && list[itemIndex]) {
            list[itemIndex].jammed = !list[itemIndex].jammed;
            openFighterDetailModal(fIdx);
        }
    }
}

function toggleWeaponAmmo(fIdx, wIdx) {
    toggleCombatAmmo(fIdx, 'weapons', wIdx);
}

function toggleWeaponJam(fIdx, wIdx) {
    toggleCombatJam(fIdx, 'weapons', wIdx);
}

function toggleCondition(fIdx, cond) {
    if (currentGameRoster[fIdx]) {
        let m = currentGameRoster[fIdx];
        if (!m.conditions) m.conditions = {};
        m.conditions[cond] = !m.conditions[cond];
        renderGameView(document.getElementById('main-content'));
    }
}

// Met à jour la cible de la Haine notée sur la fiche du combattant (en jeu).
// Ne redessine pas l'écran (onchange se déclenche au blur) pour ne pas perdre
// le focus pendant la saisie.
function updateHatredTarget(fIdx, value) {
    if (currentGameRoster[fIdx]) {
        currentGameRoster[fIdx].hatredTarget = (value || '').trim();
    }
}

function renderGameScorePriorityBanner() {
    if (!gameScores) {
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
    }
    let prioColor = '#aaa';
    let prioBorder = '#353856';
    if (gameScores.priority === 'Moi') {
        prioColor = 'var(--accent-cyan)';
        prioBorder = 'var(--accent-cyan)';
    } else if (gameScores.priority === 'Adversaire') {
        prioColor = '#ff6b6b';
        prioBorder = '#ff6b6b';
    }

    const curRound = gameScores.round || 1;
    const isEligible = isBottleCheckEligible();
    const isBottled = gameScores.isBottledOut === true;
    const bottleDone = gameScores.bottleCheckDoneThisRound === true;

    return `
        <div id="game-score-priority-banner" style="margin-top:10px; padding:8px 14px; background:#12131d; border:1px solid #2d3047; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; flex-wrap:wrap; gap:14px;">
                <!-- Indicateur Round -->
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:13px; font-weight:bold; color:#f39c12; background:#221808; border:1px solid #f39c12; padding:3px 10px; border-radius:6px; letter-spacing:0.5px;">
                        ROUND ${curRound}
                    </span>
                </div>

                <!-- Séparateur vertical -->
                <div style="width:1px; height:24px; background:#2d3047;"></div>

                <!-- Mon Score -->
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:13px; font-weight:700; color:var(--accent-cyan);">👤 Mon score :</span>
                    <div style="display:inline-flex; align-items:center; background:#0a0b12; border:1px solid #353856; border-radius:6px; overflow:hidden; padding:2px;">
                        <button type="button" class="game-score-btn" onclick="adjustGameScore('my', -1)" title="Diminuer mon score">-</button>
                        <span id="game-score-my" style="min-width:32px; text-align:center; font-weight:bold; font-size:16px; color:var(--accent-cyan); padding:0 6px;">${gameScores.myScore || 0}</span>
                        <button type="button" class="game-score-btn" onclick="adjustGameScore('my', 1)" title="Augmenter mon score">+</button>
                    </div>
                </div>

                <!-- Séparateur vertical -->
                <div style="width:1px; height:24px; background:#2d3047;"></div>

                <!-- Score Adversaire -->
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:13px; font-weight:700; color:#ff6b6b;">🎯 Score adversaire :</span>
                    <div style="display:inline-flex; align-items:center; background:#0a0b12; border:1px solid #353856; border-radius:6px; overflow:hidden; padding:2px;">
                        <button type="button" class="game-score-btn opp" onclick="adjustGameScore('opponent', -1)" title="Diminuer le score adverse">-</button>
                        <span id="game-score-opp" style="min-width:32px; text-align:center; font-weight:bold; font-size:16px; color:#ff6b6b; padding:0 6px;">${gameScores.opponentScore || 0}</span>
                        <button type="button" class="game-score-btn opp" onclick="adjustGameScore('opponent', 1)" title="Augmenter le score adverse">+</button>
                    </div>
                </div>

                <!-- Statut Bottle / Déroute -->
                ${isBottled ? `
                    <div style="display:flex; align-items:center;">
                        <span style="background:rgba(231,76,60,0.25); border:1px solid #e74c3c; color:#ff6b6b; font-size:12px; font-weight:bold; padding:3px 9px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;" title="Gang en déroute : test de Cool au début de chaque activation !">
                            🚩 DÉROUTE (Bottled out)
                        </span>
                    </div>
                ` : isEligible ? `
                    <div style="display:flex; align-items:center;">
                        ${bottleDone ? `
                            <span style="background:rgba(46,204,113,0.15); border:1px solid #2ecc71; color:#2ecc71; font-size:11px; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;">
                                ✓ Bottle check fait (Rnd ${curRound})
                            </span>
                        ` : `
                            <button type="button" class="btn" style="background:rgba(230,126,34,0.15); border:1px solid #e67e22; color:#f39c12; font-size:12px; font-weight:bold; padding:4px 10px; margin:0; border-radius:6px; cursor:pointer;" onclick="openBottleCheckModal(false)" title="Pertes subies : Test de Bottle requis en fin de ce round">
                                🚩 Faire le Bottle check
                            </button>
                        `}
                    </div>
                ` : ''}
            </div>

            <!-- Priorité -->
            <div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px;">
                <label for="game-priority-select" style="font-size:13px; font-weight:700; color:#eee; margin:0;">⚡ Priorité :</label>
                <select id="game-priority-select" onchange="updateGamePriority(this.value)" style="width:auto; margin:0; background:#0a0b12; color:${prioColor}; border:1px solid ${prioBorder}; border-radius:6px; padding:4px 10px; font-size:13px; font-weight:bold; cursor:pointer; outline:none; transition:border-color 0.2s, color 0.2s;">
                    <option value="À déterminer" ${(gameScores.priority || 'À déterminer') === 'À déterminer' ? 'selected' : ''} style="color:#aaa; background:#0a0b12;">À déterminer</option>
                    <option value="Moi" ${gameScores.priority === 'Moi' ? 'selected' : ''} style="color:var(--accent-cyan); background:#0a0b12;">Moi</option>
                    <option value="Adversaire" ${gameScores.priority === 'Adversaire' ? 'selected' : ''} style="color:#ff6b6b; background:#0a0b12;">Adversaire</option>
                </select>
                ${gameScores.previousPriority ? `
                    <span id="game-previous-priority-badge" style="font-size:12px; padding:3px 9px; border-radius:6px; background:#181928; border:1px solid #2e324d; color:#aaa; white-space:nowrap; display:inline-flex; align-items:center; gap:5px;" title="Priorité du round précédent">
                        <span style="color:#888;">Round précédent :</span>
                        <strong style="color:${gameScores.previousPriority === 'Moi' ? 'var(--accent-cyan)' : gameScores.previousPriority === 'Adversaire' ? '#ff6b6b' : '#aaa'}; font-weight:bold;">
                            ${gameScores.previousPriority}
                        </strong>
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

function adjustGameScore(who, delta) {
    if (!gameScores) {
        gameScores = { myScore: 0, opponentScore: 0, priority: 'À déterminer' };
    }
    if (who === 'my') {
        gameScores.myScore = Math.max(0, (gameScores.myScore || 0) + delta);
    } else if (who === 'opponent') {
        gameScores.opponentScore = Math.max(0, (gameScores.opponentScore || 0) + delta);
    }
    let myEl = document.getElementById('game-score-my');
    let oppEl = document.getElementById('game-score-opp');
    if (myEl && oppEl) {
        myEl.textContent = gameScores.myScore;
        oppEl.textContent = gameScores.opponentScore;
    } else {
        renderGameView(document.getElementById('main-content'));
    }
}

function updateGamePriority(val) {
    if (!gameScores) {
        gameScores = { myScore: 0, opponentScore: 0, priority: 'À déterminer' };
    }
    gameScores.priority = val;
    let sel = document.getElementById('game-priority-select');
    if (sel) {
        if (val === 'Moi') {
            sel.style.borderColor = 'var(--accent-cyan)';
            sel.style.color = 'var(--accent-cyan)';
        } else if (val === 'Adversaire') {
            sel.style.borderColor = '#ff6b6b';
            sel.style.color = '#ff6b6b';
        } else {
            sel.style.borderColor = '#353856';
            sel.style.color = '#aaa';
        }
    }
}

function renderInGameTacticsGrid() {
    if (!gameTactics || gameTactics.length === 0) {
        return '';
    }

    return `
        <div style="display:flex; flex-direction:column; gap:5px;">
            ${gameTactics.map((t, idx) => {
                let isUsed = t.used === true;
                let timing = t.timing || '';
                let effect = t.effect || t.desc || t.effet || '';
                return `
                    <div id="game-tactic-${idx}" 
                         class="game-tactic-card ${isUsed ? 'used' : ''}"
                         onclick="toggleGameTactic(${idx})"
                         title="${isUsed ? 'Cliquer pour réactiver' : 'Cliquer pour jouer (griser)'}">
                        <strong style="color:${isUsed ? '#888' : 'var(--accent-cyan)'}; font-size:13px; ${isUsed ? 'text-decoration:line-through;' : ''}; white-space:nowrap;">
                            🎴 ${t.name}
                        </strong>
                        ${timing ? `<span style="font-size:11px; color:${isUsed ? '#666' : 'var(--accent-purple, #b388ff)'}; white-space:nowrap; font-weight:600;">[${timing}]</span>` : ''}
                        <span style="font-size:12px; color:${isUsed ? '#777' : '#dddddd'}; line-height:1.3; flex:1;">
                            ${effect}
                        </span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function toggleGameTactic(idx) {
    if (gameTactics && gameTactics[idx]) {
        gameTactics[idx].used = !gameTactics[idx].used;
        let tName = gameTactics[idx].name;
        if (gameTactics[idx].used) {
            if (typeof showToast === 'function') showToast(`🎴 "${tName}" jouée et grisée !`, "info");
        } else {
            if (typeof showToast === 'function') showToast(`🔄 "${tName}" réactivée !`, "info");
        }
        renderGameView(document.getElementById('main-content'));
    }
}

function openAddTacticsMidGameModal() {
    let pool = getGangTacticsList(true);
    let currentIds = (gameTactics || []).map(t => t.id);

    let html = `
        <div style="max-height:60vh; overflow-y:auto;">
            <p style="font-size:13px; color:#aaa; margin-bottom:10px;">
                Cochez les cartes tactiques actives pour cette partie :
            </p>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:8px;">
    `;

    pool.forEach(t => {
        let isPresent = currentIds.includes(t.id);
        html += `
            <div style="border:1px solid ${isPresent ? 'var(--accent-cyan)' : '#333'}; padding:8px 10px; border-radius:6px; background:${isPresent ? '#172033' : '#111'}; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1; padding-right:8px;">
                    <strong style="color:${isPresent ? 'var(--accent-cyan)' : '#fff'}; font-size:13px;">${t.name}</strong><br>
                    <small style="color:#aaa;">${t.timing || ''}</small>
                </div>
                <input type="checkbox" class="midgame-tactic-check" value="${t.id}" ${isPresent ? 'checked' : ''} style="transform:scale(1.2);">
            </div>
        `;
    });

    html += `
            </div>
        </div>
        <br>
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <button class="btn btn-cyan" onclick="saveMidGameTactics()">Valider les cartes</button>
            <button class="btn" onclick="closeModal()">Annuler</button>
        </div>
    `;

    if (typeof openModal === 'function') {
        openModal("🎴 Gérer les Cartes de la Partie", html);
    }
}

function saveMidGameTactics() {
    let cbs = document.querySelectorAll('.midgame-tactic-check:checked');
    let newIds = Array.from(cbs).map(cb => cb.value);
    let allPool = (typeof db !== 'undefined' && db.tactics) ? db.tactics : [];

    let oldMap = {};
    (gameTactics || []).forEach(t => { oldMap[t.id] = t.used; });

    gameTactics = newIds.map(id => {
        let def = allPool.find(x => x.id === id);
        return def ? { ...JSON.parse(JSON.stringify(def)), used: !!oldMap[id] } : null;
    }).filter(Boolean);

    if (typeof closeModal === 'function') closeModal();
    renderGameView(document.getElementById('main-content'));
    if (typeof showToast === 'function') showToast("Cartes tactiques mises à jour !", "success");
}

function openTacticsModal() {
    openAddTacticsMidGameModal();
}

function toggleTacticUsed(idx) {
    toggleGameTactic(idx);
}
