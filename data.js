// data.js - Base de données Necromunda (Genestealer Cults, Mercenaires, Armes, Équipements, Traits, Cartes Tactiques, Territoires, Conditions)

const db = {
    // ===== PERSONNAGES (Genestealer Cults) =====
    // Règle d'armée "Cult uprising" (+1 au jet de dé lors d'un coup de grâce) et
    // compétence "Extra arm" : appliquées par le code (fighter-recruit.js /
    // gang-views.js), voir sk_cult_uprising et sk_extra_arm dans skills.generique
    // ci-dessous. can_take_extra_arm active la case à cocher (+20 pts) sur la fiche.
    characters: [
        {
            id: "char_adepte",
            name: "Adepte",
            stats: { M: '4"', WS: '3+', BS: '3+', S: 3, T: 3, W: 3, I: 4, A: 3, Sv: '5+', Ld: 8, Cl: 8, Wil: 9, Int: 7 },
            type: ["Guerrier", "leader", "wyrd"],
            starting_xp: 61,
            starting_skill: "Une primaire au choix",
            primary_skills: ["wyrd genestealer", "savant"],
            secondary_skills: ["agilité", "ruse"],
            cost: 120,
            tactics_cards: 2
        },
        {
            id: "char_alpha",
            name: "Alpha",
            stats: { M: '5"', WS: '3+', BS: '3+', S: 4, T: 3, W: 3, I: 4, A: 2, Sv: '5+', Ld: 9, Cl: 8, Wil: 8, Int: 7 },
            type: ["Guerrier", "leader"],
            starting_xp: 61,
            starting_skill: "Une primaire au choix, Extra arm",
            special_rules: ["Possède la compétence Extra arm directement (voir Compétences)."],
            primary_skills: ["ruse", "savant"],
            secondary_skills: ["muscle", "combat"],
            cost: 150,
            tactics_cards: 2,
            default_weapons: ["wpn_clawed_arm"]
        },
        {
            id: "char_hybrid_acolyte",
            name: "Hybrid acolyte",
            stats: { M: '4"', WS: '3+', BS: '3+', S: 3, T: 3, W: 2, I: 4, A: 1, Sv: '5+', Ld: 7, Cl: 7, Wil: 6, Int: 7 },
            type: ["Guerrier", "champion"],
            starting_xp: 39,
            starting_skill: "Une primaire au choix",
            special_rules: ["Peut prendre la compétence Extra arm pour +20 points (case à cocher sur la fiche)."],
            primary_skills: ["ruse", "tir"],
            secondary_skills: ["combat"],
            cost: 85,
            tactics_cards: 1,
            can_take_extra_arm: true
        },
        {
            id: "char_neophyte_hybrid",
            name: "Neophyte hybrid",
            stats: { M: '4"', WS: '4+', BS: '4+', S: 3, T: 3, W: 1, I: 3, A: 1, Sv: '6+', Ld: 6, Cl: 7, Wil: 6, Int: 5 },
            type: ["Guerrier", "spécialiste"],
            starting_xp: 13,
            starting_skill: "selon spécialité",
            special_rules: ["Peut prendre la compétence Extra arm pour +20 points (case à cocher sur la fiche).", "lourd (Bulging biceps), artilleur (Hip-shooting), pistolero (Gunfighter), scout (Clamber), sniper (Precision shot), bagarreur (Berserker), medic (Medicate), tech (Munitioneer)"],
            primary_skills: ["ruse"],
            secondary_skills: ["combat", "tir"],
            cost: 40,
            can_take_extra_arm: true
        },
        {
            id: "char_aberrant",
            name: "Aberrant",
            stats: { M: '5"', WS: '3+', BS: '6+', S: 4, T: 4, W: 2, I: 2, A: 2, Sv: '6+', Ld: 5, Cl: 8, Wil: 7, Int: 4 },
            type: ["Guerrier"],
            starting_xp: 13,
            starting_skill: "Unstoppable",
            special_rules: ["Ne peut jamais acheter d'arme n'ayant pas le trait melee."],
            primary_skills: ["muscle"],
            secondary_skills: ["combat", "ruse"],
            cost: 85
        },
        {
            id: "char_hybrid_initiate",
            name: "Hybrid initiate",
            stats: { M: '5"', WS: '5+', BS: '5+', S: 3, T: 3, W: 1, I: 4, A: 1, Sv: '6+', Ld: 5, Cl: 6, Wil: 5, Int: 5 },
            type: ["Guerrier", "prospect"],
            starting_xp: 1,
            starting_skill: "",
            special_rules: ["Peut prendre la compétence Extra arm pour +20 points (case à cocher sur la fiche)."],
            primary_skills: ["ruse"],
            secondary_skills: ["agilité"],
            cost: 20,
            can_take_extra_arm: true
        },
        {
            id: "char_abominant",
            name: "Abominant",
            stats: { M: '5"', WS: '3+', BS: '6+', S: 5, T: 5, W: 4, I: 2, A: 3, Sv: '5+', Ld: 5, Cl: 7, Wil: 6, Int: 4 },
            type: ["Guerrier", "brute"],
            starting_xp: 25,
            starting_skill: "Unstoppable",
            special_rules: ["Équipé de base d'un Power sledgehammer.", "Ne peut jamais acheter d'autres armes, équipements, armure ou accessoire d'arme."],
            primary_skills: ["muscle"],
            secondary_skills: ["combat"],
            cost: 240,
            default_weapons: ["wpn_power_sledgehammer"]
        },
        {
            id: "char_psychic_familiar",
            name: "Psychic familiar",
            is_gang: true,
            stats: { M: '5"', WS: '4+', BS: '6+', S: 2, T: 2, W: 1, I: 5, A: 1, Sv: '6+', Ld: 5, Cl: 6, Wil: 6, Int: 6 },
            type: ["Guerrier", "bête", "familier"],
            starting_xp: 13,
            starting_skill: "Leash de 3\", Catfall, Clamber, Omen of fortune et Precognition",
            special_rules: ["Rattaché à une figurine"],
            primary_skills: ["agilité"],
            secondary_skills: ["ruse"],
            cost: 110
        }
    ],

    // ===== DICTIONNAIRE DES COMPETENCES =====
    skills: {
        agilite: [
            { id: "sk_chute_chat", name: "Catfall", desc: "Réduit le cran de distance verticale en cas de chute/saut. Test d'agilité pour ne pas être suppressed si non blessé/hors combat." },
            { id: "sk_grimper", name: "Clamber", desc: "Mouvement non divisé par deux en grimpant." },
            { id: "sk_esquive", name: "Dodge", desc: "Avant jet d'armure, sur un 6, ignore la blessure. Si gabarit, déplace de 2\" pour éviter." },
            { id: "sk_bond_prodigieux", name: "Mighty leap", desc: "Ignore les 2 premiers pouces de distance lors d'un saut (saut 4\" sans test)." },
            { id: "sk_jaillir", name: "Spring up", desc: "Si suppressed, test d'agilité. Si réussi, n'est plus suppressed." },
            { id: "sk_sprint", name: "Sprint", desc: "Action double : déplacement = Mouvement + (2 x Initiative)." }
        ],
        muscle: [
            { id: "sk_charge_taureau", name: "Bull charge", desc: "Attaque de charge : l'arme gagne knockback (6+) et +1 en Force." },
            { id: "sk_biceps_saillants", name: "Bulging biceps", desc: "Braced shot : déplacement d'Initiative en pouces avant ou après. Arme lourde au close : peut déclarer arme secondaire non lourde." },
            { id: "sk_redoutable", name: "Fearsome", desc: "Condition fearsome." },
            { id: "sk_machoire_acier", name: "Iron jaw", desc: "Endurance +2 si touché par arme sans AP." },
            { id: "sk_nerfs_acier", name: "Nerves of steel", desc: "Si touché au tir, test de cool : si réussi, non suppressed." },
            { id: "sk_instoppable", name: "Unstoppable", desc: "A l'activation, test de Willpower : si réussi, récupère 1 PV." }
        ],
        combat: [
            { id: "sk_berserker", name: "Berserker", desc: "Condition frénésie." },
            { id: "sk_maitre_combat", name: "Combat master", desc: "Pas de malus d'interférence pour toucher. Peut toujours assister quel que soit le nb d'ennemis." },
            { id: "sk_coup_boule", name: "Headbutt", desc: "Arme intégrée : engagé, F+1, L:1, attaques additionnelles (1)." },
            { id: "sk_coups_puissants", name: "Heavy blows", desc: "Arme lourde au close = +1 Force." },
            { id: "sk_pluie_coups", name: "Rain of blows", desc: "Si après une action d'attaque, le guerrier est toujours engagé, peut faire une action d'attaque gratuite en plus." },
            { id: "sk_combat_2_armes", name: "Two-weapon fighter", desc: "Fait 2 attaques avec son arme secondaire au lieu d'une." }
        ],
        ruse: [
            { id: "sk_backstab", name: "Backstab", desc: "Armes close gagnent Backstab. Si déjà acquis, Force +2 au lieu de +1." },
            { id: "sk_contre_attaque", name: "Counter-attack", desc: "Peut faire une attaque additionnelle quand un ennemi l'attaque, au même rang d'initiative que lui." },
            { id: "sk_coupe_gorge", name: "Cut-throat", desc: "Relance son D6 de coup de grâce." },
            { id: "sk_infiltration", name: "Infiltrate", desc: "Déploiement spécial : hors ligne de vue et à + de 9\" de tout ennemi." },
            { id: "sk_se_cacher", name: "Lie low", desc: "Si suppressed, inciblable au-delà de la portée courte des ennemis." },
            { id: "sk_overwatch", name: "Overwatch", desc: "Interrompt une action ennemie avec un tir en perdant son marqueur ready." }
        ],
        savant: [
            { id: "sk_connecte", name: "Connected", desc: "Visite le Trading Post avec 1 TP supplémentaire post-cycle (2 visites max)." },
            { id: "sk_recharge_rapide", name: "Fast reload", desc: "Recharge toutes ses armes d'un coup." },
            { id: "sk_volonte_fer", name: "Iron will", desc: "Soustrait 1 aux tests de bottle check du gang." },
            { id: "sk_soin", name: "Medicate", desc: "Action : un allié à 1\" qui n'est pas seriously injured récupère 1 PV." },
            { id: "sk_mentor", name: "Mentor", desc: "Si un allié à 6\" gagne 1 XP, test de Ld : si réussi, gagne 1 XP." },
            { id: "sk_munitions", name: "Munitioneer", desc: "Action distribution : alliés à 6\" font test d'Int, si réussi -> recharge gratuite." }
        ],
        tir: [
            { id: "sk_tir_rapide", name: "Fast shot", desc: "Peut faire 2 actions de tir pendant l'activation." },
            { id: "sk_pistolero", name: "Gunfighter", desc: "Peut tirer avec 2 armes de tir (léger) sur cibles différentes." },
            { id: "sk_tir_hanche", name: "Hip-shooting", desc: "Les armes de tir (non lourdes) gagnent le trait assaut." },
            { id: "sk_tireur_habile", name: "Marksman", desc: "+1 pour toucher les cibles entre portée courte et longue." },
            { id: "sk_tir_precision", name: "Precision shot", desc: "Sur un 6 naturel pour toucher, ignore l'armure (sauf explosion/tir rapide)." },
            { id: "sk_tireur_elite", name: "Sharpshooter", desc: "Aimed shot : +2 pour toucher au lieu de +1." }
        ],
        generique: [
            { id: "sk_poison_blood", name: "Poison blood", desc: "Quand le guerrier utilise une arme avec le trait toxine (X+), les résultats de 1 peuvent être relancés." },
            { id: "sk_lands_on_feet", name: "Lands on their feet", desc: "Si le guerrier tombe pour n'importe quelle raison, réduire de 3\" la hauteur de chute dans le tableau.", specific_to: "char_phyrr_cat" },
            { id: "sk_hit_run", name: "Hit & run", desc: "Après action de combat, peut consolider (sortir de 1\") en finissant à +1\" des ennemis." },
            { id: "sk_inspirant", name: "Inspirant", desc: "Peut faire l'action d'activation de groupe en action gratuite." },
            { id: "sk_chef", name: "Chef", desc: "Tous les alliés dans les 12\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf." },
            { id: "sk_sous_chef", name: "Sous-chef", desc: "Tous les alliés dans les 6\" et en ligne de vue peuvent utiliser le Cl du leader pour leurs tests de nerf." },
            { id: "sk_juggernaut", name: "Juggernaut", desc: "Si touché au tir, suppressed uniquement si PV perdu ou effet du dé de blessure.", specific_to: "brute" },
            { id: "sk_regeneration", name: "Regeneration", desc: "Action : mouvement puis 4+ = récupère 1 PV." },
            { id: "sk_leash", name: "Leash de X\"", desc: "Portée pour familiers pour ignorer le test de panique." },
            // Règle d'armée Genestealer Cults : ajoutée automatiquement (et non
            // retirable) à tous les guerriers du gang, mercenaires exclus. Voir
            // buildInitialFighterState() et ensureInnateFighterSkills().
            { id: "sk_cult_uprising", name: "Cult uprising", desc: "Règle d'armée : les guerriers ajoutent +1 à leur jet de dé quand ils font un coup de grâce." },
            // Compétence Extra arm : innée pour l'Alpha, optionnelle (+20 pts) pour
            // Hybrid acolyte / Neophyte hybrid / Hybrid initiate (can_take_extra_arm).
            // Donne toujours l'arme Clawed arm (voir wpn_clawed_arm dans db.weapons).
            { id: "sk_extra_arm", name: "Extra arm", desc: "Le guerrier peut prendre une arme en plus et considère les braced shot comme des actions simples plutôt que doubles. Il ne peut néanmoins pas se déplacer ou faire un autre tir. Donne l'arme Clawed arm." },
            // Compétences innées du Psychic familiar (specific_to : voir buildInitialFighterState()).
            { id: "sk_omen_of_fortune", name: "Omen of fortune", desc: "Tant qu'il est dans la zone de leash du Psychic familiar, son maître a une sauvegarde invulnérable de 4+.", specific_to: "char_psychic_familiar" },
            { id: "sk_precognition", name: "Precognition", desc: "Le Psychic familiar a une sauvegarde invulnérable de 4+.", specific_to: "char_psychic_familiar" }
        ],

        // ===== NOUVELLE CATÉGORIE DE COMPÉTENCES (Genestealer Cults) =====
        // Ajoutée en plus des 6 catégories existantes (agilite, muscle, combat,
        // ruse, savant, tir), qui restent inchangées. La clé (avec espace, sans
        // accent) doit correspondre au texte utilisé dans primary_skills /
        // secondary_skills des personnages ci-dessus (comparaison normalisée en
        // minuscule + accents retirés dans fighter-skills-tactics.js).
        "wyrd genestealer": [
            { id: "sk_hypnosis", name: "Hypnosis", desc: "Action simple : sélectionner un ennemi en LdV dans les 9\" avec un token prêt. Il devra terminer son activation plus proche de l'adepte qu'il ne l'était au début. Si impossible, il subit une blessure automatique L1." },
            { id: "sk_unbreakable_will", name: "Unbreakable will", desc: "Action gratuite, effet continu : quand un allié dans les 9\" de l'adepte fait un test de Cl ou de Will, il peut utiliser les caractéristiques de l'adepte." },
            { id: "sk_zealot", name: "Zealot", desc: "Action simple, effet continu : tous les alliés dans les 9\" de l'adepte gagnent la condition Haine (tout)." },
            { id: "sk_mind_control", name: "Mind control", desc: "Action simple : sélectionner un ennemi en LdV dans les 9\". Il résout un tir, même s'il s'est déjà activé, contre un de ses alliés choisi par son adversaire." },
            { id: "sk_assail", name: "Assail", desc: "Action simple : tir contre un ennemi en LdV dans les 12\". S'il est touché, il est déplacé de D3\" dans n'importe quelle direction et devient suppressed (test d'agilité s'il devrait tomber). S'il entre en contact avec un guerrier ou un décor, il s'arrête et subit une touche S3, AP-, L1 ; une figurine percutée subit la même touche et devient suppressed (ou engagée si gang différent)." },
            { id: "sk_force_wave", name: "Force wave", desc: "Action simple : tous les ennemis dans les 3\" sont repoussés de D3+1\" (test d'agilité s'ils devraient tomber). S'ils entrent en contact avec un guerrier ou un décor, ils s'arrêtent et subissent une touche S3, AP-, L1 ; une figurine percutée subit la même touche et devient suppressed (ou engagée si gang différent)." }
        ]
    },

    // ===== ARMES =====
    weapons: [
        { id: "wpn_autogun", name: "Autogun", profiles: [{ name: "Unique", SR: '8"', LR: '24"', S: 3, AP: "-", L: 1, traits: "tir rapide (1)" }], cost_credits: 20, cost_tp: 0, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_autopistol", name: "Autopistol", profiles: [{ name: "Unique", SR: '4"', LR: '12"', S: 3, AP: "-", L: 1, traits: "léger, tir rapide (1)" }], cost_credits: 10, cost_tp: 0, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_heavy_stubber", name: "Heavy stubber*", profiles: [{ name: "Unique", SR: '20"', LR: '40"', S: 4, AP: "-1", L: 1, traits: "lourd, tir rapide (2)" }], cost_credits: 70, cost_tp: 2, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_long_rifle", name: "Long rifle", profiles: [{ name: "Unique", SR: '24"', LR: '48"', S: 4, AP: "-1", L: 1, traits: "Knockback (6+)" }], cost_credits: 55, cost_tp: 1, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_stub_gun", name: "Stub gun", profiles: [{ name: "Unique", SR: '6"', LR: '12"', S: 3, AP: "-", L: 1, traits: "léger" }], cost_credits: 5, cost_tp: 0, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_boltgun", name: "Boltgun", profiles: [{ name: "Unique", SR: '12"', LR: '24"', S: 4, AP: "-1", L: 2, traits: "tir rapide (1), munitions (3+)" }], cost_credits: 55, cost_tp: 2, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_bolt_pistol", name: "Bolt pistol", profiles: [{ name: "Unique", SR: '6"', LR: '12"', S: 4, AP: "-1", L: 2, traits: "tir rapide (1), munitions (3+), léger" }], cost_credits: 45, cost_tp: 1, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_heavy_bolter", name: "Bolter lourd*", profiles: [{ name: "Unique", SR: '18"', LR: '36"', S: 5, AP: "-2", L: 2, traits: "munitions (3+), lourd, tir rapide (2)" }], cost_credits: 100, cost_tp: 3, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_warpstorm_bolter", name: "Warpstorm bolter", profiles: [{ name: "Unique", SR: '12"', LR: '24"', S: 4, AP: "-1", L: 2, traits: "munitions (6+), tir rapide (1), rare (4+), maudit" }], cost_credits: 65, cost_tp: 4, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_lance_flamme", name: "Lance flamme", profiles: [{ name: "Unique", SR: "T", LR: "-", S: 4, AP: "-1", L: 1, traits: "munitions (6+), flammes (5+), gabarit" }], cost_credits: 70, cost_tp: 1, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_pist_lance_flamme", name: "Pistolet lance flamme", profiles: [{ name: "Unique", SR: "T", LR: "-", S: 3, AP: "-", L: 1, traits: "munitions (6+), flammes (5+), gabarit, léger" }], cost_credits: 45, cost_tp: 1, is_gang_weapon: true, is_hive_scum: true },
        { id: "wpn_lance_flamme_lourd", name: "Lance flamme lourd*", profiles: [{ name: "Unique", SR: "T", LR: "-", S: 5, AP: "-2", L: 1, traits: "munitions (6+), flammes (5+), gabarit, lourd" }], cost_credits: 95, cost_tp: 2, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_grav_gun", name: "Grav gun", profiles: [{ name: "Unique", SR: '9"', LR: '18"', S: "-", AP: "-", L: "-", traits: "munitions (5+), explosion (3\"), graviton pulse" }], cost_credits: 50, cost_tp: 4, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_grav_pistol", name: "Grav pistol", profiles: [{ name: "Unique", SR: '4"', LR: '9"', S: "-", AP: "-", L: "-", traits: "munitions (5+), explosion (3\"), graviton pulse" }], cost_credits: 40, cost_tp: 3, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_grenade_launcher", name: "Lance grenade", profiles: [
            { name: "Frag grenades", SR: '6"', LR: '24"', S: 3, AP: "-", L: 1, traits: "munitions (4+), explosion (3\"), knockback (5+)" },
            { name: "Krak grenades", SR: '6"', LR: '24"', S: 6, AP: "-2", L: 1, traits: "munitions (4+)" }
        ], optional_profiles: [
            { name: "Photon flash (disponible uniquement au trading post)", SR: '6"', LR: '24"', S: "-", AP: "-", L: "-", traits: "munitions (5+), explosion (3\"), flash", extra_cost: 15 },
            { name: "Fumigène (disponible uniquement au trading post)", SR: '6"', LR: '24"', S: "-", AP: "-", L: "-", traits: "munitions (4+), explosion (3\"), fumée", extra_cost: 15 }
        ], cost_credits: 80, cost_tp: 1, is_gang_weapon: true, is_hive_scum: true },
        { id: "wpn_lasgun", name: "Lasgun", profiles: [{ name: "Unique", SR: '16"', LR: '24"', S: 3, AP: "-", L: 1, traits: "" }], cost_credits: 15, cost_tp: 0, is_gang_weapon: true, is_hive_scum: true },
        { id: "wpn_laspistol", name: "Laspistol", profiles: [{ name: "Unique", SR: '8"', LR: '12"', S: 3, AP: "-", L: 1, traits: "léger" }], cost_credits: 5, cost_tp: 0, is_gang_weapon: true, is_hive_scum: true },
        { id: "wpn_long_las", name: "Long las", profiles: [{ name: "Unique", SR: '18"', LR: '36"', S: 4, AP: "-", L: 1, traits: "" }], cost_credits: 40, cost_tp: 1, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_fuseur", name: "Fuseur", profiles: [{ name: "Unique", SR: '6"', LR: '12"', S: 8, AP: "-4", L: 3, traits: "munitions (6+), dommages (3)" }], cost_credits: 140, cost_tp: 4, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_multifuseur", name: "Multi fuseur*", profiles: [{ name: "Unique", SR: '12"', LR: '24"', S: 8, AP: "-4", L: 3, traits: "munitions (6+), dommages (3), lourd" }], cost_credits: 150, cost_tp: 4, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_canon_plasma", name: "Canon plasma*", profiles: [{ name: "Unique", SR: '18"', LR: '36"', S: 6, AP: "-2", L: 2, traits: "munitions (6+), explosion (3\"), dommages (2), lourd, instable" }], cost_credits: 115, cost_tp: 4, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_fusil_plasma", name: "Fusil plasma", profiles: [{ name: "Unique", SR: '12"', LR: '24"', S: 5, AP: "-2", L: 2, traits: "munitions (6+), dommages (2), tir rapide (1), instable" }], cost_credits: 85, cost_tp: 3, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_pistolet_plasma", name: "Pistolet plasma", profiles: [{ name: "Unique", SR: '6"', LR: '12"', S: 5, AP: "-2", L: 2, traits: "munitions (6+), dommages (2), léger, instable" }], cost_credits: 70, cost_tp: 3, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_couteau_lancer", name: "Couteau de lancer", profiles: [{ name: "Unique", SR: '6"', LR: '12"', S: "-", AP: "-", L: 1, traits: "munitions (3+), toxine (4+)" }], cost_credits: 10, cost_tp: 0, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_canon_rad", name: "Rad Cannon*", profiles: [{ name: "Unique", SR: '16"', LR: '32"', S: 3, AP: "-1", L: 1, traits: "munitions (4+), explosion (3\"), lourd, rad-phage" }], cost_credits: 55, cost_tp: 4, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_fusil_rad", name: "Rad gun", profiles: [{ name: "Unique", SR: "T", LR: "-", S: 3, AP: "-1", L: 1, traits: "munitions (5+), gabarit, rad-phage" }], cost_credits: 60, cost_tp: 3, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_lance_harpon", name: "Lance harpon*", profiles: [{ name: "Unique", SR: '6"', LR: '18"', S: 5, AP: "-3", L: 1, traits: "munitions (5+), attirer" }], cost_credits: 80, cost_tp: 3, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_cutter_laser", name: "Las cutter", profiles: [{ name: "Unique", SR: '2"', LR: '4"', S: 9, AP: "-2", L: 2, traits: "dommages (2), léger, tir unique" }], cost_credits: 80, cost_tp: 3, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_laser_minage", name: "Laser de minage*", profiles: [{ name: "Unique", SR: '10"', LR: '14"', S: 9, AP: "-3", L: 3, traits: "munitions (5+), dommages (2), lourd" }], cost_credits: 125, cost_tp: 3, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_pompe_combat", name: "Fusil à pompe de combat", profiles: [
            { name: "Salve", SR: '4"', LR: '12"', S: 4, AP: "-", L: 1, traits: "knockback (6+)" },
            { name: "Déchiquetant", SR: "T", LR: "-", S: 3, AP: "-", L: 1, traits: "munitions (6+), tir rapide (1), déchiqueter (6+), gabarit" }
        ], cost_credits: 35, cost_tp: 1, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_pompe_canon_scie", name: "Fusil à pompe à canon scié", profiles: [
            { name: "Dispersion", SR: '4"', LR: '8"', S: 2, AP: "-", L: 1, traits: "léger, tir rapide (1)" },
            { name: "Concentré", SR: '4"', LR: '8"', S: 4, AP: "-", L: 1, traits: "léger, knockback (6+)" }
        ], cost_credits: 30, cost_tp: 1, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_fusil_pompe", name: "Fusil à pompe", profiles: [
            { name: "Dispersion", SR: '4"', LR: '8"', S: 3, AP: "-", L: 1, traits: "tir rapide (2)" },
            { name: "Concentré", SR: '8"', LR: '16"', S: 4, AP: "-", L: 1, traits: "knockback (5+)" }
        ], cost_credits: 35, cost_tp: 0, is_gang_weapon: true, is_hive_scum: true },
        { id: "wpn_pist_aiguille", name: "Pistolet à aiguille", profiles: [{ name: "Unique", SR: '4"', LR: '9"', S: "-", AP: "-", L: 1, traits: "léger, toxine (3+)" }], cost_credits: 25, cost_tp: 1, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_fusil_aiguille", name: "Fusil à aiguille", profiles: [{ name: "Unique", SR: '9"', LR: '18"', S: "-", AP: "-1", L: 1, traits: "toxine (3+)" }], cost_credits: 45, cost_tp: 2, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_fusil_web", name: "Fusil web", profiles: [{ name: "Unique", SR: "T", LR: "-", S: 5, AP: "-", L: "-", traits: "munitions (6+), gabarit, toile" }], cost_credits: 65, cost_tp: 4, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_pistolet_web", name: "Pistolet web", profiles: [{ name: "Unique", SR: "T", LR: "-", S: 4, AP: "-", L: "-", traits: "munitions (6+), gabarit, toile, léger" }], cost_credits: 50, cost_tp: 3, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_grenade_explo", name: "Grenade explosive", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '6"', S: 5, AP: "-1", L: 2, traits: "Munitions (5+), explosion (5\"), limité, Knockback (5+)" }], cost_credits: 60, cost_tp: 2, is_gang_weapon: true, is_gang: true, is_hive_scum: false, counts_as_equip: true },
        { id: "wpn_grenade_gaz", name: "Grenade à gaz asphyxiant", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '9"', S: "-", AP: "-", L: 1, traits: "Munitions (5+), explosion (3\"), limité, Gaz, toxine (3)" }], cost_credits: 45, cost_tp: 1, is_gang_weapon: false, is_gang: false, is_hive_scum: false, counts_as_equip: true },
        { id: "wpn_charge_demo", name: "Charge de démolition", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '6"', S: 6, AP: "-3", L: 3, traits: "Munitions (6+), explosion (5\"), limité, Dommages (2)" }], cost_credits: 85, cost_tp: 3, is_gang_weapon: true, is_gang: true, is_hive_scum: false, counts_as_equip: true },
        { id: "wpn_grenade_frag", name: "Grenade frag", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '9"', S: 3, AP: "-", L: 1, traits: "Munitions (4+), explosion (3\"), limité, Knockback (6+)" }], cost_credits: 30, cost_tp: 0, is_gang_weapon: true, is_gang: true, is_hive_scum: true, counts_as_equip: true },
        { id: "wpn_grenade_inc", name: "Grenade incendiaire", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '9"', S: 3, AP: "-", L: 1, traits: "Munitions (5+), explosion (5\"), limité, flammes (5+)" }], cost_credits: 40, cost_tp: 2, is_gang_weapon: true, is_gang: true, is_hive_scum: false, counts_as_equip: true },
        { id: "wpn_grenade_krak", name: "Grenade krak", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '9"', S: 6, AP: "-2", L: 1, traits: "Munitions (4+), limité" }], cost_credits: 45, cost_tp: 1, is_gang_weapon: false, is_gang: false, is_hive_scum: true, counts_as_equip: true },
        { id: "wpn_grenade_phos", name: "Grenade au phosphore", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '9"', S: 4, AP: "-2", L: 2, traits: "Munitions (5+), explosion (3\"), limité, flammes (5+), instable" }], cost_credits: 65, cost_tp: 3, is_gang_weapon: false, is_gang: false, is_hive_scum: false, counts_as_equip: true },
        { id: "wpn_grenade_photon", name: "Grenade à photon", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '9"', S: "-", AP: "-", L: "-", traits: "Munitions (4+), explosion (5\"), flash, limité" }], cost_credits: 15, cost_tp: 1, is_gang_weapon: false, is_gang: false, is_hive_scum: false, counts_as_equip: true },
        { id: "wpn_grenade_plasma", name: "Grenade à plasma", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '9"', S: 5, AP: "-1", L: 2, traits: "Munitions (4+), explosion (3\"), limité, dommages (2), instable" }], cost_credits: 70, cost_tp: 3, is_gang_weapon: false, is_gang: false, is_hive_scum: false, counts_as_equip: true },
        { id: "wpn_grenade_rad", name: "Grenade rad", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '9"', S: 2, AP: "-1", L: 1, traits: "Munitions (4+), explosion (3\"), limité, Rad-phage" }], cost_credits: 25, cost_tp: 1, is_gang_weapon: false, is_gang: false, is_hive_scum: false, counts_as_equip: true },
        { id: "wpn_grenade_fumi", name: "Grenades fumigènes", type: "Grenade", profiles: [{ name: "Unique", SR: "-", LR: '9"', S: "-", AP: "-", L: "-", traits: "Munitions (4+), explosion (3\"), limité, fumée" }], cost_credits: 15, cost_tp: 0, is_gang_weapon: false, is_gang: false, is_hive_scum: true, counts_as_equip: true },
        
        // Corps à Corps / Melee
        { id: "wpn_hache_tron", name: "Hache tronçonneuse", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-1", L: 1, traits: "melee, déchiqueter (5+)" }], cost_credits: 20, cost_tp: 1, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_epee_tron", name: "Epée tronçonneuse", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "melee, déchiqueter (5+), parade" }], cost_credits: 20, cost_tp: 1, is_gang_weapon: true, is_hive_scum: true },
        { id: "wpn_hache_nrj", name: "Hache énergétique", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-3", L: 1, traits: "breche (5+), melee" }], cost_credits: 40, cost_tp: 1, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_gantelet_nrj", name: "Gantelet énergétique", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+3", AP: "-3", L: 2, traits: "breche (6+), commotion (5+), dommages (2), melee, encombrant" }], cost_credits: 105, cost_tp: 3, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_marteau_nrj", name: "Marteau énergétique", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-2", L: 2, traits: "breche (6+), commotion (6+), melee" }], cost_credits: 40, cost_tp: 2, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_couteau_nrj", name: "Couteau énergétique", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-2", L: 1, traits: "backstab, breche (6+), melee" }], cost_credits: 30, cost_tp: 1, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_masse_nrj", name: "Masse énergétique", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+1", AP: "-2", L: 1, traits: "breche (6+), commotion (6+), melee" }], cost_credits: 45, cost_tp: 1, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_epee_nrj", name: "Epée énergétique", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-2", L: 1, traits: "breche (6+), melee, parade" }], cost_credits: 40, cost_tp: 2, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_hache", name: "Hache", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-1", L: 1, traits: "melee" }], cost_credits: 15, cost_tp: 0, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_couteau_combat", name: "Couteau de combat", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "backstab, melee" }], cost_credits: 5, cost_tp: 0, is_gang_weapon: true, is_hive_scum: true },
        { id: "wpn_fleau", name: "Fléau", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "knockback (6+), melee" }], cost_credits: 10, cost_tp: 0, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_masse", name: "Masse", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+1", AP: "-", L: 1, traits: "commotion (6+), melee" }], cost_credits: 20, cost_tp: 0, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_hache_2m", name: "Hache à deux mains*", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+1", AP: "-1", L: 2, traits: "lourd, melee, encombrant" }], cost_credits: 40, cost_tp: 1, is_gang_weapon: false, is_hive_scum: true },
        { id: "wpn_marteau_2m", name: "Marteau à deux mains*", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+1", AP: "-", L: 3, traits: "commotion (6+), lourd, melee, encombrant" }], cost_credits: 40, cost_tp: 1, is_gang_weapon: true, is_hive_scum: true },
        { id: "wpn_servo_griffe", name: "Servo-claw", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+2", AP: "-", L: 2, traits: "melee, encombrant" }], cost_credits: 40, cost_tp: 1, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_baton_shock", name: "Shock baton", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "melee, parade, shock (6+)" }], cost_credits: 20, cost_tp: 1, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_arme_hast_shock", name: "Shock stave", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+1", AP: "-", L: 1, traits: "melee, shock (5+)" }], cost_credits: 25, cost_tp: 1, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_fouet_shock", name: "Fouet shock", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "knockback (6+), melee, shock (6+)" }], cost_credits: 10, cost_tp: 1, is_gang_weapon: true, is_hive_scum: false },
        { id: "wpn_couteau_stylet", name: "Couteau stylet", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "-", AP: "-", L: 1, traits: "melee, toxine (3+)" }], cost_credits: 25, cost_tp: 2, is_gang_weapon: false, is_hive_scum: false },
        { id: "wpn_epee_stylet", name: "Epée stylet", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "-", AP: "-1", L: 1, traits: "melee, toxine (3+), parade" }], cost_credits: 45, cost_tp: 2, is_gang_weapon: false, is_hive_scum: false },

        // Armes intégrées données automatiquement par une compétence (générique,
        // toutes factions) : voir INNATE_WEAPON_SKILLS après la fermeture de db
        // ci-dessous, et la synchronisation dans ensureInnateFighterSkills()
        // (gang-views.js). isInnateWeapon: true => coût 0, jamais un emplacement
        // d'arme, non retirable manuellement (badge "Innée" sur la fiche).
        { id: "wpn_headbutt", name: "Headbutt", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+1", AP: "-", L: 1, traits: "melee, attaques additionnelles (1)" }], cost_credits: 0, isInnateWeapon: true },

        // Armes spécifiques Genestealer Cults
        // Non disponible à l'achat normal (is_gang_weapon: false, pas de specific_to) :
        // seule la compétence Extra arm (case à cocher ou Alpha) peut donner cette
        // arme, via toggleExtraArmOption()/buildInitialFighterState() qui l'ajoutent
        // directement sur la fiche sans passer par la boutique — voir sk_extra_arm.
        { id: "wpn_clawed_arm", name: "Clawed arm", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-", L: 1, traits: "attaques additionnelles (1), melee, déchirant (6+)" }], cost_credits: 0, cost_tp: 0, is_gang_weapon: false },
        { id: "wpn_seismic_cannon", name: "Seismic cannon", profiles: [{ name: "Unique", SR: '12"', LR: '24"', S: 4, AP: "-1", L: 2, traits: "breche (5+), commotion (6+), lourd, knockback (6+), tir rapide (1)" }], cost_credits: 65, cost_tp: 0, is_gang_weapon: true },
        { id: "wpn_pique_nrj", name: "Pique énergétique", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S", AP: "-2", L: 2, traits: "breche (6+), melee" }], cost_credits: 40, cost_tp: 0, is_gang_weapon: true },
        { id: "wpn_heavy_rock_cutter", name: "Heavy rock cutter*", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+4", AP: "-4", L: 2, traits: "lourd, melee, encombrant" }], cost_credits: 120, cost_tp: 0, is_gang_weapon: true },
        { id: "wpn_heavy_rock_drill", name: "Heavy rock drill*", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+2", AP: "-1", L: 2, traits: "breche (6+), lourd, melee, encombrant" }], cost_credits: 60, cost_tp: 0, is_gang_weapon: true },
        { id: "wpn_heavy_rock_saw", name: "Heavy rock saw*", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+3", AP: "-3", L: 2, traits: "dommages (2), lourd, melee, encombrant" }], cost_credits: 100, cost_tp: 0, is_gang_weapon: true },
        // Non achetable (coût "-" dans le tableau fourni) : équipement de base exclusif de
        // l'Abominant, cf. default_weapons: ["wpn_power_sledgehammer"] dans db.characters.
        // default_for masque l'arme de la liste d'achat générale (voir weapons-equipment.js).
        { id: "wpn_power_sledgehammer", name: "Power sledgehammer", profiles: [{ name: "Unique", SR: "E", LR: "-", S: "S+1", AP: "-1", L: 2, traits: "breche (5+), dommages (2), lourd, melee, encombrant" }], is_gang_weapon: true, default_for: "char_abominant" }
    ],

    // ===== EQUIPEMENTS =====
    equipment: [
        // --- Armures ---
        { id: "eq_armure_cara_leg", name: "Armure carapace légère", type: "Armure", cost_credits: 100, cost_tp: 1, effect: "Améliore la sauvegarde de 1. Réduit l'initative de 1." },
        { id: "eq_armure_cara_lourde", name: "Armure carapace lourde", type: "Armure", cost_credits: 140, cost_tp: 3, effect: "Améliore la sauvegarde de 2. Réduit l'initiative de 2. Applique un malus aux jets d'agilité de -1." },
        { id: "eq_combi_protec", name: "Hazard suit", type: "Armure", cost_credits: 10, cost_tp: 0, effect: "Le porteur est immunisé aux traits flammes (X+) et rad-phage.", is_gang: true, is_hive_scum: true },
        { id: "eq_mesh_armour", name: "Mesh Armour", type: "Armure", cost_credits: 40, cost_tp: 0, effect: "Améliore la sauvegarde de 1 au corps à corps.", is_gang: true },
        { id: "eq_nuage_reflec", name: "Reflec shroud", type: "Armure", cost_credits: 25, cost_tp: 1, effect: "Le porteur considère que l'AP des armes las, plasma et fuseur est \"-\"." },
        { id: "eq_champ_reflec", name: "Refractor shield", type: "Armure", cost_credits: 50, cost_tp: 2, effect: "Donne une sauvegarde invulnérable de 5+. Au premier jet de sauvegarde de 1, le champ ne fonctionne plus. Peut être combiné avec les autres armures.", is_gang: true },

        // --- Équipement ---
        { id: "eq_bio_booster", name: "Bio-booster", type: "Personnel", cost_credits: 25, cost_tp: 0, effect: "La première fois que ce guerrier est blessé, réduisez la léthalité de 1. Si elle tombe à zéro, jetez deux dés et choisissez lequel garder." },
        { id: "eq_corde_descente", name: "Drop rig", type: "Personnel", cost_credits: 10, cost_tp: 0, effect: "Un guerrier actif ou suppressed peut faire l'action descendre s'il est à 1\" d'un rebord : il peut bouger jusqu'à 12\" verticalement vers le bas et jusqu'à 3\" horizontalement.", is_hive_scum: true },
        { id: "eq_lance_grappin", name: "Grapnel launcher", type: "Personnel", cost_credits: 25, cost_tp: 0, effect: "Le guerrier peut faire l'action grappin : il peut se déplacer de 12\" en ligne droite dans n'importe quelle direction, à condition de finir plus haut qu'au départ." },
        { id: "eq_grav_chute", name: "Grav Chute", type: "Personnel", cost_credits: 30, cost_tp: 0, effect: "Quand un guerrier avec cet équipement tombe ou saute vers le bas, il ne subit jamais de dommages et n'est jamais suppressed." },
        { id: "eq_kit_medical", name: "Medicae Kit", type: "Personnel", cost_credits: 20, cost_tp: 0, effect: "Un guerrier avec cet équipement qui soigne un allié pendant un test de recovery jette 2 dés et garde celui de son choix.", is_gang: true },
        { id: "eq_lunettes_infra", name: "Photo-googles", type: "Personnel", cost_credits: 35, cost_tp: 0, effect: "La visibilité (X+) de ce guerrier augmente de 9\" et il peut voir à travers la fumée. S'il est touché par une munition flash, il a un malus de -2 à son test d'initiative.", is_gang: true, is_hive_scum: true },
        { id: "eq_lampe_frontale", name: "Photo-Lumens", type: "Personnel", cost_credits: 15, cost_tp: 0, effect: "La visibilité (X+) de ce guerrier augmente de 9\" mais il peut toujours être pris pour cible, quelle que soit la valeur de la règle luminosité (X+)." },
        { id: "eq_respirateur", name: "Respirator", type: "Personnel", cost_credits: 15, cost_tp: 0, effect: "Un guerrier avec cet équipement bénéficie d'une sauvegarde à 5+ invulnérable contre les armes avec le trait gaz.", is_gang: true },
        { id: "eq_servo_partiel", name: "Servo-harness partial", type: "Personnel", cost_credits: 100, cost_tp: 2, effect: "Le guerrier obtient +2 en force et +1 en endurance. Cela peut l'amener à dépasser le maximum autorisé. Il a un malus en mouvement et initiative de -1. Ne peut être combiné avec une servo-griffe ou un servo-harnais total." },
        { id: "eq_servo_total", name: "Servo-harness full", type: "Personnel", cost_credits: 130, cost_tp: 3, effect: "Le guerrier obtient tous les bénéfices du servo-harnais partiel, sans les malus. Ne peut être combiné avec une servo-griffe ou un servo-harnais partiel." },
        { id: "eq_stimm_slug", name: "Stimm-slug stash", type: "Personnel", cost_credits: 25, cost_tp: 0, effect: "Une fois par bataille, le guerrier peut l'utiliser au début de son activation. Jusqu'à sa prochaine activation, il gagne +2 en M, S et T. À sa prochaine activation, on lance un D6 : sur 2+, aucun effet ; sur un 1, il prend une blessure." },
        { id: "eq_dirt_bike", name: "Dirt bike", type: "Personnel", cost_credits: 35, cost_tp: 0, effect: "Le guerrier obtient le type Monté. Son M passe à 8\" et quand il effectue l'action dash, il se déplace de 5\" plutôt que de son initiative.", is_gang: true },
        // Genestealer Cults : max 1 par gang, réservé à un leader/champion et son
        // bonus de relance ne sont pas vérifiés par le moteur (voir précédent des
        // restrictions purement descriptives comme pour les mercenaires) ; le texte
        // ci-dessous porte la règle, à appliquer manuellement comme les autres
        // restrictions non codées de ce type.
        { id: "eq_cult_icon", name: "Cult icon", type: "Personnel", cost_credits: 20, cost_tp: 0, effect: "Maximum 1 par gang. Ne peut être porté que par un champion ou un leader. Permet de relancer le test de Ld pour les activations de groupe.", is_gang: true },

        { id: "eq_medicrane", name: "Medicrane", type: "Personnel", cost_credits: 0, effect: "Figurine à 1\", T3 Sv6+. Soigne en action gratuite.", specific_to: "merc_rogue_doc" },

        // --- Accessoires d'arme ---
        { id: "eq_cristal_concen", name: "Focusing cristal", type: "Accessoire", cost_credits: 25, cost_tp: 1, effect: "Augmente l'AP de 1. L'arme devient instable." },
        { id: "eq_hotshot", name: "Hotshot las pack", type: "Accessoire", cost_credits: 25, cost_tp: 1, effect: "Augmente la force de l'arme de 1." },
        { id: "eq_viseur_infra", name: "Infra-sight", type: "Accessoire", cost_credits: 10, cost_tp: 0, effect: "Permet de tirer sur une cible à travers de la fumée. Augmente la visibilité (X\") de 9\"." },
        { id: "eq_viseur_laser", name: "Las-projector", type: "Accessoire", cost_credits: 20, cost_tp: 1, effect: "Réduit le bonus de couvert de 1 à portée courte." },
        { id: "eq_viseur", name: "Mono-sight", type: "Accessoire", cost_credits: 20, cost_tp: 0, effect: "Quand le guerrier réalise une action de aimed shot, augmente le bonus de +2 au lieu de +1." },
        { id: "eq_suspenseur", name: "Suspensors", type: "Accessoire", cost_credits: 40, cost_tp: 0, effect: "Seulement pour les armes avec un *. L'arme ne compte que pour un emplacement au lieu de 2." },
        { id: "eq_viseur_longue", name: "Telescopic sight", type: "Accessoire", cost_credits: 20, cost_tp: 1, effect: "Réduit le bonus de couvert de 1 sur la portée longue.", is_hive_scum: true }
    ],
    accessory_rules: {
        max_per_weapon: 1,
        unequip_to_stash: true,
        desc: "Chaque arme ne peut recevoir qu'un seul accessoire. Si une arme est déséquipée et envoyée dans le stash, son accessoire aussi."
    },

    // ===== TRAITS DES ARMES =====
    weapon_traits: [
        { id: "trait_arc", name: "Arc (X)", desc: "Une arme avec ce trait a un champ de tir limité, indiqué par X." },
        { id: "trait_assaut", name: "Assaut", desc: "Après que l'utilisateur a fait une action de dash, il peut tirer en action gratuite." },
        { id: "trait_attaques_add", name: "Attaques additionnelles (X)", desc: "L'arme peut faire X attaques supplémentaires en plus des attaques normales. Uniquement pendant l'activation et si l'arme n'est pas choisie comme arme primaire ou secondaire." },
        { id: "trait_attirer", name: "Attirer", desc: "Si une figurine est touchée par une arme ayant ce trait mais pas mise hors de combat, l'attaquant peut essayer de l'attirer. Il lance un D6, et si cela dépasse la force de la cible, elle est attirée de D3\". Si elle rencontre une autre figurine, elle est attirée aussi. Si la cible finit dans les 1\" d'un de ses ennemis, elle est déplacée pour être engagée avec lui." },
        { id: "trait_auxilliaire", name: "Auxilliaire", desc: "Une arme avec ce trait ne peut qu'être attachée à une autre arme et jamais prise seule. Elle n'utilise pas d'emplacement d'arme." },
        { id: "trait_backstab", name: "Backstab", desc: "Cette arme gagne +1 en force si l'adversaire est engagé avec plus d'un ennemi." },
        { id: "trait_belier", name: "Bélier", desc: "Une arme avec ce trait ne peut être utilisée que lors d'une charge." },
        { id: "trait_bouclier", name: "Bouclier", desc: "Si la figurine est équipée avec au moins une arme ayant ce trait, elle augmente sa sauvegarde de 1 contre les tirs." },
        { id: "trait_breche", name: "Breche (X+)", desc: "Si le jet de blessure donne X ou +, il ne peut y avoir de jet d'armure." },
        { id: "trait_combi", name: "Combi", desc: "Quand on tire avec cette arme, le personnage peut choisir quel profil il utilise. Il peut aussi tirer avec les deux, mais avec une pénalité de -1 pour toucher." },
        { id: "trait_commotion", name: "Commotion (X+)", desc: "Si l'attaquant blesse son adversaire et que le jet de blessure est de X ou +, l'initiative de la cible baisse de 1 jusqu'à la fin de sa prochaine activation." },
        { id: "trait_dechiqueter", name: "Déchiqueter (X+)", desc: "Lors du jet de blessure avec cette arme, si le résultat est de X ou +, la léthalité de l'arme augmente de 1." },
        { id: "trait_dechirant", name: "Déchirant (X+)", desc: "Si le jet naturel d'une blessure avec cette arme est X ou plus, augmenter l'AP de 1." },
        { id: "trait_dommages", name: "Dommages (X)", desc: "Si un guerrier est blessé par cette arme, il perd X PV au lieu d'un. S'il faut faire un jet de dé de blessure, on ne lance que la léthalité de cette arme, quel que soit le nombre de PV perdu." },
        { id: "trait_encombrant", name: "Encombrant", desc: "Au corps à corps, les attaques avec cette arme se font avec une initiative de 1." },
        { id: "trait_explosion", name: "Explosion (3\"/5\")", desc: "Placer le gabarit correspondant sur la cible du tir. Si la touche rate, le gabarit se déplace de D6\" dans la direction indiquée par le dé de dispersion. Si le dé de dispersion indique un hit et le dé une valeur de 1, le tir est annulé." },
        { id: "trait_fiable", name: "Fiable", desc: "Une arme avec ce trait ignore le premier résultat à court de munitions obtenu à chaque round." },
        { id: "trait_flammes", name: "Flammes (X+)", desc: "Si le jet pour blesser donne X ou plus, on effectue une touche supplémentaire, même s'il n'y a pas de blessure. Faire un nouveau jet de blessure pour cette nouvelle touche." },
        { id: "trait_flash", name: "Flash", desc: "Si une cible est touchée par une arme avec flash, on ne jette pas de jet de blessure, mais d'initiative. S'il est raté, la figurine subit la condition aveugle (perd son token prêt)." },
        { id: "trait_fumee", name: "Fumée", desc: "Cette arme ne cible pas une figurine, mais un point sur le champ de bataille. Une colonne de fumée s'élève à cet endroit, bloquant les lignes de vue." },
        { id: "trait_gabarit", name: "Gabarit", desc: "Quand un tir est réalisé avec cette arme, placer le gabarit en larme. Toute figurine sous le gabarit est automatiquement touchée." },
        { id: "trait_gaz", name: "Gaz", desc: "Un guerrier ne peut faire de jet d'armure contre les armes ayant ce trait. Les guerriers équipés d'un respirateur ont une sauvegarde invulnérable de 5+ contre ces armes." },
        { id: "trait_graviton_pulse", name: "Graviton pulse", desc: "Au lieu de lancer un jet de blessure, la cible doit faire un test de force. S'il est raté, la figurine subit une blessure sans sauvegarde." },
        { id: "trait_independant", name: "Indépendant", desc: "Le porteur de cette arme ne peut pas tirer avec. À la place, elle tire en même temps que son porteur, en pouvant avoir une autre cible (touche toujours sur 4+)." },
        { id: "trait_instable", name: "Instable", desc: "Si le jet pour toucher avec cette arme donne 1, le guerrier maniant cette arme subit une touche automatique avec le profil de l'arme." },
        { id: "trait_jumelee", name: "Jumelée", desc: "Lors d'un tir avec cette arme, le dé de tir rapide peut être relancé." },
        { id: "trait_knockback", name: "Knockback (X+)", desc: "Si cette arme touche avec un résultat de X ou plus, la cible est repoussée de 1\", ce qui peut la faire tomber ou la désengager." },
        { id: "trait_lance", name: "Lance", desc: "Si le guerrier portant cette arme est monté, il ajoute +1 en force à ses attaques de charge." },
        { id: "trait_lance_bombe", name: "Lance-bombe", desc: "La première touche de la partie avec cette arme est résolue avec son profil primed, toutes les autres avec son profil utilisé." },
        { id: "trait_leger", name: "Léger", desc: "Cette arme peut être utilisée en tant qu'arme primaire ou secondaire au corps à corps, mais ne pourra faire qu'une seule attaque." },
        { id: "trait_limite", name: "Limité", desc: "Si cette arme tombe à court de munitions, elle ne peut plus être utilisée pour cette partie." },
        { id: "trait_lourd", name: "Lourd", desc: "Une arme avec ce trait ne peut tirer qu'en utilisant l'action braced shot. Une arme de corps à corps avec ce trait ne peut pas être utilisée en arme secondaire." },
        { id: "trait_maudit", name: "Maudit", desc: "Un guerrier touché par une arme maudite doit réussir un test de willpower ou subir la condition folie (insanity)." },
        { id: "trait_melee", name: "Melee", desc: "Cette arme ne peut être utilisée que quand on est engagé au corps à corps." },
        { id: "trait_munitions", name: "Munitions (X+)", desc: "Après le tir avec cette arme, lancer un D6. Si le résultat est inférieur à X, l'arme est à court de munitions." },
        { id: "trait_paire", name: "Paire (X)", desc: "Quand on attaque avec cette arme, on ajoute X attaques supplémentaires." },
        { id: "trait_parade", name: "Parade", desc: "Quand cette arme est utilisée au corps à corps, la sauvegarde augmente de 1." },
        { id: "trait_power_pack", name: "Power pack", desc: "Ne compte pas dans la limite d'armes portées (max 2 avec ce trait)." },
        { id: "trait_rad_phage", name: "Rad-phage", desc: "Quand un guerrier subit une blessure non sauvegardée d'une arme avec ce trait, il devient empoisonné aux radiations (-1 Endurance)." },
        { id: "trait_rare", name: "Rare (X+)", desc: "Lors de l'action de recharge, il faut lancer un D6 (réussi sur X+)." },
        { id: "trait_shock", name: "Shock (X+)", desc: "Lors du jet pour toucher, si le résultat est X+, on considère que le jet de blessure donne 6." },
        { id: "trait_temeraire", name: "Téméraire", desc: "Peut toucher toute figurine en ligne de vue dans les 6\", même amie, à déterminer aléatoirement." },
        { id: "trait_tir_rapide", name: "Tir rapide (X)", desc: "Ajoute le dé de tir rapide (nombre de touches potentielles et risque de court de munitions)." },
        { id: "trait_tir_unique", name: "Tir unique", desc: "Ne peut tirer qu'une fois par partie sans pouvoir être rechargée." },
        { id: "trait_toile", name: "Toile", desc: "Pas de sauvegarde d'armure (sauf invulnérable). La cible blessée gagne la condition entoilé." },
        { id: "trait_toxine", name: "Toxine (X+)", desc: "Lors du jet de blessure, on ignore l'endurance de la cible, blessée sur X+." }
    ],

    // ===== CARTES TACTIQUES (18) =====
    tactics: [
        { id: "tac_point_blank_shot", name: "Point-blank shot", timing: "Quand un guerrier s'active, avant ses actions", effect: "Une des armes du guerrier qui n'a pas les traits explosions ou template gagne le trait léger." },
        { id: "tac_hidden_stash", name: "Hidden stash", timing: "Quand un guerrier s'active, avant ses actions", effect: "Pendant son activation, ce guerrier peut faire gratuitement une action de recharge." },
        { id: "tac_suppressing_fire", name: "Suppressing fire", timing: "Quand un guerrier tire", effect: "La cible est suppressed même si elle n'est pas touchée. Les compétences ne peuvent empêcher le suppressed." },
        { id: "tac_burst_of_courage", name: "Burst of courage", timing: "Avant de faire un bottle check", effect: "Le test est automatiquement réussi." },
        { id: "tac_adrenaline_surge", name: "Adrenaline surge", timing: "Quand un guerrier s'active, avant ses actions", effect: "Le guerrier peut faire une action supplémentaire." },
        { id: "tac_desperate_effort", name: "Desperate effort", timing: "Juste avant de choisir quel guerrier va s'activer", effect: "Activer le guerrier comme s'il avait un marqueur prêt. À la fin de son activation, il est suppressed et subit une blessure qu'on ne peut sauvegarder ou empêcher." },
        { id: "tac_grenade_bouquet", name: "Grenade bouquet", timing: "Quand un guerrier tire avec une grenade ayant le trait explosion", effect: "Le guerrier résout 3 attaques ciblant le même ennemi. Elles dévient toutes et l'arme devient à court de munitions." },
        { id: "tac_quick_finish", name: "Quick finish", timing: "Quand un guerrier s'active, avant ses actions", effect: "Le guerrier peut faire un coup de grâce en action gratuite." },
        { id: "tac_remorseless_killer", name: "Remorseless killer", timing: "Quand un guerrier fait un coup de grâce, avant de jeter les dés", effect: "L'ennemi est directement out of combat sans jet de dé." },
        { id: "tac_last_gap", name: "Last gap", timing: "Quand un guerrier reçoit l'état out of action", effect: "Le guerrier peut immédiatement faire un tir avant d'être retiré du terrain." },
        { id: "tac_thundering_charge", name: "Thundering charge", timing: "Quand un guerrier déclare une charge, avant de jeter le dé de distance", effect: "Lancer 2 dés et choisir lequel garder pour la distance de charge." },
        { id: "tac_chain_attack", name: "Chain attack", timing: "Quand un guerrier a résolu un combat et n'est plus engagé", effect: "Le guerrier peut immédiatement effectuer une charge gratuite même s'il a déjà charged ce tour. La distance de charge sera de D6+2\"." },
        { id: "tac_opening_volley", name: "Opening volley", timing: "Avant le premier round et le jet de priorité", effect: "Un guerrier peut immédiatement effectuer un tir sans perdre son état prêt." },
        { id: "tac_you", name: "You !", timing: "Quand un guerrier s'active, avant ses actions", effect: "Désigner un guerrier ennemi, le guerrier aura +1 pour blesser cet ennemi pour toute la partie. Tant que l'ennemi est sur la table, le guerrier ne peut prendre que lui pour cible de ses actions." },
        { id: "tac_rapid_healing", name: "Rapid healing", timing: "Quand un guerrier s'active, avant ses actions", effect: "Le guerrier récupère immédiatement 1 PV perdu." },
        { id: "tac_reckless_attack", name: "Reckless attack", timing: "Quand un guerrier s'active, avant ses actions", effect: "Pour son activation, le guerrier a +1 à sa WS. Jusqu'à sa prochaine activation, il sera touché sur un 2+ au corps à corps." },
        { id: "tac_rapid_fire", name: "Rapid fire", timing: "Quand un guerrier s'active, avant ses actions", effect: "Durant son activation, ce guerrier peut faire une action de tir gratuitement (pas une en plus)." },
        { id: "tac_crossfire", name: "Crossfire", timing: "Quand un guerrier s'active, avant ses actions", effect: "Si ce guerrier fait une attaque de tir sur un ennemi qui a déjà été pris pour cible par un allié à ce round, le tir touche automatiquement." }
    ],

    // ===== TERRITOIRES (19) =====
    territories: [
        { id: "ter_settlement", name: "Settlement", income: 15, optionType: "discount_ganger", optionText: "Option : Recruter un ganger (-25 cr sur coût)", desc: "Revenu : 15 cr OU recruter un ganger pour 25 cr de moins." },
        { id: "ter_bullet_den", name: "Bullet den", income: 15, optionType: "discount_ammojack", optionText: "Option : Recruter un Ammo-jack (-30 cr sur coût)", desc: "Revenu : 15 cr OU recruter un Ammo-jack pour 30 cr de moins." },
        { id: "ter_rogue_doc_shop", name: "Rogue doc shop", income: 15, optionType: "discount_doc", optionText: "Option : Recruter un Rogue doc (-30 cr sur coût)", desc: "Revenu : 15 cr OU recruter un Rogue doc pour 30 cr de moins." },
        { id: "ter_mess_shack", name: "Mess Shack", income: 15, optionType: "discount_slopper", optionText: "Option : Recruter un Slopper (-30 cr sur coût)", desc: "Revenu : 15 cr OU recruter un Slopper pour 30 cr de moins." },
        { id: "ter_drinking_hole", name: "Drinking hole", income: 15, optionType: "discount_watcher", optionText: "Option : Recruter un Hive watcher (-30 cr sur coût)", desc: "Revenu : 15 cr OU recruter un Hive watcher pour 30 cr de moins." },
        { id: "ter_fence_hangout", name: "Fence hangout", income: 15, optionType: "discount_runner", optionText: "Option : Recruter un Dome runner (-30 cr sur coût)", desc: "Revenu : 15 cr OU recruter un Dome runner pour 30 cr de moins." },
        { id: "ter_bounty_den", name: "Bounty den", income: 25, desc: "Revenu : 25 crédits." },
        { id: "ter_generatorium", name: "Generatorium", income: 15, passive: "+1 Réputation", desc: "Revenu : 15 cr. Passif : +1 Réputation tant que contrôlé." },
        { id: "ter_corpse_farm", name: "Corpse farm", income: 25, desc: "Revenu : 25 crédits." },
        { id: "ter_tunnels", name: "Tunnels", income: 20, desc: "Revenu : 20 crédits." },
        { id: "ter_tech_bazaar", name: "Tech bazaar", income: 15, passive: "+1 TP", desc: "Revenu : 15 cr. Passif : +1 TP au Trading Post." },
        { id: "ter_promethium_cache", name: "Promethium cache", income: 15, optionType: "items_suits", optionText: "Option : 3 Combinaisons de protection gratos", desc: "Revenu : 15 cr OU récupérer gratuitement 3 combinaisons de protection dans le Stash." },
        { id: "ter_collapsed_dome", name: "Collapsed dome", income: 20, desc: "Revenu : 20 crédits." },
        { id: "ter_bone_shrine", name: "Bone shrine", income: 25, desc: "Revenu : 25 crédits." },
        { id: "ter_mine_workings", name: "Mine workings", income: 20, optionType: "items_respirators", optionText: "Option : 2 Respirateurs gratos", desc: "Revenu : 20 cr OU récupérer gratuitement 2 respirateurs dans le Stash." },
        { id: "ter_gambling_den", name: "Gambling den", income: 15, passive: "+1 Réputation", desc: "Revenu : 15 cr. Passif : +1 Réputation tant que contrôlé." },
        { id: "ter_synth_still", name: "Synth still", income: 20, desc: "Revenu : 20 crédits." },
        { id: "ter_old_ruins", name: "Old ruins", income: 20, desc: "Revenu : 20 crédits." },
        { id: "ter_fighting_pit", name: "Fighting pit", income: 25, desc: "Revenu : 25 crédits." }
    ],

    // ===== CONDITIONS =====
    conditions: {
        "Fearsome": "Lorsqu'il est pris pour cible d'une attaque de corps à corps, l'attaquant fait un jet de Wil. En cas d'échec, sa WS passe à 6+. Les guerriers fearsome ne sont pas affectés, sauf si la cible est terrifying.",
        "Frénésie": "Le guerrier doit déclarer une charge s'il commence son activation à son M + 6\" d'un ennemi. Il devra charger l'ennemi le plus proche. Ils gagnent +1A.",
        "Haine": "Quand le guerrier engage, charge ou est la cible de ces actions par une figurine haïe, il peut relancer les jets pour toucher ratés.",
        "Blessé": "Le guerrier perd toutes ses compétences jusqu'à ce qu'il récupère un point de vie.",
        "Intoxiqué": "Le guerrier baisse de 1 ses WS et BS, mais augmente son cool de 1.",
        "Terrifying": "A les mêmes avantages qu'un guerrier fearsome. De plus, pour charger ou engager ce guerrier, il faut réussir un test Will. En cas d'échec, l'attaquant reste sur place.",
        "Entoilé": "Le guerrier ne peut plus se déplacer, ni être déplacé et il subit un -1 à tous ses jets pour toucher. À la fin de son activation, un test de force réussi le libère.",
        "Folie": "Quand un guerrier atteint de folie s'active, jeter un dé sur le tableau de folie pour voir comment il va agir. À la fin de son activation, un jet de Will réussi annule la condition folie."
    }
};

// Correspondance compétence -> arme intégrée (générique, toutes factions) :
// toute compétence dont le texte décrit une "arme intégrée" doit apparaître
// automatiquement, sous forme d'arme, sur la fiche du guerrier qui la
// possède — voir isInnateWeapon dans db.weapons ci-dessus et la
// synchronisation dans ensureInnateFighterSkills() (gang-views.js).
// Pour ajouter une nouvelle arme intégrée : ajouter l'arme dans db.weapons
// (isInnateWeapon: true, cost_credits: 0) puis une entrée ici.
const INNATE_WEAPON_SKILLS = {
    "sk_coup_boule": "wpn_headbutt" // Headbutt
};
