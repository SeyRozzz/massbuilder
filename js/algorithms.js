/**
 * MassBuilder PRO — Algorithmes Métaboliques
 * Module: algorithms.js
 * 
 * Sources scientifiques :
 * - Mifflin MD et al. (1990) Am J Clin Nutr, 51:241-7
 * - Roza AM, Shizgal HM (1984) Am J Clin Nutr, 40:168-82
 * - Katch-McArdle (1996) Exercise Physiology
 * - Morton RW et al. (2018) Br J Sports Med, 52:376-384
 * - Lyle McDonald (2003) The Ketogenic Diet
 * - Paddon-Jones D et al. (2009) Am J Clin Nutr, 89:1S
 */

'use strict';

const ALGO = (() => {

  /* ─────────────────────────────────────────────
     1. MODÈLES DE MÉTABOLISME DE BASE (BMR)
  ───────────────────────────────────────────── */

  /**
   * Mifflin-St Jeor (1990) — Précision ±10% adultes sains
   * @param {number} w  Poids kg
   * @param {number} h  Taille cm
   * @param {number} a  Âge années
   * @param {string} sex 'male' | 'female'
   */
  function bmrMifflin(w, h, a, sex) {
    const base = 10 * w + 6.25 * h - 5 * a;
    return sex === 'male' ? base + 5 : base - 161;
  }

  /**
   * Harris-Benedict Révisé — Roza & Shizgal (1984)
   * Plus fiable que la version originale 1919
   */
  function bmrHarrisBenedict(w, h, a, sex) {
    if (sex === 'male') {
      return 88.362 + 13.397 * w + 4.799 * h - 5.677 * a;
    }
    return 447.593 + 9.247 * w + 3.098 * h - 4.330 * a;
  }

  /**
   * Katch-McArdle — Utilise la masse maigre (LBM)
   * Plus précis si % graisse connu
   * @param {number} w  Poids kg
   * @param {number} bf Pourcentage masse grasse
   */
  function bmrKatch(w, bf) {
    const lbm = w * (1 - bf / 100);
    return 370 + 21.6 * lbm;
  }

  /**
   * Moyenne pondérée multi-modèles
   * Katch reçoit plus de poids si BF est fourni explicitement
   * @returns {number} BMR arrondi (kcal/jour)
   */
  function calcBMR(w, h, a, sex, bf, bfKnown = true) {
    const m  = bmrMifflin(w, h, a, sex);
    const hb = bmrHarrisBenedict(w, h, a, sex);
    const k  = bmrKatch(w, bf);

    const weightM  = bfKnown ? 0.35 : 0.45;
    const weightHB = bfKnown ? 0.30 : 0.40;
    const weightK  = bfKnown ? 0.35 : 0.15;

    return Math.round(weightM * m + weightHB * hb + weightK * k);
  }

  /* ─────────────────────────────────────────────
     2. DÉPENSE TOTALE (TDEE) + EPOC
  ───────────────────────────────────────────── */

  /**
   * TDEE = BMR × NAP + correction EPOC estimée
   * EPOC (Excess Post-exercise Oxygen Consumption) = 6-15% 
   * de la dépense d'entraînement sur 24-48h post-séance
   * 
   * @param {number} bmr         Métabolisme de base
   * @param {number} nap         Coefficient d'activité (1.2 – 1.9)
   * @param {number} sessions    Séances/semaine
   * @param {number} duration    Durée séance (min)
   * @param {number} weight      Poids (kg) pour calibrer MET
   * @returns {number} TDEE arrondi (kcal/jour)
   */
  function calcTDEE(bmr, nap, sessions, duration, weight) {
    const baseTDEE = bmr * nap;

    // Dépense calorique par séance (MET musculation ≈ 5 METs, ajusté poids)
    const metBase = 5.0;
    const hourlyExpense = metBase * (weight * 3.5 * 5) / 1000; // ml O2/min → kcal
    const sessionKcal = (duration / 60) * metBase * weight * 3.5 * 5 / 1000 * 60;

    // EPOC moyen = 8% de la dépense workout
    const weeklyEpoc = sessions * sessionKcal * 0.08;
    const dailyEpoc  = weeklyEpoc / 7;

    return Math.round(baseTDEE + dailyEpoc);
  }

  /* ─────────────────────────────────────────────
     3. SURPLUS CALORIQUE RECOMMANDÉ
  ───────────────────────────────────────────── */

  /**
   * Surplus adaptatif selon objectif + profil
   * Pénalité si BF élevé (graisse supplémentaire préférentielle)
   * Réduction chez les avancés (sensibilité anabolique diminuée)
   * 
   * @returns {number} Surplus calorique (kcal/j)
   */
  function calcSurplus(goal, level, bodyfat, sex) {
    const baseMap = {
      lean:      { min: 150, max: 250, mid: 200 },
      standard:  { min: 300, max: 400, mid: 350 },
      agressive: { min: 500, max: 700, mid: 550 },
    };

    const levelFactor = {
      beginner:     1.10,
      intermediate: 1.00,
      advanced:     0.88,
      elite:        0.75,
    };

    // Pénalité adiposité : réduire surplus si BF > seuils
    let bfFactor = 1.0;
    if (bodyfat > 25) bfFactor = 0.70;
    else if (bodyfat > 20) bfFactor = 0.85;

    // Femmes : surplus légèrement réduit (composition différente)
    const sexFactor = sex === 'female' ? 0.88 : 1.0;

    const base = baseMap[goal].mid;
    return Math.round(base * levelFactor[level] * bfFactor * sexFactor);
  }

  /* ─────────────────────────────────────────────
     4. BESOINS PROTÉIQUES
  ───────────────────────────────────────────── */

  /**
   * Ratio protéique selon méta-analyse Morton (2018)
   * Range 1.6 – 2.2g/kg selon niveau, objectif, BF
   * 
   * Si BF > 25%, calcul sur masse maigre × 1.15 (protège LBM)
   * 
   * @returns {number} Besoin protéique (g/j)
   */
  function calcProteinNeed(weight, level, goal, bodyfat) {
    const ratioMatrix = {
      beginner:     { lean: 1.6, standard: 1.75, agressive: 1.9  },
      intermediate: { lean: 1.8, standard: 1.95, agressive: 2.1  },
      advanced:     { lean: 2.0, standard: 2.1,  agressive: 2.2  },
      elite:        { lean: 2.0, standard: 2.2,  agressive: 2.2  },
    };

    const ratio = ratioMatrix[level][goal];

    // Utiliser masse maigre ajustée si obésité
    let effectiveWeight = weight;
    if (bodyfat > 25) {
      const lbm = weight * (1 - bodyfat / 100);
      effectiveWeight = lbm * 1.15; // +15% sur LBM
    }

    return Math.round(effectiveWeight * ratio);
  }

  /* ─────────────────────────────────────────────
     5. GAINS MUSCULAIRES (Modèle McDonald adapté)
  ───────────────────────────────────────────── */

  /**
   * Potentiel de gain mensuel maximum (contexte entraîné)
   * Beginner: 0.8–1.0 kg/mois
   * Intermediate: 0.45–0.55 kg/mois
   * Advanced: 0.2–0.3 kg/mois
   * Elite: 0.08–0.15 kg/mois
   * 
   * Ajusté par : sexe, surplus, entraînement
   * 
   * @returns {number} Gain mensuel musculaire (kg)
   */
  function calcMonthlyMuscleGain(level, sex, surplus, sessionsPerWeek) {
    const basePotential = {
      beginner:     0.95,
      intermediate: 0.50,
      advanced:     0.25,
      elite:        0.11,
    };

    // Sexe — les femmes ont ~60% du potentiel hormonal masculin (GH/TestoRatio)
    const sexMult = sex === 'female' ? 0.60 : 1.0;

    // Surplus : lean = moins de nutriments disponibles
    let surplusMult = 1.0;
    if (surplus <= 220)       surplusMult = 0.72;
    else if (surplus <= 400)  surplusMult = 0.90;

    // Volume d'entraînement
    let volMult = 1.0;
    if (sessionsPerWeek <= 2)      volMult = 0.70;
    else if (sessionsPerWeek <= 3) volMult = 0.85;
    else if (sessionsPerWeek >= 6) volMult = 1.05;

    const gain = basePotential[level] * sexMult * surplusMult * volMult;
    return +gain.toFixed(3);
  }

  /**
   * Ratio de graisse dans le gain total de masse
   * Dépend du surplus et du BF actuel
   * Règle : plus le surplus est élevé et le BF élevé, 
   * plus la partition penche vers le gras (Helms, 2014)
   */
  function calcFatRatio(surplus, bodyfat) {
    let base = 0.20;

    if (surplus > 500) base += 0.20;
    else if (surplus > 380) base += 0.12;
    else if (surplus > 250) base += 0.06;

    if (bodyfat > 20) base += 0.12;
    else if (bodyfat > 15) base += 0.06;

    return Math.min(base, 0.60);
  }

  /**
   * Calcul macros optimales
   * P à besoin calculé, F = 25% kcal totales, C = reste
   */
  function calcMacros(targetCal, proteinNeed) {
    const pCal = proteinNeed * 4;
    const fCal = Math.round(targetCal * 0.25);
    const cCal = Math.max(0, targetCal - pCal - fCal);

    return {
      protein: proteinNeed,
      fat:     Math.round(fCal / 9),
      carbs:   Math.round(cCal / 4),
    };
  }

  // API publique
  return {
    calcBMR,
    calcTDEE,
    calcSurplus,
    calcProteinNeed,
    calcMonthlyMuscleGain,
    calcFatRatio,
    calcMacros,
  };

})();
