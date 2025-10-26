class GameScene {
  constructor(game, shop) {
    this.game = game;
    this.shop = shop;
    this.regnehistorieTal = [];
    this.trinCount = 1;
    this.lastAnswer = null;
    this.currentLevel = 1;
    this.facit = null;
    this.levelValuesCache = {};

    this.elements = {
      regnehistorie: document.getElementById('regnehistorie'),
      expressionContainer: document.getElementById('expression-container'),
      shopSidebar: document.getElementById('shop-sidebar'),
      addTrinButton: document.getElementById('add-trin-button'),
      calculateButton: document.getElementById('calculate-button'),
      robotCheckbox: document.getElementById('robot-checkbox'),
    };

    this.init();
    this.setCurrentLevel(1);
  }

  init() {
    this.elements.addTrinButton?.addEventListener('click', () => this.addTrin());
    this.elements.calculateButton?.addEventListener('click', () => this.calculateResult());
    this.elements.robotCheckbox?.addEventListener('change', () => this.toggleRobot());
    this.renderRegnehistorie();
    this.renderExpressionArea();
    this.updateRobotCheckbox();
  }

  renderRegnehistorie() {}

  renderTrinDraggables() {
    let container = document.getElementById('trin-draggables');
    const shopHost = document.getElementById('shop') || this.elements.shopSidebar; // foretræk #shop for korrekt alignment
    if (!container) {
      container = document.createElement('div');
      container.id = 'trin-draggables';
      container.className = 'trin-draggables';
      container.innerHTML = '<strong>Trin-resultater:</strong><br/>';
      if (shopHost) shopHost.appendChild(container);
      else this.elements.shopSidebar?.appendChild(container);
    } else {
      container.innerHTML = '<strong>Trin-resultater:</strong><br/>';
      // Sørg for at container er placeret i korrekt host (hvis host ændret eller DOM blev ryddet)
      if (container.parentElement !== shopHost && shopHost) shopHost.appendChild(container);
    }

    for (let i = 1; i <= this.trinCount; i++) {
      const resEl = document.getElementById(`trin${i}-resultat`);
      const numericValue = resEl?.dataset?.value ?? `trin${i}`;
      container.appendChild(this.createDraggable(`trin${i}`, `trin${i}`, numericValue));
    }
  }

  createDraggable(label, id = null, value = null) {
    const span = document.createElement('span');
    span.textContent = label;
    span.classList.add('draggable');
    span.draggable = true;
    span.dataset.value = value ?? label;
    if (id) span.id = id;

    Object.assign(span.style, {
      display: 'inline-block',
      margin: '4px 8px 4px 0',
      padding: '4px 8px',
      background: '#e3f2fd',
      border: '2px solid #1976d2',
      borderRadius: '5px',
      fontSize: '1em',
      color: '#1976d2',
      cursor: 'grab',
    });

    span.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', span.dataset.value);
      span.style.opacity = '0.5';
    });
    span.addEventListener('dragend', () => {
      span.style.opacity = '1';
    });

    return span;
  }

  renderExpressionArea(existingValues = {}) {
    if (!this.elements.expressionContainer) return;
    this.elements.expressionContainer.innerHTML = '';

    for (let i = 1; i <= this.trinCount; i++) {
      const div = document.createElement('div');
      div.style.marginBottom = '15px';
      div.id = `trin${i}-container`;

      const trinLabel = document.createElement('span');
      trinLabel.textContent = `trin${i}`;
      trinLabel.style.marginRight = '10px';
      div.appendChild(trinLabel);

      ['tal1', 'op', 'tal2'].forEach(field => {
        div.appendChild(this.createDropBox(`trin${i}-${field}`, existingValues[`trin${i}-${field}`]));
      });

      const res = document.createElement('span');
      res.id = `trin${i}-resultat`;
      res.style.marginLeft = '10px';
      if (existingValues[`trin${i}-resultat`]) {
        res.textContent = `= ${existingValues[`trin${i}-resultat`]}`;
        res.dataset.value = existingValues[`trin${i}-resultat`];
      }
      div.appendChild(res);

      if (this.trinCount > 1) {
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-trin-btn';
        removeBtn.style.marginLeft = '10px';
        removeBtn.addEventListener('click', () => this.removeTrin(i));
        div.appendChild(removeBtn);
      }

      this.elements.expressionContainer.appendChild(div);
    }

    this.renderTrinDraggables();
    this.updateRobotCheckbox();
  }

  createDropBox(id, value) {
    const box = document.createElement('div');
    box.classList.add('drop-box');
    box.id = id;
    Object.assign(box.style, {
      display: 'inline-block',
      width: '50px',
      height: '40px',
      border: '2px dashed #1976d2',
      borderRadius: '5px',
      marginRight: '8px',
      textAlign: 'center',
      lineHeight: '40px',
      verticalAlign: 'middle',
      cursor: 'pointer',
    });

    box.addEventListener('dragover', e => e.preventDefault());
    box.addEventListener('drop', e => this.handleDrop(e, box));
    box.addEventListener('contextmenu', e => {
      e.preventDefault();
      const val = box.dataset.value;
      if (!val) return;
      if (Object.keys(this.shop.operators).includes(val)) {
        this.shop.operators[val].count += 1;
        this.shop.render();
      }
      box.textContent = '';
      box.dataset.value = '';
      box.classList.remove('filled');
      this.updateLevelValuesCache();
    });

    if (value !== undefined) {
      box.textContent = this.resolveDisplayValue(value);
      box.dataset.value = value;
      box.classList.add('filled');
    }

    return box;
  }

  handleDrop(event, targetBox) {
    event.preventDefault();
    const val = event.dataTransfer.getData('text/plain');
    if (!val) return;

    if (Object.keys(this.shop.operators).includes(val)) {
      if (this.shop.operators[val].count > 0) {
        this.shop.useOperator(val);
        targetBox.textContent = val;
        targetBox.dataset.value = val;
        targetBox.classList.add('filled');
      }
    } else if (val.startsWith('hist')) {
      const idx = parseInt(val.slice(4));
      const currentTal = window.Levels.regnehistorieTal[idx];
      targetBox.textContent = currentTal;
      targetBox.dataset.value = val;
      targetBox.classList.add('filled');
    } else if (!isNaN(val) || /^trin\d+$/.test(val)) {
      targetBox.textContent = val;
      targetBox.dataset.value = val;
      targetBox.classList.add('filled');
    }

    this.updateLevelValuesCache();
  }

  addTrin() {
    if (this.trinCount >= 10) {
      return;
    }

    const existingValues = this.levelValuesCache[this.currentLevel] || {};
    this.trinCount++;
    this.renderExpressionArea(existingValues);
    this.updateLevelValuesCache();
  }

  removeTrin(trinIndex) {
    if (this.trinCount <= 1) {
      return;
    }

    const existingValues = { ...this.levelValuesCache[this.currentLevel] } || {};
    for (let i = trinIndex; i < this.trinCount; i++) {
      ['tal1', 'op', 'tal2', 'resultat'].forEach(field => {
        const nextKey = `trin${i + 1}-${field}`;
        const currentKey = `trin${i}-${field}`;
        if (existingValues[nextKey]) {
          existingValues[currentKey] = existingValues[nextKey];
        } else {
          delete existingValues[currentKey];
        }
      });
    }
    ['tal1', 'op', 'tal2', 'resultat'].forEach(field => {
      delete existingValues[`trin${this.trinCount}-${field}`];
    });

    this.trinCount--;
    this.levelValuesCache[this.currentLevel] = existingValues;
    this.renderExpressionArea(existingValues);
    this.calculateResult();
  }

  calculateResult() {
    const trinValues = {};

    for (let i = 1; i <= this.trinCount; i++) {
      const tal1Box = document.getElementById(`trin${i}-tal1`);
      const opBox = document.getElementById(`trin${i}-op`);
      const tal2Box = document.getElementById(`trin${i}-tal2`);
      const resSpan = document.getElementById(`trin${i}-resultat`);

      const val1 = this.resolveValue(tal1Box?.dataset.value, trinValues);
      const op = opBox?.dataset.value;
      const val2 = this.resolveValue(tal2Box?.dataset.value, trinValues);

      let numeric = NaN;
      if (val1 != null && op && val2 != null) {
        switch (op) {
          case '+': numeric = val1 + val2; break;
          case '-': numeric = val1 - val2; break;
          case '*': numeric = val1 * val2; break;
          case '/': numeric = val2 !== 0 ? val1 / val2 : NaN; break;
        }
      }

      const shown = Number.isFinite(numeric) ? numeric : '?';
      if (resSpan) {
        resSpan.textContent = `= ${shown}`;
        resSpan.dataset.value = Number.isFinite(numeric) ? String(numeric) : '';
      }

      trinValues[`trin${i}`] = numeric;

      const trinDraggable = document.getElementById(`trin${i}`);
      if (trinDraggable) {
        trinDraggable.dataset.value = Number.isFinite(numeric) ? String(numeric) : '';
        trinDraggable.textContent = `trin${i}`;
      }
    }

    const lastKey = `trin${this.trinCount}`;
    this.lastAnswer = Number.isFinite(trinValues[lastKey]) ? trinValues[lastKey] : null;

    const resultEl = document.getElementById('result');
    if (resultEl) {
      resultEl.textContent = this.lastAnswer != null ? `Resultat: ${this.lastAnswer}` : 'Resultat: ?';
      resultEl.dataset.value = this.lastAnswer != null ? String(this.lastAnswer) : '';
    }

    document.dispatchEvent(new CustomEvent('student-answer', {
      detail: {
        final: this.lastAnswer,
        stepResults: { ...trinValues }
      }
    }));
  }

  resolveValue(val, trinValues) {
    if (val == null || val === '') return null;
    if (val.startsWith('hist')) {
      const idx = parseInt(val.slice(4));
      const histVal = window.Levels.regnehistorieTal[idx];
      return Number.isFinite(histVal) ? histVal : null;
    }
    if (!isNaN(val)) return Number(val);
    if (/^trin\d+$/.test(val)) {
      const v = trinValues[val];
      return Number.isFinite(v) ? v : null;
    }
    return null;
  }

  resolveDisplayValue(val) {
    if (val?.startsWith('hist')) {
      const idx = parseInt(val.slice(4));
      return window.Levels.regnehistorieTal[idx] ?? '';
    }
    return val ?? '';
  }

  updateLevelValuesCache() {
    const existingValues = {};
    for (let i = 1; i <= this.trinCount; i++) {
      ['tal1', 'op', 'tal2'].forEach(field => {
        const el = document.getElementById(`trin${i}-${field}`);
        if (el?.dataset.value !== undefined) {
          existingValues[`trin${i}-${field}`] = el.dataset.value;
        }
      });
      const resEl = document.getElementById(`trin${i}-resultat`);
      if (resEl?.dataset.value !== undefined) {
        existingValues[`trin${i}-resultat`] = resEl.dataset.value;
      }
    }
    this.levelValuesCache[this.currentLevel] = existingValues;
  }

  updateDroppedValues() {
    const cachedValues = this.levelValuesCache[this.currentLevel] || {};
    this.trinCount = Object.keys(cachedValues).filter(k => k.includes('tal1')).length || 1;
    this.renderExpressionArea(cachedValues);
    this.calculateResult();
    this.updateRobotCheckbox();
  }

  toggleRobot() {
    console.log(`Toggling robot for level ${this.currentLevel}. robotCount: ${this.game.robotCount}, assignedRobots: ${this.game.assignedRobots.size}, levelCompleted: ${this.game.completedLevels.has(this.currentLevel)}`);
    if (!this.game.assignedRobots.has(this.currentLevel)) {
      if (this.game.assignRobotToLevel(this.currentLevel)) {
        this.game.toggleRobotForLevel(this.currentLevel);
      } else {
        this.elements.robotCheckbox.checked = false;
      }
    } else {
      this.game.toggleRobotForLevel(this.currentLevel);
    }
    this.updateRobotCheckbox();
  }

  updateRobotCheckbox() {
    if (this.elements.robotCheckbox) {
      const hasRobot = this.game.assignedRobots.has(this.currentLevel);
      const robot = this.game.assignedRobots.get(this.currentLevel);
      const isActive = robot?.isActive || false;
      const levelCompleted = this.game.completedLevels.has(this.currentLevel);
      const hasUnusedRobots = this.game.robotCount > 0;

      this.elements.robotCheckbox.disabled = !levelCompleted || (!hasRobot && !hasUnusedRobots);
      this.elements.robotCheckbox.checked = hasRobot && isActive;
      this.elements.robotCheckbox.nextElementSibling.textContent = `Robot på level ${this.currentLevel}: ${hasRobot ? (isActive ? 'Tændt' : 'Slukket') : 'Ingen robot'}`;
      console.log(`Updated checkbox for level ${this.currentLevel}: disabled=${this.elements.robotCheckbox.disabled}, checked=${this.elements.robotCheckbox.checked}, isActive=${isActive}, hasRobot=${hasRobot}, robotCount=${this.game.robotCount}`);
    }
  }

  setFacit(value) {
    this.facit = Number.isFinite(Number(value)) ? Number(value) : null;
  }

  getFacit() {
    return this.facit;
  }

  setCurrentLevel(n) {
    this.currentLevel = n;
    this.updateDroppedValues();
    this.updateRobotCheckbox();
    if (window.resetCooldown) window.resetCooldown();
    // Sørg for at Game opdaterer level-knapperne (active/solved/robot)
    if (window.game && typeof window.game.renderLevelStates === 'function') {
      window.game.renderLevelStates();
    }
    console.log(`Set current level to ${n}`);
  }

  getCurrentLevel() {
    return this.currentLevel || 1;
  }
}