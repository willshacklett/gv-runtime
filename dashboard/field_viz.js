const canvas = document.getElementById("fieldCanvas");
const ctx = canvas.getContext("2d");

const SIZE = 50;
const CELL_SIZE = canvas.width / SIZE;
const STATE_URL = "./data/state.json";

let grid = [];
let history = [];
let traceHistory = [];
let lifecycleHistory = [];
let stagePersistenceMap = [];
let originMap = [];
let loading = false;

// ----------------------
// INIT EMPTY GRID
// ----------------------
function makeEmptyGrid(size, fill = 0) {
  const out = [];
  for (let i = 0; i < size; i++) {
    out[i] = [];
    for (let j = 0; j < size; j++) {
      out[i][j] = fill;
    }
  }
  return out;
}

function initializeState() {
  grid = makeEmptyGrid(SIZE, 0);
  stagePersistenceMap = makeEmptyGrid(SIZE, 0);
  originMap = makeEmptyGrid(SIZE, 0);
}

initializeState();

// ----------------------
// NORMALIZE INCOMING GRID
// ----------------------
function normalizeIncomingGrid(data) {
  // Accept either:
  // 1) a raw 2D array
  // 2) { grid: [...] }
  const source = Array.isArray(data) ? data : data?.grid;

  if (!Array.isArray(source) || source.length === 0) {
    return makeEmptyGrid(SIZE, 0);
  }

  const inRows = source.length;
  const inCols = Array.isArray(source[0]) ? source[0].length : 0;

  if (!inCols) {
    return makeEmptyGrid(SIZE, 0);
  }

  // Resample/fit into SIZE x SIZE
  const out = makeEmptyGrid(SIZE, 0);

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const srcI = Math.min(inRows - 1, Math.floor((i / SIZE) * inRows));
      const srcJ = Math.min(inCols - 1, Math.floor((j / SIZE) * inCols));

      let value = Number(source[srcI][srcJ]);
      if (!Number.isFinite(value)) value = 0;

      // Clamp to [0, 1]
      out[i][j] = Math.max(0, Math.min(1, value));
    }
  }

  return out;
}

// ----------------------
// LIVE STATE LOAD
// ----------------------
async function loadState() {
  if (loading) return;
  loading = true;

  try {
    const res = await fetch(STATE_URL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    grid = normalizeIncomingGrid(data);
  } catch (err) {
    console.warn("Failed to load live state, keeping previous grid:", err);
  } finally {
    loading = false;
  }
}

// ----------------------
// NEIGHBORS
// ----------------------
function getNeighbors(x, y) {
  let vals = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = x + dx;
      const ny = y + dy;

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
      const c = grid[i][j];
      const dx = (grid[i][j + 1] ?? c) - c;
      const dy = (grid[i + 1]?.[j] ?? c) - c;
      out[i][j] = Math.sqrt(dx * dx + dy * dy);
    }
  }

  return out;
}

function computeStability(grid) {
  history.push(JSON.stringify(grid));
  if (history.length > 10) history.shift();

  if (history.length < 2) return grid;

  const prev = JSON.parse(history[0]);
  const out = [];

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
      const c = grid[i][j];
      const n = [];

      if (i > 0) n.push(grid[i - 1][j]);
      if (i < SIZE - 1) n.push(grid[i + 1][j]);
      if (j > 0) n.push(grid[i][j - 1]);
      if (j < SIZE - 1) n.push(grid[i][j + 1]);

      let sum = 0;
      for (const v of n) sum += Math.abs(v - c);

      out[i][j] = n.length ? sum / n.length : 0;
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
  if (grad > 0.2 && trace < 0.1) return 1; // origin/start
  if (grad > 0.2 && trace > 0.1) return 2; // propagation
  if (stab > 0.8 && trace > 0.1) return 3; // settlement
  if (stab > 0.9 && trace < 0.05) return 4; // persistence
  return 0;
}

// ----------------------
// ORIGIN + PERSISTENCE
// ----------------------
function updateOrigins(i, j, trace) {
  if (trace > 0.2) {
    originMap[i][j] += 1;
  } else {
    originMap[i][j] *= 0.95;
  }
}

function updatePersistence(i, j, currentStage, prevStage) {
  if (currentStage === prevStage) {
    stagePersistenceMap[i][j]++;
  } else {
    stagePersistenceMap[i][j] = 0;
  }
}

// ----------------------
// DRAW
// ----------------------
function draw() {
  const gradients = computeGradient(grid);
  const stability = computeStability(grid);
  const causal = computeCausal(grid);

  const lifecycleGrid = [];

  for (let i = 0; i < SIZE; i++) {
    lifecycleGrid[i] = [];

    for (let j = 0; j < SIZE; j++) {
      const val = grid[i][j];
      const grad = gradients[i][j];
      const stab = stability[i][j];
      const cause = causal[i][j];
      const trace = computeTrace(i, j);

      const stage = computeLifecycle(val, grad, stab, trace);
      lifecycleGrid[i][j] = stage;

      const prevStage = lifecycleHistory.length
        ? lifecycleHistory[lifecycleHistory.length - 1][i][j]
        : stage;

      updatePersistence(i, j, stage, prevStage);
      updateOrigins(i, j, trace);

      const persistence = stagePersistenceMap[i][j] / 50;
      const origin = originMap[i][j] / 20;

      let r = val * 255;
      let g = grad * 255;
      let b = stab * 255;

      // pressure / causal heat
      r += cause * 120;

      // origin overlay
      r += origin * 255;

      // trace glow
      const t = trace * 150;
      r += t;
      g += t;
      b += t;

      // persistence depth
      b += persistence * 200;

      // lifecycle tint
      if (stage === 1) r += 80;
      if (stage === 2) g += 80;
      if (stage === 3) b += 80;
      if (stage === 4) {
        r += 60;
        g += 60;
        b += 60;
      }

      r = Math.min(255, r);
      g = Math.min(255, g);
      b = Math.min(255, b);

      ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  lifecycleHistory.push(JSON.parse(JSON.stringify(lifecycleGrid)));
  if (lifecycleHistory.length > 30) lifecycleHistory.shift();
}

// ----------------------
// MAIN LOOP
// ----------------------
async function loop() {
  await loadState();
  updateTrace(grid);
  draw();
  requestAnimationFrame(loop);
}

loop();
