// postbattle-sequence.js (1/4 - issu de l'ancien postbattle.js)
// Rôle : séquence post-bataille (blessures, captures, rançons, XP) et le
// registre central utilisé par la session de post-cycle.
// Dépendances : les fichiers issus de l'ancien app.js (currentGang, saveGangs,
// showToast, showConfirmModal...) et de l'ancien game.js (safeSave, safeNavigate).

// ==========================================
// 1. SÉQUENCE POST-BATAILLE
// ==========================================
function renderPostBattleView(container) {
    if (typeof appState !== 'undefined') appState.view = 'post-battle';
    if (!container) container = document.getElementById('main-content');
    if (!container) return;

    if (!currentGang) {
        container.innerHTML = `<div class="card"><p>Aucun gang chargé.</p><button onclick="safeNavigate('gang-manage')">Retour</button></div>`;
        return;
    }

    updateGameTopBar();

    let ooaFighters = (currentGang.members || []).filter(m => m.ooa === true && !m.isFamiliar);
    let totalEnemiesOOA = currentGameRoster.reduce((sum, m) => sum + ((m.liveXP && m.liveXP.ooaKills) ? m.liveXP.ooaKills : 0), 0);

    let dbTerritories = (typeof db !== 'undefined' && db.territories) ? db.territories : [];
    let gangTerritories = currentGang.territories || [];

    let optGained = `<option value="">-- Aucun --</option>` + dbTerritories.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    let optLost = `<option value="">-- Aucun --</option>` + gangTerritories.map((tName, idx) => `<option value="${idx}">${tName}</option>`).join('');

    let html = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                <h2>Séquence Post-Bataille — ${currentGang.name}</h2>
                <button class="btn btn-cyan" onclick="openStashModal()">📦 Réserve du Gang (Stash)</button>
            </div>
            <div style="margin-top:10px; display:flex; gap:10px;">
                <button class="btn" onclick="safeNavigate('gang-manage')">← Retour Gestion du Gang</button>
                <button class="btn btn-cyan" onclick="startPostCycleView(document.getElementById('main-content'))">Passer au Post-Cycle →</button>
            </div>
            <hr style="margin: 15px 0; border-color: #333;">

            <!-- RÉCAPITULATIF DES GAINS D'EXPÉRIENCE (XP) -->
            <div style="background:#11151f; border:1px solid var(--accent-cyan, #00d2d3); border-radius:8px; padding:14px; margin-bottom:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
                    <h3 style="margin:0; color:var(--accent-cyan); display:flex; align-items:center; gap:8px; font-size:16px;">
                        <span>⭐</span> Gains d'Expérience de la Bataille (XP)
                    </h3>
                    <span style="font-size:12px; background:rgba(0,210,211,0.15); color:var(--accent-cyan); padding:3px 8px; border-radius:4px; font-weight:bold;">
                        ✓ Expérience garantie et définitive
                    </span>
                </div>
                <p style="font-size:13px; color:#ddd; margin:0 0 12px 0; line-height:1.5;">
                    💡 <strong>Règle fondamentale :</strong> Un guerrier ne peut <strong>jamais perdre l'expérience acquise</strong> lors d'une partie. Même s'il finit Hors de Combat ou Fuyard, il conserve l'XP de sa participation (1 XP) et tous ses accomplissements (blessures causées, soutiens, objectifs).
                </p>

                ${(() => {
                    let participants = (currentGang.members || []).filter(m => m.lastBattleGain || (Array.isArray(currentGameRoster) && currentGameRoster.some(r => r.id === m.id || r.customName === m.customName)));
                    if (participants.length === 0) {
                        return `<p style="color:#aaa; font-size:13px; margin:0;">Aucun historique de combattants en jeu enregistré pour cette bataille.</p>`;
                    }
                    return `
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            ${participants.map(m => {
                                let gain = m.lastBattleGain || {
                                    total: 1,
                                    participation: 1,
                                    assistance: 0,
                                    objective: 0,
                                    seriouslyInjured: 0,
                                    scenario: 0,
                                    ooaKills: 0,
                                    status: m.ooa ? 'Out of action' : 'Prêt'
                                };

                                let details = [];
                                details.push('+1 Participation');
                                if (gain.ooaKills > 0) details.push(`+${gain.ooaKills * 2} (${gain.ooaKills} ennemi(s) OOA)`);
                                if (gain.seriouslyInjured > 0) details.push(`+${gain.seriouslyInjured} (Sér. blessé causé)`);
                                if (gain.assistance > 0) details.push(`+${gain.assistance} (Assistance)`);
                                if (gain.objective > 0) details.push(`+${gain.objective} (Objectif)`);
                                if (gain.scenario > 0) details.push(`+${gain.scenario} (Scénario)`);

                                let statusBadge = '';
                                if (gain.status === 'Fuyard') {
                                    if (gain.wasSeriouslyInjuredWhenFled) {
                                        statusBadge = `<span style="background:#c0392b; color:#fff; font-size:11px; padding:2px 8px; border-radius:3px; font-weight:bold;">🏃 Fuyard (Sér. blessé — blessure requise)</span>`;
                                    } else {
                                        statusBadge = `<span style="background:#57606f; color:#ecf0f1; font-size:11px; padding:2px 8px; border-radius:3px; font-weight:bold;">🏃 Fuyard (Sain et sauf — protégé)</span>`;
                                    }
                                } else if (m.ooa || gain.status === 'Out of action') {
                                    statusBadge = `<span style="background:#7f1d1d; color:#fca5a5; font-size:11px; padding:2px 8px; border-radius:3px; font-weight:bold;">💀 Hors de combat</span>`;
                                } else {
                                    statusBadge = `<span style="background:#1e3a8a; color:#bfdbfe; font-size:11px; padding:2px 8px; border-radius:3px; font-weight:bold;">✓ Survécu</span>`;
                                }

                                return `
                                    <div style="display:flex; justify-content:space-between; align-items:center; background:#161922; border:1px solid #2d3345; border-radius:6px; padding:8px 12px; flex-wrap:wrap; gap:8px;">
                                        <div>
                                            <strong style="color:#fff; font-size:14px;">${m.customName}</strong>
                                            <span style="color:#aaa; font-size:12px; margin-left:6px;">(${m.charName})</span>
                                            <span style="margin-left:8px;">${statusBadge}</span>
                                            <div style="font-size:11.5px; color:#888; margin-top:2px;">
                                                Détail : ${details.join(' | ')}
                                            </div>
                                        </div>
                                        <div style="text-align:right;">
                                            <span style="color:#2ecc71; font-weight:bold; font-size:14px;">+${gain.total || 1} XP</span>
                                            <span style="color:#888; font-size:12px; margin-left:6px;">(Total : <strong style="color:var(--accent-cyan);">${getFighterXP(m)} XP</strong>)</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                })()}
            </div>

            <h3>1. Résolution des Blessures Permanentes (Out of Action)</h3>
    `;

    if (ooaFighters.length === 0) {
        html += `<p style="color:var(--status-ready, #00ff00);">✓ Aucun guerrier n'a besoin d'un jet de blessure permanente (les fuyards sains et saufs sont protégés et aucun combattant n'a terminé Hors de Combat) !</p>`;
    } else {
        ooaFighters.forEach(m => {
            let reasonBadge = '';
            if (m.ooaReason === 'fuyard_blessé' || (m.lastBattleGain && m.lastBattleGain.wasSeriouslyInjuredWhenFled)) {
                reasonBadge = `<span style="background:#c0392b; color:#fff; font-size:11px; padding:2px 8px; border-radius:3px; font-weight:bold; margin-left:8px;">⚠️ Fuyard ayant quitté le combat en étant sérieusement blessé</span>`;
            } else {
                reasonBadge = `<span style="background:#7f1d1d; color:#fca5a5; font-size:11px; padding:2px 8px; border-radius:3px; font-weight:bold; margin-left:8px;">Mis Hors de Combat (Out of Action)</span>`;
            }

            html += `
                <div style="border: 1px solid #e74c3c; padding: 12px; margin-bottom: 10px; border-radius: 6px; background: #1a0a0f;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; margin-bottom:6px;">
                        <div>
                            <strong style="color: #e74c3c; font-size:15px;">${m.customName}</strong> (${m.charName})
                            ${reasonBadge}
                        </div>
                        <div style="font-size:12px; color:#2ecc71; font-weight:bold;">
                            ⭐ XP garantie : ${getFighterXP(m)} XP
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <label style="font-size:13px; color:#ddd;">Attribuer une blessure : </label>
                        <select id="inj-select-${m.id}" style="padding:4px 8px; background:#222; color:#fff; border:1px solid #555; border-radius:4px;" onchange="onInjurySelectChange('${m.id}', this.value)">
                            ${PERMANENT_INJURIES.map(inj => `<option value="${inj.id}">${inj.label}</option>`).join('')}
                        </select>
                        <input type="text" id="inj-haine-target-${m.id}" placeholder="Cible de la Haine (gang, personnage...)" style="display:none; padding:4px 8px; width:220px;">
                        <button class="btn btn-danger" style="margin:0; padding:6px 14px; font-weight:bold;" onclick="applyInjury('${m.id}')">Valider Blessure</button>
                    </div>
                </div>
            `;
        });
    }

    let baseRep = (currentGang.reputation !== undefined) ? currentGang.reputation : 1;
    let totalRep = calculateGangReputation(currentGang);
    let territoryBonus = totalRep - baseRep;

    html += `
            <hr style="margin: 15px 0; border-color: #333;">

            <h3>2. Rapport & Enregistrement de la Bataille</h3>
            <div style="background:#111; border:1px solid var(--accent-purple, #9b59b6); padding:12px; border-radius:6px; margin-bottom:15px;">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:10px;">
                    <div>
                        <label style="font-size:12px;">Joueur Adversaire :</label>
                        <input type="text" id="hist-opponent-name" placeholder="Ex : Marc" style="width:100%; padding:4px;">
                    </div>
                    <div>
                        <label style="font-size:12px;">Gang Adversaire :</label>
                        <input type="text" id="hist-opponent-gang" placeholder="Ex : Van Saar" style="width:100%; padding:4px;">
                    </div>
                    <div>
                        <label style="font-size:12px;">Résultat :</label>
                        <select id="hist-result" style="width:100%; padding:4px; background:#222; color:#fff; border:1px solid #444;">
                            <option value="Victoire">Victoire</option>
                            <option value="Défaite">Défaite</option>
                            <option value="Égalité">Égalité</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:12px;">Gain Cr. Mission Principale :</label>
                        <input type="number" id="hist-cred-primary" value="0" min="0" step="10" style="width:100%; padding:4px;">
                    </div>
                    <div>
                        <label style="font-size:12px;">Gain Cr. Mission Sec. :</label>
                        <input type="number" id="hist-cred-secondary" value="0" min="0" step="10" style="width:100%; padding:4px;">
                    </div>
                    <div>
                        <label style="font-size:12px;">Ennemis mis OOA (calculé) :</label>
                        <input type="text" value="${totalEnemiesOOA}" disabled style="width:100%; padding:4px; background:#222; color:#2ecc71; font-weight:bold;">
                    </div>
                    <div>
                        <label style="font-size:12px;">Variation Réputation (+/-) :</label>
                        <input type="number" id="hist-rep" value="0" style="width:100%; padding:4px;" placeholder="+1, -1...">
                    </div>
                    <div>
                        <label style="font-size:12px;">Territoire Gagné :</label>
                        <select id="hist-ter-gained" style="width:100%; padding:4px; background:#222; color:#fff; border:1px solid #444;">
                            ${optGained}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:12px;">Territoire Perdu :</label>
                        <select id="hist-ter-lost" style="width:100%; padding:4px; background:#222; color:#fff; border:1px solid #444;">
                            ${optLost}
                        </select>
                    </div>
                </div>

                <button class="btn btn-cyan" style="width:100%; margin-top:5px;" onclick="saveMatchToHistory()">
                    💾 Valider & Enregistrer la Partie
                </button>
            </div>

            <hr style="margin: 15px 0; border-color: #333;">
            <h3>3. Territoires & Réputation Actuels</h3>
            <p>
                Réputation Totale : <strong style="color:#2ecc71; font-size:16px;">${totalRep}</strong> 
                <small style="color:#aaa;">(Base : ${baseRep}${territoryBonus > 0 ? ` | Bonus Territoires : +${territoryBonus}` : ''})</small>
            </p>
            <button class="btn btn-cyan" onclick="openTerritoriesModal()">🚩 Gérer les Territoires (${(currentGang.territories || []).length})</button>
        </div>
    `;

    container.innerHTML = html;
}

