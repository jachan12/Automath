(function () {
  let cooldown = false;
  const BASE_POINTS = 5;
  const POINTS_PER_LEVEL = 2;
  const COOLDOWN_MS = 2000;

  // cooldown for at forhindre spam af point per niveau (3000ms)
  const LEVEL_POINT_COOLDOWN_MS = 3000;
  const levelCooldowns = new Map(); // key: level, value: timestamp (ms)

  // Exponer reset-funktion så resetProgress kan rydde disse
  window.resetLevelCooldowns = () => {
    levelCooldowns.clear();
  };

  const btn = document.getElementById('calculate-button');

  function showFeedback(msg, color = "#1976d2") {
    let fb = document.getElementById('facit-feedback');
    if (!fb) {
      fb = document.createElement('div');
      fb.id = 'facit-feedback';
      fb.style.marginTop = '8px';
      fb.style.fontWeight = 'bold';
      fb.style.color = color;
      const resultEl = document.getElementById('result');
      if (resultEl && resultEl.parentElement) {
        resultEl.parentElement.appendChild(fb);
      }
    }
    fb.textContent = msg;
    fb.style.color = color;
  }

  document.addEventListener('student-answer', (e) => {
    if (cooldown) {
      showFeedback("Vent lidt før du prøver igen...", "#c62828");
      return;
    }

    const studentValue = e.detail?.final;
    const facit = window.Levels?.getFacit?.();
    const level = window.game.scene.getCurrentLevel() || 1;

    // check per-level cooldown (forhindrer spam ved at skifte/klikke niveau osv.)
    const last = levelCooldowns.get(level) || 0;
    if (Date.now() - last < LEVEL_POINT_COOLDOWN_MS) {
      showFeedback("Vent lidt før du prøver igen på dette niveau...", "#c62828");
      return;
    }

    if (Number.isFinite(facit) && Number.isFinite(studentValue) && Math.abs(facit - studentValue) < 1e-9) {
      // registrer tidspunkt før points tildeles (blokér gentildeling i cooldown-periode)
      levelCooldowns.set(level, Date.now());
      const pts = BASE_POINTS + (level - 1) * POINTS_PER_LEVEL;
      if (window.game && typeof window.game.addPoints === 'function') {
        window.game.addPoints(pts);
      }
      if (window.game && typeof window.game.completeLevel === 'function') {
        window.game.completeLevel(level);
      }
      showFeedback(`Rigtigt! +${pts} point`, "#2e7d32");

      cooldown = true;
      if (btn) btn.disabled = true;
      setTimeout(() => {
        cooldown = false;
        if (btn) btn.disabled = false;
        showFeedback("Prøv næste opgave eller vælg et nyt niveau.", "#1976d2");
      }, COOLDOWN_MS);
    } else {
      showFeedback("Forkert eller manglende svar.", "#c62828");
    }
  });

  window.resetCooldown = () => {
    cooldown = false;
    if (btn) btn.disabled = false;
    showFeedback("");
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (window.game && typeof window.game.renderScore === 'function') window.game.renderScore();
  });
})();