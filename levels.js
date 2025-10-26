// levels.js

// --- Utils ---
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Level-definitioner ---
const levels = {
  1: { min: 1, max: 5, numVars: 2, expr: "A+B", story: "Per har {0} æbler, han får {1} mere. Hvor mange har han nu?" },
  2: { min: 1, max: 10, numVars: 2, expr: "A-B", story: "Anna har {0} kugler, hun giver {1} væk. Hvor mange har hun tilbage?" },
  3: { min: 2, max: 8, numVars: 2, expr: "A*B", story: "Hvis du har {0} poser med {1} kiks i hver, hvor mange kiks har du i alt?" },
  4: { min: 2, max: 12, numVars: 2, expr: "A/B", story: "Der er {0} chokolader, som skal fordeles mellem {1} børn. Hvor mange får hvert barn?" },
  5: { min: 1, max: 10, numVars: 3, expr: "A+B+C", story: "Poul har {0} æg og køber {1} mere fra Peter {2} mere fra Lisa. Hvor mange æg har Poul?" },
  6: { min: 1, max: 20, numVars: 3, expr: "A-B+C", story: "Lise har {0} bøger, hun låner {1} ud og køber {2} nye. Hvor mange bøger har Lise nu?" },
  7: { min: 1, max: 10, numVars: 3, expr: "A+B-C", story: "Kasper har {0} biler, han køber {1} flere og sælger {2}. Hvor mange biler har han nu?" },
  8: { min: 1, max: 10, numVars: 3, expr: "A*B-C", story: "Sofie har {0} skåle med slik. Der er {1} stykker slik i hver skål. hun hælder alt sammen og spiser {2} stykker. Hvor mange stykker har Sofie nu?" },
  9: { min: 1, max: 10, numVars: 3, expr: "A*C+B", story: "Der er {0} æbler på hvert træ. Der er {2} træer. Mille plukker dem alle og putter dem i bakken som i forvejen har {1} æbler. Hvor mange æbler ender hun med at have?" },
  10: { min: 1, max: 5, numVars: 4, expr: "A+B-C*D", story: "Mette køber {0} blomster om mandagen og {1} blomster om tirsdagen. Hun sælger {2} blomster til {3} forskellige kunder. Hvor mange blomster har hun tilbage?" },
  11: { min: 1, max: 10, numVars: 4, expr: "A-B-C*D", story: "{0}-{1}-{2}*{3}" },
  12: { min: 1, max: 10, numVars: 4, expr: "(A+B)/(C-D)", story: "({0}+{1})/({2}-{3})" },
  13: { min: 1, max: 10, numVars: 5, expr: "A+B+C-D*E", story: "{0}+{1}+{2}-{3}*{4}" },
};

