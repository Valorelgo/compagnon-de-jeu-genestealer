// core-state.js (1/5 - issu de l'ancien app.js)
// Rôle : état global de l'appli (gang courant, combattant en cours d'édition),
// sauvegarde/chargement localStorage, filtres de recherche (armes/équipement),
// et routage entre les grandes vues (menu, création/sélection de gang...).
// Dépendances : aucune (premier fichier JS applicatif chargé après data.js).
// Doit être chargé AVANT tous les autres fichiers ci-dessous : il définit des
// variables globales (appState, currentGang, savedGangs...) et des fonctions
// utilitaires (saveGangs, escapeHtml, escapeForJsStr, showToast...) que le
// reste de l'application utilise.

// ==========================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
// Numéro de schéma des données sauvegardées en local. À incrémenter chaque fois
// que la structure d'un gang/combattant change de façon incompatible, et
// compléter migrateSavedGangsIfNeeded() avec la transformation nécessaire.
// Objectif : éviter qu'une ancienne sauvegarde ("gang JSON") casse silencieusement
// l'appli après une future évolution du format de données.
const GANGS_SCHEMA_VERSION = 3;

// Faction gérée par CE programme. Le projet existe en plusieurs copies, une par
// faction (Escher, Delaque, Genestealer, Cawdor...) ; chaque gang créé, importé,
// ou déjà sauvegardé ici est tagué avec cette valeur pour que les listes d'une
// autre faction ne s'ouvrent jamais dans ce programme (voir migrateSavedGangsIfNeeded,
// quarantineForeignFactionGangs et importGang).
const APP_GANG_FACTION = "Genestealer";

let appState = { view: 'menu', mode: null, editTarget: null, isQuickMatch: false, returnTo: null };
let savedGangs = JSON.parse(localStorage.getItem('genestealerGangs')) || {};
let currentGang = null;
let tempFighter = null;

// Nombre de gangs mis en quarantaine lors du dernier chargement (voir
// quarantineForeignFactionGangs). Lu par initApp() pour prévenir l'utilisateur
// une fois l'interface chargée (showToast n'est pas encore défini à ce stade).
let _quarantinedGangsCount = 0;

// Combattants dont une blessure permanente avec malus de statistique ("Recovery
// & -1 XX") avait été enregistrée par le passé SANS que le malus ne soit
// réellement appliqué (bug corrigé dans cette version). Chaque entrée
// { gangName, memberId, statKey } est résolue par game-state-scenarios.js une
// fois applyStatDowngrade() disponible (non défini à ce stade du chargement).
let _pendingInjuryStatFixes = [];
// Nombre de corrections effectivement appliquées, pour prévenir l'utilisateur
// une fois l'interface chargée (voir initApp()).
let _injuryStatFixCount = 0;

// Fait évoluer les gangs déjà sauvegardés (localStorage ou import JSON) vers le
// schéma courant.
function migrateSavedGangsIfNeeded() {
    const storedVersion = parseInt(localStorage.getItem('genestealerGangsSchemaVersion'), 10) || 0;
    if (storedVersion >= GANGS_SCHEMA_VERSION) return;

    if (storedVersion < 2) {
        // Ajout du tag de faction : toute sauvegarde déjà présente dans ce
        // programme Genestealer-only est réputée Genestealer si elle n'a pas encore de tag
        // (compatibilité avec les gangs créés avant l'ajout de cette protection).
        Object.values(savedGangs).forEach(gang => {
            if (gang && !gang.faction) gang.faction = APP_GANG_FACTION;
        });
        // Si une liste taguée pour une AUTRE faction s'était glissée ici (ex. import
        // manuel d'un gang Delaque/Genestealer/Cawdor avant que cette protection
        // n'existe), on la sort de cette appli plutôt que de la supprimer.
        quarantineForeignFactionGangs();
    }

    if (storedVersion < 3) {
        // Renommage des intitulés de blessures permanentes vers la nouvelle table
        // (voir PERMANENT_INJURIES dans game-state-scenarios.js), et repérage des
        // malus de statistique jamais appliqués par le passé (bug corrigé ici) :
        // - format encore "en cours de Recovery" : "Recovery & -1 BS"...
        // - format déjà nettoyé après la convalescence : "-1 BS"...
        const OLD_TO_NEW_LABEL = {
            'Gagne Haine': 'Haine',
            'Condition fearsome': 'Gagne Fearsome',
            'Aucune conséquence': 'Aucun effet',
            'Recovery (Absente prochaine partie)': 'Le guerrier part en recovery',
            'Recovery & -1 BS': 'Le guerrier part en recovery et perd 1 en BS',
            'Recovery & -1 WS': 'Le guerrier part en recovery et perd 1 en WS',
            'Recovery & -1 M': 'Le guerrier part en recovery et perd 1 en M',
            'Recovery & -1 S': 'Le guerrier part en recovery et perd 1 en S',
            'Recovery & -1 T': 'Le guerrier part en recovery et perd 1 en T',
            'Recovery & -1 Ld': 'Le guerrier part en recovery et perd 1 en Ld'
        };
        const STAT_BY_OLD_LABEL = {
            'Recovery & -1 BS': 'BS', 'Recovery & -1 WS': 'WS', 'Recovery & -1 M': 'M',
            'Recovery & -1 S': 'S', 'Recovery & -1 T': 'T', 'Recovery & -1 Ld': 'Ld'
        };
        const STAT_BY_BARE_OLD_LABEL = {
            '-1 BS': 'BS', '-1 WS': 'WS', '-1 M': 'M', '-1 S': 'S', '-1 T': 'T', '-1 Ld': 'Ld'
        };

        Object.entries(savedGangs).forEach(([gangName, gang]) => {
            (gang.members || []).forEach(m => {
                if (!m.injuries || !Array.isArray(m.injuries)) return;
                m.injuries = m.injuries.map(inj => {
                    if (typeof inj !== 'string') return inj;
                    if (STAT_BY_OLD_LABEL[inj]) {
                        _pendingInjuryStatFixes.push({ gangName, memberId: m.id, statKey: STAT_BY_OLD_LABEL[inj] });
                        return OLD_TO_NEW_LABEL[inj];
                    }
                    if (STAT_BY_BARE_OLD_LABEL[inj]) {
                        _pendingInjuryStatFixes.push({ gangName, memberId: m.id, statKey: STAT_BY_BARE_OLD_LABEL[inj] });
                        return `Séquelle : ${inj}`;
                    }
                    return OLD_TO_NEW_LABEL[inj] || inj;
                });
            });
        });
    }

    localStorage.setItem('genestealerGangsSchemaVersion', String(GANGS_SCHEMA_VERSION));
    saveGangs();
}