function isFighterMercenary(m) {
    if (!m) return false;
    return !!((m.charId && m.charId.startsWith('merc_')) || 
              (m.type || []).some(t => {
                  let lower = (t || '').toLowerCase();
                  return lower.includes('merc') || lower.includes('hired') || lower.includes('bounty');
              }));
}
window.isFighterMercenary = isFighterMercenary;

function transferFighterGearToStash(m) {
    if (!currentGang || !m) return;
    // Ni les mercenaires, ni les bêtes/familiers/hangers-on, ni les brutes ne
    // renvoient leur "équipement" dans la réserve du gang à leur départ.
    if (isFighterMercenary(m) || (typeof shouldFighterGearVanish === 'function' && shouldFighterGearVanish(m))) {
        // Le matériel disparaît entièrement pour ces catégories : les familiers
        // qui étaient rattachés à ce combattant disparaissent aussi (plus de
        // propriétaire, plus de fiche d'équipement à laquelle se raccrocher).
        (m.equipment || []).forEach(e => {
            if (e && e.familiarMemberId) {
                currentGang.members = currentGang.members.filter(fm => fm.id !== e.familiarMemberId);
            }
        });
        return;
    }

    if (!currentGang.stash) currentGang.stash = [];
    if (m.weapons && Array.isArray(m.weapons)) {
        m.weapons.forEach(w => {
            let wCost = w.cost_credits || w.cost || 0;
            currentGang.stash.push({ name: w.name, type: "Arme", cost: wCost });
            if (w.accessory) {
                let accCost = w.accessory.cost_credits || w.accessory.cost || 0;
                currentGang.stash.push({ name: w.accessory.name, type: "Accessoire", cost: accCost });
            }
        });
    }
    if (m.armor) {
        currentGang.stash.push({ name: m.armor.name, type: "Armure", cost: m.armor.cost || 0 });
    }
    if (m.equipment && Array.isArray(m.equipment)) {
        m.equipment.forEach(e => {
            let stashItem = { name: e.name, type: e.type || "Équipement", cost: e.cost_credits || e.cost || 0 };
            // Référence de familier : familiarCharId doit être préservé pour que
            // adoptFamiliarFromStash() (weapons-equipment.js) puisse le retrouver
            // et le proposer à la reprise par un autre guerrier. Sans ce champ,
            // l'objet atterrissait bien dans la réserve mais restait impossible à
            // reprendre (bug corrigé ici). Le membre actif lié (avancement, XP...)
            // ne survit pas au départ de son propriétaire : une fiche neuve sera
            // recréée à la reprise, comme pour tout familier acheté depuis la
            // réserve.
            if (e.familiarMemberId) {
                stashItem.familiarCharId = e.familiarCharId;
                currentGang.members = currentGang.members.filter(fm => fm.id !== e.familiarMemberId);
            }
            currentGang.stash.push(stashItem);
        });
    }
}
window.transferFighterGearToStash = transferFighterGearToStash;

