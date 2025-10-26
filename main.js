class Game {
  constructor() {
    window.game = this;
    this.points = 1000; // Note: index.html has Point: 100, but this takes precedence
    this.robotCount = 0;
    this.assignedRobots = new Map(); // level: { intervalId, isActive }
    this.completedLevels = new Set(); // Levels completed manually

    this.shop = new Shop(this);
    this.scene = new GameScene(this, this.shop);

    this.loadProgress();
    this.renderScore();
    this.scene.updateRobotCheckbox();
    this.shop.render();
    console.log(`Game initialized. Starting on level ${this.scene.getCurrentLevel()}`);

    const resetBtn = document.getElementById('reset-button');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetProgress());
    }

    // Add event listeners for level buttons
    for (let i = 1; i <= 13; i++) {
      const levelBtn = document.getElementById(`level-${i}-btn`);
      if (levelBtn) {
        levelBtn.addEventListener('click', () => {
          this.scene.setCurrentLevel(i);
          // sørg for at UI for levels opdateres (active/solved/robot)
          this.renderLevelStates();
          console.log(`Level changed to ${i}`);
        });
      }
    }

    // Render initial level-states (solved/robot/active)
    this.renderLevelStates();
  }

  addPoints(amount) {
    this.points += amount;
    console.log(`Added ${amount} points. Total points: ${this.points}`);
    document.dispatchEvent(new CustomEvent('points-changed', { detail: this.points }));
    this.saveProgress();
  }

  spendPoints(amount) {
    if (this.points >= amount) {
      this.points -= amount;
      console.log(`Spent ${amount} points. Remaining points: ${this.points}`);
      document.dispatchEvent(new CustomEvent('points-changed', { detail: this.points }));
      this.saveProgress();
      return true;
    }
    return false;
  }

  renderScore() {
    const scoreEl = document.getElementById('score');
    if (scoreEl) {
      scoreEl.textContent = `Point: ${this.points}`;
    }
  }

  completeLevel(level) {
    this.completedLevels.add(level);
    console.log(`Level ${level} completed. Completed levels: ${[...this.completedLevels]}`);
    this.scene.updateRobotCheckbox();
    this.saveProgress();
    // opdater UI (gør level orange)
    this.renderLevelStates();
  }

  assignRobotToLevel(level) {
    console.log(`Attempting to assign robot to level ${level}. robotCount: ${this.robotCount}, assignedRobots: ${this.assignedRobots.size}, levelCompleted: ${this.completedLevels.has(level)}`);
    if (!this.assignedRobots.has(level) && this.robotCount > 0 && this.completedLevels.has(level)) {
      this.assignedRobots.set(level, { intervalId: null, isActive: false });
      this.shop.useRobot();
      this.scene.updateRobotCheckbox();
      console.log(`Robot assigned to level ${level}. New robotCount: ${this.robotCount}`);
      this.saveProgress();
      // opdater UI så robot vises over level-knappen
      this.renderLevelStates();
      return true;
    }
    console.log(`Failed to assign robot to level ${level}`);
    return false;
  }

  toggleRobotForLevel(level) {
    if (this.assignedRobots.has(level)) {
      const robot = this.assignedRobots.get(level);
      robot.isActive = !robot.isActive;

      if (robot.intervalId) {
        clearInterval(robot.intervalId);
        robot.intervalId = null;
      }

      if (robot.isActive) {
        robot.intervalId = setInterval(() => {
          this.addPoints(5);
        }, 3000);
      }

      this.assignedRobots.set(level, robot);
      this.scene.updateRobotCheckbox();
      console.log(`Robot on level ${level} toggled to ${robot.isActive ? 'active' : 'inactive'}`);
      this.saveProgress();
      // opdater UI (robot-indikator / checkbox)
      this.renderLevelStates();
    }
  }

  saveProgress() {
    const progress = {
      points: this.points,
      robotCount: this.robotCount,
      assignedRobots: Array.from(this.assignedRobots.entries()).map(([key, value]) => ({ key, value: { isActive: value.isActive } })), // Don't save intervalId
      completedLevels: Array.from(this.completedLevels),
      levelValuesCache: this.scene.levelValuesCache,
    };
    localStorage.setItem('gameProgress', JSON.stringify(progress));
    console.log('Progress saved');
  }

  loadProgress() {
    const savedProgress = localStorage.getItem('gameProgress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      this.points = progress.points || 1000;
      this.robotCount = progress.robotCount || 0;
      this.completedLevels = new Set(progress.completedLevels || []);
      this.scene.levelValuesCache = progress.levelValuesCache || {};
      console.log(`Loading progress: ${JSON.stringify(progress.assignedRobots)}`);

      // Ensure we restore assignedRobots and restart intervals only for those that were active.
      progress.assignedRobots.forEach(({ key, value }) => {
        // store with no intervalId and default inactive, then start interval only if value.isActive
        this.assignedRobots.set(key, { intervalId: null, isActive: false });
        if (value.isActive) {
          // toggleRobotForLevel will set isActive=true and create interval
          this.toggleRobotForLevel(key);
        }
      });

      console.log(`Progress loaded. Assigned robots: ${JSON.stringify([...this.assignedRobots.entries()])}`);
      this.scene.setCurrentLevel(1); // Ensure start on level 1
      this.scene.updateRobotCheckbox(); // Ensure UI reflects robot state
      // opdater level-knapper (vis løst / robot)
      this.renderLevelStates();
    } else {
      console.log('No saved progress found. Starting fresh.');
      this.scene.setCurrentLevel(1); // Default to level 1 if no progress
    }
  }

  resetProgress() {
    // Stop and clear any robot intervals before clearing assignedRobots
    for (const [level, robot] of this.assignedRobots.entries()) {
      try {
        if (robot && robot.intervalId) {
          clearInterval(robot.intervalId);
          robot.intervalId = null;
        }
        robot.isActive = false;
      } catch (e) {
        // swallow
      }
    }

    // Also clear any global interval registry if used
    if (Array.isArray(window.__robotIntervals)) {
      window.__robotIntervals.forEach(id => clearInterval(id));
      window.__robotIntervals.length = 0;
    }

    localStorage.removeItem('gameProgress');
    this.points = 1000;
    this.robotCount = 0;

    // --- Sørg for at shoppen også nulstilles ---
    if (this.shop && typeof this.shop.reset === 'function') {
      this.shop.reset();
    }

    // ryd per-level point-cooldowns hvis tilgængelig
    if (typeof window.resetLevelCooldowns === 'function') {
      window.resetLevelCooldowns();
    }

    this.assignedRobots.clear();
    this.completedLevels.clear();
    this.scene.levelValuesCache = {};
    this.renderScore();
    this.shop.render();
    this.scene.updateRobotCheckbox();
    this.scene.setCurrentLevel(1);
    // opdater level-knapper efter reset
    this.renderLevelStates();
    console.log('Progress reset. Starting on level 1');
  }

  // Tilføjet: opdater level-knapperne så de viser løst (orange), aktiv, og evt. robot-indikator
  renderLevelStates() {
    const current = this.scene?.getCurrentLevel?.() || 1;
    for (let i = 1; i <= 13; i++) {
      const btn = document.getElementById(`level-${i}-btn`);
      if (!btn) continue;
      // active class
      if (i === current) btn.classList.add('active'); else btn.classList.remove('active');

      // solved state (orange)
      if (this.completedLevels.has(i)) btn.classList.add('solved'); else btn.classList.remove('solved');

      // ensure relative positioning so robot indicator can be absolutely placed
      btn.style.position = btn.style.position || 'relative';

      // robot indicator: add/remove span.robot-indicator
      const existing = btn.querySelector('.robot-indicator');
      if (this.assignedRobots.has(i)) {
        if (!existing) {
          const r = document.createElement('span');
          r.className = 'robot-indicator';
          r.textContent = '🤖';
          r.title = 'Robot tildelt dette niveau';
          btn.appendChild(r);
        }
      } else {
        if (existing) existing.remove();
      }
    }
  }
}

window.onload = () => {
  new Game();
};