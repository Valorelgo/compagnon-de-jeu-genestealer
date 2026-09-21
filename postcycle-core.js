// postcycle-core.js (2/4 - issu de l'ancien postbattle.js)
// Rôle : séquence de post-cycle (revenus, soins, territoires...), développement
// tactique (déblocage de cartes tactiques) et recrutement en post-cycle.
// Dépendances : postbattle-sequence.js.

// ==========================================
// 2. SÉQUENCE POST-CYCLE
// ==========================================
function renderPostCycleView(container) {
    if (typeof appState !== 'undefined') appState.view = 'post-cycle';
    if (!container) container = document.getElementById('main-content');
    if (!container) return;

    if (!currentGang) {
        container.innerHTML = `<div class="card"><p>Aucun gang chargé.</p><button onclick="safeNavigate('gang-manage')">Retour</button></div>`;
        return;
    }

    updateGameTopBar();
    if (!currentGang.territories) currentGang.territories = [];
    if (!postCycleSession.territoryUsed) postCycleSession.territoryUsed = {};

    let recoveryMembers = (currentGang.members || []).filter(m => m.recovery && !m.critInj);
    let critMembers = (currentGang.members || []).filter(m => m.critInj);

    let html = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h2>Séquence Post-Cycle — ${currentGang.name}</h2>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn btn-cyan" onclick="openPostCycleRecruitModal()">➕ Recruter un Combattant</button>
                    <button class="btn btn-cyan" onclick="openStashModal()">📦 Réserve du Gang (Stash)</button>
                    <button class="${currentGang.pauseCycleUsed ? 'btn' : 'btn btn-cyan'}" style="${currentGang.pauseCycleUsed ? 'opacity:0.5;' : ''}" onclick="openPauseCycleModal()">⏸️ Cycle de pause${currentGang.pauseCycleUsed ? ' (déjà utilisé)' : ''}</button>
                </div>
            </div>
            <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn" onclick="safeNavigate('gang-manage')">← Retour Gestion du Gang</button>
                <button class="btn btn-cyan" onclick="confirmNewCycle()">✅ Valider le Post-Cycle & Nouveau Cycle</button>
            </div>

            ${critMembers.length > 0 ? `
                <div style="margin-top:12px; background:#2c0c0e; border:1px solid #e74c3c; border-radius:6px; padding:12px 14px; font-size:13px; color:#ff7675;">
                    ⚠️ <strong>Combattant(s) en BLESSURE CRITIQUE :</strong> ${critMembers.map(m => `<strong>${m.customName}</strong>`).join(', ')}<br>
                    <span style="color:#eee; font-size:12px;">Seulement 2 issues possibles : <strong>payer l'Escorte Médicale (30 cr)</strong> pour rétablir le guerrier et le rendre utilisable dès la validation du cycle (pas de Recovery), ou le <strong>laisser mourir</strong> (retiré du gang et équipement envoyé dans la réserve).</span>
                </div>
            ` : ''}

            ${recoveryMembers.length > 0 ? `
                <div style="margin-top:12px; background:#221008; border:1px solid #e67e22; border-radius:6px; padding:10px 14px; font-size:13px; color:#f39c12;">
                    🩹 <strong>Combattant(s) en convalescence (Recovery) :</strong> ${recoveryMembers.map(m => `<strong>${m.customName}</strong>`).join(', ')}<br>
                    <span style="color:#bbb; font-size:12px;">Ces guerriers ne peuvent être assignés à aucune tâche ni participer aux combats avant la validation du Post-Cycle (cliquer sur "Valider le Post-Cycle & Nouveau Cycle" pour lever leur convalescence).</span>
                </div>
            ` : ''}

            <hr style="margin: 15px 0; border-color: #333;">

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                <div style="background:var(--bg-dark, #111); padding:12px; border-radius:6px; border:1px solid #333;">
                    <h3>Actions Spéciales</h3>
                    <button class="btn" style="width:100%; text-align:left; margin-bottom:8px; border-left:4px solid var(--accent-cyan);" onclick="openPostCycleRecruitModal()">
                        ➕ <strong>Recrutement</strong><br>
                        <small>Recruter un combattant du gang ou un mercenaire</small>
                    </button>
                    <button class="btn" style="width:100%; text-align:left; margin-bottom:8px; ${critMembers.length > 0 ? 'border:1px solid #e74c3c; background:#290e11;' : ''}" onclick="actionMedicalEscort()">
                        🏥 <strong>Escorte Médicale</strong> (30 cr) ${critMembers.length > 0 ? `<span style="background:#e74c3c; color:#fff; font-size:11px; padding:2px 7px; border-radius:4px; margin-left:6px; font-weight:bold;">⚠️ ${critMembers.length} requis</span>` : ''}<br>
                        <small>Un Leader/Champion escorte le blessé (30 cr) pour le rétablir dès le cycle validé (sans Recovery)</small>
                    </button>
                    <button class="btn" style="width:100%; text-align:left; margin-bottom:8px;" onclick="actionBionics()">
                        🦾 <strong>Pose de Bioniques</strong> (50 cr)<br>
                        <small>Soigner une blessure spécifique sur un guerrier</small>
                    </button>
                    <button class="btn" style="width:100%; text-align:left; margin-bottom:8px;" onclick="actionTerritoryWork()">
                        ⛏️ <strong>Travail sur les Territoires</strong> (+15 cr / guerrier)<br>
                        <small>Leader, Champion, Ganger ou Prospect (Max 5)</small>
                    </button>
                    <button class="btn" style="width:100%; text-align:left; margin-bottom:8px;" onclick="actionTraining()">
                        🏋️ <strong>Entraînement</strong> (+2 XP / guerrier)<br>
                        <small>Tous les guerriers disponibles</small>
                    </button>
                    <button class="btn" style="width:100%; text-align:left; margin-bottom:8px;" onclick="actionTacticalDevelopment()">
                        🎴 <strong>Développement Tactique</strong> (+1 Carte Tactique / guerrier)<br>
                        <small>Leader ou Champion uniquement</small>
                    </button>
                    <button class="btn btn-cyan" style="width:100%; text-align:left;" onclick="collectAllTerritoryIncome()">
                        💰 <strong>Collecte des Territoires non exploités</strong><br>
                        <small>Récolter les crédits automatiques des territoires disponibles</small>
                    </button>
                    <button class="btn ${postCycleSession.reputationBonusUsed ? '' : 'btn-cyan'}" style="width:100%; text-align:left; margin-top:8px;" ${postCycleSession.reputationBonusUsed ? 'disabled' : ''} onclick="actionReputationBonus()">
                        🏆 <strong>Bonus de Réputation</strong> (+${(typeof calculateGangReputation === 'function' ? calculateGangReputation(currentGang) : (currentGang.reputation || 1)) * 10} cr)<br>
                        <small>${postCycleSession.reputationBonusUsed ? 'Déjà récolté ce cycle' : "10x la réputation du gang, une fois par cycle"}</small>
                    </button>
                </div>

                <div style="background:var(--bg-dark, #111); padding:12px; border-radius:6px; border:1px solid #333;">
                    <h3>Trading Post</h3>
                    <p>Sélectionnez vos envoyés pour générer vos TP et accéder au marché.</p>
                    <p>Crédits du gang : <strong style="color:var(--accent-cyan, #00d2d3);">${currentGang.credits || 0} cr</strong></p>
                    <button class="btn btn-cyan" style="width:100%;" onclick="openTradingPostSetupModal()">Visiter le Trading Post</button>
                </div>
            </div>

            <hr style="margin: 15px 0; border-color: #333;">
            
            <h3>🗺️ Territoires Possédés & Options</h3>
            <div style="background:var(--bg-dark, #111); padding:12px; border-radius:6px; margin-bottom:15px; border:1px solid #333;">
    `;

    if (currentGang.territories.length === 0) {
        html += `<p style="color:#888;">Aucun territoire contrôlé pour le moment.</p>`;
    } else {
        currentGang.territories.forEach((terId, idx) => {
            let tDef = getTerritoryDef(terId) || { name: terId, desc: "Territoire inconnu" };
            let usage = postCycleSession.territoryUsed[idx];

            let statusMarkup = '';
            if (usage === 'credits') {
                statusMarkup = `<span style="color:#2ecc71; font-size:12px; font-weight:bold;">✅ Crédits récoltés</span>`;
            } else if (usage === 'option') {
                statusMarkup = `<span style="color:var(--accent-cyan); font-size:12px; font-weight:bold;">🎁 Option utilisée</span>`;
            } else if (tDef.optionType) {
                statusMarkup = `
                    <button class="btn btn-cyan" style="padding:4px 10px; font-size:12px;" onclick="claimTerritoryOption('${tDef.id || terId}', ${idx})">
                        🎁 ${tDef.optionText || "Utiliser l'option"}
                    </button>
                `;
            }

            html += `
                <div style="border:1px solid #333; padding:8px; margin-bottom:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                        <strong>${tDef.name}</strong> — <small style="color:#ccc;">${tDef.desc || ''}</small>
                    </div>
                    <div>
                        ${statusMarkup}
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>

            <hr style="margin: 15px 0; border-color: #333;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                <h3 style="margin:0;">Dépense d'XP & Avancées des Guerriers (${(currentGang.members || []).length})</h3>
                <button class="btn btn-cyan" onclick="openPostCycleRecruitModal()">➕ Recruter un Combattant</button>
            </div>
            <div class="roster-list">
    `;

    (currentGang.members || []).forEach(m => {
        let pendingAdvances = getPendingAdvances(m);
        let btnLevelUp = pendingAdvances > 0 
            ? `<button class="btn btn-cyan" onclick="openLevelUpModal('${m.id}')">⭐ Montée de Niveau (${pendingAdvances})</button>`
            : `<button class="btn" disabled style="opacity:0.4; cursor:not-allowed;">⭐ Montée de Niveau (0)</button>`;

        let statusBadges = '';
        if (m.critInj) {
            statusBadges += `<span style="background:#c0392b; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:6px;">⚠️ Blessure Critique</span>`;
        }
        if (m.recovery) {
            statusBadges += `<span style="background:#d35400; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:6px;">🩹 Recovery</span>`;
        }

        html += `
            <div class="fighter-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div>
                    <strong>${m.customName}</strong> (${m.charName})${statusBadges}<br>
                    <small>XP : <strong>${getFighterXP(m)}</strong> | Rang : ${getFighterRank(getFighterXP(m))} | Coût : ${m.totalCost || m.cost || 0} cr</small>
                    ${isFighterBusy(m.id) ? `<br><small style="color:var(--accent-purple); font-weight:bold;">⚡ Activité : ${isFighterBusy(m.id)}</small>` : ''}
                </div>
                <div style="display:flex; gap:6px;">
                    ${btnLevelUp}
                    <button class="btn btn-cyan" onclick="openPostCycleEquipment('${m.id}')">Équipements</button>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Cycle de pause : événement de campagne à mi-parcours où chaque gang reçoit
// 250 crédits à dépenser en guerriers et équipements. currentGang.pauseCycleUsed
// trace si le gang l'a déjà utilisé (le bouton se grise mais reste cliquable,
// pour permettre un second passage volontaire ou la correction d'une erreur).
function openPauseCycleModal() {
    if (!currentGang) return;

    if (!currentGang.pauseCycleUsed) {
        showConfirmModal(
            "⏸️ Cycle de pause",
            "Confirmez-vous qu'il s'agit bien du cycle de pause de la campagne ? Votre gang va recevoir <strong>250 crédits</strong> à dépenser en guerriers et équipements.",
            "Confirmer (+250 cr)",
            () => applyPauseCycle()
        );
        return;
    }

    const html = `
        <div style="padding: 10px 0;">
            <div style="font-size: 15px; margin-bottom: 18px; line-height: 1.5; color: #eee;">
                ⚠️ Attention, vous avez déjà utilisé le cycle de pause. Êtes-vous sûr de vouloir continuer ?
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; flex-wrap:wrap;">
                <button class="btn" style="padding: 8px 16px; margin:0;" onclick="closeModal();">Annuler</button>
                <button class="btn-danger" style="padding: 8px 16px; margin:0;" onclick="closeModal(); undoPauseCycle();">Cycle de pause fait par erreur ? (-250 cr)</button>
                <button class="btn btn-cyan" style="padding: 8px 20px; font-weight: bold; margin:0;" onclick="closeModal(); applyPauseCycle();">Confirmer quand même (+250 cr)</button>
            </div>
        </div>
    `;
    openModal("⏸️ Cycle de pause déjà utilisé", html);
}

function applyPauseCycle() {
    if (!currentGang) return;
    currentGang.credits = (currentGang.credits || 0) + 250;
    currentGang.pauseCycleUsed = true;
    saveGangs();
    showToast("Cycle de pause : +250 crédits reçus.", "success");
    renderPostCycleView(document.getElementById('main-content'));
}

function undoPauseCycle() {
    if (!currentGang) return;
    currentGang.credits = (currentGang.credits || 0) - 250;
    saveGangs();
    showToast("Cycle de pause annulé : -250 crédits.", "success");
    renderPostCycleView(document.getElementById('main-content'));
}

function openPostCycleEquipment(fighterId) {
    if (!currentGang || !currentGang.members) return;
    let idx = currentGang.members.findIndex(x => x.id === fighterId);
    if (idx < 0) return;
    if (typeof appState !== 'undefined') {
        appState.returnTo = 'post-cycle';
    }
    if (typeof editFighter === 'function') {
        editFighter(idx);
    }
}
window.openPostCycleEquipment = openPostCycleEquipment;

function isFighterBusy(fId) {
    return postCycleSession.assignments[fId] || null;
}

// Combattants pouvant escorter une opération (Escorte Médicale, Pose de
// Bioniques...) : Leader, Champion, ou porteur de la règle spéciale/compétence
// "Escorte". excludeId permet d'exclure le patient lui-même de la liste.
// Fonction partagée pour ne définir cette règle qu'à un seul endroit.
function getAvailableEscorts(excludeId) {
    return (currentGang.members || []).filter(e => {
        if (excludeId && e.id === excludeId) return false;
        if (e.recovery || e.critInj || isFighterBusy(e.id)) return false;
        let types = (e.type || []).map(t => (t || '').toLowerCase());
        let isLeaderOrChamp = types.includes("leader") || types.includes("champion");
        let hasEscortRule = (e.special_rules || []).some(r => (r || '').toLowerCase().includes("escorte")) ||
                            (e.skills || []).some(s => (typeof s === 'string' ? s : s.name).toLowerCase().includes("escorte"));
        return isLeaderOrChamp || hasEscortRule;
    });
}

function actionMedicalEscort() {
    if (!currentGang) return;
    let crits = (currentGang.members || []).filter(m => m.critInj);
    if (crits.length === 0) {
        return showToast("Aucun guerrier n'a de blessure critique à soigner actuellement.", "error");
    }

    let unassignedCrits = crits.filter(m => !isFighterBusy(m.id));
    if (unassignedCrits.length === 0) {
        return showToast("Tous les guerriers en blessure critique ont déjà été pris en charge ce cycle.", "error");
    }

    let availableEscorts = getAvailableEscorts();

    let creds = currentGang.credits || 0;
    let canAfford = creds >= 30;

    let html = `
        <div style="padding:2px;">
            <div style="background:#1c0d10; border:1px solid #c0392b; border-radius:6px; padding:12px; margin-bottom:14px; color:#ddd; font-size:13px; line-height:1.5;">
                <strong style="color:#ff6b6b; font-size:14px;">🏥 Règle de l'Escorte Médicale (30 crédits)</strong><br>
                Un combattant en <strong>Blessure Critique</strong> n'a que <strong>2 issues possibles</strong> :<br>
                • <strong>Payer l'Escorte Médicale (30 crédits)</strong> : Accompagné par un Leader ou un Champion, le guerrier est soigné par le Médicae. Il est <strong>entièrement rétabli et directement utilisable dès la validation du Post-Cycle</strong> (il ne part <em>pas</em> en Recovery).<br>
                • <strong>Ne pas payer l'escorte</strong> : Le combattant succombe à ses blessures et <strong>meurt</strong>. L'intégralité de ses armes et équipements rejoint immédiatement la <strong>réserve du gang (Stash)</strong>.
            </div>

            <div style="background:#111; border:1px solid #333; border-radius:6px; padding:12px; margin-bottom:12px;">
                <label style="font-weight:bold; display:block; margin-bottom:6px; font-size:13px; color:var(--accent-cyan);">1. Combattant en Blessure Critique :</label>
                ${unassignedCrits.length === 1 ? `
                    <input type="hidden" id="med-escort-target-id" value="${unassignedCrits[0].id}">
                    <div style="padding:8px 10px; background:#1e1e24; border:1px solid #444; border-radius:4px; font-weight:bold; color:#fff;">
                        🚑 ${unassignedCrits[0].customName} <small style="color:#aaa;">(${unassignedCrits[0].charName})</small>
                    </div>
                ` : `
                    <select id="med-escort-target-id" style="width:100%; padding:8px 10px; background:#1e1e24; color:#fff; border:1px solid var(--accent-cyan); border-radius:4px; font-size:13px;">
                        ${unassignedCrits.map(c => `<option value="${c.id}">🚑 ${c.customName} (${c.charName})</option>`).join('')}
                    </select>
                `}
            </div>

            <div style="background:#111; border:1px solid #333; border-radius:6px; padding:12px; margin-bottom:12px;">
                <label style="font-weight:bold; display:block; margin-bottom:6px; font-size:13px; color:var(--accent-cyan);">2. Leader ou Champion accompagnateur :</label>
                ${availableEscorts.length === 0 ? `
                    <div style="color:#ff6b6b; font-size:12px; padding:6px 0;">
                        ⚠️ Aucun Leader ou Champion disponible (tous sont occupés ou en convalescence). Sans escorteur, le combattant ne peut pas être conduit au Médicae.
                    </div>
                ` : `
                    <select id="med-escort-companion-id" style="width:100%; padding:8px 10px; background:#1e1e24; color:#fff; border:1px solid var(--accent-cyan); border-radius:4px; font-size:13px;">
                        ${availableEscorts.map(e => `<option value="${e.id}">🛡️ ${e.customName} (${e.charName} - ${(e.type || []).join(', ')})</option>`).join('')}
                    </select>
                    <small style="color:#888; display:block; margin-top:4px;">L'escorteur utilise son action de cycle pour accompagner le blessé.</small>
                `}
            </div>

            <div style="background:#0c0d12; border:1px solid #222; border-radius:6px; padding:10px 12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                <div>
                    <span style="color:#aaa;">Coût de l'escorte :</span> <strong style="color:#ff7675;">-30 crédits</strong><br>
                    <small style="color:#888;">Solde actuel du gang : ${creds} cr</small>
                </div>
                <div style="text-align:right;">
                    <span style="color:#aaa;">Solde après règlement :</span><br>
                    <strong style="color:${canAfford ? '#2ecc71' : '#e74c3c'}; font-size:14px;">${creds - 30} cr</strong>
                </div>
            </div>

            ${!canAfford ? `
                <div style="background:#2a0a0d; border:1px solid #e74c3c; border-radius:5px; padding:8px 10px; margin-bottom:12px; font-size:12px; color:#ff7675;">
                    ⚠️ Crédits insuffisants : 30 crédits sont requis pour payer le Médicae. Faute de moyens, le combattant succombera lors de la validation du cycle.
                </div>
            ` : ''}

            <div style="display:flex; gap:10px; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-top:14px;">
                <button class="btn" style="background:#3a1215; color:#ff7675; border:1px solid #e74c3c;" onclick="executeAbandonCriticallyInjured()">
                    💀 Ne pas soigner (Décès immédiat)
                </button>
                <div style="display:flex; gap:8px;">
                    <button class="btn" onclick="closeModal()">Fermer</button>
                    <button class="btn btn-cyan" style="font-weight:bold;" ${(!canAfford || availableEscorts.length === 0) ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="confirmExecuteMedicalEscort()">
                        🏥 Payer l'Escorte & Rétablir (-30 cr)
                    </button>
                </div>
            </div>
        </div>
    `;

    if (typeof openModal === 'function') {
        openModal("🏥 Escorte Médicale (30 crédits)", html);
    }
}
window.actionMedicalEscort = actionMedicalEscort;

function confirmExecuteMedicalEscort() {
    if (!currentGang) return;
    let targetElem = document.getElementById('med-escort-target-id');
    let escortElem = document.getElementById('med-escort-companion-id');

    if (!targetElem || !escortElem) return;

    let targetId = targetElem.value;
    let escortId = escortElem.value;

    let target = currentGang.members.find(x => x.id === targetId);
    let escort = currentGang.members.find(x => x.id === escortId);
    if (!target || !escort) return showToast("Sélection invalide.", "error");

    let creds = currentGang.credits || 0;
    if (creds < 30) {
        return showToast("Crédits insuffisants (30 crédits requis pour le Médicae).", "error");
    }

    currentGang.credits = creds - 30;

    // Le guerrier est rétabli et utilisable directement dès le post cycle validé, il ne part pas en recovery !
    target.critInj = false;
    target.recovery = false;
    if (target.injuries && Array.isArray(target.injuries)) {
        target.injuries = target.injuries.filter(inj => inj !== "Blessure critique" && inj !== "Blessure Critique");
    }

    postCycleSession.assignments[target.id] = 'Escorte Médicale';
    postCycleSession.assignments[escort.id] = 'Escorte Médicale';

    safeSave();
    if (typeof closeModal === 'function') closeModal();
    showToast(`🏥 Escorte médicale payée pour ${target.customName} (-30 cr) ! Le guerrier est rétabli et sera directement utilisable dès la validation du cycle.`, "success");
    renderPostCycleView(document.getElementById('main-content'));
}
window.confirmExecuteMedicalEscort = confirmExecuteMedicalEscort;

function executeAbandonCriticallyInjured() {
    if (!currentGang) return;
    let targetElem = document.getElementById('med-escort-target-id');
    if (!targetElem) return;
    let targetId = targetElem.value;
    let target = currentGang.members.find(x => x.id === targetId);
    if (!target) return showToast("Sélection invalide.", "error");

    showConfirmModal(
        "Confirmation du décès",
        `Êtes-vous certain de ne pas prodiguer d'escorte médicale à <strong>${target.customName}</strong> ?<br><br>Le combattant va succomber immédiatement à ses blessures critiques. Toutes ses armes, armures et équipements seront envoyés dans la <strong>réserve du gang (Stash)</strong>.`,
        "💀 Confirmer le décès",
        () => {
            let isMerc = isFighterMercenary(target);
            transferFighterGearToStash(target);
            currentGang.members = currentGang.members.filter(x => x.id !== target.id);
            if (postCycleSession && postCycleSession.assignments) {
                delete postCycleSession.assignments[target.id];
            }
            safeSave();
            if (typeof closeModal === 'function') closeModal();
            if (isMerc) {
                showToast(`${target.customName} (Mercenaire) a succombé. Son équipement disparaît avec lui.`, "error");
            } else {
                showToast(`${target.customName} a succombé à ses blessures. Ses armes et équipements ont été envoyés dans la réserve (Stash).`, "error");
            }
            renderPostCycleView(document.getElementById('main-content'));
            if (typeof ensureGangHasLeader === 'function') ensureGangHasLeader();
        }
    );
}
window.executeAbandonCriticallyInjured = executeAbandonCriticallyInjured;

function actionBionics() {
    if (!currentGang) return;
    let injuredMembers = (currentGang.members || []).filter(m => (m.injuries && m.injuries.length > 0) || m.critInj || m.recovery);

    if (injuredMembers.length === 0) return showToast("Aucun combattant n'a de blessure permanente ou séquelle à soigner.", "error");

    let html = `
        <p>Crédits du gang : <strong style="color:var(--accent-cyan, #00d2d3);">${currentGang.credits || 0} cr</strong> | Coût par pose : <strong>50 cr</strong></p>
        <p><small style="color:#e74c3c;">⚠️ Règle : 1 seule action post-cycle par guerrier.</small></p>
        <hr style="margin:10px 0; border-color:#333;">
        <div style="max-height:50vh; overflow-y:auto;">
    `;

    injuredMembers.forEach(m => {
        let busyReason = isFighterBusy(m.id);
        let isBusyOther = busyReason && busyReason !== 'Pose Bionique';

        html += `
            <div style="border:1px solid #444; padding:8px; margin-bottom:8px; border-radius:4px; background:#111; ${isBusyOther ? 'opacity:0.4;' : ''}">
                <strong>${m.customName}</strong> (${m.charName})
                ${isBusyOther ? `<small style="color:#e74c3c; margin-left:10px;">Occupé : ${busyReason}</small>` : ''}
                <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px;">
        `;

        if (m.critInj) {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#2a0808; padding:4px; border-radius:3px;">
                    <small style="color:#e74c3c;">Blessure Critique</small>
                    <button class="btn btn-cyan" ${isBusyOther ? 'disabled' : ''} style="padding:2px 6px; font-size:11px;" onclick="openBionicsEscortModal('${m.id}', 'critInj')">Soigner (-50 cr)</button>
                </div>
            `;
        }

        if (m.recovery) {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#2a2008; padding:4px; border-radius:3px;">
                    <small style="color:#f39c12;">En Convalescence (Recovery)</small>
                    <button class="btn btn-cyan" ${isBusyOther ? 'disabled' : ''} style="padding:2px 6px; font-size:11px;" onclick="openBionicsEscortModal('${m.id}', 'recovery')">Soigner (-50 cr)</button>
                </div>
            `;
        }

        (m.injuries || []).forEach((injName, idx) => {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#222; padding:4px; border-radius:3px;">
                    <small style="color:#aaa;">${injName}</small>
                    <button class="btn btn-cyan" ${isBusyOther ? 'disabled' : ''} style="padding:2px 6px; font-size:11px;" onclick="openBionicsEscortModal('${m.id}', ${idx})">Soigner (-50 cr)</button>
                </div>
            `;
        });

        html += `</div></div>`;
    });

    html += `</div><br><button class="btn" onclick="closeModal()">Fermer</button>`;
    if (typeof openModal === 'function') openModal("🦾 Pose de Bioniques", html);
}

// Détermine, comme pour l'Escorte Médicale, quels combattants peuvent
// accompagner une pose bionique : Leader, Champion, ou porteur de la règle
// spéciale/compétence "Escorte". Le patient ne peut pas s'escorter lui-même.
// Alias conservé pour la lisibilité des appels côté Bioniques (délègue à la
// fonction partagée getAvailableEscorts).
function getAvailableBionicsEscorts(patientId) {
    return getAvailableEscorts(patientId);
}

// Étape intermédiaire avant la pose bionique : comme pour l'Escorte Médicale,
// un Leader/Champion doit accompagner l'opération. L'effet à soigner (choisi
// dans la liste de actionBionics() quand il y en a plusieurs) est conservé
// tel quel jusqu'à la confirmation.
function openBionicsEscortModal(fighterId, targetType) {
    if (!currentGang) return;
    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    let effectLabel = 'cet effet';
    if (targetType === 'critInj') effectLabel = 'Blessure Critique';
    else if (targetType === 'recovery') effectLabel = 'Convalescence (Recovery)';
    else if (typeof targetType === 'number' && m.injuries && m.injuries[targetType] !== undefined) effectLabel = m.injuries[targetType];

    let availableEscorts = getAvailableBionicsEscorts(m.id);
    let creds = currentGang.credits || 0;
    let canAfford = creds >= 50;
    let targetValue = (typeof targetType === 'number') ? targetType : `'${targetType}'`;

    let html = `
        <div style="padding:2px;">
            <div style="background:#111318; border:1px solid #333; border-radius:6px; padding:10px 14px; margin-bottom:14px; font-size:13px; color:#ddd; line-height:1.5;">
                Pose bionique sur <strong style="color:var(--accent-cyan);">${m.customName}</strong> pour soigner : <strong>${effectLabel}</strong>.<br>
                Comme pour l'Escorte Médicale, un <strong>Leader ou Champion</strong> (ou un guerrier avec la règle "Escorte") doit accompagner l'opération.
            </div>

            <div style="background:#111; border:1px solid #333; border-radius:6px; padding:12px; margin-bottom:12px;">
                <label style="font-weight:bold; display:block; margin-bottom:6px; font-size:13px; color:var(--accent-cyan);">Leader ou Champion accompagnateur :</label>
                ${availableEscorts.length === 0 ? `
                    <div style="color:#ff6b6b; font-size:12px; padding:6px 0;">
                        ⚠️ Aucun Leader ou Champion disponible (tous sont occupés, en convalescence, ou blessés). Sans escorteur, la pose bionique n'est pas possible.
                    </div>
                ` : `
                    <select id="bionics-escort-id" style="width:100%; padding:8px 10px; background:#1e1e24; color:#fff; border:1px solid var(--accent-cyan); border-radius:4px; font-size:13px;">
                        ${availableEscorts.map(e => `<option value="${e.id}">🛡️ ${e.customName} (${e.charName} - ${(e.type || []).join(', ')})</option>`).join('')}
                    </select>
                `}
            </div>

            <div style="background:#0c0d12; border:1px solid #222; border-radius:6px; padding:10px 12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                <span style="color:#aaa;">Coût de la pose :</span> <strong style="color:#ff7675;">-50 crédits</strong>
                <span style="color:${canAfford ? '#2ecc71' : '#e74c3c'};">Solde : ${creds} cr</span>
            </div>
            ${!canAfford ? `<div style="background:#2a0a0d; border:1px solid #e74c3c; border-radius:5px; padding:8px 10px; margin-bottom:12px; font-size:12px; color:#ff7675;">⚠️ Crédits insuffisants : 50 crédits sont requis.</div>` : ''}

            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button class="btn" onclick="actionBionics()">Annuler</button>
                <button class="btn btn-cyan" style="font-weight:bold;" ${(!canAfford || availableEscorts.length === 0) ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="confirmBionicsWithEscort('${m.id}', ${targetValue})">
                    🦾 Payer & Poser la Bionique (-50 cr)
                </button>
            </div>
        </div>
    `;

    if (typeof openModal === 'function') openModal("🦾 Pose de Bioniques — Escorte requise", html);
}

function confirmBionicsWithEscort(fighterId, targetType) {
    let escortElem = document.getElementById('bionics-escort-id');
    if (!escortElem) return showToast("Sélection invalide.", "error");
    healSpecificInjury(fighterId, targetType, escortElem.value);
}

function healSpecificInjury(fighterId, targetType, escortId) {
    if (!currentGang) return;
    if ((currentGang.credits || 0) < 50) return showToast("Crédits insuffisants (50 cr requis).", "error");

    let m = currentGang.members.find(x => x.id === fighterId);
    if (!m) return;

    let escort = escortId ? currentGang.members.find(x => x.id === escortId) : null;
    if (!escort) return showToast("Un Leader ou Champion doit accompagner la pose bionique.", "error");

    currentGang.credits -= 50;
    postCycleSession.assignments[m.id] = 'Pose Bionique';
    postCycleSession.assignments[escort.id] = 'Pose Bionique';

    if (targetType === 'critInj') m.critInj = false;
    else if (targetType === 'recovery') {
        m.recovery = false;
        if (m.injuries && Array.isArray(m.injuries)) {
            m.injuries = m.injuries.filter(inj => inj !== 'Le guerrier part en recovery');
        }
    }
    else if (typeof targetType === 'number' && m.injuries && m.injuries[targetType] !== undefined) {
        // Si la blessure soignée correspond à un malus permanent de statistique
        // (encore affichée "en recovery" ou déjà passée en séquelle), le point
        // perdu est restauré : la pose bionique remplace la fonction abîmée.
        let healedInj = m.injuries[targetType];
        let def = (typeof healedInj === 'string') ? getPermanentInjuryDef(healedInj) : null;
        let statKey = def && def.statKey;
        if (!statKey && typeof healedInj === 'string') {
            let seqMatch = healedInj.match(/^Séquelle : -1 (BS|WS|M|S|T|Ld)$/);
            if (seqMatch) statKey = seqMatch[1];
        }
        if (statKey) applyStatUpgrade(m, statKey);
        m.injuries.splice(targetType, 1);
    }

    safeSave();
    showToast(`Traitement bionique appliqué avec succès sur ${m.customName} !`, "success");
    closeModal();
    renderPostCycleView(document.getElementById('main-content'));
}

function actionTerritoryWork() {
    if (!currentGang || !currentGang.members) return;

    let eligible = currentGang.members.filter(m => {
        if (m.recovery || m.critInj) return false;
        let types = (m.type || []).map(t => t.toLowerCase());
        return types.some(t => t.includes("leader") || t.includes("champion") || t.includes("ganger") || t.includes("prospect") || t.includes("juve"));
    });

    let html = `
        <p><small>Sélectionnez jusqu'à <strong>5 combattants</strong> (+15 cr par guerrier).</small></p>
        <p><small style="color:#e74c3c;">⚠️ Règle : 1 seule action post-cycle par guerrier.</small></p>
        <hr style="margin:10px 0; border-color:#333;">
        <div style="max-height:50vh; overflow-y:auto;">
    `;

    eligible.forEach(m => {
        let busyReason = isFighterBusy(m.id);
        let isWorking = busyReason === 'Travail Territoires';
        let isBusyOther = busyReason && busyReason !== 'Travail Territoires';

        html += `
            <div style="background:#111; border:1px solid #333; padding:8px; border-radius:5px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; ${isBusyOther ? 'opacity:0.4;' : ''}">
                <div>
                    <strong style="color:var(--accent-cyan);">${m.customName || m.charName}</strong> 
                    <small style="color:#aaa;">(${(m.type || []).join(', ')})</small>
                    ${isBusyOther ? `<br><small style="color:#e74c3c;">Occupé : ${busyReason}</small>` : ''}
                </div>
                <input type="checkbox" class="work-fighter-cb" value="${m.id}" ${isWorking ? 'checked' : ''} ${isBusyOther ? 'disabled' : ''} onchange="limitTerritoryWorkCB(this)" style="transform:scale(1.2); cursor:pointer;">
            </div>
        `;
    });

    html += `
        </div><br>
        <button class="btn btn-cyan" onclick="confirmTerritoryWork()">Valider le travail</button>
        <button class="btn" onclick="closeModal()">Annuler</button>
    `;

    if (typeof openModal === 'function') openModal("⛏️ Travail sur les Territoires", html);
}

function limitTerritoryWorkCB(changedCb) {
    if (document.querySelectorAll('.work-fighter-cb:checked').length > 5) {
        changedCb.checked = false;
        showToast("Maximum 5 guerriers peuvent travailler.", "info");
    }
}

function confirmTerritoryWork() {
    let selectedIds = Array.from(document.querySelectorAll('.work-fighter-cb:checked')).map(cb => cb.value);
    let newlyAssigned = 0, unassigned = 0;

    (currentGang.members || []).forEach(m => {
        let wasWorking = postCycleSession.assignments[m.id] === 'Travail Territoires';
        let isSelected = selectedIds.includes(m.id);

        if (isSelected && !wasWorking) {
            postCycleSession.assignments[m.id] = 'Travail Territoires';
            newlyAssigned++;
        } else if (!isSelected && wasWorking) {
            delete postCycleSession.assignments[m.id];
            unassigned++;
        }
    });

    let creditDiff = (newlyAssigned * 15) - (unassigned * 15);
    currentGang.credits = Math.max(0, (currentGang.credits || 0) + creditDiff);

    safeSave();
    closeModal();
    renderPostCycleView(document.getElementById('main-content'));
}

function actionTraining() {
    if (!currentGang || !currentGang.members) return;

    let eligible = currentGang.members.filter(m => !m.recovery && !m.critInj);

    let html = `
        <p><small>Chaque combattant sélectionné gagne <strong>+2 XP</strong>.</small></p>
        <p><small style="color:#e74c3c;">⚠️ Règle : 1 seule action post-cycle par guerrier.</small></p>
        <hr style="margin:10px 0; border-color:#333;">
        <div style="max-height:50vh; overflow-y:auto;">
    `;

    eligible.forEach(m => {
        let busyReason = isFighterBusy(m.id);
        let isTraining = busyReason === 'Entraînement';
        let isBusyOther = busyReason && busyReason !== 'Entraînement';

        html += `
            <div style="background:#111; border:1px solid #333; padding:8px; border-radius:5px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; ${isBusyOther ? 'opacity:0.4;' : ''}">
                <div>
                    <strong style="color:var(--accent-cyan);">${m.customName || m.charName}</strong> 
                    <small style="color:#aaa;">(XP actuelle : ${getFighterXP(m)})</small>
                    ${isBusyOther ? `<br><small style="color:#e74c3c;">Occupé : ${busyReason}</small>` : ''}
                </div>
                <input type="checkbox" class="training-fighter-cb" value="${m.id}" ${isTraining ? 'checked' : ''} ${isBusyOther ? 'disabled' : ''} style="transform:scale(1.2); cursor:pointer;">
            </div>
        `;
    });

    html += `
        </div><br>
        <button class="btn btn-cyan" onclick="confirmTraining()">Valider l'entraînement</button>
        <button class="btn" onclick="closeModal()">Annuler</button>
    `;

    if (typeof openModal === 'function') openModal("🏋️ Entraînement des Guerriers", html);
}

function confirmTraining() {
    let selectedIds = Array.from(document.querySelectorAll('.training-fighter-cb:checked')).map(cb => cb.value);

    (currentGang.members || []).forEach(m => {
        let wasTraining = postCycleSession.assignments[m.id] === 'Entraînement';
        let isSelected = selectedIds.includes(m.id);

        if (isSelected && !wasTraining) {
            postCycleSession.assignments[m.id] = 'Entraînement';
            m.xp = getFighterXP(m) + 2;
            if (typeof checkGangerPromotion === 'function') checkGangerPromotion(m);
            if (typeof checkProspectPromotion === 'function') checkProspectPromotion(m);
        } else if (!isSelected && wasTraining) {
            delete postCycleSession.assignments[m.id];
            m.xp = Math.max(0, getFighterXP(m) - 2);
        }
    });

    safeSave();
    closeModal();
    renderPostCycleView(document.getElementById('main-content'));
    if (typeof processPendingSpecialistChoices === 'function') processPendingSpecialistChoices();
}

// ==========================================
// DÉVELOPPEMENT TACTIQUE
// ==========================================
function actionTacticalDevelopment() {
    if (!currentGang || !currentGang.members) return;
    if (!currentGang.tactics) currentGang.tactics = [];

    let eligible = currentGang.members.filter(m => {
        if (m.recovery || m.critInj) return false;
        let types = (m.type || []).map(t => (t || '').toLowerCase());
        return types.includes("leader") || types.includes("champion");
    });

    if (eligible.length === 0) {
        return showToast("Aucun Leader ou Champion disponible (ou tous sont en convalescence).", "error");
    }

    let ownedIds = currentGang.tactics.map(t => (typeof t === 'string' ? t : t.id));
    let allPool = (typeof db !== 'undefined' && db.tactics) ? db.tactics : [];
    let availablePool = allPool.filter(t => !ownedIds.includes(t.id));

    if (availablePool.length === 0) {
        return showToast(`Toutes les cartes tactiques (${allPool.length}/${allPool.length}) ont déjà été découvertes par le gang !`, "error");
    }

    let html = `
        <p><small>Sélectionnez un <strong>Leader</strong> et/ou des <strong>Champions</strong> pour lancer le développement tactique.</small></p>
        <p><small>Pour chaque guerrier choisi, <strong>1 nouvelle carte tactique</strong> est tirée aléatoirement parmi les cartes que le gang ne possède pas encore (aucun doublon).</small></p>
        <div style="background:#11131c; border:1px solid #282b42; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:13px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span>Cartes actuelles du gang : <strong style="color:var(--accent-purple);">${currentGang.tactics.length}</strong></span>
            <span>Cartes restantes à découvrir : <strong style="color:var(--accent-cyan);">${availablePool.length} / ${allPool.length}</strong></span>
        </div>
        <p><small style="color:#e74c3c;">⚠️ Règle : 1 seule action post-cycle par guerrier.</small></p>
        <hr style="margin:10px 0; border-color:#333;">
        <div style="max-height:50vh; overflow-y:auto;">
    `;

    eligible.forEach(m => {
        let busyReason = isFighterBusy(m.id);
        let isAlreadyDone = busyReason === 'Développement Tactique';
        let isBusyOther = busyReason && !isAlreadyDone;

        let statusText = '';
        if (isAlreadyDone) {
            statusText = `<span style="color:#2ecc71; font-size:12px; font-weight:bold;">✅ Tactique déjà développée ce cycle</span>`;
        } else if (isBusyOther) {
            statusText = `<span style="color:#e74c3c; font-size:12px;">Occupé : ${busyReason}</span>`;
        }

        html += `
            <div style="background:#111; border:1px solid #333; padding:8px 12px; border-radius:5px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; ${(isBusyOther || isAlreadyDone) ? 'opacity:0.5;' : ''}">
                <div>
                    <strong style="color:var(--accent-cyan);">${m.customName || m.charName}</strong> 
                    <small style="color:#aaa;">(${(m.type || []).join(', ')})</small>
                    ${statusText ? `<br>${statusText}` : ''}
                </div>
                ${isAlreadyDone 
                    ? `<span style="color:#2ecc71; font-size:16px;">✔</span>` 
                    : `<input type="checkbox" class="tactics-fighter-cb" value="${m.id}" ${isBusyOther ? 'disabled' : ''} onchange="limitTacticsDevCB(this, ${availablePool.length})" style="transform:scale(1.2); cursor:pointer;">`
                }
            </div>
        `;
    });

    html += `
        </div><br>
        <button class="btn btn-cyan" onclick="confirmTacticalDevelopment()">🎴 Lancer le développement</button>
        <button class="btn" onclick="closeModal()">Annuler</button>
    `;

    if (typeof openModal === 'function') openModal("🎴 Développement Tactique", html);
}

function limitTacticsDevCB(changedCb, maxAvailable) {
    let checkedCount = document.querySelectorAll('.tactics-fighter-cb:checked').length;
    if (checkedCount > maxAvailable) {
        changedCb.checked = false;
        showToast(`Il ne reste que ${maxAvailable} carte(s) tactique(s) disponible(s) à débloquer !`, "info");
    }
}

function confirmTacticalDevelopment() {
    if (!currentGang || !currentGang.members) return;
    if (!currentGang.tactics) currentGang.tactics = [];

    let checkedBoxes = Array.from(document.querySelectorAll('.tactics-fighter-cb:checked'));
    if (checkedBoxes.length === 0) {
        return showToast("Veuillez sélectionner au moins un Leader ou Champion.", "error");
    }

    let ownedIds = currentGang.tactics.map(t => (typeof t === 'string' ? t : t.id));
    let allPool = (typeof db !== 'undefined' && db.tactics) ? db.tactics : [];
    let availablePool = allPool.filter(t => !ownedIds.includes(t.id));

    if (availablePool.length === 0) {
        return showToast("Toutes les cartes tactiques ont déjà été découvertes par le gang !", "error");
    }

    if (checkedBoxes.length > availablePool.length) {
        return showToast(`Vous avez sélectionné ${checkedBoxes.length} guerrier(s) mais il ne reste que ${availablePool.length} carte(s) à découvrir.`, "info");
    }

    let newlyDrawn = [];

    checkedBoxes.forEach(cb => {
        let fId = cb.value;
        let fighter = currentGang.members.find(m => m.id === fId);
        if (!fighter) return;

        let randIdx = Math.floor(Math.random() * availablePool.length);
        let pickedCard = availablePool.splice(randIdx, 1)[0];

        currentGang.tactics.push(JSON.parse(JSON.stringify(pickedCard)));
        postCycleSession.assignments[fId] = 'Développement Tactique';

        newlyDrawn.push({
            fighterName: fighter.customName || fighter.charName,
            card: pickedCard
        });
    });

    safeSave();

    let resHtml = `
        <div style="padding:4px;">
            <p style="color:#2ecc71; font-size:15px; font-weight:bold; margin-bottom:12px;">
                🎉 ${newlyDrawn.length} nouvelle(s) carte(s) tactique(s) ajoutée(s) au gang !
            </p>
            <div style="max-height:55vh; overflow-y:auto;">
    `;

    newlyDrawn.forEach(item => {
        resHtml += `
            <div style="border:1px solid #444; background:#111; border-radius:6px; padding:10px 12px; margin-bottom:10px; border-left:4px solid var(--accent-purple);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong style="color:var(--accent-cyan); font-size:15px;">${item.card.name}</strong>
                    <small style="color:#aaa; background:#1e2130; padding:2px 8px; border-radius:4px;">Générée par : <strong>${item.fighterName}</strong></small>
                </div>
                <div style="font-size:12px; color:#c084fc; margin-bottom:4px;">
                    <strong>Timing :</strong> ${item.card.timing}
                </div>
                <div style="font-size:12px; color:#ddd; line-height:1.4;">
                    <strong>Effet :</strong> ${item.card.effect}
                </div>
            </div>
        `;
    });

    resHtml += `
            </div>
            <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <span style="font-size:13px; color:#aaa;">Deck total : <strong>${currentGang.tactics.length}</strong> / ${allPool.length} cartes</span>
                <button class="btn btn-cyan" onclick="closeModal(); renderPostCycleView(document.getElementById('main-content'));">Continuer le Post-Cycle</button>
            </div>
        </div>
    `;

    if (typeof openModal === 'function') {
        openModal("🎴 Nouvelles Cartes Tactiques Obtenues", resHtml);
    } else {
        renderPostCycleView(document.getElementById('main-content'));
    }
}

window.actionTacticalDevelopment = actionTacticalDevelopment;
window.limitTacticsDevCB = limitTacticsDevCB;
window.confirmTacticalDevelopment = confirmTacticalDevelopment;

// ==========================================
// RECRUTEMENT EN POST-CYCLE
// ==========================================
function openPostCycleRecruitModal() {
    if (!currentGang) return showToast("Aucun gang sélectionné.", "error");
    if (typeof appState !== 'undefined') {
        appState.returnTo = 'post-cycle';
    }
    if (typeof openRecruitModal === 'function') {
        openRecruitModal();
    } else {
        showToast("Erreur : Le module de recrutement n'est pas disponible.", "error");
    }
}
window.openPostCycleRecruitModal = openPostCycleRecruitModal;

