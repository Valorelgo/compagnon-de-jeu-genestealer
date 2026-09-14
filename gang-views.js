// gang-views.js (2/5 - issu de l'ancien app.js)
// Rôle : rendu des vues de premier niveau (menu principal, création/sélection
// de gang) et de l'écran de gestion du gang (roster, crédits, territoires...).
// Dépendances : core-state.js (appState, currentGang, saveGangs, openModal...).

// ==========================================
// VIEWS RENDERING
// ==========================================
function renderMenu(container) {
    currentGang = null;
    updateTopBar();
    container.innerHTML = `
        <div class="hero-menu">
            <div class="cult-mark-wrap">
                <svg class="cult-mark" viewBox="0 0 120 120" width="92" height="92" aria-hidden="true">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent-cyan)" stroke-width="1.5" opacity="0.6"/>
                    <g stroke="var(--accent-purple)" stroke-width="4" stroke-linecap="round" fill="none">
                        <path d="M60 13 C 68 24, 68 33, 59 43" transform="rotate(0 60 60)"/>
                        <path d="M60 13 C 68 24, 68 33, 59 43" transform="rotate(90 60 60)"/>
                        <path d="M60 13 C 68 24, 68 33, 59 43" transform="rotate(180 60 60)"/>
                        <path d="M60 13 C 68 24, 68 33, 59 43" transform="rotate(270 60 60)"/>
                    </g>
                    <circle cx="60" cy="60" r="8" fill="var(--accent-cyan)"/>
                </svg>
            </div>
            <h1 class="hero-title">Genestealer Cult</h1>
            <p class="hero-tagline">Compagnon de campagne Necromunda : gérez votre gang, guerrier par guerrier, de sa fondation jusqu'à la domination du Sous-Monde.</p>
            <div class="hero-actions">
                <button class="btn-hero-primary" onclick="navigate('gang-create')">Fonder un nouveau gang</button>
                <button class="btn-hero-secondary" onclick="appState.mode='campaign'; navigate('gang-select')">Reprendre une campagne</button>
            </div>
            <button class="hero-import-link" onclick="importGang()">Importer un gang Genestealer (.json)</button>
        </div>
    `;
}

function renderGangCreate(container) {
    container.innerHTML = `
        <div class="card">
            <h2>Créer un nouveau gang Genestealer</h2>
            <input type="text" id="new-gang-name" placeholder="Nom du gang">
            <button onclick="createGang()">Créer</button>
            <button class="btn-danger" onclick="navigate('menu')">Annuler</button>
        </div>
    `;
}

function createGang() {
    const name = document.getElementById('new-gang-name').value.trim();
    if(!name) return showToast("Veuillez saisir un nom de gang.", "error");
    if(savedGangs[name]) {
        showConfirmModal(
            "Gang existant",
            `Un gang nommé <strong>${name}</strong> existe déjà dans vos sauvegardes. Voulez-vous le remplacer ?`,
            "Écraser",
            () => {
                proceedCreateGang(name);
            }
        );
        return;
    }
    proceedCreateGang(name);
}

function proceedCreateGang(name) {
    currentGang = {
        name: name, credits: 1000, rating: 0, reputation: 1, members: [], stash: [], territories: [], tactics: [], isEstablished: false,
        faction: APP_GANG_FACTION
    };
    savedGangs[name] = currentGang;
    saveGangs();
    appState.mode = 'campaign';
    navigate('gang-manage');
    showToast(`Gang ${name} créé avec succès !`, "success");
}

function renderGangSelect(container) {
    let html = `<div class="card"><h2>Sélectionner un gang</h2>`;
    // Sécurité supplémentaire : même si savedGangs est déjà nettoyé au chargement
    // (voir quarantineForeignFactionGangs), on n'affiche jamais une liste taguée
    // pour une autre faction que celle de ce programme.
    let genestealerGangNames = Object.keys(savedGangs).filter(name => {
        const g = savedGangs[name];
        return !g.faction || g.faction === APP_GANG_FACTION;
    });
    if(genestealerGangNames.length === 0) {
        html += `<p>Aucun gang sauvegardé.</p>`;
    } else {
        for(let name of genestealerGangNames) {
            calculateGangRating(savedGangs[name]);
            html += `
                <div class="fighter-item">
                    <span><strong>${name}</strong> (Rating: ${savedGangs[name].rating})</span>
                    <div>
                        <button onclick="loadGang('${name}')">Gérer</button>
                        <button onclick="exportGang('${name}')">Export</button>
                        <button class="btn-danger" onclick="deleteGang('${name}')">X</button>
                    </div>
                </div>
            `;
        }
    }
    html += `<br><button class="btn-danger" onclick="navigate('menu')">Retour</button></div>`;
    container.innerHTML = html;
}

