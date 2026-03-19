const canvas = document.getElementById("fieldCanvas");
const ctx = canvas.getContext("2d");

const SIZE = 50;
const CELL_SIZE = canvas.width / SIZE;

let grid = [];
let history = [];
let traceHistory = [];
let lifecycleHistory = [];
let stagePersistenceMap = [];

// ----------------------
// INIT
// ----------------------
for (let i = 0; i < SIZE; i++) {
  grid[i] = [];
  stagePersistenceMap[i] = [];

  for (let j = 0; j < SIZE; j++) {
    grid[i][j] = Math.random() * 0.2;
    stagePersistenceMap[i][j] = 0;
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

      let next = value + (avg - value) * 0.1 - value * 0.02;
      next = Math.max(0, Math.min(1, next));

      newGrid[i][j] = next;
    }
  }

  grid = newGrid;
}

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
// METRICS
// ----------------------
function computeGradient(grid) {
  let out = [];

  for (let i = 0; i < SIZE; i++) {
    out[i] = [];

    for (let j = 0; j < SIZE; j++) {
      let c = grid[i][j];
      let dx = (grid[i][j + 1] ?? c) - c;
      let dy = (grid[i + 1]?.[j] ?? c) - c;
      out[i][j] = Math.sqrt(dx * dx + dy * dy);
    }
  }

  return out;
}

function computeStability(grid) {
  history.push(JSON.stringify(grid));
  if (history.length > 10) history.shift();
  if (history.length < 2) return grid;

  let prev = JSON.parse(history[0]);
  let out = [];

  for (let i = 0; i < SIZE; i++) {
    out[i] = [];
    for (let j = 0; j < SIZE; j++) {
      out[i][j] = 1 - Math.abs(grid[i][j] - prev[i][j]);
    }
  }

  return out;
}

function computeCausal(grid) {
  let out = [];

  for (let i = 0; i < SIZE; i++) {
    out[i] = [];

    for (let j = 0; j < SIZE; j++) {
      let c = grid[i][j];
      let n = [];

      if (i > 0) n.push(grid[i - 1][j]);
      if (i < SIZE - 1) n.push(grid[i + 1][j]);
      if (j > 0) n.push(grid[i][j - 1]);
      if (j < SIZE - 1) n.push(grid[i][j + 1]);

      let sum = 0;
      for (let v of n) sum += Math.abs(v - c);

      out[i][j] = sum / n.length;
    }
  }

  return out;
}

// ----------------------
// TRACE
// ----------------------
function updateTrace(grid) {
  traceHistory.push(JSON.parse(JSON.stringify(grid)));
  if (traceHistory.length > 25) traceHistory.shift();
}

function computeTrace(i, j) {
  if (traceHistory.length < 2) return 0;

  let sum = 0;
  for (let k = 1; k < traceHistory.length; k++) {
    sum += Math.abs(traceHistory[k][i][j] - traceHistory[k - 1][i][j]);
  }

  return sum / traceHistory.length;
}

// ----------------------
// LIFECYCLE
// ----------------------
function computeLifecycle(val, grad, stab, trace) {
  if (grad > 0.2 && trace < 0.1) return 1;
  if (grad > 0.2 && trace > 0.1) return 2;
  if (stab > 0.8 && trace > 0.1) return 3;
  if (stab > 0.9 && trace < 0.05) return 4;
  return 0;
}

// ----------------------
// PERSISTENCE + RECLASS
// ----------------------
function updatePersistence(i, j, currentStage, prevStage) {
  if (currentStage === prevStage) {
    stagePersistenceMap[i][j]++;
  } else {
    stagePersistenceMap[i][j] = 0;
  }
}

function computeReclass(i, j) {
  if (lifecycleHistory.length < 2) return 0;

  let changes = 0;

  for (let k = 1; k < lifecycleHistory.length; k++) {
    if (lifecycleHistory[k][i][j] !== lifecycleHistory[k - 1][i][j]) {
      changes++;
    }
  }

  return changes / lifecycleHistory.length;
}

// ----------------------
// DRAW
// ----------------------
function draw() {
  let gradients = computeGradient(grid);
  let stability = computeStability(grid);
  let causal = computeCausal(grid);

  let lifecycleGrid = [];

  for (let i = 0; i < SIZE; i++) {
    lifecycleGrid[i] = [];

    for (let j = 0; j < SIZE; j++) {
      let val = grid[i][j];
      let grad = gradients[i][j];
      let stab = stability[i][j];
      let cause = causal[i][j];
      let trace = computeTrace(i, j);

      let stage = computeLifecycle(val, grad, stab, trace);
      lifecycleGrid[i][j] = stage;

      let prevStage = lifecycleHistory.length
        ? lifecycleHistory[lifecycleHistory.length - 1][i][j]
        : stage;

      updatePersistence(i, j, stage, prevStage);

      let persistence = stagePersistenceMap[i][j] / 50;
      let reclass = computeReclass(i, j);

      let r = val * 255;
      let g = grad * 255;
      let b = stab * 255;

      // pressure
      r += cause * 120;

      // trace glow
      let t = trace * 150;
      r += t; g += t; b += t;

      // persistence = deep blue
      b += persistence * 200;

      // reclass = green flicker
      g += reclass * 200;

      // lifecycle tint
      if (stage === 1) r += 80;
      if (stage === 2) g += 80;
      if (stage === 3) b += 80;
      if (stage === 4) { r += 60; g += 60; b += 60; }

      r = Math.min(255, r);
      g = Math.min(255, g);
      b = Math.min(255, b);

      ctx.fillStyle = `rgb(${r|0}, ${g|0}, ${b|0})`;
      ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  lifecycleHistory.push(JSON.parse(JSON.stringify(lifecycleGrid)));
  if (lifecycleHistory.length > 30) lifecycleHistory.shift();
}

// ----------------------
function loop() {
  step();
  updateTrace(grid);
  draw();
  requestAnimationFrame(loop);
}

loop();
