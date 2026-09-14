// game-roster-view.js (2/3 - issu de l'ancien game.js)
// Rôle : vue "roster en direct" pendant une partie (liste des combattants,
// actions rapides, scoring, priorité, tours).
// Dépendances : game-state-scenarios.js (currentGameRoster, gameScores...).

// ==========================================
// GAME VIEW (Vue Roster en Direct)
// ==========================================
function renderGameView(container) {
    setGameHeaderVisibility(true);

    let isQuick = typeof appState !== 'undefined' && appState.isQuickMatch;
    let needsBottleCheck = isBottleCheckEligible();

    let html = `
        <div class="card" style="margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h2>Partie en cours — ${currentGang ? currentGang.name : ''} ${isQuick ? '(⚡ Partie Rapide)' : ''}</h2>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <button class="btn btn-cyan" onclick="openPdfModal('📖 Règles', 'Recapitulatif de regles.pdf')">📖 Règles</button>
                    <button class="btn btn-cyan" onclick="openPdfModal('📊 Tableaux', 'Tableaux.pdf')">📊 Tableaux</button>
                    <button class="${needsBottleCheck ? 'btn btn-danger' : 'btn'}" style="${needsBottleCheck ? 'background:#e74c3c; border:1px solid #c0392b; color:#fff; font-weight:bold; box-shadow:0 0 12px rgba(231,76,60,0.6); cursor:pointer;' : ''}" onclick="endRound()">
                        ${needsBottleCheck ? '⚠️ Fin de Round (Bottle check)' : '🔄 Fin de Round'}
                    </button>
                    <button class="btn-danger" onclick="openEndOrQuitGameModal()">🚪 Quitter / Terminer</button>
                </div>
            </div>

            <!-- BANDEAU SCORE ET PRIORITÉ -->
            ${renderGameScorePriorityBanner()}

            <!-- CARTES TACTIQUES DIRECTEMENT VISIBLES DANS LA PARTIE -->
            ${(gameTactics && gameTactics.length > 0) ? `
            <div style="margin-top:10px; border-top:1px solid #333; padding-top:8px;">
                <div style="margin-bottom:6px;">
                    <small style="color:#aaa; font-size:12px;">💡 Cliquez sur une carte pour la jouer (grisée)</small>
                </div>
                ${renderInGameTacticsGrid()}
            </div>
            ` : ''}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h3>Résumé de la Bande (${currentGameRoster.length})</h3>
            <small style="color:#aaa;">Cliquez sur le nom d'un guerrier pour ouvrir sa fiche complète en plein écran.</small>
        </div>

        <!-- CONTENEUR SUR 2 COLONNES POUR LES GUERRIERS -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 10px; align-items: start;">
    `;

    currentGameRoster.forEach((m, idx) => {
        let activeConds = Object.keys(m.conditions || {}).filter(c => m.conditions[c]);
        let isOOA = (m.status === 'Out of action');
        let isFuyard = (m.status === 'Fuyard');
        let isReinforcement = (m.isReinforcement === true);

        let nameColor = '#ffffff';
        if (isOOA) {
            nameColor = '#777777';
        } else if (isFuyard) {
            nameColor = '#888888';
        } else if (m.status === 'Sérieusement blessé') {
            nameColor = '#e74c3c';
        } else if (m.status === 'Pilonné' || m.suppressed) {
            nameColor = '#f1c40f';
        } else if (m.conditions && m.conditions['Blessé']) {
            nameColor = '#e67e22';
        }

        let cardStyle = '';
        if (isOOA) {
            cardStyle = 'background: #141414; opacity: 0.45; filter: grayscale(1); border: 1px solid #333;';
        } else if (isFuyard) {
            cardStyle = 'background: #121316; opacity: 0.5; filter: grayscale(0.85); border: 1px dashed #5c6270;';
        } else if (isReinforcement) {
            cardStyle = 'background: #181824; opacity: 0.65; border: 1px dashed var(--accent-purple, #9b59b6);';
        }

        let xpBlock = '';
        if (!isQuick) {
            let lx = m.liveXP || { assistance: 0, objective: 0, seriouslyInjured: 0, scenario: 0, ooaKills: 0 };
            let currentTotalXP = getFighterBattleXP(m);

            xpBlock = `
                <div style="margin-top:8px; padding:6px 8px; background:#111; border:1px solid #333; border-radius:4px; font-size:11px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <strong style="color:var(--accent-cyan);">⭐ XP en direct : <span style="color:#2ecc71; font-size:12px;">+${currentTotalXP} XP</span></strong>
                        <small style="color:#888;">(1 XP participation incluse)</small>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap:4px;">
                        <div style="display:flex; align-items:center; gap:3px;">
                            <span>Assistance:</span>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'assistance', -1)">-</button>
                            <strong>${lx.assistance}</strong>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'assistance', 1)">+</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:3px;">
                            <span>Objectif:</span>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'objective', -1)">-</button>
                            <strong>${lx.objective}</strong>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'objective', 1)">+</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:3px;">
                            <span>Sér. Blessé:</span>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'seriouslyInjured', -1)">-</button>
                            <strong>${lx.seriouslyInjured}</strong>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'seriouslyInjured', 1)">+</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:3px;">
                            <span>Scénario:</span>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'scenario', -1)">-</button>
                            <strong>${lx.scenario}</strong>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'scenario', 1)">+</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:3px;">
                            <span style="color:#e74c3c; font-weight:bold;">OOA:</span>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'ooaKills', -1)">-</button>
                            <strong style="color:#e74c3c;">${lx.ooaKills}</strong>
                            <button class="btn" style="padding:0 4px; font-size:10px;" onclick="adjLiveXP(${idx}, 'ooaKills', 1)">+</button>
                            <small style="color:#888;">(2XP)</small>
                        </div>
                    </div>
                </div>
            `;
        }

        html += `
            <div class="card" style="margin-bottom:0; ${cardStyle}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                    <div>
                        <strong style="font-size:16px; cursor:pointer; text-decoration:${(isOOA || isFuyard) ? 'line-through' : 'underline'}; color:${nameColor};" onclick="openFighterDetailModal(${idx})">
                            ${m.customName}
                        </strong> 
                        <small style="color:${(isOOA || isFuyard) ? '#666' : 'inherit'};"> — <strong>${m.charName || ''}</strong> (${buildFighterTypeBadgesHTML(getEffectiveFighterTypes(m))})</small>
                        ${isReinforcement ? `<span style="background:var(--accent-purple, #9b59b6); color:#fff; padding:2px 6px; border-radius:3px; font-size:11px; font-weight:bold; margin-left:6px;">RENFORT</span>` : ''}
                        ${isFuyard ? (m.wasSeriouslyInjuredWhenFled ? `<span style="background:#c0392b; color:#fff; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:6px; letter-spacing:0.5px;">🏃 FUYARD (Sér. blessé — blessure requise)</span>` : `<span style="background:#57606f; color:#ecf0f1; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:6px; letter-spacing:0.5px;">🏃 FUYARD (Protégé)</span>`) : ''}
                        <br>
                        ${(() => {
                            let wNames = (m.weapons || []).map(w => w.name + (w.accessory ? ' ['+w.accessory.name+']' : ''));
                            let gNames = (m.equipment || []).filter(e => e.counts_as_equip || e.type === 'Grenade' || (e.id && ((e.id.startsWith('wpn_grenade_') && e.id !== 'wpn_grenade_launcher') || e.id === 'wpn_charge_demo'))).map(g => g.name);
                            let allCombatNames = [...wNames, ...gNames];
                            return `<small style="color:${(isOOA || isFuyard) ? '#666' : 'inherit'};">Armes : ${allCombatNames.join(', ') || 'Aucune'}</small>`;
                        })()}
                        ${activeConds.length > 0 ? `<br><small style="color:${(isOOA || isFuyard) ? '#666' : '#e67e22'};"><strong>Conditions :</strong> ${activeConds.map(c => `<span style="cursor:pointer; text-decoration:underline;" onclick="showConditionDetails('${escapeForJsStr(c)}')">${c}</span>`).join(', ')}</small>` : ''}
                    </div>

                    <div style="display:flex; align-items:center; gap:8px; margin-top:2px; flex-wrap:wrap;">
                        ${isReinforcement ? `
                            <button class="btn btn-cyan" style="padding:4px 10px; font-size:12px;" onclick="deployReinforcement(${idx})">⚡ Déployer</button>
                        ` : `
                            <div style="display:flex; align-items:center; gap:3px;">
                                <span>PV:</span>
                                <button class="btn" style="padding:1px 5px; font-weight:bold;" onclick="adjHP(${idx}, -1)">-</button>
                                <strong style="font-size:14px; min-width:16px; text-align:center;">${m.currentHP}</strong> / ${m.stats ? m.stats.W : 1}
                                <button class="btn" style="padding:1px 5px; font-weight:bold;" onclick="adjHP(${idx}, 1)">+</button>
                            </div>

                            <div>
                                <select style="background:#222; color:#fff; border:1px solid #444; padding:2px 4px; border-radius:4px; font-size:11px;" onchange="updateFighterStatus(${idx}, this.value)">
                                    <option value="Prêt" ${m.status === 'Prêt' ? 'selected' : ''}>Prêt</option>
                                    <option value="Engagé" ${m.status === 'Engagé' ? 'selected' : ''}>Engagé</option>
                                    <option value="Pilonné" ${m.status === 'Pilonné' ? 'selected' : ''}>Pilonné</option>
                                    <option value="Sérieusement blessé" ${m.status === 'Sérieusement blessé' ? 'selected' : ''}>Sérieusement blessé</option>
                                    <option value="Out of action" ${m.status === 'Out of action' ? 'selected' : ''}>Out of action</option>
                                    <option value="Fuyard" ${m.status === 'Fuyard' ? 'selected' : ''}>🏃 Fuyard</option>
                                </select>
                            </div>

                            <div>
                                <label style="cursor:${isFuyard ? 'not-allowed' : 'pointer'}; font-size:11px; opacity:${isFuyard ? '0.4' : '1'};">
                                    <input type="checkbox" ${m.activated ? 'checked' : ''} ${isFuyard ? 'disabled' : ''} onchange="toggleActivation(${idx})"> Activé
                                </label>
                            </div>
                        `}
                    </div>
                </div>

                ${xpBlock}
            </div>
        `;
    });

    html += `
        </div>
    `;

    container.innerHTML = html;
}