function ensureInnateFighterSkills(gang) {
    if (!gang || !gang.members) return;

    const pbSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique) 
        ? db.skills.generique.find(s => s.id === 'sk_poison_blood' || s.name.toLowerCase() === 'poison blood') 
        : null;
    const poisonBloodObj = pbSkill ? JSON.parse(JSON.stringify(pbSkill)) : {
        id: "sk_poison_blood",
        name: "Poison blood",
        desc: "Quand le guerrier utilise une arme avec le trait toxine (X+), les résultats de 1 peuvent être relancés."
    };

    const lotfSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique) 
        ? db.skills.generique.find(s => s.id === 'sk_lands_on_feet' || s.name.toLowerCase() === 'lands on their feet') 
        : null;
    const landsOnFeetObj = lotfSkill ? JSON.parse(JSON.stringify(lotfSkill)) : {
        id: "sk_lands_on_feet",
        name: "Lands on their feet",
        desc: "Si le guerrier tombe pour n'importe quelle raison, réduire de 3\" la hauteur de chute dans le tableau.",
        specific_to: "char_phyrr_cat"
    };

    const juggSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique) 
        ? db.skills.generique.find(s => s.id === 'sk_juggernaut' || s.name.toLowerCase() === 'juggernaut') 
        : null;
    const juggernautObj = juggSkill ? JSON.parse(JSON.stringify(juggSkill)) : {
        id: "sk_juggernaut",
        name: "Juggernaut",
        desc: "Si touché au tir, suppressed uniquement si PV perdu ou effet du dé de blessure.",
        specific_to: "brute"
    };

    const inspSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
        ? db.skills.generique.find(s => s.id === 'sk_inspirant' || s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')
        : null;
    const inspirantObj = inspSkill ? JSON.parse(JSON.stringify(inspSkill)) : {
        id: "sk_inspirant",
        name: "Inspirant",
        desc: "Peut faire l'action d'activation de groupe en action gratuite."
    };

    const chefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
        ? db.skills.generique.find(s => s.id === 'sk_chef' || s.name.toLowerCase() === 'chef')
        : null;
    const chefObj = chefSkill ? JSON.parse(JSON.stringify(chefSkill)) : {
        id: "sk_chef",
        name: "Chef",
        desc: "Tous les alliés dans les 12\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
    };

    const sousChefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
        ? db.skills.generique.find(s => s.id === 'sk_sous_chef' || s.name.toLowerCase() === 'sous-chef' || s.name.toLowerCase() === 'sous chef')
        : null;
    const sousChefObj = sousChefSkill ? JSON.parse(JSON.stringify(sousChefSkill)) : {
        id: "sk_sous_chef",
        name: "Sous-chef",
        desc: "Tous les alliés dans les 6\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
    };

    gang.members.forEach(m => {
        if (!m.skills) m.skills = [];

        // Mise à niveau du nom du Heavy stubber*
        if (m.weapons) {
            m.weapons.forEach(w => {
                if (w.id === 'wpn_heavy_stubber' || w.name === 'Heavy stubber') {
                    w.name = 'Heavy stubber*';
                }
            });
        }

        // Death Maiden -> Poison blood
        if (m.charId === 'char_death_maiden') {
            const hasPb = m.skills.some(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'poison blood' || (s.id && s.id === 'sk_poison_blood');
            });
            if (!hasPb) {
                m.skills.unshift(JSON.parse(JSON.stringify(poisonBloodObj)));
            }
        }

        // Phyrr Cat -> Lands on their feet
        if (m.charId === 'char_phyrr_cat') {
            const hasLotf = m.skills.some(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'lands on their feet' || (s.id && s.id === 'sk_lands_on_feet');
            });
            if (!hasLotf) {
                m.skills.push(JSON.parse(JSON.stringify(landsOnFeetObj)));
            }
        }

        // Brute -> Juggernaut (Tous les guerriers ayant le type brute ont systématiquement la compétence Juggernaut)
        const isBrute = (m.type && Array.isArray(m.type) && m.type.some(t => String(t).toLowerCase() === 'brute')) ||
                        (m.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === m.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'brute')));

        if (isBrute) {
            if (!m.type) m.type = [];
            if (!m.type.some(t => String(t).toLowerCase() === 'brute')) {
                m.type.push('brute');
            }
            const hasJugg = m.skills.some(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'juggernaut' || (s.id && s.id === 'sk_juggernaut');
            });
            if (!hasJugg) {
                m.skills.push(JSON.parse(JSON.stringify(juggernautObj)));
            }
        }

        // Leader -> Inspirant et Chef (Tous les guerriers ayant le type leader ont systématiquement Inspirant et Chef)
        const isLeader = (m.type && Array.isArray(m.type) && m.type.some(t => String(t).toLowerCase() === 'leader')) ||
                         (m.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === m.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'leader')));

        if (isLeader) {
            if (!m.type) m.type = [];
            if (!m.type.some(t => String(t).toLowerCase() === 'leader')) {
                m.type.push('leader');
            }

            const inspIdx = m.skills.findIndex(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'inspirant' || n.toLowerCase() === 'inspiring' || (s.id && s.id === 'sk_inspirant');
            });
            if (inspIdx >= 0) {
                m.skills[inspIdx] = JSON.parse(JSON.stringify(inspirantObj));
            } else {
                m.skills.unshift(JSON.parse(JSON.stringify(inspirantObj)));
            }

            const chefIdx = m.skills.findIndex(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'chef' || (s.id && s.id === 'sk_chef');
            });
            if (chefIdx >= 0) {
                m.skills[chefIdx] = JSON.parse(JSON.stringify(chefObj));
            } else {
                // Insérer Chef juste après Inspirant ou en début
                let inspPos = m.skills.findIndex(s => s.id === 'sk_inspirant' || (s.name && (s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')));
                if (inspPos >= 0) {
                    m.skills.splice(inspPos + 1, 0, JSON.parse(JSON.stringify(chefObj)));
                } else {
                    m.skills.unshift(JSON.parse(JSON.stringify(chefObj)));
                }
            }
        }

        // Champion -> Inspirant et Sous-chef (Tous les guerriers ayant le type champion ont systématiquement Inspirant et Sous-chef)
        const isChampion = (m.type && Array.isArray(m.type) && m.type.some(t => String(t).toLowerCase() === 'champion')) ||
                           (m.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === m.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'champion')));

        if (isChampion) {
            if (!m.type) m.type = [];
            if (!m.type.some(t => String(t).toLowerCase() === 'champion')) {
                m.type.push('champion');
            }

            const inspIdx = m.skills.findIndex(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'inspirant' || n.toLowerCase() === 'inspiring' || (s.id && s.id === 'sk_inspirant');
            });
            if (inspIdx >= 0) {
                m.skills[inspIdx] = JSON.parse(JSON.stringify(inspirantObj));
            } else {
                m.skills.unshift(JSON.parse(JSON.stringify(inspirantObj)));
            }

            const sousChefIdx = m.skills.findIndex(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'sous-chef' || n.toLowerCase() === 'sous chef' || (s.id && s.id === 'sk_sous_chef');
            });
            if (sousChefIdx >= 0) {
                m.skills[sousChefIdx] = JSON.parse(JSON.stringify(sousChefObj));
            } else {
                // Insérer Sous-chef juste après Inspirant ou en début
                let inspPos = m.skills.findIndex(s => s.id === 'sk_inspirant' || (s.name && (s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')));
                if (inspPos >= 0) {
                    m.skills.splice(inspPos + 1, 0, JSON.parse(JSON.stringify(sousChefObj)));
                } else {
                    m.skills.unshift(JSON.parse(JSON.stringify(sousChefObj)));
                }
            }
        }

        // Monté (Escher cutter/Dirt bike équipé) -> Nerves of steel et Hit & run.
        // Uniquement ajoutées, jamais retirées si le guerrier redescend de sa
        // monture : on ne peut pas distinguer une compétence gagnée par la
        // monture d'une compétence choisie librement par ailleurs, et il vaut
        // mieux ne jamais risquer de retirer une compétence légitimement acquise.
        const isMounted = (m.equipment || []).some(e => e && (e.id === 'eq_dirt_bike' || e.id === 'eq_escher_cutter'));
        if (isMounted) {
            const hasNerves = m.skills.some(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'nerves of steel' || (s.id && s.id === 'sk_nerfs_acier');
            });
            if (!hasNerves) {
                const nervesSkill = (typeof db !== 'undefined' && db.skills && db.skills.muscle)
                    ? db.skills.muscle.find(s => s.id === 'sk_nerfs_acier' || s.name.toLowerCase() === 'nerves of steel')
                    : null;
                m.skills.push(nervesSkill ? JSON.parse(JSON.stringify(nervesSkill)) : {
                    id: "sk_nerfs_acier", name: "Nerves of steel",
                    desc: "Si touché au tir, test de cool : si réussi, non suppressed."
                });
            }

            const hasHitRun = m.skills.some(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'hit & run' || (s.id && s.id === 'sk_hit_run');
            });
            if (!hasHitRun) {
                const hitRunSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                    ? db.skills.generique.find(s => s.id === 'sk_hit_run' || s.name.toLowerCase() === 'hit & run')
                    : null;
                m.skills.push(hitRunSkill ? JSON.parse(JSON.stringify(hitRunSkill)) : {
                    id: "sk_hit_run", name: "Hit & run",
                    desc: "Après action de combat, peut consolider (sortir de 1\") en finissant à +1\" des ennemis."
                });
            }
        }

        // Migration grenades : les grenades ne prennent pas d'emplacements d'armes et sont notées dans l'équipement
        if (m.weapons && m.weapons.length > 0) {
            let toMove = [];
            m.weapons = m.weapons.filter(w => {
                let isGrenade = w.counts_as_equip || w.type === 'Grenade' || (w.id && ((w.id.startsWith('wpn_grenade_') && w.id !== 'wpn_grenade_launcher') || w.id === 'wpn_charge_demo'));
                if (isGrenade) {
                    toMove.push(w);
                    return false;
                }
                return true;
            });
            if (toMove.length > 0) {
                if (!m.equipment) m.equipment = [];
                toMove.forEach(g => {
                    let item = JSON.parse(JSON.stringify(g));
                    item.type = "Grenade";
                    item.counts_as_equip = true;
                    m.equipment.push(item);
                });
            }
        }

        // ===== Genestealer Cults =====

        // Règle d'armée Cult uprising -> tous les guerriers (hors mercenaires/hangers-on)
        if (m.charId && !m.charId.startsWith('merc_')) {
            const hasCult = m.skills.some(s => {
                let n = (typeof s === 'string' ? s : s.name) || '';
                return n.toLowerCase() === 'cult uprising' || (s.id && s.id === 'sk_cult_uprising');
            });
            if (!hasCult) {
                const cultSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                    ? db.skills.generique.find(s => s.id === 'sk_cult_uprising')
                    : null;
                m.skills.unshift(cultSkill ? JSON.parse(JSON.stringify(cultSkill)) : {
                    id: "sk_cult_uprising", name: "Cult uprising",
                    desc: "Règle d'armée : les guerriers ajoutent +1 à leur jet de dé quand ils font un coup de grâce."
                });
            }
        }

        // Alpha -> Extra arm innée
        if (m.charId === 'char_alpha') {
            const hasEa = m.skills.some(s => (s.id && s.id === 'sk_extra_arm') || ((typeof s === 'string' ? s : s.name || '').toLowerCase() === 'extra arm'));
            if (!hasEa) {
                const eaSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                    ? db.skills.generique.find(s => s.id === 'sk_extra_arm')
                    : null;
                m.skills.push(eaSkill ? JSON.parse(JSON.stringify(eaSkill)) : {
                    id: "sk_extra_arm", name: "Extra arm",
                    desc: "Le guerrier peut prendre une arme en plus et considère les braced shot comme des actions simples plutôt que doubles. Il ne peut néanmoins pas se déplacer ou faire un autre tir. Donne l'arme Clawed arm."
                });
            }
        }

        // Tout guerrier possédant Extra arm (inné ou acheté) doit avoir l'arme
        // Clawed arm sur sa fiche (voir sk_extra_arm dans data.js).
        const hasExtraArmSkill = m.skills.some(s => (s.id && s.id === 'sk_extra_arm') || ((typeof s === 'string' ? s : s.name || '').toLowerCase() === 'extra arm'));
        if (hasExtraArmSkill) {
            if (!m.weapons) m.weapons = [];
            if (!m.weapons.some(w => w.id === 'wpn_clawed_arm')) {
                const clawObj = (typeof db !== 'undefined' && db.weapons) ? db.weapons.find(w => w.id === 'wpn_clawed_arm') : null;
                let item = clawObj ? JSON.parse(JSON.stringify(clawObj)) : {
                    id: "wpn_clawed_arm", name: "Clawed arm",
                    profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "attaques additionnelles (1), melee, déchirant (6+)" }],
                    cost_credits: 0
                };
                item.isDefault = (m.charId === 'char_alpha');
                m.weapons.push(item);
            }
            // Le coût de Clawed arm est 0 (arme naturelle) : le "+20 points" de
            // l'option achetée (hors Alpha, qui l'a gratuitement) est porté par ce
            // flag, lu par calculateFighterCost (core-state.js).
            if (m.charId !== 'char_alpha' && m.extraArmPurchased === undefined) {
                m.extraArmPurchased = true;
            }
        }

        // Psychic familiar -> leash, catfall, clamber, omen of fortune, precognition
        if (m.charId === 'char_psychic_familiar') {
            const psySkillDefs = [
                { id: 'sk_leash', name: 'Leash de 3"', cat: 'generique', lookupId: 'sk_leash', fallback: { desc: "Portée pour familiers pour ignorer le test de panique." }, renameOnly: true },
                { id: 'sk_chute_chat', cat: 'agilite', fallback: { name: "Catfall", desc: "Réduit le cran de distance verticale en cas de chute/saut. Test d'agilité pour ne pas être suppressed si non blessé/hors combat." } },
                { id: 'sk_grimper', cat: 'agilite', fallback: { name: "Clamber", desc: "Mouvement non divisé par deux en grimpant." } },
                { id: 'sk_omen_of_fortune', cat: 'generique', fallback: { name: "Omen of fortune", desc: "Tant qu'il est dans la zone de leash du Psychic familiar, son maître a une sauvegarde invulnérable de 4+.", specific_to: "char_psychic_familiar" } },
                { id: 'sk_precognition', cat: 'generique', fallback: { name: "Precognition", desc: "Le Psychic familiar a une sauvegarde invulnérable de 4+.", specific_to: "char_psychic_familiar" } }
            ];
            psySkillDefs.forEach(def => {
                const hasIt = m.skills.some(s => s.id === def.id);
                if (hasIt) return;
                const dbSkill = (typeof db !== 'undefined' && db.skills && db.skills[def.cat])
                    ? db.skills[def.cat].find(s => s.id === def.id)
                    : null;
                let obj = dbSkill ? JSON.parse(JSON.stringify(dbSkill)) : Object.assign({ id: def.id }, def.fallback);
                if (def.renameOnly) obj.name = 'Leash de 3"';
                m.skills.push(obj);
            });
        }

        // Nettoyage de sécurité des blessures de convalescence si le guerrier n'est plus en recovery
        resolveEndedRecoveryInjuries(m);
    });

    if (gang.stash) {
        gang.stash.forEach(item => {
            if (item.name === 'Heavy stubber') {
                item.name = 'Heavy stubber*';
            }
            if (item.counts_as_equip || (item.id && ((item.id.startsWith('wpn_grenade_') && item.id !== 'wpn_grenade_launcher') || item.id === 'wpn_charge_demo'))) {
                item.type = "Grenade";
                item.counts_as_equip = true;
            }
        });
    }
}
const ensureDeathMaidenPoisonBlood = ensureInnateFighterSkills;