// Affiche/masque le champ "Cible de la Haine" et ouvre la modale de capture,
// selon la blessure sélectionnée dans le menu déroulant.
function onInjurySelectChange(fighterId, value) {
    if (value === 'captured') {
        openCapturedModal(fighterId);
    }
    let hField = document.getElementById(`inj-haine-target-${fighterId}`);
    if (hField) hField.style.display = (value === 'haine') ? 'inline-block' : 'none';
}

function applyInjury(fighterId) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    let selectElem = document.getElementById(`inj-select-${fighterId}`);
    let selectedId = selectElem ? selectElem.value : 'none';
    let def = getPermanentInjuryDef(selectedId);
    if (!def) return;

    if (def.id === 'captured') {
        openCapturedModal(fighterId);
        return;
    }

    m.ooa = false;
    m.ooaReason = null;

    if (!m.injuries) m.injuries = [];
    if (!currentGang.stash) currentGang.stash = [];

    if (def.id === 'xp1') {
        m.xp = getFighterXP(m) + 1;
        if (typeof checkGangerPromotion === 'function') checkGangerPromotion(m);
        if (typeof checkProspectPromotion === 'function') checkProspectPromotion(m);
        showToast(`${m.customName} gagne +1 XP !`, "success");
    } else if (def.id === 'xp2') {
        m.xp = getFighterXP(m) + 2;
        if (typeof checkGangerPromotion === 'function') checkGangerPromotion(m);
        if (typeof checkProspectPromotion === 'function') checkProspectPromotion(m);
        showToast(`${m.customName} gagne +2 XP !`, "success");
    } else if (def.id === 'xp3') {
        m.xp = getFighterXP(m) + 3;
        if (typeof checkGangerPromotion === 'function') checkGangerPromotion(m);
        if (typeof checkProspectPromotion === 'function') checkProspectPromotion(m);
        showToast(`${m.customName} gagne +3 XP !`, "success");
    } else if (def.id === 'haine') {
        let hField = document.getElementById(`inj-haine-target-${fighterId}`);
        let target = hField ? hField.value.trim() : '';
        m.hatredTarget = target;
        m.injuries.push(target ? `${def.label} (Cible : ${target})` : def.label);
        showToast(`${m.customName} gagne la Haine${target ? ' envers ' + target : ''} de façon permanente ! La condition sera automatiquement active en début de partie.`, "success");
    } else if (def.id === 'fearsome') {
        m.injuries.push(def.label);
        showToast(`${m.customName} gagne la condition Fearsome de façon permanente ! Elle sera automatiquement active en début de partie.`, "success");
    } else if (def.id === 'ld_bonus') {
        applyStatUpgrade(m, 'Ld');
        m.injuries.push(def.label);
        showToast(`${m.customName} gagne +1 Ld de façon permanente !`, "success");
    } else if (def.id === 'none') {
        m.injuries.push(def.label);
    } else if (def.id === 'dead') {
        let isMerc = isFighterMercenary(m);
        let isBeast = (typeof isMercOrBeastProfile === 'function') && isMercOrBeastProfile(m) && !isMerc;
        transferFighterGearToStash(m);
        currentGang.members = currentGang.members.filter(x => x.id !== fighterId);
        if (isMerc || isBeast) {
            showToast(`${m.customName} (${isMerc ? 'Mercenaire' : 'Bête'}) est décédé(e). Son équipement disparaît avec lui/elle.`, "error");
        } else {
            showToast(`${m.customName} est décédé(e). Ses armes et équipements ont été envoyés dans la réserve du gang.`, "error");
        }
        if (typeof ensureGangHasLeader === 'function') ensureGangHasLeader();
    } else if (def.id === 'critical') {
        m.critInj = true;
        m.injuries.push(def.label);
        showToast(`⚠️ ${m.customName} est en Blessure Critique ! Il doit recevoir une Escorte Médicale (30 cr) durant le Post-Cycle, sinon il succombera lors de la validation du cycle.`, "error");
    } else if (def.statKey) {
        // Résultats "Recovery & -1 XX" : le guerrier part en convalescence ET
        // perd immédiatement et de façon permanente 1 point dans la statistique
        // concernée (conforme aux règles : la perte n'attend pas la fin de la
        // convalescence, seule l'indisponibilité pour la prochaine partie l'attend).
        m.recovery = true;
        applyStatDowngrade(m, def.statKey);
        m.injuries.push(def.label);
        showToast(`${m.customName} part en Recovery et perd 1 en ${def.statLabel} de façon permanente.`, "error");
    } else if (def.id === 'recovery') {
        m.recovery = true;
        m.injuries.push(def.label);
    }

    safeSave();
    renderPostBattleView(document.getElementById('main-content'));
    if (typeof processPendingSpecialistChoices === 'function') processPendingSpecialistChoices();
}

