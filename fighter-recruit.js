// fighter-recruit.js (3/5 - issu de l'ancien app.js)
// Rôle : recrutement d'un combattant et édition de sa fiche (fiche vierge
// avant sauvegarde définitive dans currentGang.members).
// Dépendances : core-state.js, gang-views.js (renderGangManage pour le retour).

// ==========================================
// FIGHTER EDITING & RECRUITMENT
// ==========================================
function openRecruitModal() {
    if (currentGang && currentGang.isEstablished && (typeof appState === 'undefined' || appState.returnTo !== 'post-cycle')) {
        showToast("Le recrutement de combattants est verrouillé une fois la création du gang validée. Utilisez le Post-Cycle.", "error");
        return;
    }
    let html = `<h3>Sélectionner le profil à recruter</h3>`;
    const showMercs = currentGang && (currentGang.isEstablished || (typeof appState !== 'undefined' && appState.returnTo === 'post-cycle'));
    // Un seul Leader possible par gang, et toujours un une fois le gang établi :
    // dès qu'un combattant porte déjà le type "leader", plus aucun profil Leader
    // n'est proposé au recrutement (initial ou en post-cycle).
    const gangAlreadyHasLeader = currentGang && (currentGang.members || []).some(m => (m.type || []).some(t => normalizeTypeKey(t) === 'leader'));
    if (currentGang && currentGang.credits !== undefined) {
        html += `<p style="color:#aaa; font-size:13px; margin-bottom:12px;">Trésorerie disponible : <strong style="color:var(--accent-cyan);">${currentGang.credits} cr</strong></p>`;
    }

    db.characters.forEach(c => {
        const isMerc = c.id.startsWith("merc_");
        if (isMerc && !showMercs) return;
        // Les familiers non-mercenaires s'achètent comme de l'équipement sur la
        // fiche de leur propriétaire (catégorie "Familiers"), pas ici. Les
        // familiers mercenaires (Rat géant, Millisaur...) restent recrutables
        // normalement pour l'instant (règles spécifiques à venir).
        if (typeof isNonMercFamiliarCharDef === 'function' && isNonMercFamiliarCharDef(c)) return;
        if (gangAlreadyHasLeader && (c.type || []).some(t => normalizeTypeKey(t) === 'leader')) return;

        html += `
            <div class="fighter-item">
                <span><strong>${c.name}</strong> (${c.cost}c) ${isMerc ? '<small style="color:var(--accent-purple);">[Mercenaire/Hanger-on]</small>' : ''}</span>
                <button onclick="selectRecruitProfile('${c.id}')">Choisir</button>
            </div>
        `;
    });

    openModal("Recrutement", html);
}