// Retire de savedGangs toute entrée taguée pour une autre faction que celle de ce
// programme (APP_GANG_FACTION) et la conserve dans une clé localStorage séparée
// (genestealerGangs_otherFactions) : aucune perte de données, la liste étrangère reste
// récupérable, mais n'apparaît plus jamais dans cette appli Genestealer.
function quarantineForeignFactionGangs() {
    const foreignNames = Object.keys(savedGangs).filter(name => {
        const g = savedGangs[name];
        return g && g.faction && g.faction !== APP_GANG_FACTION;
    });
    if (foreignNames.length === 0) return;

    let quarantine = {};
    try {
        quarantine = JSON.parse(localStorage.getItem('genestealerGangs_otherFactions')) || {};
    } catch (e) {
        quarantine = {};
    }
    foreignNames.forEach(name => {
        quarantine[name] = savedGangs[name];
        delete savedGangs[name];
    });
    localStorage.setItem('genestealerGangs_otherFactions', JSON.stringify(quarantine));
    _quarantinedGangsCount += foreignNames.length;
}
migrateSavedGangsIfNeeded();

// ==========================================
// FILTRES DE RECHERCHE (ARMES / GRENADES / ÉQUIPEMENT)
// ==========================================
// État séparé par liste filtrée, pour qu'un filtre appliqué sur une liste
// n'affecte jamais silencieusement une autre liste ailleurs dans l'appli.
// Chaque liste a un filtre "mots-clés" ou "type" (logique OU) ET un texte de
// recherche libre par nom (combiné aux cases cochées avec une logique ET).
let weaponKeywordFilters = [];        // openWeaponSelectModal() - Acheter sur la Liste de Clan
let weaponSearchText = '';
let equipGrenadeKeywordFilters = [];  // openEquipSelectModal() - Grenades & Explosifs
let equipGrenadeSearchText = '';
let equipPersonalTypeFilters = [];    // openEquipSelectModal() - Équipement Personnel
let equipPersonalSearchText = '';
let equipArmorTypeFilters = [];       // openEquipSelectModal() - Armures
let equipArmorSearchText = '';
// Les variables équivalentes du Trading Post (tpWeaponKeywordFilters, tpWeaponSearchText,
// tpGrenadeKeywordFilters, tpGrenadeSearchText, tpArmorTypeFilters, tpArmorSearchText,
// tpPersonalTypeFilters, tpPersonalSearchText, tpAccessoryTypeFilters, tpAccessorySearchText)
// sont déclarées dans trading-post.js, seul fichier qui les utilise — les déclarer
// ici aussi provoquerait une SyntaxError ("Identifier has already been declared"),
// deux <script> classiques partageant la même portée lexicale de premier niveau.

// Les 6 mots-clés de filtre + la case "Aucun de ces 6"
const WEAPON_FILTER_KEYWORDS = [
    { id: 'melee', label: 'Melee', match: 'melee' },
    { id: 'leger', label: 'Léger', match: 'léger' },
    { id: 'lourd', label: 'Lourd', match: 'lourd' },
    { id: 'tir_rapide', label: 'Tir rapide', match: 'tir rapide' },
    { id: 'gabarit', label: 'Gabarit', match: 'gabarit' },
    { id: 'explosion', label: 'Explosion', match: 'explosion' }
];

// Formate la ligne de statistiques d'un profil d'arme/grenade (Portée/F/AP/D/Traits).
// Centralise un format utilisé dans une dizaine d'endroits (fiches d'achat,
// Trading Post...) pour qu'un changement de présentation ne se fasse qu'ici.
function weaponStatsLine(prof) {
    if (!prof) return '';
    return `Portée: ${prof.SR}/${prof.LR} | F:${prof.S} | AP:${prof.AP} | D:${prof.L}${prof.traits ? ` | ${prof.traits}` : ''}`;
}

