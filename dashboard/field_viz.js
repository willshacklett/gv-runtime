const canvas = document.getElementById("fieldCanvas");
const ctx = canvas.getContext("2d");

const SIZE = 50;
let grid = [];

// initialize field
for (let i = 0; i < SIZE; i++) {
  grid[i] = [];
  for (let j = 0; j < SIZE; j++) {
    grid[i][j] = Math.random() * 0.2;
  }
}

function step() {
  let newGrid = [];

  for (let i = 0; i < SIZE; i++) {
    newGrid[i] = [];
    for (let j = 0; j < SIZE; j++) {
      let neighbors = getNeighbors(i, j);
      let avg = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;

      // simulate coupling + decay
      let value = grid[i][j];

      let coupling = (avg - value) * 0.1;
      let decay = value * 0.02;

      let next = value + coupling - decay;

      // clamp
      next = Math.max(0, Math.min(1, next));

      newGrid[i][j] = next;
    }
  }

  grid = newGrid;
}

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

function draw() {
  let cellSize = canvas.width / SIZE;

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      let val = grid[i][j];

      let color = `rgb(${val * 255}, ${50}, ${255 - val * 255})`;

      ctx.fillStyle = color;
      ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
    }
  }
}

function loop() {
  step();
  draw();
  requestAnimationFrame(loop);
}

loop();
