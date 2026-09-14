// data-mercenaries.js
// Personnages et armes spécifiques aux Mercenaires/Hangers-on (Hive scum,
// Luthern armbot, Jotunn Ogryn, Rogue doc, Ammo-jack, Dome runner, Slopper,
// Hive watcher, Rat géant, Millisaur, Ripperjack), isolés de data.js pour ne
// pas alourdir les futures modifications qui ne les concernent pas — leurs
// règles spécifiques restent à développer séparément (voir mémo du projet).
// Complète db.characters et db.weapons une fois data.js chargé : doit être
// inséré juste après lui dans index.html.
const MERC_CHARACTERS = [
        {
            id: "merc_hive_scum", name: "Hive scum",
            stats: { M: '5"', WS: '4+', BS: '4+', S: 3, T: 3, W: 1, I: 3, A: 1, Sv: '6+', Ld: 6, Cl: 6, Wil: 6, Int: 6 },
            type: ["Guerrier", "ganger", "mercenaire"], starting_xp: 0, cost: 30,
            special_rules: ["Armes/équipements pour hive scum max 60 pts.", "Ne gagne jamais d'expérience."]
        },
        {
            id: "merc_luthern_armbot", name: "Luthern armbot",
            stats: { M: '4"', WS: '3+', BS: '5+', S: 5, T: 5, W: 3, I: 2, A: 2, Sv: '4+', Ld: 6, Cl: 8, Wil: 6, Int: 5 },
            type: ["Guerrier", "brute", "mercenaire"], starting_xp: 25, starting_skill: "Infiltrate, Juggernaut", primary_skills: ["Muscle"], secondary_skills: ["Combat"], cost: 230,
            special_rules: ["Post cycle : travailler sur territoires possédés."], default_weapons: ["wpn_griffes_tunnel"],
            allowed_merc_weapons: [
                { id: "wpn_armbot_grav", cost_credits: 40 },
                { id: "wpn_armbot_melta", cost_credits: 70 }
            ]
        },
        {
            id: "merc_jotunn_ogryn", name: "Jotunn Ogryn",
            stats: { M: '5"', WS: '4+', BS: '5+', S: 5, T: 5, W: 3, I: 3, A: 2, Sv: '5+', Ld: 7, Cl: 8, Wil: 6, Int: 5 },
            type: ["Guerrier", "brute", "mercenaire"], starting_xp: 25, starting_skill: "Headbutt, Juggernaut", primary_skills: ["Muscle"], secondary_skills: ["Combat"], cost: 160,
            special_rules: ["Ne peut jamais être activé en activation de groupe."], default_weapons: ["wpn_poing_augmetic", "wpn_poing_augmetic"],
            allowed_merc_weapons: [
                { id: "wpn_arc_welder", cost_credits: 70, replaces: "wpn_poing_augmetic" },
                { id: "wpn_storm_welder", cost_credits: 70, replaces: "wpn_poing_augmetic" },
                { id: "wpn_spud_jacker", cost_credits: 20, replaces: "wpn_poing_augmetic" }
            ]
        },
        {
            id: "merc_rogue_doc", name: "Rogue doc",
            stats: { M: '5"', WS: '5+', BS: '5+', S: 2, T: 3, W: 1, I: 3, A: 1, Sv: '6+', Ld: 6, Cl: 8, Wil: 6, Int: 7 },
            type: ["Guerrier", "hanger-on", "mercenaire"], starting_xp: 13, starting_skill: "Medicate", primary_skills: ["Savant"], secondary_skills: ["Agilité"], cost: 90,
            special_rules: ["Peut accompagner un guerrier en escorte médicale ou mise en place de bioniques."],
            default_weapons: ["wpn_stub_gun"], default_equipment: ["eq_kit_medical", "eq_medicrane"],
            allowed_merc_weapons: [
                { id: "wpn_laspistol", cost_credits: 5, replaces: "wpn_stub_gun" }
            ]
        },
        {
            id: "merc_ammo_jack", name: "Ammo-jack",
            stats: { M: '5"', WS: '4+', BS: '3+', S: 3, T: 3, W: 1, I: 2, A: 1, Sv: '5+', Ld: 6, Cl: 7, Wil: 7, Int: 7 },
            type: ["Guerrier", "hanger-on", "mercenaire"], starting_xp: 13, starting_skill: "Munitioneer", primary_skills: ["Tir"], secondary_skills: ["Savant"], cost: 100,
            special_rules: ["Post cycle overcharge : Une arme gagne +1 S et instable."],
            default_weapons: ["wpn_epee_energetique", "wpn_pompe_combat"],
            allowed_merc_weapons: [
                { id: "wpn_boltgun", cost_credits: 15, replaces: "wpn_pompe_combat" },
                { id: "wpn_marteau_nrj", cost_credits: 0, replaces: "wpn_epee_energetique" }
            ]
        },
        {
            id: "merc_dome_runner", name: "Dome runner",
            stats: { M: '5"', WS: '5+', BS: '5+', S: 3, T: 3, W: 1, I: 4, A: 1, Sv: '6+', Ld: 6, Cl: 7, Wil: 7, Int: 7 },
            type: ["Guerrier", "hanger-on", "mercenaire"], starting_xp: 13, starting_skill: "Catfall, Clamber", primary_skills: ["Agilité"], secondary_skills: ["Ruse"], cost: 50,
            special_rules: ["Déploiement : D3 alliés peuvent se déplacer de leur initiative avant T1."],
            default_weapons: ["wpn_stub_gun", "wpn_couteau_combat"],
            allowed_merc_weapons: [
                { id: "wpn_laspistol", cost_credits: 0, replaces: "wpn_stub_gun" },
                { id: "wpn_long_las", cost_credits: 35, replaces: "wpn_stub_gun" },
                { id: "wpn_hache", cost_credits: 15, replaces: "wpn_couteau_combat" }
            ]
        },
        {
            id: "merc_slopper", name: "Slopper",
            stats: { M: '4"', WS: '4+', BS: '4+', S: 3, T: 3, W: 1, I: 4, A: 1, Sv: '6+', Ld: 6, Cl: 7, Wil: 7, Int: 7 },
            type: ["Guerrier", "hanger-on", "soutien", "mercenaire"], starting_xp: 13, primary_skills: ["Savant"], secondary_skills: ["Muscle"], cost: 45,
            special_rules: ["Post cycle : +20 crédits.", "1/partie : adversaire relance jet de blessures permanentes."],
            default_weapons: ["wpn_couteau_combat"]
        },
        {
            id: "merc_hive_watcher", name: "Hive watcher",
            stats: { M: '4"', WS: '5+', BS: '5+', S: 3, T: 3, W: 1, I: 4, A: 1, Sv: '6+', Ld: 6, Cl: 7, Wil: 7, Int: 8 },
            type: ["Guerrier", "hanger-on", "soutien", "mercenaire"], starting_xp: 13, starting_skill: "Clamber, Lie low", primary_skills: ["Ruse"], secondary_skills: ["Agilité"], cost: 30,
            special_rules: ["Infiltration/renfort ennemis repoussés à +3\" des alliés."],
            default_weapons: ["wpn_laspistol"]
        },
        {
            id: "merc_rat_geant", name: "Rat géant",
            stats: { M: '5"', WS: '4+', BS: '5+', S: 3, T: 3, W: 1, I: 4, A: 1, Sv: '6+', Ld: 6, Cl: 7, Wil: 6, Int: 5 },
            type: ["guerrier", "bête", "familier", "mercenaire"], starting_xp: 13, starting_skill: "Leash de 3\"", primary_skills: ["Agilité"], secondary_skills: ["Ruse"], cost: 45,
            special_rules: ["Leader/champion uniquement.", "Remplacé gratuitement si tué.", "Compte comme équipement"], default_weapons: ["wpn_morsure"]
        },
        {
            id: "merc_millisaur", name: "Millisaur",
            stats: { M: '6"', WS: '4+', BS: '5+', S: 3, T: 3, W: 2, I: 3, A: 2, Sv: '5+', Ld: 6, Cl: 6, Wil: 6, Int: 5 },
            type: ["guerrier", "bête", "familier", "mercenaire"], starting_xp: 13, starting_skill: "Leash de 6\"", primary_skills: ["Combat"], secondary_skills: ["Agilité"], cost: 95,
            special_rules: ["Leader/champion uniquement.", "Déplacement sous infranchissable.", "Compte comme équipement"], default_weapons: ["wpn_gueule_crocs"]
        },
        {
            id: "merc_ripperjack", name: "Ripperjack",
            stats: { M: '7"', WS: '4+', BS: '6+', S: 3, T: 3, W: 2, I: 4, A: 2, Sv: '6+', Ld: 6, Cl: 8, Wil: 5, Int: 6 },
            type: ["guerrier", "bête", "familier", "mercenaire", "volant"], starting_xp: 13, starting_skill: "Leash de 6\"", primary_skills: ["Muscle"], secondary_skills: ["Combat"], cost: 85,
            special_rules: ["Leader/champion uniquement.", "Ne peut assister/être assisté.", "Ennemi engagé avec test d'agilité pour fuir.", "Compte comme équipement"], default_weapons: ["wpn_dents"]
        }
];

