(function () {
  let cooldown = false;
  let isChecking = false;
  const BASE_POINTS = 5;
  const POINTS_PER_LEVEL = 0;
  const COOLDOWN_MS = 2000;
  const CHECKING_MS = 1500; // Simuleret tjeknings-tid

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

  function showCheckingAnimation() {
    showFeedback("Regner løsningen...", "#1976d2");
  }

  document.addEventListener('student-answer', (e) => {
    if (cooldown || isChecking) {
      showFeedback("Vent lidt før du prøver igen...", "#1976d2");
      return;
    }

    const studentValue = e.detail?.final;
    const facit = window.Levels?.getFacit?.();
    const level = window.game.scene.getCurrentLevel() || 1;

    // Vis tjeknings-animation
    isChecking = true;
    if (btn) btn.disabled = true;
    showCheckingAnimation();

    // Simuleret tjeknings-delay
    setTimeout(() => {
      isChecking = false;

      if (Number.isFinite(facit) && Number.isFinite(studentValue) && Math.abs(facit - studentValue) < 1e-9) {
        // Kun sæt cooldown ved RIGTIGT svar
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
        }, COOLDOWN_MS);
      } else {
        // Neutral feedback med afstand fra rigtige svar - INGEN COOLDOWN på forkert svar
        if (Number.isFinite(facit)) {
          // Hvis intet svar, behandl som 0
          const value = Number.isFinite(studentValue) ? studentValue : 0;
          const diff = Math.abs(facit - value);
          showFeedback(`Du er ${diff} fra det rigtige svar. Prøv igen.`, "#1976d2");
        }
        // Knappen er nu tilgængelig igen - du kan prøve straks!
        if (btn) btn.disabled = false;
      }
    }, CHECKING_MS);
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