function toggleActivation(idx) {
    if (currentGameRoster[idx]) {
        currentGameRoster[idx].activated = !currentGameRoster[idx].activated;
        renderGameView(document.getElementById('main-content'));
    }
}

function toggleSuppressed(idx) {
    if (currentGameRoster[idx]) {
        currentGameRoster[idx].suppressed = !currentGameRoster[idx].suppressed;
        renderGameView(document.getElementById('main-content'));
    }
}

// Vérifie si un Bottle check est requis pour la ronde en cours (suite à une mise hors de combat non testée)
function isBottleCheckEligible() {
    if (!gameScores) return false;
    // Si le gang est déjà en déroute permanente (Bottled Out), pas de nouveau bottle check requis
    if (gameScores.isBottledOut) return false;
    // Si le test a déjà été fait / réussi ce round (maximum 1 fois par round)
    if (gameScores.bottleCheckDoneThisRound) return false;
    // Requis si un combattant a été mis Hors de combat (OOA) pendant ce round
    return !!gameScores.bottleCheckRequired;
}
window.isBottleCheckEligible = isBottleCheckEligible;

// Pop-up d'alerte immédiate lorsqu'un combattant est mis Hors de Combat (Out of action)
function triggerOutOfActionAlert(fighter, fighterIdx) {
    if (!gameScores) {
        gameScores = {
            myScore: 0,
            opponentScore: 0,
            priority: 'À déterminer',
            previousPriority: null,
            round: 1,
            bottleCheckRequired: true,
            bottleCheckDoneThisRound: false,
            isBottledOut: false
        };
    } else {
        if (!gameScores.bottleCheckDoneThisRound && !gameScores.isBottledOut) {
            gameScores.bottleCheckRequired = true;
        }
    }

    const fighterName = (typeof escapeHtml === 'function')
        ? escapeHtml(fighter.customName || fighter.charName || 'Combattant')
        : (fighter.customName || fighter.charName || 'Combattant');
    const returnToDetail = (typeof fighterIdx === 'number');

    const title = `⚠️ ${fighterName} est Hors de Combat !`;

    const content = `
        <div style="padding: 6px 0;">
            <div style="background: rgba(231, 76, 60, 0.12); border: 1px solid #e74c3c; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                <div style="font-size: 15px; font-weight: bold; color: #ff6b6b; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                    <span>💀</span> <strong>Rappels de règles immédiats :</strong>
                </div>
                <div style="font-size: 13.5px; line-height: 1.6; color: #eee;">
                    <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(231,76,60,0.3);">
                        <strong style="color: #f39c12; font-size: 14px;">1. Test de Sang-Froid (Cool check) à 3" :</strong><br>
                        Tous les combattants alliés situés dans un rayon de <strong>3"</strong> (3 pouces) de <strong>${fighterName}</strong> doivent immédiatement effectuer un <strong>Test de Cool (Sang-Froid)</strong> ! En cas d'échec, ils deviennent Brisés (Broken / Fuyards).
                    </div>
                    <div>
                        <strong style="color: #e74c3c; font-size: 14px;">2. Test de Déroute (Bottle check) en fin de ronde :</strong><br>
                        Une perte a été subie par le gang. Un <strong>Bottle check</strong> devra obligatoirement être effectué lors de la <strong>Phase de Fin de ce Round</strong> (un seul test par fin de ronde pour l'ensemble du gang).
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;">
                ${returnToDetail ? `
                    <button class="btn" style="padding: 8px 16px;" onclick="closeModal(); openFighterDetailModal(${fighterIdx}); renderGameView(document.getElementById('main-content'));">
                        ← Fiche de ${fighterName}
                    </button>
                ` : ''}
                <button class="btn btn-cyan" style="padding: 8px 20px; font-weight: bold;" onclick="closeModal(); renderGameView(document.getElementById('main-content'));">
                    ✓ Compris
                </button>
            </div>
        </div>
    `;

    openModal(title, content);
}
window.triggerOutOfActionAlert = triggerOutOfActionAlert;