function openCapturedModal(fighterId) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    let creds = currentGang.credits || 0;
    let html = `
        <div style="padding:2px;">
            <div style="background:#1e1418; border:1px solid #e74c3c; border-radius:6px; padding:10px 14px; margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <strong style="color:#e74c3c; font-size:15px;">⛓️ ${m.customName}</strong>
                    <span style="color:#aaa; font-size:12px;">${m.charName} (${(m.type || []).join(', ')})</span>
                </div>
                <p style="margin:6px 0 0 0; font-size:13px; color:#ddd; line-height:1.4;">
                    Ce combattant a subi le résultat <strong>Capturé</strong>. Choisissez son sort parmi les 3 options suivantes :
                </p>
            </div>

            <!-- OPTION 1 : MORT -->
            <div style="background:#141417; border:1px solid #3d2024; border-left:4px solid #e74c3c; border-radius:6px; padding:12px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:#e74c3c; font-size:14px;">💀 Option 1 : Mort du combattant</strong>
                </div>
                <p style="font-size:12px; color:#bbb; margin:0 0 10px 0; line-height:1.4;">
                    Le combattant succombe ou est exécuté par ses ravisseurs. Ses armes et équipements récupérés sont transférés dans la réserve du gang (Stash), sauf pour un mercenaire.
                </p>
                <button class="btn btn-danger" style="width:100%; font-weight:bold;" onclick="resolveCapturedDeath('${m.id}')">
                    💀 Confirmer la Mort
                </button>
            </div>

            <!-- OPTION 2 : RECOVERY SANS RANÇON -->
            <div style="background:#141417; border:1px solid #3d2d1e; border-left:4px solid #e67e22; border-radius:6px; padding:12px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:#e67e22; font-size:14px;">🩹 Option 2 : Évasion / Libéré sans rançon</strong>
                </div>
                <p style="font-size:12px; color:#bbb; margin:0 0 10px 0; line-height:1.4;">
                    Le combattant parvient à s'échapper ou est relâché. Il part en <strong>Recovery</strong> (convalescence) et reste <strong>indisponible pour les parties et les actions jusqu'à la validation d'un Post-Cycle</strong>.
                </p>
                <button class="btn" style="width:100%; font-weight:bold; background:#d35400; color:#fff;" onclick="resolveCapturedRecovery('${m.id}')">
                    🩹 Placer en Convalescence (Recovery)
                </button>
            </div>

            <!-- OPTION 3 : RANÇON DEMANDÉE -->
            <div style="background:#141417; border:1px solid #1a3536; border-left:4px solid var(--accent-cyan); border-radius:6px; padding:12px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:var(--accent-cyan); font-size:14px;">💰 Option 3 : Rançon demandée</strong>
                </div>
                <p style="font-size:12px; color:#bbb; margin:0 0 10px 0; line-height:1.4;">
                    Une rançon est exigée. Choisissez le montant à payer (entre 10 et 60 crédits, par tranches de 10). Le gang paie la somme, et le combattant rentre mais est placé en <strong>Recovery</strong> (indisponible jusqu'à la validation d'un Post-Cycle).
                </p>
                
                <div style="background:#0c0d12; border:1px solid #232738; border-radius:6px; padding:10px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:12px;">
                        <span style="color:#aaa;">Crédits actuels du gang :</span>
                        <strong style="color:#fff;">${creds} cr</strong>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                        <label style="font-size:12px; font-weight:bold; color:var(--accent-cyan);">Montant de la rançon :</label>
                        <select id="captured-ransom-select" onchange="updateCapturedRansomPreview()" style="flex:1; min-width:140px; padding:6px 10px; background:#181a24; color:#fff; border:1px solid var(--accent-cyan); border-radius:4px; font-weight:bold; font-size:13px;">
                            <option value="10">10 Crédits</option>
                            <option value="20">20 Crédits</option>
                            <option value="30" selected>30 Crédits</option>
                            <option value="40">40 Crédits</option>
                            <option value="50">50 Crédits</option>
                            <option value="60">60 Crédits</option>
                        </select>
                    </div>

                    <div style="font-size:12px; color:#aaa; display:flex; justify-content:space-between;">
                        <span>Solde après paiement :</span>
                        <strong id="captured-ransom-balance" style="color:${(creds - 30) < 0 ? '#e74c3c' : '#2ecc71'};">${creds - 30} cr</strong>
                    </div>
                </div>

                <button class="btn btn-cyan" style="width:100%; font-weight:bold;" onclick="resolveCapturedRansom('${m.id}')">
                    💰 Payer la Rançon & Valider le Recovery
                </button>
            </div>

            <button class="btn" style="width:100%; margin-top:4px;" onclick="closeModal()">Annuler</button>
        </div>
    `;

    if (typeof openModal === 'function') {
        openModal(`⛓️ Résolution de Capture : ${m.customName}`, html);
    }
}

