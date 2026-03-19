// ------------------------------------
// CAUSAL INFLUENCE MAP
// ------------------------------------

function computeCausalMap(grid) {
  let causal = [];

  for (let i = 0; i < grid.length; i++) {
    causal[i] = [];

    for (let j = 0; j < grid[i].length; j++) {

      let center = grid[i][j];

      let neighbors = [];

      if (i > 0) neighbors.push(grid[i - 1][j]);
      if (i < grid.length - 1) neighbors.push(grid[i + 1][j]);
      if (j > 0) neighbors.push(grid[i][j - 1]);
      if (j < grid.length - 1) neighbors.push(grid[i][j + 1]);

      let influence = 0;

      for (let n of neighbors) {
        influence += Math.abs(n - center);
      }

      causal[i][j] = influence / neighbors.length;
    }
  }

  return causal;
}
