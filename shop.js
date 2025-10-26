class Shop {
  constructor(game) {
    this.game = game;
    // count = antal tilgængelige på lager; purchased = hvor mange der er købt historisk (pris-basis)
    this.operators = {
      '+': { count: 1, purchased: 1, basePrice: 15, multiplier: 1.5 },
      '-': { count: 0, purchased: 0, basePrice: 15, multiplier: 1.5 },
      '*': { count: 0, purchased: 0, basePrice: 20, multiplier: 1.5 },
      '/': { count: 0, purchased: 0, basePrice: 25, multiplier: 1.5 }
    };
    // robot følger samme mønster (pris for næste robot beregnes ud fra antal købt)
    this.robot = { count: 0, purchased: 0, basePrice: 100, multiplier: 1.5 };

    document.addEventListener('points-changed', () => this.render());
    this.render();
  }

  // beregn pris for næste operator-køb (heltal)
  getOperatorPrice(operator) {
    const data = this.operators[operator];
    if (!data) return Infinity;
    const nextIndex = data.purchased || 0; // pris baseret på hvor mange der er købt historisk
    return Math.ceil(data.basePrice * Math.pow(data.multiplier || 1.5, nextIndex));
  }

  // beregn pris for næste robot
  getRobotPrice() {
    const r = this.robot;
    const nextIndex = r.purchased || 0;
    return Math.ceil(r.basePrice * Math.pow(r.multiplier || 1.5, nextIndex));
  }

  render() {
    const shopOperatorsEl = document.getElementById('shop-operators');
    shopOperatorsEl.innerHTML = '';

    for (const [op, data] of Object.entries(this.operators)) {
      const container = document.createElement('div');
      container.className = 'shop-operator-container';
      container.style.marginBottom = '16px';

      const btn = document.createElement('button');
      const price = this.getOperatorPrice(op);
      btn.textContent = `Køb ${op} (${price}p)`;
      btn.className = 'shop-buy-btn';
      btn.disabled = this.game.points < price;
      btn.addEventListener('click', () => this.buyOperator(op));
      container.appendChild(btn);

      if (data.count > 0) {
        const span = document.createElement('span');
        span.textContent = `Antal: ${data.count}`;
        span.style.marginLeft = '10px';
        container.appendChild(span);

        const dragSpan = document.createElement('span');
        dragSpan.textContent = op;
        dragSpan.className = 'draggable';
        dragSpan.draggable = true;
        dragSpan.dataset.value = op;
        Object.assign(dragSpan.style, {
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
        dragSpan.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', op);
          dragSpan.style.opacity = '0.5';
        });
        dragSpan.addEventListener('dragend', () => {
          dragSpan.style.opacity = '1';
        });
        container.appendChild(dragSpan);
      }

      shopOperatorsEl.appendChild(container);
    }

    const robotContainer = document.createElement('div');
    robotContainer.className = 'shop-operator-container';
    robotContainer.style.marginBottom = '16px';

    const robotPrice = this.getRobotPrice();
    const robotBtn = document.createElement('button');
    robotBtn.textContent = `Køb Robot (${robotPrice}p)`;
    robotBtn.className = 'shop-buy-btn';
    robotBtn.disabled = this.game.points < robotPrice;
    robotBtn.addEventListener('click', () => this.buyRobot());
    robotContainer.appendChild(robotBtn);

    if (this.robot.count > 0) {
      const robotSpan = document.createElement('span');
      robotSpan.textContent = `Robotter: ${this.robot.count}`;
      robotSpan.style.marginLeft = '10px';
      robotContainer.appendChild(robotSpan);
    }

    shopOperatorsEl.appendChild(robotContainer);

    this.game.renderScore();
  }

  buyOperator(operator) {
    const data = this.operators[operator];
    if (!data) return;
    if ((data.purchased || 0) >= 10) return; // begrænsning baseret på hvor mange købt
    const price = this.getOperatorPrice(operator);
    if (this.game.spendPoints(price)) {
      data.count = (data.count || 0) + 1;       // øg tilgængeligt lager
      data.purchased = (data.purchased || 0) + 1; // øg historisk købt (bestemmer næste pris)
      this.render();
      if (this.game && typeof this.game.saveProgress === 'function') this.game.saveProgress();
    } else {
      // insufficient points - silently fail
    }
  }

  buyRobot() {
    const price = this.getRobotPrice();
    if (this.game.spendPoints(price)) {
      this.robot.count = (this.robot.count || 0) + 1;
      this.robot.purchased = (this.robot.purchased || 0) + 1;
      this.game.robotCount = this.robot.count;
      this.render();
      if (this.game && typeof this.game.saveProgress === 'function') this.game.saveProgress();
    } else {
      // insufficient points
    }
  }

  useOperator(operator) {
    const data = this.operators[operator];
    if (data && data.count > 0) {
      data.count -= 1; // bruger kun lager; purchased påvirkes ikke
      this.render();
      if (this.game && typeof this.game.saveProgress === 'function') this.game.saveProgress();
      return true;
    }
    return false;
  }

  useRobot() {
    if (this.robot.count > 0) {
      this.robot.count -= 1;
      this.game.robotCount = this.robot.count;
      this.render();
      if (this.game && typeof this.game.saveProgress === 'function') this.game.saveProgress();
      return true;
    }
    return false;
  }

  // Tilføjet: nulstil shop-tilstand til startværdier
  reset() {
    // Sæt counts tilbage til de oprindelige startværdier
    // (match værdier i constructor initialisering)
    if (this.operators) {
      for (const key of Object.keys(this.operators)) {
        this.operators[key].count = 0;
        this.operators[key].purchased = 0;
      }
      // '+' startede med 1 i constructor
      if (this.operators['+']) {
        this.operators['+'].count = 1;
        this.operators['+'].purchased = 1;
      }
    }
    if (this.robot) {
      this.robot.count = 0;
      this.robot.purchased = 0;
    }

    // Sørg for at Game holder samme værdi
    if (this.game) {
      this.game.robotCount = this.robot.count || 0;
    }

    // Opdater UI
    this.render();

    // Gem evt. progress hvis spillet bruger save på reset
    if (this.game && typeof this.game.saveProgress === 'function') {
      this.game.saveProgress();
    }
  }
}