// Genestealer Cults : la compétence Extra arm ("Le guerrier peut prendre une
// arme en plus...") porte la limite habituelle de 3 emplacements d'armes à 4
// pour le guerrier qui la possède (innée pour l'Alpha, achetable pour Hybrid
// acolyte / Neophyte hybrid / Hybrid initiate). Voir sk_extra_arm dans data.js.
function getMaxWeaponSlots(fighter) {
    let hasExtraArm = !!(fighter && Array.isArray(fighter.skills) && fighter.skills.some(s =>
        (typeof s === 'object' && s && s.id === 'sk_extra_arm') ||
        (typeof s === 'string' && s.toLowerCase() === 'extra arm')
    ));
    return hasExtraArm ? 4 : 3;
}

function getWeaponSlotCost(w) {
    if (!w || !w.name) return 1;
    if (w.counts_as_equip || w.type === 'Grenade' || (w.id && ((w.id.startsWith('wpn_grenade_') && w.id !== 'wpn_grenade_launcher') || w.id === 'wpn_charge_demo'))) {
        return 0;
    }
    if (!w.name.includes('*')) return 1;
    if (w.accessory && (w.accessory.id === 'eq_suspenseur' || (w.accessory.name && w.accessory.name.toLowerCase().includes('suspens')))) {
        return 1;
    }
    return 2;
}

