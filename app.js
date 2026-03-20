const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const LINES_PER_LEVEL = 10;
const BASE_DROP_INTERVAL = 850;

const COLORS = {
  I: "#40d3ff",
  J: "#3774ff",
  L: "#ff9f45",
  O: "#ffd75b",
  S: "#67e8a5",
  T: "#b073ff",
  Z: "#ff6f86",
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const gameCanvas = document.getElementById("game");
const nextCanvas = document.getElementById("next");
const gameCtx = gameCanvas.getContext("2d");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const overlayEl = document.getElementById("overlay");
const finalScoreEl = document.getElementById("finalScore");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

let board = createBoard();
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let lastTime = 0;
let dropCounter = 0;
let animationFrame = null;
let isRunning = false;
let isPaused = false;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomType() {
  const keys = Object.keys(SHAPES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function createPiece(type = randomType()) {
  const shape = SHAPES[type].map((row) => [...row]);
  return {
    type,
    shape,
    color: COLORS[type],
    x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2),
    y: 0,
  };
}

function resetGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  lastTime = 0;
  isPaused = false;
  overlayEl.classList.add("hidden");
  currentPiece = createPiece();
  nextPiece = createPiece();
  updateStats();
  draw();
}

function startGame() {
  resetGame();
  isRunning = true;
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(update);
}

function updateStats() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function collide(piece, offsetX = 0, offsetY = 0, shape = piece.shape) {
  return shape.some((row, y) =>
    row.some((value, x) => {
      if (!value) return false;
      const nextX = piece.x + x + offsetX;
      const nextY = piece.y + y + offsetY;
      return nextX < 0 || nextX >= COLS || nextY >= ROWS || (nextY >= 0 && board[nextY][nextX]);
    })
  );
}

function mergePiece() {
  currentPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const boardY = currentPiece.y + y;
        if (boardY >= 0) {
          board[boardY][currentPiece.x + x] = currentPiece.color;
        }
      }
    });
  });
}

function rotate(shape) {
  return shape[0].map((_, index) => shape.map((row) => row[index]).reverse());
}

function rotatePiece() {
  const rotated = rotate(currentPiece.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const offset of kicks) {
    if (!collide(currentPiece, offset, 0, rotated)) {
      currentPiece.x += offset;
      currentPiece.shape = rotated;
      draw();
      return;
    }
  }
}

function movePiece(direction) {
  if (!isRunning || isPaused) return;
  if (!collide(currentPiece, direction, 0)) {
    currentPiece.x += direction;
    draw();
  }
}

function softDrop() {
  if (!isRunning || isPaused) return;
  if (!collide(currentPiece, 0, 1)) {
    currentPiece.y += 1;
    score += 1;
    updateStats();
  } else {
    lockPiece();
  }
  dropCounter = 0;
  draw();
}

function hardDrop() {
  if (!isRunning || isPaused) return;
  let distance = 0;
  while (!collide(currentPiece, 0, 1)) {
    currentPiece.y += 1;
    distance += 1;
  }
  score += distance * 2;
  lockPiece();
  draw();
}

function clearLines() {
  let cleared = 0;

  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) continue outer;
    }
    const row = board.splice(y, 1)[0].fill(null);
    board.unshift(row);
    cleared++;
    y++;
  }

  if (cleared > 0) {
    const lineScores = [0, 100, 300, 500, 800];
    score += lineScores[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / LINES_PER_LEVEL) + 1;
    updateStats();
  }
}

function lockPiece() {
  mergePiece();
  clearLines();
  currentPiece = nextPiece;
  nextPiece = createPiece();

  if (collide(currentPiece)) {
    endGame();
  }
}

function endGame() {
  isRunning = false;
  cancelAnimationFrame(animationFrame);
  finalScoreEl.textContent = `Score: ${score}`;
  overlayEl.classList.remove("hidden");
}

function togglePause() {
  if (!isRunning) return;
  isPaused = !isPaused;
  if (!isPaused) {
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(update);
  } else {
    cancelAnimationFrame(animationFrame);
  }
}

function drawCell(ctx, x, y, color, size) {
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x * size + 3, y * size + 3, size - 6, 5);
}

function drawBoard() {
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  gameCtx.fillStyle = "rgba(12, 28, 53, 0.85)";
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        drawCell(gameCtx, x, y, board[y][x], BLOCK);
      } else {
        gameCtx.strokeStyle = "rgba(255,255,255,0.04)";
        gameCtx.strokeRect(x * BLOCK + 0.5, y * BLOCK + 0.5, BLOCK - 1, BLOCK - 1);
      }
    }
  }
}

function drawPiece(piece, ctx, size, center = false) {
  const width = piece.shape[0].length;
  const height = piece.shape.length;
  const offsetX = center ? (ctx.canvas.width / size - width) / 2 : piece.x;
  const offsetY = center ? (ctx.canvas.height / size - height) / 2 : piece.y;

  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(ctx, offsetX + x, offsetY + y, piece.color, size);
      }
    });
  });
}

function drawGhost() {
  const ghost = {
    ...currentPiece,
    y: currentPiece.y,
  };

  while (!collide(ghost, 0, 1)) {
    ghost.y += 1;
  }

  ghost.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        gameCtx.strokeStyle = "rgba(170, 214, 255, 0.35)";
        gameCtx.setLineDash([6, 4]);
        gameCtx.strokeRect((ghost.x + x) * BLOCK + 2, (ghost.y + y) * BLOCK + 2, BLOCK - 4, BLOCK - 4);
        gameCtx.setLineDash([]);
      }
    });
  });
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = "rgba(12, 28, 53, 0.85)";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawPiece(nextPiece, nextCtx, 24, true);
}

function draw() {
  drawBoard();
  if (currentPiece) {
    drawGhost();
    drawPiece(currentPiece, gameCtx, BLOCK);
  }
  if (nextPiece) drawNext();
}

function update(time = 0) {
  if (!isRunning || isPaused) return;

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  const interval = Math.max(120, BASE_DROP_INTERVAL - (level - 1) * 65);
  if (dropCounter >= interval) {
    if (!collide(currentPiece, 0, 1)) {
      currentPiece.y += 1;
    } else {
      lockPiece();
    }
    dropCounter = 0;
  }

  draw();
  animationFrame = requestAnimationFrame(update);
}

function bindEvents() {
  document.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case "ArrowLeft":
        movePiece(-1);
        break;
      case "ArrowRight":
        movePiece(1);
        break;
      case "ArrowUp":
        rotatePiece();
        break;
      case "ArrowDown":
        softDrop();
        break;
      case " ":
        hardDrop();
        break;
      case "p":
      case "P":
        togglePause();
        break;
      default:
        break;
    }
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "left") movePiece(-1);
      if (action === "right") movePiece(1);
      if (action === "rotate") rotatePiece();
      if (action === "drop") softDrop();
      if (action === "hardDrop") hardDrop();
    });
  });

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
}

bindEvents();
draw();