function updateCapturedRansomPreview() {
    let sel = document.getElementById('captured-ransom-select');
    let bal = document.getElementById('captured-ransom-balance');
    if (!sel || !bal || !currentGang) return;
    let amount = parseInt(sel.value, 10) || 0;
    let newBal = (currentGang.credits || 0) - amount;
    bal.innerText = `${newBal} cr`;
    bal.style.color = newBal < 0 ? '#e74c3c' : '#2ecc71';
}

function resolveCapturedDeath(fighterId) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    m.ooa = false;
    let isMerc = isFighterMercenary(m);
    transferFighterGearToStash(m);
    currentGang.members = currentGang.members.filter(x => x.id !== fighterId);

    if (isMerc) {
        showToast(`${m.customName} (Mercenaire capturé) a péri. Son équipement disparaît avec lui.`, "error");
    } else {
        showToast(`${m.customName} a péri en captivité. Ses armes et équipements ont été envoyés dans la réserve du gang.`, "error");
    }

    safeSave();
    if (typeof closeModal === 'function') closeModal();
    renderPostBattleView(document.getElementById('main-content'));
    if (typeof ensureGangHasLeader === 'function') ensureGangHasLeader();
}

function resolveCapturedRecovery(fighterId) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    m.ooa = false;
    m.recovery = true;
    if (!m.injuries) m.injuries = [];
    m.injuries.push("Capturé (Évasion / Libéré - Convalescence)");

    safeSave();
    if (typeof closeModal === 'function') closeModal();
    showToast(`${m.customName} est libéré et placé en convalescence (Recovery) jusqu'au prochain Post-Cycle.`, "success");
    renderPostBattleView(document.getElementById('main-content'));
}