function loadGang(name) {
    const g = savedGangs[name];
    if (!g) return showToast("Gang introuvable.", "error");
    if (g.faction && g.faction !== APP_GANG_FACTION) {
        return showToast(`"${name}" est une liste ${g.faction}, pas Genestealer. Ce programme ne peut pas l'ouvrir.`, "error");
    }
    currentGang = g;
    if (currentGang.isEstablished === undefined) {
        currentGang.isEstablished = true;
    }
    ensureInnateFighterSkills(currentGang);
    ensureNoDuplicateTactics(currentGang);
    navigate('gang-manage');
}

// ==========================================
// GESTION ET AFFICHAGE DU GANG
// ==========================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeForJsStr(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function showSkillInfoModal(skillName) {
    if (!skillName) return;
    let foundSkill = null;
    let foundCategory = '';

    if (typeof db !== 'undefined' && db.skills) {
        for (let cat in db.skills) {
            let match = db.skills[cat].find(s => s.name.toLowerCase() === skillName.toLowerCase() || s.id === skillName.toLowerCase());
            if (match) {
                foundSkill = match;
                foundCategory = cat;
                break;
            }
        }
    }

    if (!foundSkill && currentGang && currentGang.members) {
        for (let m of currentGang.members) {
            if (m.skills) {
                let match = m.skills.find(s => {
                    let n = typeof s === 'string' ? s : (s.name || s.id);
                    return n && n.toLowerCase() === skillName.toLowerCase();
                });
                if (match && typeof match === 'object' && match.desc) {
                    foundSkill = match;
                    break;
                }
            }
        }
    }

    let categoryDisplay = foundCategory ? (foundCategory.charAt(0).toUpperCase() + foundCategory.slice(1)) : 'Général';
    let desc = foundSkill ? foundSkill.desc : 'Aucune description détaillée répertoriée pour cette compétence.';

    let html = `
        <div style="padding:4px;">
            <div style="background:#1a1424; border:1px solid #8a2be2; border-radius:6px; padding:14px; margin-bottom:12px;">
                <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#c084fc; font-weight:bold; margin-bottom:4px;">
                    Compétence • Catégorie : ${categoryDisplay}
                </div>
                <h3 style="margin:0 0 10px 0; color:#fff; font-size:18px;">${escapeHtml(skillName)}</h3>
                <p style="margin:0; font-size:14px; line-height:1.6; color:#eee;">${desc}</p>
            </div>
            <div style="text-align:right;">
                <button class="btn btn-cyan" onclick="closeModal()">Fermer</button>
            </div>
        </div>
    `;

    openModal(`Compétence : ${skillName}`, html);
}
window.showSkillInfoModal = showSkillInfoModal;