// Construit l'état initial (compétences de départ, armes, équipement) d'un
// personnage fraîchement recruté à partir de sa définition dans db.characters.
// Extrait de selectRecruitProfile() pour être réutilisable ailleurs (achat
// d'un familier comme équipement, voir weapons-equipment.js), qui a besoin
// exactement de la même logique (y compris les compétences innées spéciales
// comme "Lands on their feet" pour le Phyrr Cat).
function buildInitialFighterState(char) {
    let initSkills = [];

    // Règle d'armée Genestealer Cults "Cult uprising" : ajoutée automatiquement à
    // tous les guerriers du gang (mercenaires/hangers-on exclus, ils ne font pas
    // partie du culte). Non retirable (voir renderFighterEdit).
    if (!char.id.startsWith("merc_")) {
        let cultSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_cult_uprising')
            : null;
        initSkills.push(cultSkill ? JSON.parse(JSON.stringify(cultSkill)) : {
            id: "sk_cult_uprising",
            name: "Cult uprising",
            desc: "Règle d'armée : les guerriers ajoutent +1 à leur jet de dé quand ils font un coup de grâce."
        });
    }

    // Alpha : possède la compétence Extra arm directement (l'arme Clawed arm est
    // ajoutée automatiquement plus bas via default_weapons du personnage).
    if (char.id === "char_alpha") {
        let eaSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_extra_arm')
            : null;
        initSkills.push(eaSkill ? JSON.parse(JSON.stringify(eaSkill)) : {
            id: "sk_extra_arm",
            name: "Extra arm",
            desc: "Le guerrier peut prendre une arme en plus et considère les braced shot comme des actions simples plutôt que doubles. Il ne peut néanmoins pas se déplacer ou faire un autre tir. Donne l'arme Clawed arm."
        });
    }

    // Psychic familiar : compétences de départ innées (leash, catfall, clamber,
    // omen of fortune, precognition). Traité explicitement ici plutôt que par le
    // parseur générique de starting_skill plus bas (trop de compétences à la fois,
    // dont deux propres à ce familier), qui l'ignore volontairement (voir plus bas).
    if (char.id === "char_psychic_familiar") {
        let leashSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_leash')
            : null;
        let leashObj = JSON.parse(JSON.stringify(leashSkill || {
            id: "sk_leash", name: "Leash de X\"",
            desc: "Portée pour familiers pour ignorer le test de panique."
        }));
        leashObj.name = "Leash de 3\"";
        initSkills.push(leashObj);

        let catfallSkill = (typeof db !== 'undefined' && db.skills && db.skills.agilite)
            ? db.skills.agilite.find(s => s.id === 'sk_chute_chat')
            : null;
        initSkills.push(JSON.parse(JSON.stringify(catfallSkill || {
            id: "sk_chute_chat", name: "Catfall",
            desc: "Réduit le cran de distance verticale en cas de chute/saut. Test d'agilité pour ne pas être suppressed si non blessé/hors combat."
        })));

        let clamberSkill = (typeof db !== 'undefined' && db.skills && db.skills.agilite)
            ? db.skills.agilite.find(s => s.id === 'sk_grimper')
            : null;
        initSkills.push(JSON.parse(JSON.stringify(clamberSkill || {
            id: "sk_grimper", name: "Clamber",
            desc: "Mouvement non divisé par deux en grimpant."
        })));

        let omenSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_omen_of_fortune')
            : null;
        initSkills.push(JSON.parse(JSON.stringify(omenSkill || {
            id: "sk_omen_of_fortune", name: "Omen of fortune",
            desc: "Tant qu'il est dans la zone de leash du Psychic familiar, son maître a une sauvegarde invulnérable de 4+.",
            specific_to: "char_psychic_familiar"
        })));

        let precogSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_precognition')
            : null;
        initSkills.push(JSON.parse(JSON.stringify(precogSkill || {
            id: "sk_precognition", name: "Precognition",
            desc: "Le Psychic familiar a une sauvegarde invulnérable de 4+.",
            specific_to: "char_psychic_familiar"
        })));
    }

    // Compétence de départ innée Poison blood pour la Death Maiden
    if (char.id === "char_death_maiden" || (char.starting_skill && char.starting_skill.toLowerCase().includes("poison blood"))) {
        let pbSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_poison_blood' || s.name.toLowerCase() === 'poison blood')
            : null;
        if (!pbSkill) {
            pbSkill = {
                id: "sk_poison_blood",
                name: "Poison blood",
                desc: "Quand le guerrier utilise une arme avec le trait toxine (X+), les résultats de 1 peuvent être relancés."
            };
        }
        initSkills.push(JSON.parse(JSON.stringify(pbSkill)));
    }

    // Compétence de départ innée Lands on their feet pour le Phyrr Cat
    if (char.id === "char_phyrr_cat" || (char.starting_skill && char.starting_skill.toLowerCase().includes("lands on their feet"))) {
        let lotfSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_lands_on_feet' || s.name.toLowerCase() === 'lands on their feet')
            : null;
        if (!lotfSkill) {
            lotfSkill = {
                id: "sk_lands_on_feet",
                name: "Lands on their feet",
                desc: "Si le guerrier tombe pour n'importe quelle raison, réduire de 3\" la hauteur de chute dans le tableau.",
                specific_to: "char_phyrr_cat"
            };
        }
        initSkills.push(JSON.parse(JSON.stringify(lotfSkill)));
    }

    // Compétence de départ innée Juggernaut pour les Brutes
    const isBruteChar = (char.type && Array.isArray(char.type) && char.type.some(t => String(t).toLowerCase() === 'brute')) ||
                        (char.starting_skill && char.starting_skill.toLowerCase().includes("juggernaut"));
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
        if (!initSkills.some(s => (s.id === 'sk_juggernaut' || (s.name && s.name.toLowerCase() === 'juggernaut')))) {
            initSkills.push(JSON.parse(JSON.stringify(juggSkill)));
        }
    }

    // Compétences de départ innées Inspirant et Chef pour les Leaders
    const isLeaderChar = (char.type && Array.isArray(char.type) && char.type.some(t => String(t).toLowerCase() === 'leader')) ||
                         (char.id === "char_reine_de_gang");
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
        if (!initSkills.some(s => s.id === 'sk_inspirant' || (s.name && (s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')))) {
            initSkills.push(JSON.parse(JSON.stringify(inspirantObj)));
        }
        if (!initSkills.some(s => s.id === 'sk_chef' || (s.name && s.name.toLowerCase() === 'chef'))) {
            initSkills.push(JSON.parse(JSON.stringify(chefObj)));
        }
    }

    // Compétences de départ innées Inspirant et Sous-chef pour les Champions
    const isChampionChar = (char.type && Array.isArray(char.type) && char.type.some(t => String(t).toLowerCase() === 'champion')) ||
                           (char.id === "char_matriarche" || char.id === "char_death_maiden");
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
        if (!initSkills.some(s => s.id === 'sk_inspirant' || (s.name && (s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')))) {
            initSkills.push(JSON.parse(JSON.stringify(inspirantObj)));
        }
        if (!initSkills.some(s => s.id === 'sk_sous_chef' || (s.name && (s.name.toLowerCase() === 'sous-chef' || s.name.toLowerCase() === 'sous chef')))) {
            initSkills.push(JSON.parse(JSON.stringify(sousChefObj)));
        }
    }

    if (char.starting_skill && char.starting_skill.trim() !== "" && !char.starting_skill.includes("choix") && !char.starting_skill.includes("selon") && char.id !== "char_psychic_familiar") {
        const norm = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        let skillNames = char.starting_skill.split(/\s+et\s+|,\s*|\/\s*/i);

        skillNames.forEach(rawName => {
            let cleanRaw = rawName.trim();
            if (!cleanRaw) return;
            if (cleanRaw.toLowerCase() === "poison blood" || cleanRaw.toLowerCase() === "lands on their feet" || cleanRaw.toLowerCase() === "juggernaut" || cleanRaw.toLowerCase() === "inspirant" || cleanRaw.toLowerCase() === "inspiring" || cleanRaw.toLowerCase() === "chef" || cleanRaw.toLowerCase() === "sous-chef" || cleanRaw.toLowerCase() === "sous chef") return; // Déjà traitée au-dessus

            let normRaw = norm(cleanRaw);
            let foundSkill = null;

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

            if (foundSkill) {
                initSkills.push(foundSkill);
            } else {
                initSkills.push({
                    id: "sk_start_" + generateId(),
                    name: cleanRaw.charAt(0).toUpperCase() + cleanRaw.slice(1),
                    desc: "Compétence de départ"
                });
            }
        });
    }

    let initWeapons = [];
    if (char.default_weapons) {
        char.default_weapons.forEach(wId => {
            let wObj = db.weapons.find(w => w.id === wId || w.name === wId);
            if (wObj) {
                let item = JSON.parse(JSON.stringify(wObj));
                item.isDefault = true;
                initWeapons.push(item);
            }
        });
    }

    let initEquip = [];
    if (char.default_equipment) {
        char.default_equipment.forEach(eId => {
            let eObj = db.equipment.find(e => e.id === eId || e.name === eId);
            if (eObj) {
                let item = JSON.parse(JSON.stringify(eObj));
                item.isDefault = true;
                initEquip.push(item);
            }
        });
    }

    return { initSkills, initWeapons, initEquip };
}

function selectRecruitProfile(charId) {
    closeModal();
    const char = db.characters.find(c => c.id === charId);
    if (!char) return;

    let { initSkills, initWeapons, initEquip } = buildInitialFighterState(char);

    tempFighter = {
        id: generateId(),
        charId: char.id,
        charName: char.name,
        customName: "",
        type: char.type,
        stats: JSON.parse(JSON.stringify(char.stats)),
        weapons: initWeapons,
        equipment: initEquip,
        skills: initSkills,
        totalCost: char.cost,
        xp: char.starting_xp || 0
    };
    appState.editTarget = null;
    navigate('fighter-edit');
}

function editFighter(idx) {
    if (currentGang && currentGang.isEstablished && (typeof appState === 'undefined' || appState.returnTo !== 'post-cycle')) {
        showToast("La modification d'un combattant est verrouillée une fois la création du gang validée. Utilisez le Post-Cycle.", "error");
        return;
    }
    appState.editTarget = idx;
    tempFighter = JSON.parse(JSON.stringify(currentGang.members[idx]));

    if (tempFighter.weapons) {
        tempFighter.weapons.forEach(w => {
            if (w.id === 'wpn_heavy_stubber' || w.name === 'Heavy stubber') {
                w.name = 'Heavy stubber*';
            }
        });
    }

    if (tempFighter.charId === 'char_death_maiden') {
        if (!tempFighter.skills) tempFighter.skills = [];
        const hasPb = tempFighter.skills.some(s => {
            let n = (typeof s === 'string' ? s : s.name) || '';
            return n.toLowerCase() === 'poison blood' || (s.id && s.id === 'sk_poison_blood');
        });
        if (!hasPb) {
            let pbSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                ? db.skills.generique.find(s => s.id === 'sk_poison_blood' || s.name.toLowerCase() === 'poison blood')
                : null;
            tempFighter.skills.unshift(pbSkill ? JSON.parse(JSON.stringify(pbSkill)) : {
                id: "sk_poison_blood",
                name: "Poison blood",
                desc: "Quand le guerrier utilise une arme avec le trait toxine (X+), les résultats de 1 peuvent être relancés."
            });
        }
    }

    if (tempFighter.charId === 'char_phyrr_cat') {
        if (!tempFighter.skills) tempFighter.skills = [];
        const hasLotf = tempFighter.skills.some(s => {
            let n = (typeof s === 'string' ? s : s.name) || '';
            return n.toLowerCase() === 'lands on their feet' || (s.id && s.id === 'sk_lands_on_feet');
        });
        if (!hasLotf) {
            let lotfSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                ? db.skills.generique.find(s => s.id === 'sk_lands_on_feet' || s.name.toLowerCase() === 'lands on their feet')
                : null;
            tempFighter.skills.push(lotfSkill ? JSON.parse(JSON.stringify(lotfSkill)) : {
                id: "sk_lands_on_feet",
                name: "Lands on their feet",
                desc: "Si le guerrier tombe pour n'importe quelle raison, réduire de 3\" la hauteur de chute dans le tableau.",
                specific_to: "char_phyrr_cat"
            });
        }
    }

    const isBrute = (tempFighter.type && Array.isArray(tempFighter.type) && tempFighter.type.some(t => String(t).toLowerCase() === 'brute')) ||
                    (tempFighter.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === tempFighter.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'brute')));
    if (isBrute) {
        if (!tempFighter.skills) tempFighter.skills = [];
        const hasJugg = tempFighter.skills.some(s => {
            let n = (typeof s === 'string' ? s : s.name) || '';
            return n.toLowerCase() === 'juggernaut' || (s.id && s.id === 'sk_juggernaut');
        });
        if (!hasJugg) {
            let juggSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
                ? db.skills.generique.find(s => s.id === 'sk_juggernaut' || s.name.toLowerCase() === 'juggernaut')
                : null;
            tempFighter.skills.push(juggSkill ? JSON.parse(JSON.stringify(juggSkill)) : {
                id: "sk_juggernaut",
                name: "Juggernaut",
                desc: "Si touché au tir, suppressed uniquement si PV perdu ou effet du dé de blessure.",
                specific_to: "brute"
            });
        }
    }

    const isLeader = (tempFighter.type && Array.isArray(tempFighter.type) && tempFighter.type.some(t => String(t).toLowerCase() === 'leader')) ||
                     (tempFighter.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === tempFighter.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'leader')));
    if (isLeader) {
        if (!tempFighter.skills) tempFighter.skills = [];
        let inspIdx = tempFighter.skills.findIndex(s => {
            let n = (typeof s === 'string' ? s : s.name) || '';
            return n.toLowerCase() === 'inspirant' || n.toLowerCase() === 'inspiring' || (s.id && s.id === 'sk_inspirant');
        });
        let inspSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_inspirant' || s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')
            : null;
        let inspObj = inspSkill ? JSON.parse(JSON.stringify(inspSkill)) : {
            id: "sk_inspirant",
            name: "Inspirant",
            desc: "Peut faire l'action d'activation de groupe en action gratuite."
        };
        if (inspIdx >= 0) {
            tempFighter.skills[inspIdx] = inspObj;
        } else {
            tempFighter.skills.push(inspObj);
        }

        let chefIdx = tempFighter.skills.findIndex(s => {
            let n = (typeof s === 'string' ? s : s.name) || '';
            return n.toLowerCase() === 'chef' || (s.id && s.id === 'sk_chef');
        });
        let chefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_chef' || s.name.toLowerCase() === 'chef')
            : null;
        let chefObj = chefSkill ? JSON.parse(JSON.stringify(chefSkill)) : {
            id: "sk_chef",
            name: "Chef",
            desc: "Tous les alliés dans les 12\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
        };
        if (chefIdx >= 0) {
            tempFighter.skills[chefIdx] = chefObj;
        } else {
            tempFighter.skills.push(chefObj);
        }
    }

    const isChampion = (tempFighter.type && Array.isArray(tempFighter.type) && tempFighter.type.some(t => String(t).toLowerCase() === 'champion')) ||
                       (tempFighter.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === tempFighter.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'champion')));
    if (isChampion) {
        if (!tempFighter.skills) tempFighter.skills = [];
        let inspIdx = tempFighter.skills.findIndex(s => {
            let n = (typeof s === 'string' ? s : s.name) || '';
            return n.toLowerCase() === 'inspirant' || n.toLowerCase() === 'inspiring' || (s.id && s.id === 'sk_inspirant');
        });
        let inspSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_inspirant' || s.name.toLowerCase() === 'inspirant' || s.name.toLowerCase() === 'inspiring')
            : null;
        let inspObj = inspSkill ? JSON.parse(JSON.stringify(inspSkill)) : {
            id: "sk_inspirant",
            name: "Inspirant",
            desc: "Peut faire l'action d'activation de groupe en action gratuite."
        };
        if (inspIdx >= 0) {
            tempFighter.skills[inspIdx] = inspObj;
        } else {
            tempFighter.skills.push(inspObj);
        }

        let sousChefIdx = tempFighter.skills.findIndex(s => {
            let n = (typeof s === 'string' ? s : s.name) || '';
            return n.toLowerCase() === 'sous-chef' || n.toLowerCase() === 'sous chef' || (s.id && s.id === 'sk_sous_chef');
        });
        let sousChefSkill = (typeof db !== 'undefined' && db.skills && db.skills.generique)
            ? db.skills.generique.find(s => s.id === 'sk_sous_chef' || s.name.toLowerCase() === 'sous-chef' || s.name.toLowerCase() === 'sous chef')
            : null;
        let sousChefObj = sousChefSkill ? JSON.parse(JSON.stringify(sousChefSkill)) : {
            id: "sk_sous_chef",
            name: "Sous-chef",
            desc: "Tous les alliés dans les 6\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf."
        };
        if (sousChefIdx >= 0) {
            tempFighter.skills[sousChefIdx] = sousChefObj;
        } else {
            tempFighter.skills.push(sousChefObj);
        }
    }

    navigate('fighter-edit');
}

