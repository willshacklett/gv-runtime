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
let clusterHistory = [];
let loading = false;

// VIEW MODES
let mode = "full"; 
// options: full, origin, persistence, clusters

window.addEventListener("keydown", (e) => {
  if (e.key === "1") mode = "full";
  if (e.key === "2") mode = "origin";
  if (e.key === "3") mode = "persistence";
  if (e.key === "4") mode = "clusters";
});

// ----------------------
function makeGrid(val = 0) {
  let g = [];
  for (let i = 0; i < SIZE; i++) {
    g[i] = [];
    for (let j = 0; j < SIZE; j++) {
      g[i][j] = val;
    }
  }
  return g;
}

grid = makeGrid();
stagePersistenceMap = makeGrid();
originMap = makeGrid();

// ----------------------
function normalize(data) {
  let src = Array.isArray(data) ? data : data.grid;
  if (!src || !src.length) return makeGrid();

  let out = makeGrid();

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      let si = Math.floor((i / SIZE) * src.length);
      let sj = Math.floor((j / SIZE) * src[0].length);
      let v = Number(src[si][sj]);
      out[i][j] = isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    }
  }

  return out;
}

// ----------------------
async function loadState() {
  if (loading) return;
  loading = true;

  try {
    let res = await fetch(STATE_URL, { cache: "no-store" });
    let data = await res.json();
    grid = normalize(data);
  } catch (e) {}

  loading = false;
}

// ----------------------
// METRICS
// ----------------------
function gradient() {
  let g = makeGrid();
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      let c = grid[i][j];
      let dx = (grid[i][j + 1] ?? c) - c;
      let dy = (grid[i + 1]?.[j] ?? c) - c;
      g[i][j] = Math.sqrt(dx * dx + dy * dy);
    }
  }
  return g;
}

function stability() {
  history.push(JSON.stringify(grid));
  if (history.length > 10) history.shift();
  if (history.length < 2) return grid;

  let prev = JSON.parse(history[0]);
  let s = makeGrid();

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      s[i][j] = 1 - Math.abs(grid[i][j] - prev[i][j]);
    }
  }
  return s;
}

function causal() {
  let c = makeGrid();

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      let val = grid[i][j];
      let n = [];

      if (i > 0) n.push(grid[i - 1][j]);
      if (i < SIZE - 1) n.push(grid[i + 1][j]);
      if (j > 0) n.push(grid[i][j - 1]);
      if (j < SIZE - 1) n.push(grid[i][j + 1]);

      let sum = 0;
      for (let v of n) sum += Math.abs(v - val);

      c[i][j] = n.length ? sum / n.length : 0;
    }
  }

  return c;
}

// ----------------------
function updateTrace() {
  traceHistory.push(JSON.parse(JSON.stringify(grid)));
  if (traceHistory.length > 25) traceHistory.shift();
}

function trace(i, j) {
  if (traceHistory.length < 2) return 0;

  let sum = 0;
  for (let k = 1; k < traceHistory.length; k++) {
    sum += Math.abs(
      traceHistory[k][i][j] - traceHistory[k - 1][i][j]
    );
  }

  return sum / traceHistory.length;
}

// ----------------------
function lifecycle(val, grad, stab, tr) {
  if (grad > 0.2 && tr < 0.1) return 1;
  if (grad > 0.2 && tr > 0.1) return 2;
  if (stab > 0.8 && tr > 0.1) return 3;
  if (stab > 0.9 && tr < 0.05) return 4;
  return 0;
}

// ----------------------
function updateOrigin(i, j, tr) {
  if (tr > 0.2) originMap[i][j] += 1;
  else originMap[i][j] *= 0.95;
}

function updatePersistence(i, j, stage, prev) {
  if (stage === prev) stagePersistenceMap[i][j]++;
  else stagePersistenceMap[i][j] = 0;
}

// ----------------------
// CLUSTERS
// ----------------------
function detectClusters(threshold = 0.6) {
  let visited = makeGrid(false);
  let clusters = [];

  function dfs(i, j, c) {
    if (
      i < 0 || j < 0 || i >= SIZE || j >= SIZE ||
      visited[i][j] || grid[i][j] < threshold
    ) return;

    visited[i][j] = true;
    c.push([i, j]);

    dfs(i + 1, j, c);
    dfs(i - 1, j, c);
    dfs(i, j + 1, c);
    dfs(i, j - 1, c);
  }

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (!visited[i][j] && grid[i][j] >= threshold) {
        let c = [];
        dfs(i, j, c);
        if (c.length > 5) clusters.push(c);
      }
    }
  }

  return clusters;
}

// ----------------------
// DRAW
// ----------------------
function draw() {
  let g = gradient();
  let s = stability();
  let c = causal();

  let life = makeGrid();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      let val = grid[i][j];
      let grad = g[i][j];
      let stab = s[i][j];
      let cause = c[i][j];
      let tr = trace(i, j);

      let stage = lifecycle(val, grad, stab, tr);
      life[i][j] = stage;

      let prev = lifecycleHistory.length
        ? lifecycleHistory[lifecycleHistory.length - 1][i][j]
        : stage;

      updatePersistence(i, j, stage, prev);
      updateOrigin(i, j, tr);

      let persistence = stagePersistenceMap[i][j] / 50;
      let origin = originMap[i][j] / 20;

      let r = 0, gC = 0, b = 0;

      if (mode === "full") {
        r = val * 255 + origin * 255;
        gC = grad * 255;
        b = stab * 255 + persistence * 200;
      }

      if (mode === "origin") {
        r = origin * 255;
      }

      if (mode === "persistence") {
        b = persistence * 255;
      }

      ctx.fillStyle = `rgb(${r|0},${gC|0},${b|0})`;
      ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  lifecycleHistory.push(JSON.parse(JSON.stringify(life)));
  if (lifecycleHistory.length > 30) lifecycleHistory.shift();

  if (mode === "clusters") {
    let clusters = detectClusters();

    for (let cluster of clusters) {
      for (let [i, j] of cluster) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }
}

// ----------------------
async function loop() {
  await loadState();
  updateTrace();
  draw();
  requestAnimationFrame(loop);
}

loop();