function showWeaponInfoModal(weaponName, fighterIdx) {
    if (!weaponName) return;
    let fighter = (currentGang && currentGang.members && fighterIdx !== undefined) ? currentGang.members[fighterIdx] : null;
    let w = null;

    if (fighter && fighter.weapons) {
        w = fighter.weapons.find(x => x.name.toLowerCase() === weaponName.toLowerCase() || x.id === weaponName);
    }
    if (!w && typeof db !== 'undefined' && db.weapons) {
        w = db.weapons.find(x => x.name.toLowerCase() === weaponName.toLowerCase() || x.id === weaponName);
    }
    if (!w && fighter && fighter.equipment) {
        w = fighter.equipment.find(x => x.name.toLowerCase() === weaponName.toLowerCase() || x.id === weaponName);
    }

    if (!w) {
        return openModal(`Arme : ${weaponName}`, `<p style="padding:10px; color:#aaa;">Informations non disponibles pour cette arme.</p>`);
    }

    let profiles = w.profiles || [];
    if (profiles.length === 0 && typeof db !== 'undefined' && db.weapons) {
        let dbW = db.weapons.find(x => x.name.toLowerCase() === w.name.toLowerCase() || x.id === w.id);
        if (dbW && dbW.profiles) profiles = dbW.profiles;
    }

    // Traits collection
    let traitsList = [];
    let traitSet = new Set();
    profiles.forEach(p => {
        if (p.traits) {
            p.traits.split(',').forEach(t => {
                let clean = t.trim();
                if (clean && !traitSet.has(clean.toLowerCase())) {
                    traitSet.add(clean.toLowerCase());
                    traitsList.push(clean);
                }
            });
        }
    });

    let traitsDescHTML = '';
    if (traitsList.length > 0) {
        traitsDescHTML = traitsList.map(t => {
            let baseKey = t.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
            let foundTrait = null;
            if (typeof db !== 'undefined' && db.weapon_traits) {
                foundTrait = db.weapon_traits.find(dt => dt.name.toLowerCase().replace(/\s*\(.*?\)/g, '').trim() === baseKey);
            }
            let desc = foundTrait ? foundTrait.desc : "Effet ou règle standard de cette arme.";
            return `
                <div style="background:#17171d; border-left:3px solid var(--accent-cyan); padding:8px 10px; margin-bottom:6px; border-radius:0 4px 4px 0; font-size:12px;">
                    <strong style="color:var(--accent-cyan);">${foundTrait ? foundTrait.name : t} :</strong> <span style="color:#ddd;">${desc}</span>
                </div>
            `;
        }).join('');
    }

    let accHTML = '';
    if (w.accessory) {
        let accName = (typeof w.accessory === 'object') ? w.accessory.name : w.accessory;
        let accEffect = (typeof w.accessory === 'object' && w.accessory.effect) ? w.accessory.effect : '';
        if (!accEffect && typeof db !== 'undefined' && db.equipment) {
            let foundAcc = db.equipment.find(e => e.name.toLowerCase() === String(accName).toLowerCase());
            if (foundAcc && foundAcc.effect) accEffect = foundAcc.effect;
        }
        accHTML = `
            <div style="background:#0f2119; border:1px solid #2ecc71; border-radius:6px; padding:10px 12px; margin-top:12px;">
                <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#2ecc71; font-weight:bold;">
                    Accessoire monté
                </div>
                <strong style="color:#fff; font-size:14px;">${escapeHtml(accName)}</strong><br>
                <span style="font-size:12px; color:#a8e6cf; line-height:1.4;">${accEffect || 'Accessoire d\'arme.'}</span>
            </div>
        `;
    }

    let costVal = w.cost_credits !== undefined ? w.cost_credits : (w.cost || 0);

    let html = `
        <div style="padding:2px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:10px;">
                <h3 style="margin:0; color:var(--accent-cyan); font-size:18px;">${escapeHtml(w.name)}</h3>
                <span style="background:#222; border:1px solid var(--accent-cyan); color:#fff; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:bold;">
                    ${costVal} crédits
                </span>
            </div>

            ${profiles.length > 0 ? `
                <div style="overflow-x:auto; margin-bottom:12px;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:center; background:#111; border-radius:4px; overflow:hidden;">
                        <thead>
                            <tr style="background:#1e1e24; color:var(--accent-cyan);">
                                <th style="padding:6px 8px; border:1px solid #333; text-align:left;">Profil</th>
                                <th style="padding:6px 4px; border:1px solid #333;">Portée C</th>
                                <th style="padding:6px 4px; border:1px solid #333;">Portée L</th>
                                <th style="padding:6px 4px; border:1px solid #333;">Force</th>
                                <th style="padding:6px 4px; border:1px solid #333;">AP</th>
                                <th style="padding:6px 4px; border:1px solid #333;">Dégâts</th>
                                <th style="padding:6px 8px; border:1px solid #333; text-align:left;">Traits</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${profiles.map(p => `
                                <tr>
                                    <td style="padding:6px 8px; border:1px solid #282828; text-align:left; font-weight:bold; color:#fff;">${p.name || 'Unique'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.SR || '-'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.LR || '-'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.S || '-'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.AP || '-'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.L || 1}</td>
                                    <td style="padding:6px 8px; border:1px solid #282828; text-align:left; color:#c084fc;">${p.traits || '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p style="color:#888; font-style:italic; font-size:13px;">Profil d\'arme de corps à corps ou standard.</p>'}

            ${accHTML}

            ${traitsDescHTML ? `
                <div style="margin-top:12px;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#c084fc; font-weight:bold; margin-bottom:6px;">
                        Effet des Traits d'arme :
                    </div>
                    ${traitsDescHTML}
                </div>
            ` : ''}

            <div style="margin-top:14px; text-align:right;">
                <button class="btn btn-cyan" onclick="closeModal()">Fermer</button>
            </div>
        </div>
    `;

    openModal(`Arme : ${w.name}`, html);
}
window.showWeaponInfoModal = showWeaponInfoModal;

function showAccessoryInfoModal(accName) {
    if (!accName) return;
    let acc = null;
    if (typeof db !== 'undefined' && db.equipment) {
        acc = db.equipment.find(e => e.name.toLowerCase() === accName.toLowerCase());
    }

    let effect = acc ? acc.effect : "Accessoire fixé sur une arme.";
    let cost = acc ? (acc.cost_credits || acc.cost || 0) : 0;
    let ruleDesc = (typeof db !== 'undefined' && db.accessory_rules && db.accessory_rules.desc) 
        ? db.accessory_rules.desc 
        : "Chaque arme ne peut recevoir qu'un seul accessoire. Si une arme est déséquipée et envoyée dans le stash, son accessoire aussi.";

    let html = `
        <div style="padding:2px;">
            <div style="background:#0f241a; border:1px solid #2ecc71; border-radius:6px; padding:14px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#2ecc71; font-weight:bold;">
                        Accessoire d'Arme
                    </span>
                    ${cost > 0 ? `<span style="background:#1b3d2b; color:#a8e6cf; border:1px solid #2ecc71; font-size:11px; padding:2px 8px; border-radius:4px; font-weight:bold;">${cost} cr</span>` : ''}
                </div>
                <h3 style="margin:0 0 8px 0; color:#fff; font-size:18px;">${escapeHtml(accName)}</h3>
                <p style="margin:0; font-size:14px; line-height:1.5; color:#eee;">${effect}</p>
            </div>

            <div style="background:#141416; border:1px solid #333; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:12px; color:#bbb; line-height:1.5;">
                <strong style="color:var(--accent-cyan);">Règle des Accessoires :</strong><br>
                ${ruleDesc}
            </div>

            <div style="text-align:right;">
                <button class="btn btn-cyan" onclick="closeModal()">Fermer</button>
            </div>
        </div>
    `;

    openModal(`Accessoire : ${accName}`, html);
}
window.showAccessoryInfoModal = showAccessoryInfoModal;

function showEquipmentInfoModal(equipName, fighterIdx) {
    if (!equipName) return;
    let fighter = (currentGang && currentGang.members && fighterIdx !== undefined) ? currentGang.members[fighterIdx] : null;
    let item = null;

    if (fighter) {
        if (fighter.armor && fighter.armor.name && fighter.armor.name.toLowerCase() === equipName.toLowerCase()) {
            item = fighter.armor;
        }
        if (!item && fighter.equipment) {
            item = fighter.equipment.find(e => e.name.toLowerCase() === equipName.toLowerCase() || e.id === equipName);
        }
    }

    if (!item && typeof db !== 'undefined' && db.equipment) {
        item = db.equipment.find(e => e.name.toLowerCase() === equipName.toLowerCase() || e.id === equipName);
    }
    if (!item && typeof db !== 'undefined' && db.weapons) {
        item = db.weapons.find(w => w.name.toLowerCase() === equipName.toLowerCase() || w.id === equipName);
    }

    if (!item) {
        return openModal(`Équipement : ${equipName}`, `<p style="padding:10px; color:#aaa;">Informations non disponibles pour cet équipement.</p>`);
    }

    let isGrenade = item.counts_as_equip || item.type === 'Grenade' || (item.id && ((item.id.startsWith('wpn_grenade_') && item.id !== 'wpn_grenade_launcher') || item.id === 'wpn_charge_demo')) || (item.profiles && item.profiles.length > 0);
    let profiles = item.profiles || [];
    if (isGrenade && profiles.length === 0 && typeof db !== 'undefined' && db.weapons) {
        let foundW = db.weapons.find(w => w.id === item.id || w.name === item.name);
        if (foundW && foundW.profiles) profiles = foundW.profiles;
    }

    let costVal = item.cost_credits !== undefined ? item.cost_credits : (item.cost || 0);
    let typeVal = item.type || (isGrenade ? 'Grenade' : 'Équipement');
    let effectVal = item.effect || (isGrenade ? "Grenade de combat projetée à la main ou via un lance-grenades." : "Équipement personnel standard.");

    let traitsDescHTML = '';
    if (profiles.length > 0) {
        let traitSet = new Set();
        let traitsList = [];
        profiles.forEach(p => {
            if (p.traits) {
                p.traits.split(',').forEach(t => {
                    let clean = t.trim();
                    if (clean && !traitSet.has(clean.toLowerCase())) {
                        traitSet.add(clean.toLowerCase());
                        traitsList.push(clean);
                    }
                });
            }
        });
        if (traitsList.length > 0) {
            traitsDescHTML = traitsList.map(t => {
                let baseKey = t.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
                let foundTrait = null;
                if (typeof db !== 'undefined' && db.weapon_traits) {
                    foundTrait = db.weapon_traits.find(dt => dt.name.toLowerCase().replace(/\s*\(.*?\)/g, '').trim() === baseKey);
                }
                let desc = foundTrait ? foundTrait.desc : "Effet ou règle standard de cette grenade.";
                return `
                    <div style="background:#17171d; border-left:3px solid var(--accent-cyan); padding:8px 10px; margin-bottom:6px; border-radius:0 4px 4px 0; font-size:12px;">
                        <strong style="color:var(--accent-cyan);">${foundTrait ? foundTrait.name : t} :</strong> <span style="color:#ddd;">${desc}</span>
                    </div>
                `;
            }).join('');
        }
    }

    let html = `
        <div style="padding:2px;">
            <div style="background:#22180d; border:1px solid #f39c12; border-radius:6px; padding:14px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#f39c12; font-weight:bold;">
                        ${typeVal}
                    </span>
                    ${costVal > 0 ? `<span style="background:#3d2a13; color:#fce38a; border:1px solid #f39c12; font-size:11px; padding:2px 8px; border-radius:4px; font-weight:bold;">${costVal} cr</span>` : ''}
                </div>
                <h3 style="margin:0 0 8px 0; color:#fff; font-size:18px;">${escapeHtml(item.name)}</h3>
                <p style="margin:0; font-size:14px; line-height:1.5; color:#eee;">${effectVal}</p>
            </div>

            ${profiles.length > 0 ? `
                <div style="overflow-x:auto; margin-bottom:12px;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:var(--accent-cyan); font-weight:bold; margin-bottom:6px;">
                        Profils d'attaque :
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:center; background:#111; border-radius:4px; overflow:hidden;">
                        <thead>
                            <tr style="background:#1e1e24; color:var(--accent-cyan);">
                                <th style="padding:6px 8px; border:1px solid #333; text-align:left;">Type</th>
                                <th style="padding:6px 4px; border:1px solid #333;">Portée C</th>
                                <th style="padding:6px 4px; border:1px solid #333;">Portée L</th>
                                <th style="padding:6px 4px; border:1px solid #333;">Force</th>
                                <th style="padding:6px 4px; border:1px solid #333;">AP</th>
                                <th style="padding:6px 4px; border:1px solid #333;">Dégâts</th>
                                <th style="padding:6px 8px; border:1px solid #333; text-align:left;">Traits</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${profiles.map(p => `
                                <tr>
                                    <td style="padding:6px 8px; border:1px solid #282828; text-align:left; font-weight:bold; color:#fff;">${p.name || 'Grenade'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.SR || 'Sx3'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.LR || '-'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.S || '-'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.AP || '-'}</td>
                                    <td style="padding:6px 4px; border:1px solid #282828; color:#ddd;">${p.L || 1}</td>
                                    <td style="padding:6px 8px; border:1px solid #282828; text-align:left; color:#c084fc;">${p.traits || '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${traitsDescHTML ? `
                <div style="margin-top:10px;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#c084fc; font-weight:bold; margin-bottom:6px;">
                        Traits associés :
                    </div>
                    ${traitsDescHTML}
                </div>
            ` : ''}

            <div style="margin-top:14px; text-align:right;">
                <button class="btn btn-cyan" onclick="closeModal()">Fermer</button>
            </div>
        </div>
    `;

    openModal(`Équipement : ${item.name}`, html);
}
window.showEquipmentInfoModal = showEquipmentInfoModal;

function renderGangManage(container) {
    if (!container) container = document.getElementById('main-content');
    if (!container) return;

    ensureInnateFighterSkills(currentGang);
    calculateGangRating(currentGang);
    updateTopBar();

    const statKeys = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'Sv', 'Ld', 'Cl', 'Wil', 'Int'];

    let html = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                <h2 style="margin:0;">Gestion de Gang : ${escapeHtml(currentGang.name)}</h2>
                ${currentGang.isEstablished 
                    ? `<span style="font-size:13px; color:#2ecc71; background:rgba(46,204,113,0.15); border:1px solid #2ecc71; padding:4px 10px; border-radius:14px; font-weight:bold;">✓ Mode Campagne Validé</span>` 
                    : `<span style="font-size:13px; color:#f39c12; background:rgba(243,156,18,0.15); border:1px solid #f39c12; padding:4px 10px; border-radius:14px; font-weight:bold;">⏳ Création Initiale</span>`}
            </div>
            ${!currentGang.isEstablished ? `<button onclick="openRecruitModal()">+ Recruter un Combattant</button>` : ''}
            <button onclick="openGangTacticsModal()">🎴 Cartes Tactiques (${(currentGang.tactics || []).length})</button>
            <button onclick="if(typeof resetSetupState === 'function') resetSetupState(); appState.isQuickMatch = false; navigate('game-setup')">⚔️ Partie de campagne</button>
            <button class="btn-cyan" onclick="if(typeof resetSetupState === 'function') resetSetupState(); appState.isQuickMatch = true; navigate('game-setup')">⚡ Partie rapide</button>
            <button onclick="if(typeof renderPostCycleView === 'function') { renderPostCycleView(document.getElementById('main-content')); }">🔄 Lancer un Post-Cycle</button>
            ${!currentGang.isEstablished ? `<button class="btn-cyan" onclick="finishGangCreation()">✅ Valider la création du gang</button>` : ''}
            <button onclick="exportGang('${escapeForJsStr(currentGang.name)}')">Export JSON</button>
            <button class="btn-danger" onclick="navigate('menu')">Menu Principal</button>
        </div>
        
        <div class="card">
            <h3>Membres du Gang (${currentGang.members.length})</h3>
    `;

    if (currentGang.members.length === 0) {
        html += `<p style="margin-top:10px;">Aucun membre recruté.</p>`;
    } else {
        currentGang.members.forEach((m, idx) => {
            let st = m.stats || {};
            let xp = (typeof getFighterXP === 'function') ? getFighterXP(m) : (m.xp || 0);

            // 1. Compétences (cliquables)
            let skillsHTML = '';
            if (m.skills && m.skills.length > 0) {
                skillsHTML = m.skills.map(s => {
                    let sName = typeof s === 'string' ? s : (s.name || s.id);
                    return `<span class="tag-chip tag-skill" title="Cliquer pour voir la description" onclick="showSkillInfoModal('${escapeForJsStr(sName)}'); event.stopPropagation();">${escapeHtml(sName)}</span>`;
                }).join('');
            } else {
                skillsHTML = '<span style="color:#777; font-style:italic;">Aucune</span>';
            }

            // 2. Armes (avec accessoire si présent, cliquables)
            let weaponsHTML = '';
            if (m.weapons && m.weapons.length > 0) {
                weaponsHTML = m.weapons.map(w => {
                    let wName = w.name;
                    let accName = null;
                    if (w.accessory) {
                        accName = (typeof w.accessory === 'object') ? w.accessory.name : w.accessory;
                    }
                    let wBadge = `<span class="tag-chip tag-weapon" title="Cliquer pour voir le profil et les règles" onclick="showWeaponInfoModal('${escapeForJsStr(wName)}', ${idx}); event.stopPropagation();">${escapeHtml(wName)}</span>`;
                    if (accName) {
                        let accBadge = `<span class="tag-chip tag-accessory" title="Cliquer pour voir l'effet de l'accessoire" onclick="showAccessoryInfoModal('${escapeForJsStr(accName)}'); event.stopPropagation();">${escapeHtml(accName)}</span>`;
                        return `${wBadge} <span style="color:#aaa; font-style:italic; margin:0 3px;">avec</span> ${accBadge}`;
                    }
                    return wBadge;
                }).join('<span style="color:#555; margin:0 4px;">,</span> ');
            } else {
                weaponsHTML = '<span style="color:#777; font-style:italic;">Aucune</span>';
            }

            // 3. Équipements & Armures (cliquables)
            let allEquip = [];
            if (m.armor && m.armor.name) {
                allEquip.push({ name: m.armor.name });
            }
            if (m.equipment && Array.isArray(m.equipment)) {
                m.equipment.forEach(e => {
                    if (e && e.name) allEquip.push({ name: e.name });
                });
            }
            let equipmentHTML = '';
            if (allEquip.length > 0) {
                equipmentHTML = allEquip.map(eq => {
                    return `<span class="tag-chip tag-equip" title="Cliquer pour voir la règle détaillée" onclick="showEquipmentInfoModal('${escapeForJsStr(eq.name)}', ${idx}); event.stopPropagation();">${escapeHtml(eq.name)}</span>`;
                }).join('');
            } else {
                equipmentHTML = '<span style="color:#777; font-style:italic;">Aucun</span>';
            }
            
            html += `
            <div class="card" style="margin-top:12px; background:#18181c; border:1px solid #333; padding:14px;">
                <!-- Ligne 1 : Nom, Rôle, Coût, Type, XP, Statuts + Bouton Licencier (et modifier seulement si création non validée) -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding-bottom:8px; border-bottom:1px solid #282830;">
                    <div style="font-size:14px; line-height:1.5;">
                        <strong style="color:#fff; font-size:16px;">${escapeHtml(m.customName || 'Sans nom')}</strong> 
                        <span style="color:#aaa; font-weight:normal;">(${escapeHtml(m.charName)})</span>
                        <span style="color:#555; margin:0 6px;">—</span>
                        <span style="color:var(--accent-cyan); font-weight:bold;">${m.totalCost || m.cost || 0} cr</span>
                        <span style="color:#555; margin:0 6px;">|</span>
                        <span style="color:#bbb;">Type : <strong style="color:#eee;">${buildFighterTypeBadgesHTML(getEffectiveFighterTypes(m))}</strong></span>
                        <span style="color:#555; margin:0 6px;">|</span>
                        <span style="color:#bbb;">XP : <strong style="color:var(--accent-cyan);">${xp}</strong></span>
                        ${m.recovery ? `<span style="background:#e67e22; color:#fff; padding:2px 7px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:8px;">🩹 Recovery</span>` : ''}
                        ${m.critInj ? `<span style="background:#c0392b; color:#fff; padding:2px 7px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:8px;">⚠️ Blessure Critique</span>` : ''}
                        ${(m.injuries && m.injuries.length > 0) ? `<span style="color:#e74c3c; font-size:12px; margin-left:8px;">[Blessures : ${m.injuries.join(', ')}]</span>` : ''}
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${!currentGang.isEstablished ? `<button onclick="editFighter(${idx})" style="padding:6px 12px; font-size:12px; margin:0;">Équipement & Compétences</button>` : ''}
                        <button class="btn-danger" onclick="removeFighter(${idx})" style="padding:6px 12px; font-size:12px; margin:0;">Licencier</button>
                    </div>
                </div>

                <!-- Ligne 2 : Compétences, Armes et Équipements sur la même ligne -->
                <div style="margin:6px 0 10px 0; font-size:13px; line-height:1.6; display:flex; flex-wrap:wrap; align-items:center; gap:6px 18px;">
                    <div style="display:inline-flex; align-items:center; flex-wrap:wrap;">
                        <strong style="color:var(--accent-purple, #a29bfe); margin-right:6px;">Compétences :</strong>
                        ${skillsHTML}
                    </div>
                    <div style="display:inline-flex; align-items:center; flex-wrap:wrap;">
                        <strong style="color:var(--accent-cyan, #00ffff); margin-right:6px;">Armes :</strong>
                        ${weaponsHTML}
                    </div>
                    <div style="display:inline-flex; align-items:center; flex-wrap:wrap;">
                        <strong style="color:#f39c12; margin-right:6px;">Équipements :</strong>
                        ${equipmentHTML}
                    </div>
                </div>

                <!-- Tableau des Caractéristiques -->
                <div style="overflow-x:auto; background:#111; padding:8px; border-radius:4px; border:1px solid #2c2c36;">
                    <div style="display:flex; justify-content:space-between; gap:4px; text-align:center; min-width:600px;">
                        ${(() => {
                            let armorDeltas = getArmorStatDeltas(m);
                            return statKeys.map(key => {
                                let raw = st[key] !== undefined ? st[key] : '-';
                                let display;
                                if (key === 'M') {
                                    display = formatMovementWithMount(m);
                                } else if (armorDeltas && armorDeltas[key] !== undefined) {
                                    display = formatStatWithArmorDelta(raw, armorDeltas[key]);
                                } else {
                                    display = raw;
                                }
                                return `
                            <div style="flex:1; background:#1a1a1f; padding:6px 2px; border-radius:3px; border:1px solid #222228;">
                                <small style="color:var(--accent-cyan); font-weight:bold; font-size:11px;">${key}</small>
                                <div style="font-weight:bold; font-size:13px; margin-top:2px; color:#fff;">${display}</div>
                            </div>
                        `;
                            }).join('');
                        })()}
                    </div>
                </div>
            </div>`;
        });
    }
    html += `</div>`;
    container.innerHTML = html;
}


function finishGangCreation() {
    showConfirmModal(
        "Validation de la création du gang",
        `Confirmer la validation de la liste initiale pour <strong>${currentGang.name}</strong> et passer en mode <strong>Campagne</strong> ?<br><br>
        <div style="background:#141414; padding:12px; border-radius:6px; border:1px solid #444; font-size:13px; line-height:1.6; color:#ddd;">
            <span style="color:#2ecc71;">✓</span> Débloque le recrutement des mercenaires (Hive Scum, Bounty Hunter)<br>
            <span style="color:#2ecc71;">✓</span> Active la gestion des blessures durables, séquelles et gains d'XP<br>
            <span style="color:#2ecc71;">✓</span> Donne accès aux séquences de Post-Bataille et de Post-Cycle
        </div>`,
        "✅ Valider le Gang",
        () => {
            currentGang.isEstablished = true;
            saveGangs();
            renderGangManage(document.getElementById('main-content'));
            showToast("Le gang est désormais validé en mode Campagne !", "success");
        }
    );
}

