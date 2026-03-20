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
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

const gameCanvas = document.getElementById("game");
const nextCanvas = document.getElementById("next");
const gameCtx = gameCanvas.getContext("2d");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const scoreMobileEl = document.getElementById("scoreMobile");
const linesMobileEl = document.getElementById("linesMobile");
const levelMobileEl = document.getElementById("levelMobile");
const overlayEl = document.getElementById("overlay");
const finalScoreEl = document.getElementById("finalScore");
const startButton = document.getElementById("startButton");
const startButtonMobile = document.getElementById("startButtonMobile");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");
const pauseButtonMobile = document.getElementById("pauseButtonMobile");
const swipeHint = document.getElementById("swipeHint");
const statusText = document.getElementById("statusText");

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
let touchStart = null;
let touchMoved = false;

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

function updateStatus(text) {
  statusText.textContent = text;
}

function vibrate(pattern = 12) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function setPauseLabels(label) {
  pauseButton.textContent = label;
  if (pauseButtonMobile) pauseButtonMobile.textContent = label;
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
  updateStatus("Running");
  setPauseLabels("Pause");
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
  scoreMobileEl.textContent = score;
  linesMobileEl.textContent = lines;
  levelMobileEl.textContent = level;
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
  if (!isRunning || isPaused || !currentPiece) return;
  const rotated = rotate(currentPiece.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const offset of kicks) {
    if (!collide(currentPiece, offset, 0, rotated)) {
      currentPiece.x += offset;
      currentPiece.shape = rotated;
      vibrate(8);
      draw();
      return;
    }
  }
}

function movePiece(direction) {
  if (!isRunning || isPaused || !currentPiece) return;
  if (!collide(currentPiece, direction, 0)) {
    currentPiece.x += direction;
    draw();
  }
}

function softDrop() {
  if (!isRunning || isPaused || !currentPiece) return;
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
  if (!isRunning || isPaused || !currentPiece) return;
  let distance = 0;
  while (!collide(currentPiece, 0, 1)) {
    currentPiece.y += 1;
    distance += 1;
  }
  score += distance * 2;
  vibrate([10, 30, 10]);
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
    updateStatus(cleared >= 4 ? "Tetris!" : `${cleared} line${cleared > 1 ? "s" : ""}`);
    vibrate(cleared >= 4 ? [18, 40, 18] : 14);
    setTimeout(() => {
      if (isRunning && !isPaused) updateStatus("Running");
    }, 700);
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
  updateStatus("Game Over");
  setPauseLabels("Pause");
}

function togglePause() {
  if (!isRunning) return;
  isPaused = !isPaused;
  setPauseLabels(isPaused ? "Resume" : "Pause");
  updateStatus(isPaused ? "Paused" : "Running");
  if (!isPaused) {
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(update);
  } else {
    cancelAnimationFrame(animationFrame);
  }
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const bigint = Number.parseInt(value, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function drawCell(ctx, x, y, color, size) {
  const px = x * size;
  const py = y * size;
  const { r, g, b } = hexToRgb(color);
  const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
  gradient.addColorStop(0, `rgba(${Math.min(255, r + 45)}, ${Math.min(255, g + 45)}, ${Math.min(255, b + 45)}, 1)`);
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, `rgba(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}, 1)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(px + 1.5, py + 1.5, size - 3, size - 3);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(px + 5, py + 4, size - 10, 5);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.28)`;
  ctx.fillRect(px + 4, py + size - 10, size - 8, 5);

  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.38)`;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.45)`;
  ctx.strokeRect(px + 2.5, py + 2.5, size - 5, size - 5);
  ctx.shadowBlur = 0;
}

function drawBoard() {
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  const background = gameCtx.createLinearGradient(0, 0, 0, gameCanvas.height);
  background.addColorStop(0, "rgba(11, 29, 56, 0.98)");
  background.addColorStop(1, "rgba(3, 10, 22, 1)");
  gameCtx.fillStyle = background;
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        drawCell(gameCtx, x, y, board[y][x], BLOCK);
      } else {
        gameCtx.strokeStyle = y % 2 === 0 ? "rgba(255,255,255,0.045)" : "rgba(120,170,255,0.035)";
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
      if (value) drawCell(ctx, offsetX + x, offsetY + y, piece.color, size);
    });
  });
}

function drawGhost() {
  const ghost = { ...currentPiece, y: currentPiece.y };
  while (!collide(ghost, 0, 1)) {
    ghost.y += 1;
  }

  ghost.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      gameCtx.strokeStyle = "rgba(170, 214, 255, 0.45)";
      gameCtx.setLineDash([6, 4]);
      gameCtx.strokeRect((ghost.x + x) * BLOCK + 4, (ghost.y + y) * BLOCK + 4, BLOCK - 8, BLOCK - 8);
      gameCtx.setLineDash([]);
    });
  });
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = "rgba(10, 24, 46, 0.9)";
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

function handleAction(action) {
  if (action === "left") movePiece(-1);
  if (action === "right") movePiece(1);
  if (action === "rotate") rotatePiece();
  if (action === "drop") softDrop();
  if (action === "hardDrop") hardDrop();
  if (action === "pause") togglePause();
}

function bindTouchGestures() {
  gameCanvas.addEventListener("pointerdown", (event) => {
    touchStart = { x: event.clientX, y: event.clientY, time: Date.now() };
    touchMoved = false;
    gameCanvas.setPointerCapture?.(event.pointerId);
    swipeHint.style.opacity = "0.55";
  });

  gameCanvas.addEventListener("pointermove", (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) touchMoved = true;
  });

  gameCanvas.addEventListener("pointerup", (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    const duration = Date.now() - touchStart.time;

    swipeHint.style.opacity = "1";

    if (!touchMoved || (Math.abs(dx) < 12 && Math.abs(dy) < 12)) {
      rotatePiece();
      touchStart = null;
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      const steps = Math.max(1, Math.min(3, Math.floor(Math.abs(dx) / 34)));
      const direction = dx > 0 ? 1 : -1;
      for (let i = 0; i < steps; i++) movePiece(direction);
    } else if (dy > 0) {
      if (dy > 120 || duration < 140) {
        hardDrop();
      } else {
        const steps = Math.max(1, Math.min(5, Math.floor(dy / 28)));
        for (let i = 0; i < steps; i++) softDrop();
      }
    }

    touchStart = null;
  });

  gameCanvas.addEventListener("pointercancel", () => {
    touchStart = null;
    swipeHint.style.opacity = "1";
  });
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
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });

  startButton.addEventListener("click", startGame);
  if (startButtonMobile) startButtonMobile.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", togglePause);
  if (pauseButtonMobile) pauseButtonMobile.addEventListener("click", togglePause);

  bindTouchGestures();
}

bindEvents();
updateStatus("Ready");
draw();