// Gestion du clic sur "Fin de Round" avec vérification du Bottle check si nécessaire
function handleEndRoundClick() {
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

    const eligible = isBottleCheckEligible();

    // Si le gang a subi des pertes et n'a pas encore validé le bottle check pour ce round
    if (eligible && !gameScores.bottleCheckDoneThisRound) {
        openBottleCheckModal(true);
        return;
    }

    proceedEndRound();
}
window.handleEndRoundClick = handleEndRoundClick;

// Modal de validation du Bottle check
function openBottleCheckModal(isFromEndRound = false) {
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

    const curRound = gameScores.round || 1;
    const isAlreadyBottled = gameScores.isBottledOut === true;

    // Les familiers ne comptent pas pour le Bottle check (ni comme perte, ni
    // dans l'effectif total du gang pour ce test) : ils suivent leur propriétaire
    // et ne font jamais dérouter le gang à eux seuls.
    const ooaCount = (currentGameRoster || []).filter(m => m.status === 'Out of action' && !m.isFamiliar).length;
    const fuyardCount = (currentGameRoster || []).filter(m => m.status === 'Fuyard' && !m.isFamiliar).length;
    const totalCount = (currentGameRoster || []).filter(m => !m.isFamiliar).length;

    const title = isFromEndRound 
        ? `🚩 Fin du Round ${curRound} — Test de Déroute (Bottle Check)` 
        : `🚩 Test de Déroute (Bottle Check) — Round ${curRound}`;

    const html = `
        <div style="padding: 6px 0;">
            <div style="background: rgba(230, 126, 34, 0.12); border: 1px solid #e67e22; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; color: #f39c12; font-size: 15px; display: flex; align-items: center; gap: 8px;">
                    <span>🚩</span> Test de Bottle (Déroute) de fin de ronde
                </h4>
                <div style="font-size: 13.5px; line-height: 1.6; color: #eee;">
                    <p style="margin: 0 0 8px 0;">
                        Pertes du gang : <strong>${ooaCount}</strong> Hors de Combat${fuyardCount > 0 ? ` + <strong>${fuyardCount}</strong> Fuyard(s)` : ''} sur ${totalCount} combattants.<br>
                        Le Bottle check s'effectue <strong>une seule fois par fin de round</strong> pour l'ensemble du gang.
                    </p>
                    <p style="margin: 0; color: #bbb; font-size: 12.5px;">
                        <em>Rappel : Lancez 1D6 + nombre de combattants OOA / Sérieusement blessés. Si le total est strictement supérieur au nombre initial de membres du gang, le gang part en Déroute (Bottled Out).</em>
                    </p>
                    ${isAlreadyBottled ? `
                        <div style="margin-top: 10px; padding: 6px 10px; background: rgba(231,76,60,0.2); border: 1px solid #e74c3c; border-radius: 6px; color: #ff7675; font-size: 12px; font-weight: bold;">
                            ⚠️ Votre gang est actuellement déjà en Déroute (Bottled Out). Vos combattants doivent tester leur Cool au début de chaque activation.
                        </div>
                    ` : ''}
                </div>
            </div>

            <p style="font-weight: bold; margin-bottom: 12px; font-size: 14px; color: #fff;">
                Avez-vous fait le Bottle check ? Quel est le résultat ?
            </p>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
                <button class="btn btn-cyan" style="padding: 12px; text-align: left; font-weight: bold; width: 100%; margin: 0;" onclick="recordBottleCheckResult(true, ${isFromEndRound})">
                    <span style="font-size: 15px; display: block; color: var(--accent-cyan);">✅ Test Réussi — Le gang tient bon</span>
                    <span style="font-size: 12px; font-weight: normal; color: #ddd; display: block; margin-top: 2px;">
                        ${isFromEndRound 
                            ? `Le gang ne déroute pas. Valider la fin du Round ${curRound} et passer au Round ${curRound + 1}.` 
                            : `Le gang ne déroute pas. Test validé pour ce Round ${curRound}.`}
                    </span>
                </button>

                <button class="btn-danger" style="padding: 12px; text-align: left; font-weight: bold; width: 100%; margin: 0;" onclick="recordBottleCheckResult(false, ${isFromEndRound})">
                    <span style="font-size: 15px; display: block; color: #ff6b6b;">🚩 Test Échoué — Le gang part en Déroute (Bottled Out)</span>
                    <span style="font-size: 12px; font-weight: normal; color: #ddd; display: block; margin-top: 2px;">
                        ${isFromEndRound 
                            ? `Le gang déroute. 1 ou 2 combattants fuient la bataille (sélection immédiate) avant de passer au Round ${curRound + 1}.` 
                            : `Le gang déroute. 1 ou 2 combattants fuient la bataille (sélection immédiate).`}
                    </span>
                </button>

                ${isFromEndRound ? `
                    <button class="btn" style="padding: 10px 12px; text-align: left; width: 100%; margin: 0;" onclick="recordBottleCheckResult('skip', true)">
                        <span style="font-size: 13px; display: block; color: #ccc;">⏭️ Ignorer / Déjà fait manuellement</span>
                        <span style="font-size: 11px; color: #999; display: block;">
                            Marque le test comme fait pour cette ronde et passe directement au Round ${curRound + 1}.
                        </span>
                    </button>
                ` : ''}
            </div>

            <div style="display: flex; justify-content: flex-end;">
                <button class="btn" style="padding: 6px 14px; margin: 0;" onclick="closeModal()">
                    ${isFromEndRound ? `↩️ Annuler (rester dans le round ${curRound})` : 'Fermer'}
                </button>
            </div>
        </div>
    `;

    openModal(title, html);
}
window.openBottleCheckModal = openBottleCheckModal;

