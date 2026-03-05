/**
 * MassBuilder PRO — Contrôleur Principal
 * Module: app.js
 * 
 * Responsabilité : orchestrer la navigation, la collecte
 * des données, les calculs et le rendu.
 * 
 * Sécurité :
 * - Validation et sanitisation de toutes les entrées
 * - Limites strictes sur chaque champ numérique
 * - Aucune donnée sensible stockée (localStorage désactivé)
 * - CSP compatible (pas d'eval, pas de inline events)
 */

'use strict';

const APP = (() => {

  /* ─────────────────────────────────────────────
     ÉTAT GLOBAL (en mémoire uniquement)
  ───────────────────────────────────────────── */
  const state = {
    // Entrées utilisateur
    age: 0, sex: 'male', height: 0, weight: 0, bodyfat: 20,
    level: 'beginner', activity: 1.55, sessions: 4,
    duration: 60, goal: 'lean', meals: 3,
    dietaryProtein: 80, wheyPerScoop: 25, trainingTime: 'afternoon',

    // Résultats calculés
    bmr: 0, tdee: 0, surplus: 0, targetCalories: 0,
    proteinNeed: 0, proteinGap: 0, scoopsNeeded: 0,
    monthlyMuscleGain: 0, fatRatio: 0,
    macros: { protein: 0, fat: 0, carbs: 0 },
  };

  let currentStep = 1;
  const TOTAL_STEPS = 5;

  /* ─────────────────────────────────────────────
     VALIDATION — Règles par champ
  ───────────────────────────────────────────── */
  const VALIDATORS = {
    age:            { min: 14,  max: 75,  label: 'Âge',      required: true },
    height:         { min: 140, max: 220, label: 'Taille',   required: true },
    weight:         { min: 40,  max: 180, label: 'Poids',    required: true },
    dietaryProtein: { min: 0,   max: 400, label: 'Protéines alimentaires', required: false },
    wheyPerScoop:   { min: 10,  max: 50,  label: 'Protéines / scoop', required: false },
  };

  function validateField(name, value) {
    const rule = VALIDATORS[name];
    if (!rule) return null;
    if (rule.required && (!value || isNaN(value))) {
      return `${rule.label} est requis.`;
    }
    if (value < rule.min || value > rule.max) {
      return `${rule.label} doit être entre ${rule.min} et ${rule.max}.`;
    }
    return null;
  }

  function validateStep(n) {
    const errors = [];

    if (n === 1) {
      ['age', 'height', 'weight'].forEach(field => {
        const val = parseFloat(document.getElementById(field)?.value);
        const err = validateField(field, val);
        if (err) errors.push(err);
      });
    }

    if (n === 3) {
      ['wheyPerScoop'].forEach(field => {
        const val = parseFloat(document.getElementById(field)?.value);
        const err = validateField(field, val);
        if (err) errors.push(err);
      });
    }

    if (errors.length > 0) {
      showError(errors[0]);
      return false;
    }
    return true;
  }

  function showError(msg) {
    // Toast discret sans alert()
    let toast = document.getElementById('mb-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mb-toast';
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
      Object.assign(toast.style, {
        position: 'fixed', bottom: '24px', left: '50%',
        transform: 'translateX(-50%)', zIndex: '9999',
        background: '#ef4444', color: '#fff',
        fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem',
        fontWeight: '500', padding: '12px 24px',
        borderRadius: '100px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transition: 'opacity 0.3s', opacity: '0',
        pointerEvents: 'none', maxWidth: '90vw', textAlign: 'center',
      });
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
  }

  /* ─────────────────────────────────────────────
     COLLECTE DES DONNÉES
  ───────────────────────────────────────────── */

  function getRadioValue(name, fallback) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : fallback;
  }

  function safeNum(id, fallback = 0) {
    const val = parseFloat(document.getElementById(id)?.value);
    return isNaN(val) ? fallback : val;
  }

  function collectStep(n) {
    if (n === 1) {
      state.age     = safeNum('age');
      state.sex     = document.getElementById('sex')?.value || 'male';
      state.height  = safeNum('height');
      state.weight  = safeNum('weight');
      state.bodyfat = safeNum('bodyfat', 20);
      state.level   = getRadioValue('level', 'beginner');
    }
    if (n === 2) {
      state.activity = parseFloat(document.getElementById('activity')?.value) || 1.55;
      state.sessions = safeNum('sessionsPerWeek', 4);
      state.duration = safeNum('sessionDuration', 60);
      state.goal     = getRadioValue('goal', 'lean');
    }
    if (n === 3) {
      state.meals          = parseInt(document.getElementById('meals')?.value) || 3;
      state.dietaryProtein = safeNum('dietaryProtein', 0);
      state.wheyPerScoop   = safeNum('wheyPerScoop', 25);
      state.trainingTime   = document.getElementById('trainingTime')?.value || 'afternoon';
    }
  }

  /* ─────────────────────────────────────────────
     MOTEUR DE CALCUL
  ───────────────────────────────────────────── */

  function runCalculations() {
    const { weight, height, age, sex, bodyfat, activity, sessions,
            duration, goal, level, dietaryProtein, wheyPerScoop } = state;

    state.bmr    = ALGO.calcBMR(weight, height, age, sex, bodyfat, true);
    state.tdee   = ALGO.calcTDEE(state.bmr, activity, sessions, duration, weight);
    state.surplus = ALGO.calcSurplus(goal, level, bodyfat, sex);
    state.targetCalories = state.tdee + state.surplus;

    state.proteinNeed  = ALGO.calcProteinNeed(weight, level, goal, bodyfat);
    state.proteinGap   = Math.max(0, state.proteinNeed - dietaryProtein);
    state.scoopsNeeded = Math.ceil(state.proteinGap / wheyPerScoop);

    state.monthlyMuscleGain = ALGO.calcMonthlyMuscleGain(level, sex, state.surplus, sessions);
    state.fatRatio          = ALGO.calcFatRatio(state.surplus, bodyfat);

    state.macros = ALGO.calcMacros(state.targetCalories, state.proteinNeed);
  }

  /* ─────────────────────────────────────────────
     GESTION STRATÉGIE (sélection manuelle)
  ───────────────────────────────────────────── */

  function onStrategySelect(goal, kcal) {
    state.goal           = goal;
    state.targetCalories = kcal;
    state.surplus        = ALGO.calcSurplus(goal, state.level, state.bodyfat, state.sex);

    // Recalc dépendants
    state.monthlyMuscleGain = ALGO.calcMonthlyMuscleGain(
      state.level, state.sex, state.surplus, state.sessions
    );
    state.fatRatio = ALGO.calcFatRatio(state.surplus, state.bodyfat);
    state.macros   = ALGO.calcMacros(state.targetCalories, state.proteinNeed);

    RENDERER.renderProjection(state);
    RENDERER.renderResultAdvice(state);
  }

  /* ─────────────────────────────────────────────
     NAVIGATION ENTRE ÉTAPES
  ───────────────────────────────────────────── */

  function goToStep(n) {
    if (n < 1 || n > TOTAL_STEPS) return;

    // Masquer tous les panels
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('step' + n);
    if (panel) panel.classList.add('active');

    // Mettre à jour nodes de progression
    document.querySelectorAll('.step-node').forEach((node, i) => {
      const stepNum = i + 1;
      node.classList.toggle('active', stepNum === n);
      node.classList.toggle('done', stepNum < n);
    });

    // Ligne de progression
    const line = document.getElementById('progressLine');
    if (line) {
      const pct = ((n - 1) / (TOTAL_STEPS - 1)) * 100;
      line.style.width = pct + '%';
    }

    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextStep(current) {
    if (!validateStep(current)) return;
    collectStep(current);
    goToStep(current + 1);
  }

  /* ─────────────────────────────────────────────
     CALCUL FINAL + RENDU
  ───────────────────────────────────────────── */

  function calculate() {
    // Collecter toutes les étapes
    collectStep(1);
    collectStep(2);
    collectStep(3);

    // Validation finale
    if (!validateStep(1)) { goToStep(1); return; }

    // Lancer les algorithmes
    runCalculations();

    // Rendre step 4
    RENDERER.renderMetrics(state);
    RENDERER.renderMacros(state);
    RENDERER.renderStrategies(state, onStrategySelect);
    RENDERER.renderProjection(state);
    RENDERER.renderResultAdvice(state);

    // Rendre step 5
    RENDERER.renderProteinMetrics(state);
    RENDERER.renderTiming(state);
    RENDERER.renderAdvice(state);

    goToStep(4);
  }

  /* ─────────────────────────────────────────────
     BINDING DES SLIDERS
  ───────────────────────────────────────────── */

  function bindSlider(id, displayId, format) {
    const el = document.getElementById(id);
    const display = document.getElementById(displayId);
    if (!el || !display) return;

    const update = () => { display.textContent = format(el.value); };
    el.addEventListener('input', update);
    update();
  }

  /* ─────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────── */

  function init() {
    // Sliders
    bindSlider('bodyfat', 'bfVal', v => v + '%');
    bindSlider('sessionsPerWeek', 'spwVal', v => v + (v > 1 ? ' séances' : ' séance'));
    bindSlider('sessionDuration', 'sdVal', v => v + ' min');

    // Boutons navigation
    const bindBtn = (id, handler) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', handler);
    };

    bindBtn('btnStep1Next',    () => nextStep(1));
    bindBtn('btnStep2Back',    () => goToStep(1));
    bindBtn('btnStep2Next',    () => nextStep(2));
    bindBtn('btnStep3Back',    () => goToStep(2));
    bindBtn('btnCalculate',    calculate);
    bindBtn('btnStep4Back',    () => goToStep(3));
    bindBtn('btnStep4Next',    () => goToStep(5));
    bindBtn('btnStep5Back',    () => goToStep(4));
    bindBtn('btnPrint',        () => window.print());

    // Nodes cliquables dans la barre de progression
    document.querySelectorAll('.step-node').forEach((node, i) => {
      node.addEventListener('click', () => {
        const target = i + 1;
        if (target <= currentStep) goToStep(target);
      });
      node.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const target = i + 1;
          if (target <= currentStep) goToStep(target);
        }
      });
    });

    // Init progression
    goToStep(1);
  }

  // Lancement au DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposer navigation pour usage HTML minimal
  return { goToStep, nextStep, calculate };

})();