function resolveCapturedRansom(fighterId) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    let sel = document.getElementById('captured-ransom-select');
    let amount = sel ? parseInt(sel.value, 10) : 30;
    if (isNaN(amount) || amount < 10 || amount > 60 || amount % 10 !== 0) {
        return showToast("Veuillez sélectionner un montant valide de rançon (entre 10 et 60 crédits, par tranches de 10).", "error");
    }

    let currentCreds = currentGang.credits || 0;

    const finalizeRansomPayment = () => {
        currentGang.credits = currentCreds - amount;
        m.ooa = false;
        m.recovery = true;
        if (!m.injuries) m.injuries = [];
        m.injuries.push(`Capturé (Rançon payée : ${amount}c - Convalescence)`);

        safeSave();
        if (typeof closeModal === 'function') closeModal();
        showToast(`Rançon de ${amount} crédits payée ! ${m.customName} est libéré et placé en convalescence (Recovery) jusqu'à la validation du Post-Cycle.`, "success");
        renderPostBattleView(document.getElementById('main-content'));
    };

    if (currentCreds < amount) {
        showConfirmModal(
            "Solde insuffisant",
            `Attention : le gang ne possède que ${currentCreds} crédits. Régler cette rançon de ${amount} crédits fera passer votre solde à <strong>${currentCreds - amount} crédits</strong>. Voulez-vous confirmer le paiement ?`,
            "Confirmer le paiement",
            finalizeRansomPayment
        );
        return;
    }

    finalizeRansomPayment();
}