// Armes spécifiques aux mercenaires ci-dessus (toutes marquées is_merc_weapon
// dans data.js à l'origine).
const MERC_WEAPONS = [
        { id: "wpn_armbot_grav", name: "Armbot grav cutter", profiles: [{ name: "Unique", SR: '6"', LR: '12"', S: "-", AP: "-", L: 2, traits: "Explosion (3\"), graviton pulse" }], is_merc_weapon: true, cost_credits: 40 },
        { id: "wpn_armbot_melta", name: "Armbot melta cutter", profiles: [{ name: "Unique", SR: '4"', LR: '8"', S: 6, AP: "-2", L: 2, traits: "Munitions (6+) dommages (2)" }], is_merc_weapon: true, cost_credits: 70 },
        { id: "wpn_storm_welder", name: "Storm Welder", profiles: [{ name: "Unique", SR: '8"', LR: '16"', S: 5, AP: "-", L: 1, traits: "Tir rapide (3), shock (6+), Instable" }], is_merc_weapon: true, cost_credits: 70 },
        { id: "wpn_poing_augmetic", name: "Poing augmetic", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "melee, knockback (6+)" }], is_merc_weapon: true, cost_credits: 0 },
        { id: "wpn_morsure", name: "Morsure", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "Melee" }], is_merc_weapon: true },
        { id: "wpn_gueule_crocs", name: "Gueule à crocs", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "-", AP: "-", L: 1, traits: "melee, toxine (4+)" }], is_merc_weapon: true },
        { id: "wpn_dents", name: "Dents", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 2, traits: "Melee" }], is_merc_weapon: true },
        { id: "wpn_arc_welder", name: "Arc welder", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+2", AP: "-3", L: 2, traits: "Melee, flammes (5+)" }], is_merc_weapon: true, cost_credits: 70 },
        { id: "wpn_griffes_tunnel", name: "Griffes de tunnel", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S-1", AP: "-", L: 2, traits: "Melee, paire (2)" }], is_merc_weapon: true },
        { id: "wpn_spud_jacker", name: "Spud jacker", profiles: [{ name: "Unique", SR: "E", LR: "+", S: "S+1", AP: "-", L: 1, traits: "melee, knockback (6+), commotion (6+)" }], is_merc_weapon: true, cost_credits: 20 }
];

db.characters = db.characters.concat(MERC_CHARACTERS);
db.weapons = db.weapons.concat(MERC_WEAPONS);
