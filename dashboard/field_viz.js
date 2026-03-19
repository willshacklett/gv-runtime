const canvas = document.getElementById("fieldCanvas");
const ctx = canvas.getContext("2d");

const SIZE = 50;
const CELL_SIZE = canvas.width / SIZE;

let grid = [];
let history = [];

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
// STEP FUNCTION
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
// GRADIENT MAP
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

      let mag = Math.sqrt(dx * dx + dy * dy);

      gradients[i][j] = mag;
    }
  }

  return gradients;
}

// ----------------------
// STABILITY MAP
// ----------------------
function computeStability(grid) {
  history.push(JSON.stringify(grid));

  if (history.length > 10) {
    history.shift();
  }

  if (history.length < 2) {
    return grid;
  }

  let prev = JSON.parse(history[0]);

  let stability = [];

  for (let i = 0; i < SIZE; i++) {
    stability[i] = [];

    for (let j = 0; j < SIZE; j++) {
      let diff = Math.abs(grid[i][j] - prev[i][j]);
      stability[i][j] = 1 - diff;
    }
  }

  return stability;
}

// ----------------------
// CAUSAL MAP
// ----------------------
function computeCausalMap(grid) {
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

      causal[i][j] = influence / neighbors.length;
    }
  }

  return causal;
}

// ----------------------
// DRAW FUNCTION
// ----------------------
function draw() {
  let gradients = computeGradient(grid);
  let stability = computeStability(grid);
  let causal = computeCausalMap(grid);

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {

      let val = grid[i][j];       // field strength
      let grad = gradients[i][j]; // flow intensity
      let stab = stability[i][j]; // stability
      let cause = causal[i][j];   // causal pressure

      // Base RGB
      let r = Math.floor(val * 255);
      let g = Math.floor(grad * 255);
      let b = Math.floor(stab * 255);

      // Boost intensity based on causal influence
      let intensity = Math.min(1, cause * 2);

      r = Math.min(255, r + intensity * 80);
      g = Math.min(255, g + intensity * 80);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

// ----------------------
// LOOP
// ----------------------
function loop() {
  step();
  draw();
  requestAnimationFrame(loop);
}

loop();