// Formate TOUS les profils d'une arme/grenade à profils multiples (fusil à
// pompe, lance-grenades...) : une ligne par profil, précédée d'un tiret et du
// nom du profil (ex: "- Dispersion : Portée: ..."). Pour une arme à un seul
// profil "Unique" (l'immense majorité), le rendu est identique à avant (juste
// la ligne de stats, sans tiret ni nom).
// Les profils optionnels payants (ex: Photon flash/Fumigène du Grenade
// launcher, stockés dans w.optional_profiles avec un extra_cost) ne sont
// affichés QUE s'ils ont été débloqués sur cette arme précise (w.unlockedOptions
// contient leur nom) — voir buyWeaponOption() dans weapons-equipment.js.
function weaponAllProfilesText(w) {
    if (!w || !w.profiles || w.profiles.length === 0) return '';

    const formatProfileLine = (p) => {
        let line = weaponStatsLine(p);
        let label = (p.name && p.name.toLowerCase() !== 'unique') ? p.name : '';
        return label ? `- ${label} : ${line}` : line;
    };

    let lines = w.profiles.map(p => formatProfileLine(p));
    if (w.optional_profiles && w.optional_profiles.length > 0 && w.unlockedOptions && w.unlockedOptions.length > 0) {
        let unlocked = w.optional_profiles.filter(p => w.unlockedOptions.includes(p.name));
        lines = lines.concat(unlocked.map(p => formatProfileLine(p)));
    }

    return lines.join('<br>');
}

// Concatène en minuscule les traits de tous les profils d'une arme/grenade.
function weaponTraitsText(w) {
    if (!w || !w.profiles) return '';
    return w.profiles.map(p => (p.traits || '')).join(' , ').toLowerCase();
}

// Logique de correspondance générique (OU entre filtres). Retourne toujours
// true si filterList est vide (aucun filtre actif = liste complète).
function weaponMatchesKeywordList(w, filterList) {
    if (!filterList || filterList.length === 0) return true;
    const text = weaponTraitsText(w);

    const matchesAnyKeyword = WEAPON_FILTER_KEYWORDS.some(kw =>
        filterList.includes(kw.id) && text.includes(kw.match)
    );
    if (matchesAnyKeyword) return true;

    if (filterList.includes('aucun')) {
        const matchesNoneOfSix = !WEAPON_FILTER_KEYWORDS.some(kw => text.includes(kw.match));
        if (matchesNoneOfSix) return true;
    }

    return false;
}

// Recherche libre par nom (insensible à la casse). Retourne toujours true si
// le texte de recherche est vide. Combinable en ET avec un filtre mots-clés/type.
function itemMatchesSearch(item, searchText) {
    if (!searchText || !searchText.trim()) return true;
    return (item.name || '').toLowerCase().includes(searchText.trim().toLowerCase());
}

// État de repli des panneaux de filtre : une fois ouvert (automatiquement dès
// qu'un filtre/recherche est actif, ou en cliquant dessus), un panneau reste
// ouvert même si l'utilisateur décoche tous les filtres, pour éviter qu'il se
// referme brusquement en pleine manipulation. Une clé par liste filtrée.
let filterPanelOpenState = {};

// Génère un champ de recherche texte + un compteur de résultats, à placer au-dessus
// des cases de filtre. Partagé par buildKeywordFilterBarHTML et buildTypeFilterBarHTML.
function buildSearchRowHTML(searchValue, searchFnName, resultCount, totalCount, panelKey) {
    return `
        <input type="text" id="${panelKey ? `search-input-${panelKey}` : ''}" placeholder="🔍 Rechercher par nom..." value="${escapeHtml(searchValue || '')}"
               style="margin:0 0 8px 0;" oninput="${searchFnName}(this.value)">
        <div style="font-size:11px; color:#888; margin:-4px 0 8px 0;">${resultCount} / ${totalCount} affiché(s)</div>
    `;
}

// Après un re-rendu complet de la modale suite à la frappe dans un champ de
// recherche, l'input est recréé de zéro (innerHTML) et perd le focus/curseur.
// Cette fonction le retrouve par son id stable (voir buildSearchRowHTML) et
// replace le curseur à la fin du texte, pour que la frappe reste fluide.
function refocusSearchInput(panelKey) {
    if (!panelKey) return;
    let el = document.getElementById(`search-input-${panelKey}`);
    if (el) {
        el.focus();
        let len = el.value.length;
        el.setSelectionRange(len, len);
    }
}