// Variable globale pour la sélection des combattants fuyards
let currentFleeingSelectedIndices = [];
window.currentFleeingSelectedIndices = currentFleeingSelectedIndices;
window.currentFleeingIsFromEndRound = false;

// Retourne la liste des combattants éligibles pour fuir, ordonnés par priorité :
// "en priorité les guerriers non engagés, sinon les engagés, sinon les sérieusement blessés"
function getEligibleFleeingFighters() {
    let list = [];
    (currentGameRoster || []).forEach((m, idx) => {
        if (m.status !== 'Out of action' && m.status !== 'Fuyard' && (!m.isReinforcement || m.deployed)) {
            let priorityRank = 1;
            let priorityLabel = "Non engagé";
            let priorityBadgeColor = "#27ae60"; // vert
            if (m.status === 'Sérieusement blessé') {
                priorityRank = 3;
                priorityLabel = "Sérieusement blessé";
                priorityBadgeColor = "#c0392b"; // rouge
            } else if (m.status === 'Engagé') {
                priorityRank = 2;
                priorityLabel = "Engagé";
                priorityBadgeColor = "#e67e22"; // orange
            } else {
                priorityRank = 1;
                priorityLabel = `Non engagé (${m.status || 'Prêt'})`;
                priorityBadgeColor = "#27ae60";
            }
            list.push({
                rosterIndex: idx,
                fighter: m,
                priorityRank: priorityRank,
                priorityLabel: priorityLabel,
                priorityBadgeColor: priorityBadgeColor
            });
        }
    });

    // Tri par priorité (1 en premier, puis 2, puis 3)
    list.sort((a, b) => {
        if (a.priorityRank !== b.priorityRank) {
            return a.priorityRank - b.priorityRank;
        }
        return (a.fighter.customName || '').localeCompare(b.fighter.customName || '');
    });
    return list;
}
window.getEligibleFleeingFighters = getEligibleFleeingFighters;