function renderFighterEdit(container) {
    const m = tempFighter;
    m.totalCost = calculateFighterCost(m);

    let types = (m.type || []).map(t => t.toLowerCase());
    let isBeast = types.includes("bête") || types.includes("bette");
    let isMerc = m.charId && m.charId.startsWith("merc_");
    let isHiveScum = m.charId === "merc_hive_scum";
    let usedSlots = (m.weapons || []).reduce((sum, w) => sum + getWeaponSlotCost(w), 0);
    let maxWeaponSlots = (typeof getMaxWeaponSlots === 'function') ? getMaxWeaponSlots(m) : 3;

    // Genestealer Cults : case à cocher optionnelle "Extra arm" (+20 pts) pour les
    // profils marqués can_take_extra_arm (Hybrid acolyte, Neophyte hybrid, Hybrid
    // initiate). L'Alpha possède la compétence directement (pas de case affichée).
    const charDefForOptions = db.characters.find(c => c.id === m.charId);
    let canTakeExtraArm = !!(charDefForOptions && charDefForOptions.can_take_extra_arm === true);
    let hasExtraArm = (m.skills || []).some(s => (s.id === 'sk_extra_arm') || (typeof s === 'string' && s.toLowerCase() === 'extra arm'));

    let isPostCycleEquip = (appState.returnTo === 'post-cycle' && appState.editTarget !== null);
    let isPostCycleRecruit = (appState.returnTo === 'post-cycle' && appState.editTarget === null);

    let html = `
        <div class="card">
            <h2>${isPostCycleEquip ? 'Équipement — ' + (m.customName || m.charName) : (appState.editTarget === null ? 'Recruter : ' + m.charName : 'Modifier ' + (m.customName || m.charName))} <small style="font-size:14px; color:#aaa;">(${m.charName})</small></h2>
            ${isPostCycleEquip ? `
                <div style="background:#11131c; border:1px solid #282b42; border-radius:6px; padding:10px 12px; margin-bottom:15px; font-size:13px; color:#ccc;">
                    <span style="color:var(--accent-cyan); font-weight:bold;">📦 Gestion de l'équipement (Post-Cycle) :</span><br>
                    Achetez des armes, armures, équipements et accessoires de gang (Trésorerie disponible : <strong>${currentGang.credits || 0} cr</strong>), ou équipez gratuitement le matériel disponible dans la réserve (stash). Les éléments déséquipés sont immédiatement renvoyés dans le stash.
                </div>
            ` : (isPostCycleRecruit ? `
                <div style="background:#11131c; border:1px solid #282b42; border-radius:6px; padding:10px 12px; margin-bottom:15px; font-size:13px; color:#ccc;">
                    <span style="color:var(--accent-cyan); font-weight:bold;">➕ Recrutement de Combattant (Post-Cycle) :</span><br>
                    Coût de base du profil : <strong>${m.charName} (${db.characters.find(c => c.id === m.charId)?.cost || m.totalCost || 0} cr)</strong>. Équipez les armes et objets souhaités ou piochez dans la réserve. Trésorerie disponible : <strong>${currentGang.credits || 0} cr</strong>.
                </div>
                <label>Nom personnalisable :</label>
                <input type="text" value="${m.customName}" placeholder="Ex: Roxie Speed" oninput="tempFighter.customName = this.value">
            ` : `
                <label>Nom personnalisable :</label>
                <input type="text" value="${m.customName}" placeholder="Ex: Roxie Speed" oninput="tempFighter.customName = this.value">
            `)}

            ${canTakeExtraArm && !isPostCycleEquip ? `
                <div style="background:#181818; border:1px solid var(--accent-purple); border-radius:6px; padding:10px 12px; margin:10px 0;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin:0;">
                        <input type="checkbox" ${hasExtraArm ? 'checked' : ''} onchange="toggleExtraArmOption()">
                        <span><strong>Extra arm</strong> (+20 cr) — donne la compétence Extra arm et l'arme Clawed arm, et augmente la capacité d'armes portées de 1.</span>
                    </label>
                </div>
            ` : ''}

            <h3>Armes Équipées <span style="font-size:12px; font-weight:normal; color:#888;">(Emplacements : ${usedSlots} / ${maxWeaponSlots})</span></h3>
            <div id="weapon-list">
                ${m.weapons.length === 0 ? '<p>Aucune arme.</p>' : m.weapons.map((w, i) => {
                    let statsText = weaponAllProfilesText(w);
                    let slotCost = getWeaponSlotCost(w);
                    let isTwoSlots = w.name && w.name.includes('*');

                    // Options payantes non encore débloquées sur cette arme (ex: Photon
                    // flash/Fumigène du Grenade launcher) : un bouton par option restante.
                    let lockedOptionsHTML = '';
                    if (w.optional_profiles && w.optional_profiles.length > 0) {
                        let unlockedNames = w.unlockedOptions || [];
                        let lockedOptions = w.optional_profiles.filter(op => !unlockedNames.includes(op.name));
                        if (lockedOptions.length > 0) {
                            lockedOptionsHTML = `<div style="margin:4px 0 0 12px;">` + lockedOptions.map(op => `
                                <button style="padding:2px 6px; font-size:11px; margin:2px 4px 0 0;" onclick="buyWeaponOption(${i}, '${escapeForJsStr(op.name)}')">+ ${op.name} (+${op.extra_cost || 0}c)</button>
                            `).join('') + `</div>`;
                        }
                    }

                    return `
                    <div style="margin:8px 0; background:#181818; padding:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            • <strong>${w.name}</strong> (${w.cost_credits||0}c) ${isTwoSlots ? `<span style="color:var(--accent-purple); font-size:11px; margin-left:6px;">(${slotCost === 1 ? '1 emp. grâce aux Suspensors' : '2 emplacements'})</span>` : ''}
                            ${statsText ? `<br><small style="color:#aaa; font-size:11px; margin-left:12px;">${statsText}</small>` : ''}
                            ${lockedOptionsHTML}
                            ${w.accessory ? `<br><small style="color:var(--accent-cyan); margin-left:12px;">↳ Accessoire (1 max) : ${w.accessory.name} ${w.accessory.effect ? `— <em>${w.accessory.effect}</em>` : ''} ${w.accessory.fromStash ? '<span style="color:#2ecc71;">(Réserve - 0c)</span>' : `(${w.accessory.cost_credits||0}c)`} ${!isBeast && (!isMerc || isHiveScum) ? `<button class="btn-danger" style="padding:2px 6px; font-size:10px; margin-left:5px;" onclick="removeWeaponAccessory(${i})">Retirer accessoire</button>` : ''}</small>` : (!isBeast && (!isMerc || isHiveScum) ? `<br><button style="padding:2px 6px; font-size:11px; margin-left:12px; margin-top:4px;" onclick="openWeaponAccessoryModal(${i})">+ Ajouter un accessoire (1 max)</button>` : '')}
                        </div>
                        ${w.isInnateWeapon
                            ? `<span style="color:var(--accent-cyan); font-size:11px; font-weight:bold; flex-shrink:0; white-space:nowrap;">[Innée]</span>`
                            : `<button class="btn-danger" style="padding:2px 6px; font-size:11px; flex-shrink:0;" onclick="removeWeapon(${i})" title="${currentGang && currentGang.isEstablished ? 'Déséquiper et envoyer dans la réserve (avec accessoire si équipé)' : 'Supprimer'}">${currentGang && currentGang.isEstablished ? 'Déséquiper' : 'Supprimer'}</button>`}
                    </div>
                    `;
                }).join('')}
            </div>
            <button onclick="openWeaponSelectModal()">+ Ajouter / Échanger une Arme</button>

            <h3 style="margin-top:15px;">Armures & Équipements</h3>
            <div id="equip-list">
                ${m.equipment.length === 0 ? '<p>Aucun équipement.</p>' : m.equipment.map((e, i) => {
                    let isGrenade = e.counts_as_equip || e.type === 'Grenade' || (e.id && ((e.id.startsWith('wpn_grenade_') && e.id !== 'wpn_grenade_launcher') || e.id === 'wpn_charge_demo')) || (e.profiles && e.profiles.length > 0);
                    let profSource = e;
                    if ((!e.profiles || e.profiles.length === 0) && isGrenade && typeof db !== 'undefined' && db.weapons) {
                        let fW = db.weapons.find(w => w.id === e.id || w.name === e.name);
                        if (fW && fW.profiles) profSource = fW;
                    }
                    let statsText = weaponAllProfilesText(profSource);
                    return `
                    <div style="margin:6px 0; background:#181818; padding:6px 8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            • <strong>${e.name}</strong> ${isGrenade ? `<span style="color:var(--accent-purple); font-size:11px; margin-left:4px; font-weight:bold; background:rgba(155,89,182,0.2); padding:1px 5px; border-radius:3px;">Grenade</span>` : ''} ${e.fromStash ? '<span style="color:#2ecc71;">(Réserve)</span>' : `(${e.cost_credits||e.cost||0}c)`}
                            ${statsText ? `<br><small style="color:#aaa; font-size:11px; margin-left:12px;">${statsText}</small>` : ''}
                            ${e.effect ? `<br><small style="color:#aaa; font-size:11px; margin-left:12px;">${e.effect}</small>` : ''}
                        </div>
                        <button class="btn-danger" style="padding:2px 6px; font-size:11px;" onclick="removeEquipment(${i})" title="${currentGang && currentGang.isEstablished ? 'Déséquiper et envoyer dans la réserve' : 'Supprimer'}">X</button>
                    </div>
                    `;
                }).join('')}
            </div>
            <button onclick="openEquipSelectModal()">+ Ajouter Armure / Équipement / Grenade</button>
    `;

    if (isHiveScum) {
        html += `<p style="color:var(--accent-purple); font-size:12px; margin-top:5px;">💡 Hive Scum : peut sélectionner uniquement le matériel compatible Hive Scum (60 cr max au total).</p>`;
    } else if (isBeast || isMerc) {
        html += `<p style="color:#aaa; font-size:12px; margin-top:5px;">💡 Les options proposées sont strictement filtrées selon les spécificités de ce profil.</p>`;
    }

    html += `
            <h3 style="margin-top:15px;">Compétences</h3>
            <div id="skills-list">
                ${m.skills.length === 0 ? '<p>Aucune compétence sélectionnée.</p>' : m.skills.map((s, i) => {
                    let sName = typeof s === 'string' ? s : s.name;
                    let isPoisonBlood = sName.toLowerCase() === 'poison blood' || (s.id && s.id === 'sk_poison_blood');
                    let isLandsOnFeet = sName.toLowerCase() === 'lands on their feet' || (s.id && s.id === 'sk_lands_on_feet');
                    let isJuggernaut = sName.toLowerCase() === 'juggernaut' || (s.id && s.id === 'sk_juggernaut');
                    let isInspirant = sName.toLowerCase() === 'inspirant' || sName.toLowerCase() === 'inspiring' || (s.id && s.id === 'sk_inspirant');
                    let isChef = sName.toLowerCase() === 'chef' || (s.id && s.id === 'sk_chef');
                    let isSousChef = sName.toLowerCase() === 'sous-chef' || sName.toLowerCase() === 'sous chef' || (s.id && s.id === 'sk_sous_chef');
                    let isBrute = (m.type && Array.isArray(m.type) && m.type.some(t => String(t).toLowerCase() === 'brute')) ||
                                  (m.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === m.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'brute')));
                    let isLeader = (m.type && Array.isArray(m.type) && m.type.some(t => String(t).toLowerCase() === 'leader')) ||
                                   (m.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === m.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'leader')));
                    let isChampion = (m.type && Array.isArray(m.type) && m.type.some(t => String(t).toLowerCase() === 'champion')) ||
                                     (m.charId && typeof db !== 'undefined' && db.characters && db.characters.some(c => c.id === m.charId && c.type && c.type.some(t => String(t).toLowerCase() === 'champion')));
                    let isInnateLeader = isLeader && (isInspirant || isChef);
                    let isInnateChampion = isChampion && (isInspirant || isSousChef);
                    let isCultUprising = sName.toLowerCase() === 'cult uprising' || (s.id && s.id === 'sk_cult_uprising');
                    let isExtraArm = sName.toLowerCase() === 'extra arm' || (s.id && s.id === 'sk_extra_arm');

                    let sDesc = (typeof s === 'object' && s.desc) ? s.desc : '';
                    if (!sDesc && typeof db !== 'undefined' && db.skills) {
                        for (let cat in db.skills) {
                            let match = db.skills[cat].find(sk => sk.name.toLowerCase() === sName.toLowerCase() || sk.id === s.id);
                            if (match) { sDesc = match.desc; break; }
                        }
                    }
                    return `
                    <div style="margin:6px 0; background:#181818; padding:6px 8px; border-radius:4px; display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            • <strong>${sName}</strong> 
                            ${isPoisonBlood && m.charId === 'char_death_maiden' ? '<span style="color:var(--accent-purple); font-size:11px; font-weight:bold; margin-left:6px;">[Innée - Death Maiden]</span>' : ''}
                            ${isLandsOnFeet && m.charId === 'char_phyrr_cat' ? '<span style="color:var(--accent-cyan); font-size:11px; font-weight:bold; margin-left:6px;">[Innée - Phyrr Cat]</span>' : ''}
                            ${isJuggernaut && isBrute ? '<span style="color:var(--accent-purple); font-size:11px; font-weight:bold; margin-left:6px;">[Innée - Brute]</span>' : ''}
                            ${isInnateLeader ? '<span style="color:var(--accent-cyan); font-size:11px; font-weight:bold; margin-left:6px;">[Innée - Leader]</span>' : ''}
                            ${(!isInnateLeader && isInnateChampion) ? '<span style="color:var(--accent-purple); font-size:11px; font-weight:bold; margin-left:6px;">[Innée - Champion]</span>' : ''}
                            ${isCultUprising ? '<span style="color:var(--accent-cyan); font-size:11px; font-weight:bold; margin-left:6px;">[Règle d\'armée]</span>' : ''}
                            ${isExtraArm ? `<span style="color:var(--accent-purple); font-size:11px; font-weight:bold; margin-left:6px;">[${m.charId === 'char_alpha' ? 'Innée - Alpha' : 'Décochez la case ci-dessus pour la retirer'}]</span>` : ''}
                            ${sDesc ? `<br><small style="color:#aaa; font-size:11px; margin-left:12px;">${sDesc}</small>` : ''}
                        </div>
                        ${(!isPostCycleEquip && !isBeast && !isMerc && (!isPoisonBlood || m.charId !== 'char_death_maiden') && (!isLandsOnFeet || m.charId !== 'char_phyrr_cat') && (!isJuggernaut || !isBrute) && !isInnateLeader && !isInnateChampion && !isCultUprising && !isExtraArm) ? `<button class="btn-danger" style="padding:2px 6px; font-size:11px; flex-shrink:0;" onclick="removeSkill(${i})">X</button>` : ''}
                    </div>
                    `;
                }).join('')}
            </div>
            ${isPostCycleEquip 
                ? `<p style="font-size:12px; color:#888; margin-top:6px;"><em>🔒 Les compétences ne peuvent pas être modifiées ici (gérées uniquement lors d'une montée de niveau).</em></p>`
                : (!isBeast && !isMerc ? `<button onclick="openSkillModal()">Gérer les Compétences</button>` : '')
            }

            <hr style="margin:20px 0; border-color:var(--border-color);">
            <p><strong>Valeur du Combattant (Rating) : ${m.totalCost} crédits</strong></p>
            <button onclick="saveFighter()">${isPostCycleRecruit ? 'Recruter et Revenir au Post-Cycle' : (isPostCycleEquip ? 'Valider et Revenir au Post-Cycle' : 'Valider et Enregistrer')}</button>
            <button class="btn-danger" onclick="cancelFighterEdit()">${appState.returnTo === 'post-cycle' ? 'Annuler et Revenir au Post-Cycle' : 'Annuler'}</button>
        </div>
    `;
    container.innerHTML = html;
}