// Génère le HTML de la barre de filtre "mots-clés" (7 cases) + recherche texte,
// dans un panneau repliable. panelKey identifie ce panneau de façon unique pour
// que son état ouvert/fermé reste stable d'un re-rendu à l'autre (voir
// filterPanelOpenState) : décocher la dernière case active ne le referme plus.
function buildKeywordFilterBarHTML(activeFilters, toggleFnName, resetFnName, searchValue, searchFnName, resultCount, totalCount, panelKey) {
    activeFilters = activeFilters || [];
    searchValue = searchValue || '';
    const hasActiveFilters = activeFilters.length > 0 || searchValue.trim() !== '';
    if (hasActiveFilters && panelKey) filterPanelOpenState[panelKey] = true;
    const isOpen = (panelKey && filterPanelOpenState[panelKey]) || hasActiveFilters;

    let checksHtml = WEAPON_FILTER_KEYWORDS.map(kw => `
        <label style="display:inline-flex; align-items:center; gap:4px; margin:2px 10px 2px 0; font-size:12px; font-weight:normal; text-transform:none; cursor:pointer;">
            <input type="checkbox" style="width:auto; margin:0;" ${activeFilters.includes(kw.id) ? 'checked' : ''} onchange="${toggleFnName}('${kw.id}')">
            ${kw.label}
        </label>
    `).join('');

    checksHtml += `
        <label style="display:inline-flex; align-items:center; gap:4px; margin:2px 10px 2px 0; font-size:12px; font-weight:normal; text-transform:none; cursor:pointer;">
            <input type="checkbox" style="width:auto; margin:0;" ${activeFilters.includes('aucun') ? 'checked' : ''} onchange="${toggleFnName}('aucun')">
            Aucun de ces 6
        </label>
    `;

    return `
        <details ${isOpen ? 'open' : ''} ${panelKey ? `ontoggle="if(typeof filterPanelOpenState !== 'undefined') filterPanelOpenState['${panelKey}'] = this.open;"` : ''} style="background:#181818; border:1px solid #333; border-radius:5px; padding:6px 10px; margin:8px 0;">
            <summary style="cursor:pointer; font-size:12px; color:var(--accent-cyan); text-transform:uppercase; font-weight:bold; list-style:revert;">🔍 Filtrer</summary>
            <div style="margin-top:8px;">
                ${buildSearchRowHTML(searchValue, searchFnName, resultCount, totalCount, panelKey)}
                <div>${checksHtml}</div>
                ${hasActiveFilters ? `<button class="btn-danger" style="margin:6px 0 0 0; padding:3px 10px; font-size:11px;" onclick="${resetFnName}()">✕ Réinitialiser</button>` : ''}
            </div>
        </details>
    `;
}

// Génère le HTML de la barre de filtre "par type" (calculée dynamiquement) + recherche
// texte, dans le même panneau repliable que la barre mots-clés. Voir panelKey
// ci-dessus (buildKeywordFilterBarHTML) pour la persistance de l'état ouvert/fermé.
function buildTypeFilterBarHTML(availableTypes, activeFilters, toggleFnName, resetFnName, searchValue, searchFnName, resultCount, totalCount, panelKey) {
    activeFilters = activeFilters || [];
    searchValue = searchValue || '';
    const hasTypeChoice = availableTypes && availableTypes.length > 1;
    const hasActiveFilters = activeFilters.length > 0 || searchValue.trim() !== '';
    if (hasActiveFilters && panelKey) filterPanelOpenState[panelKey] = true;
    const isOpen = (panelKey && filterPanelOpenState[panelKey]) || hasActiveFilters;

    let checksHtml = hasTypeChoice ? availableTypes.map(t => `
        <label style="display:inline-flex; align-items:center; gap:4px; margin:2px 10px 2px 0; font-size:12px; font-weight:normal; text-transform:none; cursor:pointer;">
            <input type="checkbox" style="width:auto; margin:0;" ${activeFilters.includes(t) ? 'checked' : ''} onchange="${toggleFnName}('${escapeForJsStr(t || '')}')">
            ${t}
        </label>
    `).join('') : '';

    return `
        <details ${isOpen ? 'open' : ''} ${panelKey ? `ontoggle="if(typeof filterPanelOpenState !== 'undefined') filterPanelOpenState['${panelKey}'] = this.open;"` : ''} style="background:#181818; border:1px solid #333; border-radius:5px; padding:6px 10px; margin:8px 0;">
            <summary style="cursor:pointer; font-size:12px; color:var(--accent-cyan); text-transform:uppercase; font-weight:bold; list-style:revert;">🔍 Filtrer</summary>
            <div style="margin-top:8px;">
                ${buildSearchRowHTML(searchValue, searchFnName, resultCount, totalCount, panelKey)}
                ${hasTypeChoice ? `<div>${checksHtml}</div>` : ''}
                ${hasActiveFilters ? `<button class="btn-danger" style="margin:6px 0 0 0; padding:3px 10px; font-size:11px;" onclick="${resetFnName}()">✕ Réinitialiser</button>` : ''}
            </div>
        </details>
    `;
}

function toggleWeaponKeywordFilter(id) {
    let idx = weaponKeywordFilters.indexOf(id);
    if (idx >= 0) weaponKeywordFilters.splice(idx, 1); else weaponKeywordFilters.push(id);
    openWeaponSelectModal();
}
function setWeaponSearchText(value) {
    weaponSearchText = value;
    openWeaponSelectModal();
    refocusSearchInput('weapon');
}
function resetWeaponKeywordFilters() {
    weaponKeywordFilters = [];
    weaponSearchText = '';
    openWeaponSelectModal();
}

function toggleEquipGrenadeKeywordFilter(id) {
    let idx = equipGrenadeKeywordFilters.indexOf(id);
    if (idx >= 0) equipGrenadeKeywordFilters.splice(idx, 1); else equipGrenadeKeywordFilters.push(id);
    openEquipSelectModal();
}
function setEquipGrenadeSearchText(value) {
    equipGrenadeSearchText = value;
    openEquipSelectModal();
    refocusSearchInput('equipGrenade');
}
function resetEquipGrenadeKeywordFilters() {
    equipGrenadeKeywordFilters = [];
    equipGrenadeSearchText = '';
    openEquipSelectModal();
}