// Menu pour sélectionner le ou les combattants (1 ou 2) qui fuient la bataille
function openFleeingFightersModal(isFromEndRound = false) {
    window.currentFleeingSelectedIndices = [];
    window.currentFleeingIsFromEndRound = isFromEndRound;

    const curRound = (gameScores && gameScores.round) ? gameScores.round : 1;
    const eligible = getEligibleFleeingFighters();
    const title = `🏃 Combattants en Fuite — Déroute (Round ${curRound})`;

    let html = `
        <div style="padding: 6px 0;">
            <!-- BANNIÈRE EXPLICATIVE RÈGLE -->
            <div style="background: rgba(231, 76, 60, 0.14); border: 1px solid #e74c3c; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
                <div style="font-size: 15px; font-weight: bold; color: #ff6b6b; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <span>🚩</span> <strong>Test de Déroute Échoué — Le gang part en Déroute !</strong>
                </div>
                <div style="font-size: 13.5px; line-height: 1.5; color: #eee;">
                    <p style="margin: 0 0 10px 0;">
                        Le test de déroute a échoué. <strong>1 ou 2 combattants fuient immédiatement la bataille</strong>.
                    </p>
                    <div style="background: rgba(243, 156, 18, 0.18); border-left: 4px solid #f39c12; padding: 8px 12px; border-radius: 0 6px 6px 0; margin-bottom: 8px; font-size: 13px; color: #f39c12; font-weight: bold;">
                        📌 Ordre de priorité : En priorité les guerriers non engagés, sinon les engagés, sinon les sérieusement blessés.
                    </div>
                    <div style="font-size: 12px; color: #ddd; line-height: 1.5;">
                        🛡️ <em>Les guerriers qui fuient sont protégés (pas de blessure permanente), <strong>sauf s'ils étaient sérieusement blessés au moment de fuir</strong>, auquel cas ils devront faire le jet de blessure permanente en après-bataille.</em><br>
                        ⭐ <em><strong>Règle d'Expérience :</strong> Un guerrier ne perd jamais son XP acquise. Même s'il finit Hors de combat ou Fuyard, il conserve l'XP de participation (+1) et tous ses accomplissements.</em>
                    </div>
                </div>
            </div>

            <!-- COMPTEUR DE SÉLECTION -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #11121a; padding: 8px 12px; border-radius: 6px; border: 1px solid #2d3047;">
                <span style="font-size: 13px; font-weight: bold; color: #fff;">Sélectionnez 1 ou 2 combattants :</span>
                <span id="fleeing-selection-counter" style="font-size: 13px; font-weight: bold; color: #ff6b6b;">
                    0 / 2 sélectionné(s) (1 ou 2 requis)
                </span>
            </div>

            ${eligible.length === 0 ? `
                <div style="padding: 16px; text-align: center; color: #aaa; background: #141418; border-radius: 6px; border: 1px solid #333; margin-bottom: 16px;">
                    Aucun combattant restant sur la table pour fuir (tous sont déjà Hors de combat ou ont fui).
                </div>
            ` : `
                <!-- LISTE DES COMBATTANTS ÉLIGIBLES CLASSÉS PAR PRIORITÉ -->
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; padding-right: 4px; margin-bottom: 16px;">
                    ${eligible.map(item => {
                        const m = item.fighter;
                        const idx = item.rosterIndex;
                        const name = (typeof escapeHtml === 'function')
                            ? escapeHtml(m.customName || m.charName || 'Combattant')
                            : (m.customName || m.charName || 'Combattant');
                        const typeStr = buildFighterTypeBadgesHTML(getEffectiveFighterTypes(m));
                        const isSeriouslyInjured = (item.priorityRank === 3);

                        return `
                            <div id="fleeing-card-${idx}" onclick="toggleFleeingSelection(${idx})" style="display: flex; justify-content: space-between; align-items: center; background: #15161f; border: 1px solid #333; border-radius: 6px; padding: 10px 14px; cursor: pointer; transition: all 0.2s;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <input type="checkbox" id="fleeing-chk-${idx}" style="transform: scale(1.25); cursor: pointer; pointer-events: none;">
                                    <div>
                                        <strong style="font-size: 14px; color: #fff; display: block;">${name}</strong>
                                        <small style="color: #888;">${typeStr ? typeStr + ' — ' : ''}PV: ${m.currentHP}/${m.stats ? m.stats.W : 1}</small>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="background: ${item.priorityBadgeColor}; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: bold; white-space: nowrap;">
                                        Priorité ${item.priorityRank} : ${item.priorityLabel} ${isSeriouslyInjured ? '⚠️ (Jet blessure requis)' : '✓ (Sain et sauf)'}
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}

            <!-- ACTIONS -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button type="button" class="btn" style="margin: 0; padding: 8px 14px;" onclick="openBottleCheckModal(${isFromEndRound})">
                    ↩️ Retour au test
                </button>

                <div style="display: flex; gap: 10px;">
                    ${eligible.length === 0 ? `
                        <button type="button" class="btn btn-cyan" style="margin: 0; padding: 8px 18px; font-weight: bold;" onclick="confirmFleeingFighters(${isFromEndRound})">
                            Continuer ${isFromEndRound ? 'vers le Round ' + (curRound + 1) : ''}
                        </button>
                    ` : `
                        <button type="button" id="btn-confirm-fleeing" class="btn btn-danger" style="margin: 0; padding: 10px 20px; font-weight: bold; opacity: 0.5; cursor: not-allowed;" onclick="confirmFleeingFighters(${isFromEndRound})" disabled>
                            🏃 Valider la fuite et continuer
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;

    openModal(title, html);
}
window.openFleeingFightersModal = openFleeingFightersModal;

// Bascule la sélection d'un combattant fuyard (max 2)
function toggleFleeingSelection(idx) {
    if (!Array.isArray(window.currentFleeingSelectedIndices)) {
        window.currentFleeingSelectedIndices = [];
    }

    const pos = window.currentFleeingSelectedIndices.indexOf(idx);
    if (pos >= 0) {
        window.currentFleeingSelectedIndices.splice(pos, 1);
    } else {
        if (window.currentFleeingSelectedIndices.length >= 2) {
            showToast("Vous ne pouvez sélectionner que 1 ou 2 combattants fuyards au maximum.", "error");
            return;
        }
        window.currentFleeingSelectedIndices.push(idx);
    }

    // Mise à jour visuelle des cartes et des checkboxes
    const eligible = getEligibleFleeingFighters();
    eligible.forEach(item => {
        const i = item.rosterIndex;
        const card = document.getElementById(`fleeing-card-${i}`);
        const chk = document.getElementById(`fleeing-chk-${i}`);
        const isSelected = window.currentFleeingSelectedIndices.includes(i);
        if (chk) chk.checked = isSelected;
        if (card) {
            if (isSelected) {
                card.style.borderColor = '#e74c3c';
                card.style.background = 'rgba(231, 76, 60, 0.2)';
                card.style.boxShadow = '0 0 10px rgba(231, 76, 60, 0.4)';
            } else {
                card.style.borderColor = '#333';
                card.style.background = '#15161f';
                card.style.boxShadow = 'none';
            }
        }
    });

    const count = window.currentFleeingSelectedIndices.length;
    const counterEl = document.getElementById('fleeing-selection-counter');
    const confirmBtn = document.getElementById('btn-confirm-fleeing');
    const isFromEndRound = window.currentFleeingIsFromEndRound;
    const curRound = (gameScores && gameScores.round) ? gameScores.round : 1;

    if (counterEl) {
        if (count === 0) {
            counterEl.style.color = '#ff6b6b';
            counterEl.textContent = '0 / 2 sélectionné(s) (1 ou 2 requis)';
        } else if (count === 1) {
            counterEl.style.color = '#2ecc71';
            counterEl.textContent = '1 / 2 sélectionné (Valide)';
        } else {
            counterEl.style.color = '#2ecc71';
            counterEl.textContent = '2 / 2 sélectionnés (Valide)';
        }
    }

    if (confirmBtn) {
        if (count >= 1 && count <= 2) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.innerHTML = `🏃 Valider la fuite (${count}) et ${isFromEndRound ? 'passer au Round ' + (curRound + 1) : 'continuer'}`;
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            confirmBtn.innerHTML = `🏃 Valider la fuite et continuer`;
        }
    }
}
window.toggleFleeingSelection = toggleFleeingSelection;

// Confirme les fuyards et enclenche la suite
function confirmFleeingFighters(isFromEndRound = false) {
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

    const eligible = getEligibleFleeingFighters();
    const sel = window.currentFleeingSelectedIndices || [];

    if (eligible.length > 0 && sel.length === 0) {
        showToast("Veuillez sélectionner 1 ou 2 combattants qui fuient la bataille.", "error");
        return;
    }

    const fledNames = [];
    sel.forEach(idx => {
        if (currentGameRoster[idx]) {
            let wasSeriouslyInjured = (currentGameRoster[idx].status === 'Sérieusement blessé');
            currentGameRoster[idx].wasSeriouslyInjuredWhenFled = wasSeriouslyInjured;
            currentGameRoster[idx].status = 'Fuyard';
            currentGameRoster[idx].activated = true; // Ne peut plus agir
            let fName = currentGameRoster[idx].customName || currentGameRoster[idx].charName || 'Combattant';
            if (wasSeriouslyInjured) {
                fName += ' (Sér. blessé — blessure requise)';
            } else {
                fName += ' (Sain et sauf)';
            }
            fledNames.push(fName);
        }
    });

    gameScores.isBottledOut = true;
    gameScores.bottleCheckDoneThisRound = true;

    if (fledNames.length > 0) {
        showToast(`🏃 ${fledNames.join(' et ')} ${fledNames.length > 1 ? 'ont fui' : 'a fui'} le combat ! (Marqué(s) Fuyard)`, "warning");
    } else {
        showToast("⚠️ Le gang est en Déroute (Bottled Out) !", "error");
    }

    window.currentFleeingSelectedIndices = [];

    if (isFromEndRound) {
        proceedEndRound();
    } else {
        closeModal();
        renderGameView(document.getElementById('main-content'));
    }
}
window.confirmFleeingFighters = confirmFleeingFighters;

function recordBottleCheckResult(result, isFromEndRound = false) {
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

    if (result === true) {
        gameScores.bottleCheckDoneThisRound = true;
        gameScores.bottleCheckRequired = false;
        gameScores.isBottledOut = false;
        showToast("✓ Bottle check réussi : Le gang tient bon et ne déroute pas !", "success");
        if (isFromEndRound) {
            proceedEndRound();
        } else {
            closeModal();
            renderGameView(document.getElementById('main-content'));
        }
    } else if (result === false) {
        // En cas d'échec : sélection de 1 ou 2 combattants qui fuient la bataille
        openFleeingFightersModal(isFromEndRound);
    } else if (result === 'skip') {
        gameScores.bottleCheckDoneThisRound = true;
        gameScores.bottleCheckRequired = false;
        if (isFromEndRound) {
            proceedEndRound();
        } else {
            closeModal();
            renderGameView(document.getElementById('main-content'));
        }
    }
}
window.recordBottleCheckResult = recordBottleCheckResult;

function proceedEndRound() {
    closeModal();
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

    gameScores.round = (gameScores.round || 1) + 1;
    // Réinitialisation pour le nouveau round : aucun test requis tant qu'un nouveau combattant n'est pas mis OOA
    gameScores.bottleCheckRequired = false;
    gameScores.bottleCheckDoneThisRound = false;

    if (gameScores.priority && gameScores.priority !== 'À déterminer') {
        gameScores.previousPriority = gameScores.priority;
    }
    gameScores.priority = 'À déterminer';

    currentGameRoster.forEach(m => m.activated = false);

    renderGameView(document.getElementById('main-content'));
    showToast(`🔄 Début du Round ${gameScores.round} : priorité réinitialisée et combattants réactivés !`, "success");
}
window.proceedEndRound = proceedEndRound;

function endRound() {
    handleEndRoundClick();
}

function endGame() {
    openEndOrQuitGameModal();
}

function openEndOrQuitGameModal() {
    let isQuick = typeof appState !== 'undefined' && appState.isQuickMatch;

    let html = `
        <div style="padding:10px 0;">
            <p style="font-size:15px; margin-bottom:16px; color:#eee;">Que souhaitez-vous faire pour cette partie en cours ?</p>
            
            <div style="display:flex; flex-direction:column; gap:12px;">
                ${!isQuick ? `
                    <button class="btn btn-cyan" style="padding:14px; text-align:left; margin:0; width:100%;" onclick="closeModal(); processEndGame();">
                        <strong style="font-size:15px; display:block; color:var(--accent-cyan);">🏁 Terminer la Partie & Passer au Post-Bataille</strong>
                        <span style="font-size:12px; color:#ddd; text-transform:none; font-weight:normal; display:block; margin-top:4px;">
                            Enregistre les combattants Out of Action (OOA), valide les gains d'XP en direct et accède aux jets de blessures durables.
                        </span>
                    </button>
                    
                    <button class="btn-danger" style="padding:14px; text-align:left; margin:0; width:100%;" onclick="closeModal(); processQuitGame();">
                        <strong style="font-size:15px; display:block; color:var(--status-danger);">🚪 Abandonner / Quitter sans enregistrer</strong>
                        <span style="font-size:12px; color:#ddd; text-transform:none; font-weight:normal; display:block; margin-top:4px;">
                            Annule la partie et retourne à la gestion du gang sans modifier les XP ni les blessures.
                        </span>
                    </button>
                ` : `
                    <button class="btn btn-cyan" style="padding:14px; text-align:left; margin:0; width:100%;" onclick="closeModal(); processQuitGame();">
                        <strong style="font-size:15px; display:block;">🚪 Quitter la Partie Rapide</strong>
                        <span style="font-size:12px; color:#ddd; text-transform:none; font-weight:normal; display:block; margin-top:4px;">
                            Retourne au menu principal (aucune modification de gang).
                        </span>
                    </button>
                `}
                
                <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                    <button class="btn" style="padding:8px 18px; margin:0;" onclick="closeModal()">
                        ↩️ Reprendre la partie
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal("Quitter ou Terminer la Partie", html);
}

function processEndGame() {
    setGameHeaderVisibility(false);

    if (currentGang && currentGang.members) {
        currentGameRoster.forEach(battleFighter => {
            let gangFighter = currentGang.members.find(m => m.id === battleFighter.id || m.customName === battleFighter.customName);
            if (gangFighter) {
                // RÈGLE HORS DE COMBAT / BLESSURE PERMANENTE :
                // Les guerriers fuyards sont protégés de blessure permanente SAUF s'ils étaient
                // sérieusement blessés au moment où ils ont fui !
                let isOOA = false;
                let ooaReason = null;

                if (battleFighter.status === 'Fuyard') {
                    if (battleFighter.wasSeriouslyInjuredWhenFled === true) {
                        isOOA = true;
                        ooaReason = 'fuyard_blessé';
                    } else {
                        isOOA = false;
                        ooaReason = null;
                    }
                } else if (battleFighter.status === 'Out of action' || (battleFighter.currentHP <= 0 && battleFighter.status !== 'Fuyard')) {
                    isOOA = true;
                    ooaReason = 'hors_de_combat';
                }

                // Un familier ne prend jamais de blessure permanente : il ne doit
                // donc jamais se retrouver marqué "à traiter" en post-bataille.
                if (gangFighter.isFamiliar) {
                    isOOA = false;
                    ooaReason = null;
                }

                gangFighter.ooa = isOOA;
                gangFighter.ooaReason = ooaReason;

                // RÈGLE EXPÉRIENCE : Un combattant ne peut JAMAIS perdre l'XP acquise pendant la partie.
                // Même s'il finit Hors de combat ou Fuyard, il conserve l'intégralité de son XP de participation (1 XP)
                // ainsi que tous ses accomplissements éventuels (blessures, soutiens, etc.).
                let currentXP = getFighterXP(gangFighter);
                let matchXP = getFighterBattleXP(battleFighter);
                gangFighter.xp = currentXP + matchXP;
                if (typeof checkGangerPromotion === 'function') checkGangerPromotion(gangFighter);
                if (typeof checkProspectPromotion === 'function') checkProspectPromotion(gangFighter);

                gangFighter.lastBattleGain = {
                    total: matchXP,
                    participation: 1,
                    assistance: (battleFighter.liveXP && battleFighter.liveXP.assistance) || 0,
                    objective: (battleFighter.liveXP && battleFighter.liveXP.objective) || 0,
                    seriouslyInjured: (battleFighter.liveXP && battleFighter.liveXP.seriouslyInjured) || 0,
                    scenario: (battleFighter.liveXP && battleFighter.liveXP.scenario) || 0,
                    ooaKills: (battleFighter.liveXP && battleFighter.liveXP.ooaKills) || 0,
                    status: battleFighter.status,
                    wasSeriouslyInjuredWhenFled: !!battleFighter.wasSeriouslyInjuredWhenFled
                };
            }
        });
        safeSave();
    }

    showToast("Partie terminée ! Bienvenue dans la phase d'Après-Bataille.", "success");

    if (typeof renderPostBattleView === 'function') {
        renderPostBattleView(document.getElementById('main-content'));
    } else {
        safeNavigate('gang-manage');
    }

    // Affiche le choix de spécialité pour un éventuel Prospect promu Ganger
    // pendant cette partie (voir checkProspectPromotion) : en tout dernier,
    // pour que cette fenêtre ne soit jamais écrasée par le rendu ci-dessus.
    if (typeof processPendingSpecialistChoices === 'function') processPendingSpecialistChoices();
}

function processQuitGame() {
    setGameHeaderVisibility(false);

    if (typeof appState !== 'undefined' && appState.isQuickMatch) {
        appState.isQuickMatch = false;
        showToast("Partie rapide fermée.");
        safeNavigate('menu');
        return;
    }

    showToast("Partie quittée sans enregistrer de modifications.", "info");
    safeNavigate('gang-manage');
}