function addFighterXP(fighterId, amount) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (m) {
        m.xp = getFighterXP(m) + amount;
        if (typeof checkGangerPromotion === 'function') checkGangerPromotion(m);
        if (typeof checkProspectPromotion === 'function') checkProspectPromotion(m);
        safeSave();
        renderPostBattleView(document.getElementById('main-content'));
        if (typeof processPendingSpecialistChoices === 'function') processPendingSpecialistChoices();
    }
}

function adjustReputation(delta) {
    if (!currentGang) return;
    if (currentGang.reputation === undefined) currentGang.reputation = 1;
    currentGang.reputation = Math.max(1, currentGang.reputation + delta);
    safeSave();
    renderPostBattleView(document.getElementById('main-content'));
}

// ==========================================
// REGISTRE CENTRAL & SESSION POST-CYCLE
// ==========================================
let postCycleSession = {
    assignments: {},
    territoryUsed: {},
    reputationBonusUsed: false
};

function resetPostCycleSession() {
    postCycleSession = {
        assignments: {},
        territoryUsed: {},
        reputationBonusUsed: false
    };
}

function startPostCycleView(container) {
    resetPostCycleSession();
    renderPostCycleView(container);
}

function confirmNewCycle() {
    if (!currentGang) return;
    let crits = (currentGang.members || []).filter(m => m.critInj);

    let title = "Validation du Post-Cycle & Nouveau Cycle";
    let messageHtml = "Voulez-vous valider le Post-Cycle actuel, réinitialiser toutes les actions et territoires pour le nouveau cycle, et lever les convalescences (Recovery) de tous les combattants rétablis ?";
    let btnText = "✅ Valider & Démarrer le nouveau cycle";

    if (crits.length > 0) {
        title = "⚠️ Alerte Blessures Critiques Non Soignées !";
        messageHtml = `
            <div style="background:#2c0c0e; border:1px solid #e74c3c; border-radius:6px; padding:12px; margin-bottom:14px; color:#ff7675; font-size:13px; line-height:1.4;">
                <strong style="font-size:14px;">Attention : ${crits.length} combattant(s) n'ont PAS été emmenés en Escorte Médicale !</strong><br>
                <div style="margin-top:6px; color:#fff;">
                    ${crits.map(c => `• <strong>${c.customName}</strong> (${c.charName})`).join('<br>')}
                </div>
            </div>
            <p style="font-size:14px; color:#eee; line-height:1.5;">
                Conformément aux règles, sans escorte médicale pendant le post-cycle, ces combattants <strong>succombent à leurs blessures critiques</strong>.<br>
                Ils seront <strong>retirés du gang</strong> et l'intégralité de leur équipement (armes, armures, accessoires) rejoindra immédiatement la <strong>réserve du gang (Stash)</strong>.
            </p>
            <p style="font-size:13px; color:#f39c12; margin-top:8px;">
                💡 Si vous souhaitez les sauver, annulez et utilisez l'action <strong>🏥 Escorte Médicale (30 cr)</strong> avant de valider le cycle.
            </p>
        `;
        btnText = "💀 Valider et Acter les Décès";
    }

    showConfirmModal(
        title,
        messageHtml,
        btnText,
        () => {
            let deceasedNames = [];
            if (crits.length > 0) {
                crits.forEach(c => {
                    deceasedNames.push(c.customName);
                    transferFighterGearToStash(c);
                });
                currentGang.members = currentGang.members.filter(m => !m.critInj);
            }

            resetPostCycleSession();
            if (typeof currentGang !== 'undefined' && currentGang && currentGang.members) {
                currentGang.members.forEach(m => {
                    m.recovery = false;
                    m.ooa = false;
                    resolveEndedRecoveryInjuries(m);
                });
                safeSave();
            }

            if (deceasedNames.length > 0) {
                showToast(`Cycle validé. ${deceasedNames.join(', ')} a/ont succombé faute d'escorte médicale. Matériel envoyé dans la réserve.`, "error");
            } else {
                showToast("Post-Cycle validé : territoires libérés, nouveau cycle démarré et combattants en convalescence (Recovery) rétablis !", "success");
            }
            renderPostCycleView(document.getElementById('main-content'));
            if (typeof ensureGangHasLeader === 'function') ensureGangHasLeader();
        }
    );
}

