const canvas = document.getElementById("fieldCanvas");
const ctx = canvas.getContext("2d");

const SIZE = 50;
const CELL_SIZE = canvas.width / SIZE;

let grid = [];
let history = [];
let traceHistory = [];

// ----------------------
// INIT GRID
// ----------------------
for (let i = 0; i < SIZE; i++) {
  grid[i] = [];
  for (let j = 0; j < SIZE; j++) {
    grid[i][j] = Math.random() * 0.2;
  }
}

// ----------------------
// STEP
// ----------------------
function step() {
  let newGrid = [];

  for (let i = 0; i < SIZE; i++) {
    newGrid[i] = [];

    for (let j = 0; j < SIZE; j++) {
      let value = grid[i][j];
      let neighbors = getNeighbors(i, j);

      let avg = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;

      let coupling = (avg - value) * 0.1;
      let decay = value * 0.02;

      let next = value + coupling - decay;

      next = Math.max(0, Math.min(1, next));
      newGrid[i][j] = next;
    }
  }

  grid = newGrid;
}

// ----------------------
// NEIGHBORS
// ----------------------
function getNeighbors(x, y) {
  let vals = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      let nx = x + dx;
      let ny = y + dy;

      if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) {
        vals.push(grid[nx][ny]);
      }
    }
  }

  return vals;
}

// ----------------------
// GRADIENT (FLOW)
// ----------------------
function computeGradient(grid) {
  let gradients = [];

  for (let i = 0; i < SIZE; i++) {
    gradients[i] = [];

    for (let j = 0; j < SIZE; j++) {
      let center = grid[i][j];

      let right = grid[i][j + 1] ?? center;
      let down = grid[i + 1]?.[j] ?? center;

      let dx = right - center;
      let dy = down - center;

      gradients[i][j] = Math.sqrt(dx * dx + dy * dy);
    }
  }

  return gradients;
}

// ----------------------
// STABILITY (EQUILIBRIUM)
// ----------------------
function computeStability(grid) {
  history.push(JSON.stringify(grid));

  if (history.length > 10) history.shift();
  if (history.length < 2) return grid;

  let prev = JSON.parse(history[0]);
  let stability = [];

  for (let i = 0; i < SIZE; i++) {
    stability[i] = [];
    for (let j = 0; j < SIZE; j++) {
      let diff = Math.abs(grid[i][j] - prev[i][j]);
      stability[i][j] = Math.max(0, 1 - diff);
    }
  }

  return stability;
}

// ----------------------
// CAUSAL PRESSURE
// ----------------------
function computeCausal(grid) {
  let causal = [];

  for (let i = 0; i < SIZE; i++) {
    causal[i] = [];

    for (let j = 0; j < SIZE; j++) {
      let center = grid[i][j];
      let neighbors = [];

      if (i > 0) neighbors.push(grid[i - 1][j]);
      if (i < SIZE - 1) neighbors.push(grid[i + 1][j]);
      if (j > 0) neighbors.push(grid[i][j - 1]);
      if (j < SIZE - 1) neighbors.push(grid[i][j + 1]);

      let influence = 0;

      for (let n of neighbors) {
        influence += Math.abs(n - center);
      }

      causal[i][j] = neighbors.length ? influence / neighbors.length : 0;
    }
  }

  return causal;
}

// ----------------------
// TRACE HISTORY
// ----------------------
function updateTrace(grid) {
  traceHistory.push(JSON.parse(JSON.stringify(grid)));
  if (traceHistory.length > 25) traceHistory.shift();
}

// ----------------------
// TRACE (PATH)
// ----------------------
function computeTrace(i, j) {
  if (traceHistory.length < 2) return 0;

  let sum = 0;

  for (let k = 1; k < traceHistory.length; k++) {
    let prev = traceHistory[k - 1][i][j];
    let curr = traceHistory[k][i][j];
    sum += Math.abs(curr - prev);
  }

  return sum / traceHistory.length;
}

// ----------------------
// PATH STABILITY
// ----------------------
function computePathStability(i, j) {
  if (traceHistory.length < 5) return 0;

  let values = traceHistory.map(s => s[i][j]);
  let avg = values.reduce((a, b) => a + b, 0) / values.length;

  let variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length;

  return 1 - Math.min(1, variance * 10);
}

// ----------------------
// LIFECYCLE STAGE
// ----------------------
function computeLifecycle(val, grad, stab, trace) {
  if (grad > 0.2 && trace < 0.1) return 1; // start
  if (grad > 0.2 && trace > 0.1) return 2; // propagation
  if (stab > 0.8 && trace > 0.1) return 3; // settlement
  if (stab > 0.9 && trace < 0.05) return 4; // persistence
  return 0;
}

// ----------------------
// DRAW
// ----------------------
function draw() {
  let gradients = computeGradient(grid);
  let stability = computeStability(grid);
  let causal = computeCausal(grid);

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {

      let val = grid[i][j];
      let grad = gradients[i][j];
      let stab = stability[i][j];
      let cause = causal[i][j];
      let trace = computeTrace(i, j);
      let pathStab = computePathStability(i, j);

      let stage = computeLifecycle(val, grad, stab, trace);

      let r = val * 255;
      let g = grad * 255;
      let b = stab * 255;

      // pressure heat
      r += cause * 120;

      // trace glow
      let traceBoost = trace * 150;
      r += traceBoost;
      g += traceBoost;
      b += traceBoost;

      // path persistence
      b += pathStab * 120;

      // lifecycle tint
      if (stage === 1) r += 80;        // start = red
      if (stage === 2) g += 80;        // propagation = green
      if (stage === 3) b += 80;        // settlement = blue
      if (stage === 4) {               // persistence = white
        r += 60; g += 60; b += 60;
      }

      r = Math.min(255, r);
      g = Math.min(255, g);
      b = Math.min(255, b);

      ctx.fillStyle = `rgb(${r|0}, ${g|0}, ${b|0})`;
      ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

// ----------------------
// LOOP
// ----------------------
function loop() {
  step();
  updateTrace(grid);
  draw();
  requestAnimationFrame(loop);
}

loop();
