/**
 * MassBuilder PRO — Renderer UI
 * Module: renderer.js
 * 
 * Responsabilité : injecter les données calculées dans le DOM
 * Aucun calcul ici — seulement de la présentation.
 */

'use strict';

const RENDERER = (() => {

  /* ─────────────────────────────────────────────
     UTILITAIRES
  ───────────────────────────────────────────── */

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function animateBar(el, pct, delay = 100) {
    if (!el) return;
    setTimeout(() => {
      el.style.width = Math.min(100, pct).toFixed(1) + '%';
    }, delay);
  }

  /* ─────────────────────────────────────────────
     STEP 4 — RÉSULTATS PRINCIPAUX
  ───────────────────────────────────────────── */

  function renderMetrics(state) {
    const el = document.getElementById('metaResults');
    if (!el) return;

    el.innerHTML = `
      <div class="metric-box">
        <div class="metric-label">Métabolisme de base</div>
        <div class="metric-value">${esc(state.bmr)}<span class="metric-unit">kcal</span></div>
        <div class="metric-note">Moyenne pondérée 3 modèles scientifiques</div>
      </div>
      <div class="metric-box ice">
        <div class="metric-label">Dépense totale (TDEE)</div>
        <div class="metric-value">${esc(state.tdee)}<span class="metric-unit">kcal</span></div>
        <div class="metric-note">Activité + EPOC estimé</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Objectif calorique</div>
        <div class="metric-value">${esc(state.targetCalories)}<span class="metric-unit">kcal</span></div>
        <div class="metric-note">Surplus +${esc(state.surplus)} kcal/j</div>
      </div>
      <div class="metric-box gold">
        <div class="metric-label">Protéines cibles</div>
        <div class="metric-value">${esc(state.proteinNeed)}<span class="metric-unit">g/j</span></div>
        <div class="metric-note">${(state.proteinNeed / state.weight).toFixed(2)}g/kg de poids corporel</div>
      </div>
    `;
  }

  function renderMacros(state) {
    const el = document.getElementById('macroBlock');
    if (!el) return;

    const macros = state.macros;
    const totalCal = macros.protein * 4 + macros.fat * 9 + macros.carbs * 4;

    el.innerHTML = `
      <div class="section-label">Répartition macronutriments</div>
      <div class="macro-bar-row">
        <div class="macro-label">Protéines</div>
        <div class="macro-track"><div class="macro-fill fire" id="mfP"></div></div>
        <div class="macro-grams">${esc(macros.protein)}g</div>
      </div>
      <div class="macro-bar-row">
        <div class="macro-label">Glucides</div>
        <div class="macro-track"><div class="macro-fill ice" id="mfC"></div></div>
        <div class="macro-grams">${esc(macros.carbs)}g</div>
      </div>
      <div class="macro-bar-row">
        <div class="macro-label">Lipides</div>
        <div class="macro-track"><div class="macro-fill ok" id="mfF"></div></div>
        <div class="macro-grams">${esc(macros.fat)}g</div>
      </div>
    `;

    // Animer les barres
    const animate = () => {
      animateBar(document.getElementById('mfP'), macros.protein * 4 / totalCal * 100, 150);
      animateBar(document.getElementById('mfC'), macros.carbs  * 4 / totalCal * 100, 250);
      animateBar(document.getElementById('mfF'), macros.fat    * 9 / totalCal * 100, 350);
    };
    requestAnimationFrame(animate);
  }

  function renderStrategies(state, onSelect) {
    const el = document.getElementById('strategyCards');
    if (!el) return;

    const strategies = [
      {
        id: 'lean',
        label: 'Recommandé BF > 15%',
        name: 'Lean Bulk',
        range: '+150 à +250 kcal/jour',
        gain: '+0.5 à 0.7 kg',
        risk: 'Très faible',
        kcal: state.tdee + 200,
      },
      {
        id: 'standard',
        label: 'Équilibre optimal',
        name: 'Standard',
        range: '+300 à +400 kcal/jour',
        gain: '+0.7 à 1.0 kg',
        risk: 'Modéré',
        kcal: state.tdee + 350,
      },
      {
        id: 'agressive',
        label: 'Vitesse maximale',
        name: 'Agressif',
        range: '+500 à +700 kcal/jour',
        gain: '+0.9 à 1.4 kg',
        risk: 'Élevé',
        kcal: state.tdee + 550,
      },
    ];

    el.innerHTML = strategies.map(s => `
      <div class="strategy-card ${esc(s.id)} ${s.id === state.goal ? 'selected' : ''}"
           data-goal="${esc(s.id)}"
           data-kcal="${esc(s.kcal)}"
           role="button"
           tabindex="0"
           aria-label="Stratégie ${esc(s.name)}">
        <div class="check-icon" aria-hidden="true">✓</div>
        <div class="strategy-badge">${esc(s.label)}</div>
        <div class="strategy-name">${esc(s.name)}</div>
        <div class="strategy-range">${esc(s.range)}</div>
        <div class="strategy-stat-row">
          <span>Gain musculaire/mois</span>
          <strong>${esc(s.gain)}</strong>
        </div>
        <div class="strategy-stat-row">
          <span>Risque graisse</span>
          <strong>${esc(s.risk)}</strong>
        </div>
        <div class="strategy-stat-row">
          <span>Calories cibles</span>
          <strong>${esc(s.kcal)} kcal</strong>
        </div>
      </div>
    `).join('');

    // Attacher les events
    el.querySelectorAll('.strategy-card').forEach(card => {
      const handler = () => {
        el.querySelectorAll('.strategy-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        onSelect(card.dataset.goal, +card.dataset.kcal);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });
  }

  function renderProjection(state) {
    const el = document.getElementById('projectionData');
    if (!el) return;

    const mGain = state.monthlyMuscleGain;
    const fatRatio = state.fatRatio;

    const proj = (months) => {
      const muscle = (mGain * months).toFixed(2);
      const fat    = (mGain * months * (fatRatio / (1 - fatRatio))).toFixed(2);
      return { muscle, fat };
    };

    const p3 = proj(3);
    const p6 = proj(6);

    el.innerHTML = `
      <div class="proj-card">
        <div class="proj-period">Projection 3 mois</div>
        <div class="proj-muscle-val">+${esc(p3.muscle)}</div>
        <div class="proj-muscle-unit">kg de muscle estimé</div>
        <div class="proj-fat-note">+${esc(p3.fat)} kg graisse potentielle</div>
      </div>
      <div class="proj-card">
        <div class="proj-period">Projection 6 mois</div>
        <div class="proj-muscle-val">+${esc(p6.muscle)}</div>
        <div class="proj-muscle-unit">kg de muscle estimé</div>
        <div class="proj-fat-note">+${esc(p6.fat)} kg graisse potentielle</div>
      </div>
    `;
  }

  /* ─────────────────────────────────────────────
     STEP 5 — PROTÉINES & WHEY
  ───────────────────────────────────────────── */

  function renderProteinMetrics(state) {
    const el = document.getElementById('proteinResults');
    if (!el) return;

    const covered = Math.min(100, Math.round(state.dietaryProtein / state.proteinNeed * 100));

    el.innerHTML = `
      <div class="metric-box">
        <div class="metric-label">Besoin total</div>
        <div class="metric-value">${esc(state.proteinNeed)}<span class="metric-unit">g/j</span></div>
        <div class="metric-note">${(state.proteinNeed / state.weight).toFixed(2)}g/kg · niveau ${esc(state.level)}</div>
      </div>
      <div class="metric-box ice">
        <div class="metric-label">Via alimentation</div>
        <div class="metric-value">${esc(state.dietaryProtein)}<span class="metric-unit">g/j</span></div>
        <div class="metric-note">${esc(covered)}% de l'objectif couvert</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Déficit protéique</div>
        <div class="metric-value">${esc(state.proteinGap)}<span class="metric-unit">g/j</span></div>
        <div class="metric-note">À combler via supplémentation</div>
      </div>
      <div class="metric-box gold">
        <div class="metric-label">Scoops whey / jour</div>
        <div class="metric-value">${esc(state.scoopsNeeded)}<span class="metric-unit">scoop${state.scoopsNeeded > 1 ? 's' : ''}</span></div>
        <div class="metric-note">${esc(state.wheyPerScoop)}g protéines / scoop</div>
      </div>
    `;

    // Barre de couverture
    const fillEl = document.getElementById('proteinFill');
    const pctEl  = document.getElementById('dietCoverPct');
    if (pctEl) pctEl.textContent = covered + '%';
    animateBar(fillEl, covered, 200);
  }

  function renderTiming(state) {
    const tbody = document.getElementById('timingBody');
    if (!tbody) return;

    const rows = buildTimingRows(state);
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <div class="dot-indicator">
            <div class="dot ${esc(r.dotClass || '')}"></div>
            ${esc(r.moment)}
          </div>
        </td>
        <td>
          <strong>${esc(r.amount)}g</strong>
          ${r.scoops > 0 ? `<span style="color:var(--clr-text3);font-size:0.8em;margin-left:4px;">(${esc(r.scoops)} scoop${r.scoops > 1 ? 's' : ''})</span>` : '<span style="color:var(--clr-text3);font-size:0.8em;margin-left:4px;">(alimentation)</span>'}
        </td>
        <td style="color:var(--clr-text3)">${r.advice}</td>
      </tr>
    `).join('');
  }

  function buildTimingRows(state) {
    const { wheyPerScoop, proteinGap, dietaryProtein, trainingTime, meals, proteinNeed } = state;
    const rows = [];
    let wheyUsed = 0;

    if (trainingTime === 'morning') {
      const preAmt = 20;
      rows.push({ moment: 'Pré-entraînement (matin)', amount: preAmt, scoops: Math.ceil(preAmt / wheyPerScoop), dotClass: 'ice', advice: 'Whey isolate à jeun, 30 min avant la séance' });
      wheyUsed += preAmt;
    }

    const postAmt = Math.min(40, Math.round(proteinGap * 0.40));
    rows.push({ moment: 'Post-entraînement', amount: postAmt, scoops: Math.ceil(postAmt / wheyPerScoop), dotClass: '', advice: 'Fenêtre anabolique : priorité absolue, < 30 min après séance' });
    wheyUsed += postAmt;

    if (trainingTime === 'evening') {
      const preEvAmt = 20;
      rows.push({ moment: 'Pré-workout soir', amount: preEvAmt, scoops: Math.ceil(preEvAmt / wheyPerScoop), dotClass: 'ice', advice: '1h avant la séance — évite les glucides lourds' });
      wheyUsed += preEvAmt;
    }

    const remaining = Math.max(0, proteinGap - wheyUsed);
    if (remaining > 10) {
      const interAmt = Math.round(remaining);
      rows.push({ moment: 'Entre les repas', amount: interAmt, scoops: Math.ceil(interAmt / wheyPerScoop), dotClass: 'gold', advice: `Répartir en ${Math.max(1, meals - 2)} prise(s) · toutes les 3-4h pour synthèse optimale` });
    }

    rows.push({ moment: 'Alimentation totale', amount: dietaryProtein, scoops: 0, dotClass: 'ok', advice: 'Viandes, œufs, fromage blanc, légumineuses — base irremplaçable' });

    return rows;
  }

  function renderAdvice(state) {
    const el = document.getElementById('adviceList');
    if (!el) return;

    const cards = generateAdviceCards(state);
    el.innerHTML = cards.map(c => `
      <div class="advice-card">
        <div class="advice-emoji" aria-hidden="true">${c.icon}</div>
        <div class="advice-body">${c.html}</div>
      </div>
    `).join('');
  }

  function generateAdviceCards(state) {
    const { level, goal, bodyfat, sessions, weight, proteinNeed, surplus, targetCalories, sex } = state;
    const cards = [];

    // Surplus intelligent
    cards.push({
      icon: '🔥',
      html: `<strong>Surplus intelligent :</strong> Vise ${targetCalories} kcal/jour (+${surplus} kcal). Pèse-toi chaque matin à jeun — une progression de <strong>0.2 à 0.4 kg/semaine</strong> est le signe d'un surplus bien calibré. Au-delà, réduis de 100 kcal.`,
    });

    // Protéines
    const perMeal = Math.round(proteinNeed / state.meals);
    cards.push({
      icon: '🥩',
      html: `<strong>Distribution protéique :</strong> ${proteinNeed}g en ${state.meals} repas = <strong>~${perMeal}g/repas</strong>. La synthèse protéique musculaire est maximisée entre 20–40g par prise (Churchward-Venne, 2012). Ne dépasse pas 40g en une seule prise.`,
    });

    // Conseils niveau
    const levelCards = {
      beginner: { icon: '💪', html: `<strong>Avantage débutant :</strong> Ta sensibilité anabolique est maximale ces 12 premiers mois. Priorise la progression de charge sur <strong>5 mouvements fondamentaux</strong> (squat, soulevé, développé, rowing, tractions). La fréquence prime sur le volume.` },
      intermediate: { icon: '📈', html: `<strong>Intermédiaire :</strong> La progression linéaire seule ne suffit plus. Adopte une <strong>périodisation ondulante</strong> (force / hypertrophie / volume alternés). Surveille tes biomarqueurs de récupération : qualité du sommeil, libido, performance en séance.` },
      advanced: { icon: '⚡', html: `<strong>Avancé :</strong> Tes gains seront lents et précieux. Planifie des <strong>déloads toutes les 6-8 semaines</strong> (volume –40%, intensité –20%). La progression méticuleuse sur les micro-charges (0.5 kg) est désormais ta norme.` },
      elite: { icon: '🏆', html: `<strong>Élite :</strong> Optimise les derniers pourcentages : timing glucides péri-workout, <strong>7h30–9h de sommeil strict</strong>, gestion du cortisol (stress = catabolisme). Considère le suivi de HRV (variabilité cardiaque) comme outil de récupération.` },
    };
    cards.push(levelCards[level]);

    // Avertissement BF élevé
    if (bodyfat > 20) {
      cards.push({
        icon: '⚠️',
        html: `<strong>Attention à la composition corporelle :</strong> Avec ${bodyfat}% de masse grasse, un surplus important favorise le stockage adipeux (résistance à l'insuline accrue). Cible <strong>15–17% de BF</strong> avant d'adopter un surplus agressif. Le lean bulk est ta priorité.`,
      });
    }

    // Sommeil
    cards.push({
      icon: '😴',
      html: `<strong>Sommeil = anabolisme :</strong> 70–80% de la GH est sécrétée en phase de sommeil profond. Une nuit courte (<6h) réduit la synthèse protéique musculaire de <strong>~18%</strong> (Dattilo et al. 2011). Vise 7h30–9h, température pièce < 19°C.`,
    });

    // Hydratation
    const waterTarget = (weight * 0.035 + 0.5).toFixed(1);
    cards.push({
      icon: '💧',
      html: `<strong>Hydratation :</strong> Pour ${proteinNeed}g de protéines/j, cible minimum <strong>${waterTarget}L d'eau</strong>. Les reins filtrent l'urée (résidu de métabolisme protéique) — l'hydratation protège la fonction rénale et optimise le transport des acides aminés.`,
    });

    // Volume entraînement
    if (sessions >= 5) {
      cards.push({
        icon: '🔄',
        html: `<strong>${sessions} séances/semaine :</strong> Surveille les signaux de surentraînement : performance en baisse 2+ semaines, troubles du sommeil, irritabilité. La <strong>créatine monohydrate (3–5g/j)</strong> est le seul supplément dont l'efficacité est prouvée par méta-analyse (Lanhers et al. 2017).`,
      });
    }

    return cards;
  }

  /* ─────────────────────────────────────────────
     MINI CONSEILS POUR BLOC RÉSULTATS
  ───────────────────────────────────────────── */
  function renderResultAdvice(state) {
    const el = document.getElementById('resultAdviceBlock');
    if (!el) return;
    const all = generateAdviceCards(state);
    el.innerHTML = `
      <div class="section-label">Conseils clés</div>
      <div class="advice-list">
        ${all.slice(0, 3).map(c => `
          <div class="advice-card">
            <div class="advice-emoji">${c.icon}</div>
            <div class="advice-body">${c.html}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // API publique
  return {
    renderMetrics,
    renderMacros,
    renderStrategies,
    renderProjection,
    renderProteinMetrics,
    renderTiming,
    renderAdvice,
    renderResultAdvice,
  };

})();