function toggleEquipTypeFilter(t) {
    let idx = equipPersonalTypeFilters.indexOf(t);
    if (idx >= 0) equipPersonalTypeFilters.splice(idx, 1); else equipPersonalTypeFilters.push(t);
    openEquipSelectModal();
}
function setEquipTypeSearchText(value) {
    equipPersonalSearchText = value;
    openEquipSelectModal();
    refocusSearchInput('equipPersonal');
}
function resetEquipTypeFilters() {
    equipPersonalTypeFilters = [];
    equipPersonalSearchText = '';
    openEquipSelectModal();
}

function toggleEquipArmorTypeFilter(t) {
    let idx = equipArmorTypeFilters.indexOf(t);
    if (idx >= 0) equipArmorTypeFilters.splice(idx, 1); else equipArmorTypeFilters.push(t);
    openEquipSelectModal();
}
function setEquipArmorSearchText(value) {
    equipArmorSearchText = value;
    openEquipSelectModal();
    refocusSearchInput('equipArmor');
}
function resetEquipArmorTypeFilters() {
    equipArmorTypeFilters = [];
    equipArmorSearchText = '';
    openEquipSelectModal();
}

function saveGangs() {
    if (currentGang && currentGang.name) {
        savedGangs[currentGang.name] = currentGang;
    }
    localStorage.setItem('genestealerGangs', JSON.stringify(savedGangs));
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function isMercOrBeastProfile(fighter) {
    let types = (fighter.type || []).map(t => t.toLowerCase());
    return types.includes("bête") || types.includes("bette") || types.includes("hanger-on") || (fighter.charId && fighter.charId.startsWith("merc_") && fighter.charId !== "merc_hive_scum");
}

// Descriptions des règles spéciales associées à certains types de combattant.
// Cliquer sur un type dans la gestion de gang, la fiche du combattant ou le
// résumé en partie affiche cette description (voir buildFighterTypeBadgesHTML
// et showFighterTypeDescription). Clés normalisées (minuscule, sans accent) —
// voir normalizeTypeKey.
const FIGHTER_TYPE_DESCRIPTIONS = {
    'bete': "Ne peut pas effectuer les actions Interagir et Treat Ally. Ne peut pas non plus assister un allié qui effectue un test de blessure.",
    'volant': "Peut grimper sans perdre de mouvement et peut survoler les décors et les autres combattants. En cas de chute, ne subit aucun dommage et n'est pas suppressed.",
    'mercenaire': "Peut ne pas être sélectionné aléatoirement dans les scénarios.",
    'solitaire': "Son Ld ne peut pas être utilisé pour les tests de Bottle Check du gang.",
    'familier': "Rattaché à un guerrier du gang. Ne peut pas prendre les objectifs, mais peut les contester.",
    'prospect': "Ne déclenche pas de test de nerfs chez les guerriers qui ne sont pas eux-mêmes Prospects.",
    'soutien': "Ne compte pas dans la limite de guerriers sélectionnables dans les scénarios. Ne peut pas être pris pour cible au tir, sauf s'il est le combattant le plus proche du tireur.",
    'wyrd': "Peut lancer des pouvoirs psychiques.",
    'monte': "Donne les compétences Nerves of Steel et Hit & Run. Ne peut pas grimper. Pour les charges et les mouvements Dash, seul un virage à 90° est autorisé. Ne peut pas être équipé d'armes lourdes ni de la règle Paired, sauf avec le trait Lance. Ne peut pas utiliser d'arme secondaire au corps à corps."
};

function normalizeTypeKey(t) {
    return String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function getFighterTypeDescription(t) {
    return FIGHTER_TYPE_DESCRIPTIONS[normalizeTypeKey(t)] || null;
}

// "Monté" n'est pas un type fixe du personnage : il dépend de l'équipement
// porté (Dirt bike, Escher cutter...). Calculé à la volée plutôt que stocké,
// pour qu'il apparaisse/disparaisse automatiquement selon ce qui est équipé.
function getEffectiveFighterTypes(m) {
    if (!m) return [];
    let types = (m.type || []).slice();
    let isMounted = (m.equipment || []).some(e => e && (e.id === 'eq_dirt_bike' || e.id === 'eq_escher_cutter'));
    if (isMounted && !types.some(t => normalizeTypeKey(t) === 'monte')) {
        types.push('Monté');
    }
    return types;
}

// Affiche, sous forme de badges, la liste des types d'un combattant. Ceux qui
// ont une description associée sont cliquables (soulignés en pointillés) et
// ouvrent une petite fenêtre avec la règle correspondante au clic.
function buildFighterTypeBadgesHTML(types) {
    if (!types || types.length === 0) return '';
    return types.map(t => {
        let desc = getFighterTypeDescription(t);
        if (desc) {
            return `<span onclick="showFighterTypeDescription('${escapeForJsStr(t)}')" style="cursor:pointer; text-decoration:underline dotted; text-underline-offset:2px; color:var(--accent-cyan);" title="Cliquer pour voir la règle">${escapeHtml(t)}</span>`;
        }
        return escapeHtml(String(t));
    }).join(', ');
}

function showFighterTypeDescription(typeName) {
    let desc = getFighterTypeDescription(typeName);
    if (!desc) return;
    let niceLabel = String(typeName).charAt(0).toUpperCase() + String(typeName).slice(1);
    let html = `
        <div style="padding:4px;">
            <p style="font-size:14px; line-height:1.6; color:#ddd;">${escapeHtml(desc)}</p>
        </div>
        <br>
        <button class="btn btn-cyan" onclick="closeModal()">Fermer</button>
    `;
    if (typeof openModal === 'function') openModal(`ℹ️ Type : ${niceLabel}`, html);
}

// Détermine si l'équipement d'un combattant doit disparaître purement et
// simplement (mercenaire, familier, bête, brute) plutôt que rejoindre la
// réserve du gang, quand ce combattant quitte le gang (licenciement, mort,
// capture non rachetée...). Centralisé ici pour que la règle soit identique
// partout où un combattant quitte définitivement le gang.
function shouldFighterGearVanish(fighter) {
    if (!fighter) return false;
    if (isMercOrBeastProfile(fighter)) return true;
    let types = (fighter.type || []).map(t => (t || '').toLowerCase());
    return types.includes("brute") || types.includes("familier");
}

// ==========================================
// FAMILIERS (traités comme du matériel rattaché à un guerrier propriétaire)
// ==========================================
// Un familier est un personnage de db.characters comme un autre (stats,
// armes, compétences...) tagué "familier" dans son type. Au lieu d'apparaître
// dans le recrutement normal, il s'achète comme un objet d'équipement sur la
// fiche de son propriétaire (voir la catégorie "Familiers" dans
// openEquipSelectModal, weapons-equipment.js). Générique et automatique :
// tout personnage tagué "familier" (et pas "mercenaire") suit cette règle
// pour n'importe quel clan, sans code spécifique par familier.
// Les familiers mercenaires (Rat géant, Millisaur, Ripperjack...) gardent
// pour l'instant le parcours de recrutement classique : leurs règles
// spécifiques supplémentaires seront ajoutées séparément plus tard.
function isFamiliarCharDef(charDef) {
    if (!charDef) return false;
    let types = (charDef.type || []).map(t => normalizeTypeKey(t));
    return types.includes('familier');
}
function isMercenaryCharDef(charDef) {
    if (!charDef) return false;
    let types = (charDef.type || []).map(t => normalizeTypeKey(t));
    return types.includes('mercenaire') || !!(charDef.id && charDef.id.startsWith('merc_'));
}
function isNonMercFamiliarCharDef(charDef) {
    return isFamiliarCharDef(charDef) && !isMercenaryCharDef(charDef);
}

// Retrouve le(s) familier(s) appartenant à ce combattant (ownerId sur la
// fiche du familier référence l'id de son propriétaire).
function getFamiliarsOfFighter(fighterId) {
    if (!currentGang || !currentGang.members) return [];
    return currentGang.members.filter(f => f && f.isFamiliar && f.ownerId === fighterId);
}

// Bonus/malus de statistiques (Sv, I) accordés par une armure carapace équipée.
// Exprimés comme un delta arithmétique DIRECT sur le nombre affiché (une
// amélioration de sauvegarde fait baisser le nombre, tout comme un malus
// d'initiative) : pas besoin de distinguer les statistiques au format "X+"
// des statistiques numériques classiques, l'arithmétique est la même.
const CARAPACE_ARMOR_STAT_DELTAS = {
    'eq_armure_cara_leg': { Sv: -1, I: -1 },      // Armure carapace légère : Sv +1 (le nombre baisse de 1), I -1
    'eq_armure_cara_lourde': { Sv: -2, I: -2 }    // Armure carapace lourde : Sv +2 (le nombre baisse de 2), I -2
};

// Retourne les deltas de statistique dus à une armure carapace équipée par ce
// combattant (à afficher sur sa fiche), ou null si aucune n'est équipée. Si les
// deux étaient équipées en même temps (non prévu par les règles), la lourde prime.
// Un combattant ne peut porter qu'une seule armure à la fois, à l'exception du
// Refractor field qui se cumule avec n'importe quelle autre armure.
function isStackableArmor(item) {
    return !!(item && (item.id === 'eq_champ_reflec' || item.name === 'Refractor field'));
}

// Vérifie qu'ajouter cette armure ne dépasse pas la limite d'une seule armure
// portée à la fois (hors Refractor field, cumulable). Retourne un message
// d'erreur à afficher si la limite est dépassée, ou null si l'ajout est permis.
function checkArmorSlotLimit(fighter, newItem) {
    if (!newItem || newItem.type !== 'Armure' || isStackableArmor(newItem)) return null;
    let equipment = (fighter && fighter.equipment) || [];
    let existingArmor = equipment.find(e => e && e.type === 'Armure' && !isStackableArmor(e));
    if (existingArmor) {
        return `${fighter.customName || 'Ce combattant'} porte déjà "${existingArmor.name}". Une seule armure peut être portée à la fois (le Refractor field excepté).`;
    }
    return null;
}

// Un guerrier Monté (Escher cutter/Dirt bike équipé) ne peut pas être équipé
// d'une arme Lourde, sauf si cette arme a le trait Lance (conçue pour le combat
// monté). Retourne un message d'erreur si l'ajout est refusé, ou null si permis.
function checkMountedWeaponRestriction(fighter, weapon) {
    if (!fighter || !weapon) return null;
    let isMounted = (fighter.equipment || []).some(e => e && (e.id === 'eq_dirt_bike' || e.id === 'eq_escher_cutter'));
    if (!isMounted) return null;

    let traitsText = (typeof weaponTraitsText === 'function') ? weaponTraitsText(weapon) : '';
    if (traitsText.includes('lance')) return null;
    if (traitsText.includes('lourd')) {
        return `${fighter.customName || 'Ce combattant'} est Monté : il ne peut pas être équipé d'une arme Lourde, sauf si elle a le trait Lance.`;
    }
    return null;
}

// Certains accessoires d'arme ne sont compatibles qu'avec des armes précises.
// Focusing crystal et Hotshot las pack sont réservés au Lasgun, au Laspistol
// et au Long Las (autres armes à las). Suspensors est réservé aux armes dont
// le nom contient "*" (celles qui, sans lui, prennent 2 emplacements au lieu
// d'1 — voir getWeaponSlotCost).
const ACCESSORY_WEAPON_RESTRICTIONS = {
    'eq_cristal_concen': ['wpn_lasgun', 'wpn_laspistol', 'wpn_long_las'],
    'eq_hotshot': ['wpn_lasgun', 'wpn_laspistol', 'wpn_long_las']
};

function isAccessoryCompatibleWithWeapon(accId, weapon) {
    if (!weapon) return false;
    if (accId === 'eq_suspenseur') {
        return !!(weapon.name && weapon.name.includes('*'));
    }
    let restrictedTo = ACCESSORY_WEAPON_RESTRICTIONS[accId];
    if (restrictedTo) {
        return restrictedTo.includes(weapon.id);
    }
    return true;
}

function getArmorStatDeltas(m) {
    if (!m || !m.equipment || !Array.isArray(m.equipment)) return null;
    let hasHeavy = m.equipment.some(e => e && (e.id === 'eq_armure_cara_lourde' || e.name === 'Armure carapace lourde'));
    if (hasHeavy) return CARAPACE_ARMOR_STAT_DELTAS['eq_armure_cara_lourde'];
    let hasLight = m.equipment.some(e => e && (e.id === 'eq_armure_cara_leg' || e.name === 'Armure carapace légère'));
    if (hasLight) return CARAPACE_ARMOR_STAT_DELTAS['eq_armure_cara_leg'];
    return null;
}

// Formate une statistique en tenant compte d'un delta d'armure : retourne
// "nouvelle_valeur (ancienne_valeur)" si un delta s'applique, sinon la valeur
// brute inchangée. N'affecte jamais m.stats — purement un affichage dérivé.
function formatStatWithArmorDelta(rawValue, delta) {
    if (rawValue === undefined || rawValue === null || rawValue === '' || rawValue === '-') return '-';
    if (!delta) return rawValue;

    let str = rawValue.toString().trim();
    let hasPlus = str.endsWith('+');
    let num = parseInt(str);
    if (isNaN(num)) return rawValue;

    let newNum = Math.max(1, num + delta);
    return `${newNum}${hasPlus ? '+' : ''} (${str})`;
}

// Le M (Mouvement) d'un guerrier Monté est remplacé par une valeur fixe
// propre à sa monture (contrairement aux bonus d'armure, qui sont des deltas
// relatifs) : Escher cutter -> 9", Dirt bike -> 8". Si les deux sont équipés
// en même temps (non prévu par les règles), l'Escher cutter prévaut.
const MOUNTED_M_OVERRIDES = {
    'eq_escher_cutter': '9"',
    'eq_dirt_bike': '8"'
};

function getMountedMOverride(m) {
    if (!m || !m.equipment) return null;
    if (m.equipment.some(e => e && e.id === 'eq_escher_cutter')) return MOUNTED_M_OVERRIDES['eq_escher_cutter'];
    if (m.equipment.some(e => e && e.id === 'eq_dirt_bike')) return MOUNTED_M_OVERRIDES['eq_dirt_bike'];
    return null;
}

// Formate le M en tenant compte d'une monture équipée, avec l'ancienne valeur
// entre parenthèses (même présentation que les bonus d'armure). Sans monture,
// ou si la monture ne change rien (déjà la même valeur), retourne la valeur
// brute inchangée.
function formatMovementWithMount(m) {
    let rawM = (m && m.stats && m.stats.M !== undefined) ? m.stats.M : '-';
    let override = getMountedMOverride(m);
    if (!override || String(rawM) === String(override)) return rawM;
    return `${override} (${rawM})`;
}

function calculateFighterCost(m) {
    const char = db.characters.find(c => c.id === m.charId);
    if (!char) return 0;
    let total = char.cost;

    // Genestealer Cults : case à cocher "Extra arm" (+20 pts) — voir
    // can_take_extra_arm dans db.characters et toggleExtraArmOption(). Ne
    // s'applique pas à l'Alpha, qui possède la compétence gratuitement (déjà
    // incluse dans son cost de base) et n'a donc jamais ce flag à true.
    if (m.extraArmPurchased) {
        total += 20;
    }

    (m.weapons || []).forEach(w => {
        if (!w) return;
        const isDefault = w.isDefault || (char.default_weapons && (char.default_weapons.includes(w.id) || char.default_weapons.includes(w.name)));
        if (!isDefault) {
            total += (w.cost_credits || w.cost || 0);
        }
        if (w.accessory && typeof w.accessory === 'object' && !w.accessory.isDefault) {
            total += (w.accessory.cost_credits || w.accessory.cost || 0);
        }
        // Options payantes débloquées sur cette arme (ex: Photon flash/Fumigène
        // du Grenade launcher) : chacune augmente la valeur du combattant de
        // son propre coût, en plus du prix de base de l'arme.
        if (w.optional_profiles && w.unlockedOptions && w.unlockedOptions.length > 0) {
            w.optional_profiles.forEach(op => {
                if (w.unlockedOptions.includes(op.name)) total += (op.extra_cost || 0);
            });
        }
    });
    
    (m.equipment || []).forEach(e => {
        if (!e) return;
        const isDefault = e.isDefault || (char.default_equipment && (char.default_equipment.includes(e.id) || char.default_equipment.includes(e.name)));
        if (!isDefault) {
            total += (e.cost_credits || e.cost || 0);
        }
    });
    
    total += (m.advancesCost || 0);
    return total;
}

// Comme calculateFighterCost(), mais exclut le coût des objets d'équipement
// "costPrepaid" (familiers achetés via buyFamiliarForFighter/adoptFamiliarFromStash) :
// leur coût a déjà été débité immédiatement des crédits du gang au moment de
// l'achat (voir buyFamiliarForFighter dans weapons-equipment.js), donc il ne
// doit pas être recompté lors d'un débit/remboursement basé sur le coût total
// de la fiche. Corrige un double-débit qui se produisait en phase de création
// de gang : saveFighter() y déduit un delta calculé sur tempFighter.totalCost
// (calculateFighterCost), qui inclut ce coût déjà payé — d'où un guerrier dont
// le familier venait d'être acheté qui se retrouvait facturé deux fois pour
// lui. À utiliser uniquement pour calculer un montant à débiter/rembourser
// (saveFighter() en phase de création, performRemoveFighter()) — jamais pour
// m.totalCost lui-même (affichage, cote du gang), qui doit continuer à
// refléter la pleine valeur du guerrier, familier compris.
function calculateFighterChargeableCost(m) {
    let prepaidTotal = (m.equipment || []).reduce((sum, e) => sum + (e && e.costPrepaid ? (e.cost_credits || e.cost || 0) : 0), 0);
    return calculateFighterCost(m) - prepaidTotal;
}

function calculateGangRating(gang) {
    if (!gang || !gang.members) return 0;
    let rating = 0;
    gang.members.forEach(m => {
        m.totalCost = calculateFighterCost(m);
        rating += m.totalCost;
    });
    gang.rating = rating;
    return rating;
}

function updateTopBar() {
    const topBar = document.getElementById('top-bar');
    if (!topBar) return;

    if (typeof currentGang === 'undefined' || !currentGang) {
        topBar.innerHTML = '';
        topBar.style.display = 'none';
        return;
    }

    topBar.style.display = 'block';
    topBar.classList.remove('hidden');

    let gangRating = typeof calculateGangRating === 'function' 
        ? calculateGangRating(currentGang) 
        : (currentGang.members || []).reduce((sum, m) => sum + (m.totalCost || m.cost || 0), 0);

    let stashVal = (currentGang.stash || []).reduce((sum, item) => {
        let itemCost = (typeof item === 'object') ? (item.cost || item.cost_credits || item.price || 0) : 0;
        return sum + itemCost;
    }, 0);

    let gangWealth = gangRating + stashVal + (currentGang.credits || 0);

    let totalRep = typeof calculateGangReputation === 'function' 
        ? calculateGangReputation(currentGang) 
        : ((currentGang.reputation !== undefined) ? currentGang.reputation : 1);

    topBar.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; padding:6px 15px; background:var(--panel-bg, #1e1e1e); border-bottom:1px solid #333; box-sizing:border-box; color:#fff;">
            <div>
                <strong>${currentGang.name || 'Gang'}</strong> | 
                Crédits : <strong style="color:var(--accent-cyan, #00d2d3);">${currentGang.credits || 0} cr</strong> | 
                Gang Rating : <strong style="color:var(--accent-purple, #9b59b6);">${gangRating} cr</strong> | 
                Richesse : <strong style="color:#f39c12;">${gangWealth} cr</strong> | 
                Réputation : <strong style="color:#2ecc71;">${totalRep}</strong>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-cyan" style="padding:3px 10px; font-size:12px; cursor:pointer;" onclick="openStashModal()">📦 Réserve (Stash)</button>
                <button class="btn" style="padding:3px 10px; font-size:12px; cursor:pointer;" onclick="openTerritoriesModal()">🚩 Territoires</button>
                <button class="btn btn-cyan" style="padding:3px 10px; font-size:12px; cursor:pointer;" onclick="openMatchHistoryModal()">📜 Historique</button>
            </div>
        </div>
    `;
}

// ==========================================
// UI ROUTING
// ==========================================
function navigate(view) {
    appState.view = view;
    if (view !== 'fighter-edit' && view !== 'post-cycle') {
        appState.returnTo = null;
    }
    const container = document.getElementById('main-content');
    updateTopBar();

    switch(view) {
        case 'menu': renderMenu(container); break;
        case 'gang-create': renderGangCreate(container); break;
        case 'gang-select': renderGangSelect(container); break;
        case 'gang-manage': renderGangManage(container); break;
        case 'fighter-edit': renderFighterEdit(container); break;
        case 'game-setup': renderGameSetup(container); break;
        case 'post-cycle': 
            if (typeof renderPostCycleView === 'function') {
                renderPostCycleView(container);
            }
            break;
    }
}