// --- Controller for historien + facit (op til 10 variable A..J) ---
const gameScene = {
  regnehistorieTal: [], // array af tal i historien (maks 10)
  regnehistorieText: '', // tekstskabelon med {0}..{9}
  variables: {}, // fx {A: 3, B: 4, C: ...}
  correctExpr: '', // fx "A+B*C"
  facit: null, // beregnet facit-tal
  varNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],

  evaluateExpr(exprStr) {
    let expr = String(exprStr);
    for (const [name, val] of Object.entries(this.variables)) {
      const re = new RegExp(`\\b${name}\\b`, 'g');
      expr = expr.replace(re, String(val));
    }
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) return NaN;
    try {
      const result = Function(`"use strict"; return (${expr});`)();
      return Number.isFinite(result) ? result : NaN;
    } catch {
      return NaN;
    }
  },

  inferNumVars(cfg) {
    if (typeof cfg.numVars === 'number' && cfg.numVars > 0) {
      return Math.min(10, Math.max(1, Math.floor(cfg.numVars)));
    }
    if (typeof cfg.story === 'string') {
      const matches = [...cfg.story.matchAll(/\{(\d)\}/g)].map(m => parseInt(m[1], 10));
      if (matches.length) {
        const maxIdx = Math.max(...matches);
        return Math.min(10, maxIdx + 1);
      }
    }
    if (typeof cfg.expr === 'string') {
      const found = [...new Set((cfg.expr.match(/[A-J]/g) || []))];
      if (found.length) return Math.min(10, found.length);
    }
    return 2;
  },

  generateStory(level) {
    const cfg = levels[level] || { min: 1, max: 10, numVars: 2, expr: "A+B", story: "{0} og {1}" };
    const numVars = this.inferNumVars(cfg);
    const vars = this.varNames.slice(0, numVars);

    let attempts = 0;
    const maxAttempts = 100;
    let lastFacit = NaN;

    do {
      this.variables = {};
      this.regnehistorieTal = [];
      vars.forEach((name, idx) => {
        const tal = getRandomInt(cfg.min, cfg.max);
        this.variables[name] = tal;
        this.regnehistorieTal.push(tal);
      });

      this.correctExpr = cfg.expr || vars.join('+');
      lastFacit = this.evaluateExpr(this.correctExpr);
      attempts++;
    } while ((!Number.isFinite(lastFacit) || Number.isNaN(lastFacit)) && attempts < maxAttempts);

    this.facit = lastFacit;

    if (cfg.story && typeof cfg.story === 'string') {
      this.regnehistorieText = cfg.story;
    } else {
      const placeholders = this.regnehistorieTal.map((_, i) => `{${i}}`).join(', ');
      this.regnehistorieText = `Tal: ${placeholders}`;
    }

    this.regnehistorieOperator = cfg.operator || '';
  },

  renderRegnehistorie() {
    const container = document.getElementById('regnehistorie-text');
    if (!container) return;
    container.innerHTML = '';

    const parts = this.regnehistorieText.split(/(\{\d\})/g);
    for (let part of parts) {
      if (!part) continue;
      const placeholderMatch = part.match(/^\{(\d)\}$/);
      if (placeholderMatch) {
        const idx = Number(placeholderMatch[1]);
        const tal = (this.regnehistorieTal[idx] !== undefined) ? this.regnehistorieTal[idx] : '';
        const talBox = document.createElement('span');
        talBox.className = 'draggable-box';
        talBox.textContent = tal;
        talBox.draggable = true;
        talBox.dataset.value = tal;
        talBox.style.cssText = `
          display:inline-block; padding:2px 6px; margin:0 4px;
          background:#e3f2fd; border:1px solid #1976d2; border-radius:4px; cursor:grab;
          color:#1976d2; font-weight:bold;
        `;
        talBox.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', `hist${idx}`);
        });
        container.appendChild(talBox);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    }

    container.dataset.correctExpr = this.correctExpr;
  },

  getFacit() {
    if (this.facit == null || Number.isNaN(this.facit)) {
      this.facit = this.evaluateExpr(this.correctExpr);
    }
    return this.facit;
  },

  compareWithResultElement() {
    const target = this.getFacit();
    const resEl = document.getElementById('result');
    if (!resEl) return;

    const m = String(resEl.textContent).match(/(-?\d+(?:\.\d+)?)/);
    const studentValue = m ? Number(m[1]) : NaN;

    const correct = Number.isFinite(studentValue) && Math.abs(studentValue - target) < 1e-9;

    let fb = document.getElementById('facit-feedback');
    if (!fb) {
      const host = document.getElementById('regnehistorie-text');
      if (host && host.parentElement) {
        fb = document.createElement('div');
        fb.id = 'facit-feedback';
        fb.style.marginTop = '8px';
        fb.style.fontWeight = 'bold';
        host.parentElement.appendChild(fb);
      }
    }
    if (fb) {
      fb.textContent = correct ? 'Rigtigt ✅' : `Forkert ❌ (facit: ${target})`;
      fb.style.color = correct ? '#2e7d32' : '#c62828';
    } else {
      alert(correct ? 'Rigtigt ✅' : `Forkert ❌ (facit: ${target})`);
    }
  },

  loadLevel(levelNum) {
    this.generateStory(levelNum);
    this.renderRegnehistorie();
    if (window.game && window.game.scene) {
      window.game.scene.setCurrentLevel(levelNum);
    }
  }
};

window.Levels = gameScene;

document.addEventListener('DOMContentLoaded', () => {
  const levelKeys = Object.keys(levels).map(k => Number(k)).sort((a, b) => a - b);
  for (const k of levelKeys) {
    const btn = document.getElementById(`level-${k}-btn`);
    if (btn) btn.addEventListener('click', () => gameScene.loadLevel(k));
  }

  const inputs = document.querySelectorAll('.droppable-input');
  inputs.forEach(input => {
    input.addEventListener('dragover', (e) => e.preventDefault());
    input.addEventListener('drop', (e) => {
      e.preventDefault();
      const value = e.dataTransfer.getData('text/plain');
      input.value = value;
    });
  });

  const calcBtn = document.getElementById('calculate-button');
  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      setTimeout(() => gameScene.compareWithResultElement(), 0);
    });
  }
});