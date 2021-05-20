const INITIAL_PIXEL_SIZE = 25;
const COLUMNS = 20;
const ROWS = 14;
const SPEED = 1;
const INITIAL_SNAKE_SIZE = 3;

var gameCanvas = null;
var gameCtx = null;
var pixelSize = INITIAL_PIXEL_SIZE;
var borderWidth = INITIAL_PIXEL_SIZE * 0.4;
var leftArrowButton;
var upArrowButton;
var rightArrowButton;
var downArrowButton;
var ignoreClicks = false;

var previousTime = 0;
var timeDeltaAcc = 0;
var snakeSize = INITIAL_SNAKE_SIZE;
var snake = [{x: 0, y: 0}];
var direction = {x: 1, y: 0};
var food = {x: -1, y: -1};
var moveNumber = 0;
var gameOver = false;

function initGame(canvas, ctx) {
  gameCanvas = canvas;
  gameCtx = ctx;
  onScreenResized();

  window.addEventListener('resize', onScreenResized);
  window.addEventListener('keydown', onKeyPressed);
  gameCanvas.addEventListener('touchstart', onGameClicked);
  gameCanvas.addEventListener('mousedown', onGameClicked);
  gameCanvas.addEventListener('mousemove', onGameMouseOver);

  requestAnimationFrame(drawAndUpdate);
}

function updateGame() {
  updateSnake();
  updateFood();
  moveNumber++;
}

function updateSnake() {
  // Calculate new position of the head
  const previousHeadPosition = snake[snake.length - 1];
  const newHeadPosition = {
    x: previousHeadPosition.x + direction.x,
    y: previousHeadPosition.y + direction.y
  };

  // Apply corrections for when the snake teleports through the walls
  correctOutsidePosition(newHeadPosition);

  // Update snake
  if ((snake.length + 1) >= snakeSize) {
    snake.splice(0, 1);
  }
  snake.push(newHeadPosition);
  if (snake.some(snakePiece => snakePiece != newHeadPosition && snakePiece.x == newHeadPosition.x && snakePiece.y == newHeadPosition.y)) {
    // The snake collided with itself!
    gameOver = true;
  }
}

function correctOutsidePosition(position) {
  if (position.x < 0) {
    position.x = COLUMNS - 1;
  } else if (position.x >= COLUMNS) {
    position.x = 0;
  }
  if (position.y < 0) {
    position.y = ROWS - 1;
  } else if (position.y >= ROWS) {
    position.y = 0;
  }
}

function updateFood() {
  const headPosition = snake[snake.length - 1];
  if ((food.x == headPosition.x && food.y == headPosition.y) || (food.x == -1)) {
    snakeSize += 1;
    createRandomFood();
  } else if ((moveNumber % 2) == 0 && calculateDistanceToSnakeHead(food.x, food.y) < 5) {
    // If the snake head is close to the food and the food can move in this turn, we move it
    food = calculateBestNextFoodPosition();
  }
}

function calculateBestNextFoodPosition() {
  const possiblePositions = [{x: food.x, y: food.y - 1}, {x: food.x - 1, y: food.y}, {x: food.x + 1, y: food.y}, {x: food.x, y: food.y + 1}];
  shuffleArrayRandomly(possiblePositions);
  var furthestPosition = getFurthestPositionFromSnakeHead(possiblePositions, food);

  if (calculateDistanceToSnakeHead(furthestPosition.x, furthestPosition.y) == 3) {
    // The snake is getting close, so we disregard the furthest distance (the straight line)
    // and try to dodge it by running in a different direction
    const possiblePositionsAlt = direction.x == 0
      ? [ {x: food.x - 1, y: food.y}, {x: food.x + 1, y: food.y} ]
      : [ {x: food.x, y: food.y - 1}, {x: food.x, y: food.y + 1} ];
    shuffleArrayRandomly(possiblePositionsAlt);
    var furthestPosition = getFurthestPositionFromSnakeHead(possiblePositionsAlt, food);
  }

  return furthestPosition;
}

function getFurthestPositionFromSnakeHead(possiblePositions, currentPosition) {
  var furthestPosition = currentPosition;
  var furthestDistance = 0.0;

  possiblePositions.forEach(position => {
    correctOutsidePosition(position);
    const distance = calculateDistanceToSnakeHead(position.x, position.y);
    if (distance > furthestDistance && !snake.some(snakePiece => snakePiece.x == position.x && snakePiece.y == position.y)) {
      furthestDistance = distance;
      furthestPosition = position;
    }
  });

  return furthestPosition;
}

function calculateDistanceToSnakeHead(x, y) {
  var minDistance = 999999.0;

  // The snake head has "multiple" positions because it could go through the walls at any moment
  const headPosition = snake[snake.length - 1];
  const snakeHeadPositions = [
    {x: headPosition.x, y: headPosition.y},
    {x: headPosition.x - COLUMNS, y: headPosition.y},
    {x: headPosition.x + COLUMNS, y: headPosition.y},
    {x: headPosition.x, y: headPosition.y - ROWS},
    {x: headPosition.x - COLUMNS, y: headPosition.y - ROWS},
    {x: headPosition.x + COLUMNS, y: headPosition.y - ROWS},
    {x: headPosition.x, y: headPosition.y + ROWS},
    {x: headPosition.x - COLUMNS, y: headPosition.y + ROWS},
    {x: headPosition.x + COLUMNS, y: headPosition.y + ROWS},
  ];

  snakeHeadPositions.forEach(snakeHeadPosition => {
    const distance = calculateDistance(snakeHeadPosition.x, snakeHeadPosition.y, x, y);
    minDistance = distance < minDistance ? distance : minDistance;
  });

  return minDistance;
}

function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow((x1 - x2), 2) + (Math.pow((y1 - y2), 2)));
}

function createRandomFood() {
  food = { x: Math.round(Math.random() * (COLUMNS - 1)), y: Math.round(Math.random() * (ROWS - 1)) };
  while (snake.some(snakePiece => snakePiece.x == food.x && snakePiece.y == food.y)) {
    createRandomFood();
  }
}

function tryChangeSnakeDirection(x, y) {
  if ((x != 0 && direction.x != 0) || (y != 0 && direction.y != 0)) {
    return;
  }

  direction = {x: x, y: y};
  updateGame();
  timeDeltaAcc = 0;
}

function shuffleArrayRandomly(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function onScreenResized() {
  var newPixelSize = INITIAL_PIXEL_SIZE;
  var newBorderWidth = INITIAL_PIXEL_SIZE * 0.4;
  var newGameCanvasWidth = (newBorderWidth * 2) + (newPixelSize * COLUMNS);
  var newGameCanvasHeight = (newBorderWidth * 2) + ((newPixelSize * ROWS) + (newPixelSize * 6));

  // Scale down the dimensions to make the board fit if necessary
  if (newGameCanvasWidth > window.innerWidth) {
    const scale = window.innerWidth / newGameCanvasWidth;
    newGameCanvasWidth = window.innerWidth;
    newGameCanvasHeight *= scale;
    newPixelSize *= scale;
    newBorderWidth *= scale;
  }
  if (newGameCanvasHeight > window.innerHeight) {
    const scale = window.innerHeight / newGameCanvasHeight;
    newGameCanvasHeight = window.innerHeight;
    newGameCanvasWidth *= scale;
    newPixelSize *= scale;
    newBorderWidth *= scale;
  }

  gameCanvas.width = newGameCanvasWidth;
  gameCanvas.height = newGameCanvasHeight;
  pixelSize = newPixelSize;
  borderWidth = newBorderWidth;
}

function onKeyPressed(event) {
  if (gameOver) {
    return;
  }

  event = event || window.event;

  switch(event.code) {
    case "KeyW":
    case "ArrowUp":
      tryChangeSnakeDirection(0, -1);
      break;

    case "KeyS":
    case "ArrowDown":
      tryChangeSnakeDirection(0, 1);
      break;

    case "KeyA":
    case "ArrowLeft":
      tryChangeSnakeDirection(-1, 0);
      break;

    case "KeyD":
    case "ArrowRight":
      tryChangeSnakeDirection(1, 0);
      break;
  }
}

function onGameClicked(event) {
  if (gameOver) {
    return;
  }

  // If the user clicks on one of the arrow buttons, we execute the move action
  if (event.type == 'touchstart') {
    ignoreClicks = true;
    var canvasBounds = gameCanvas.getBoundingClientRect();
    for (var i = 0; i < event.touches.length; i++) {
      var touch = event.touches.item(i);
      performClick(touch.pageX - canvasBounds.left, touch.pageY - canvasBounds.top);
    }
  } else if (event.type == 'mousedown') {
    if (!ignoreClicks) {
      performClick(event.offsetX, event.offsetY);
    } else {
      ignoreClicks = false;
    }
  }
}

function performClick(x, y) {
  if (gameCtx.isPointInPath(upArrowButton, x, y)) {
    tryChangeSnakeDirection(0, -1);
  } else if (gameCtx.isPointInPath(downArrowButton, x, y)) {
    tryChangeSnakeDirection(0, 1);
  } else if (gameCtx.isPointInPath(leftArrowButton, x, y)) {
    tryChangeSnakeDirection(-1, 0);
  } else if (gameCtx.isPointInPath(rightArrowButton, x, y)) {
    tryChangeSnakeDirection(1, 0);
  }
}

function onGameMouseOver(event) {
  // If the user moves the mouse over one of the arrow buttons, we set the pointer cursor
  const canvasOffset = rect = gameCanvas.getBoundingClientRect();
  const mouseX = parseInt(event.clientX - canvasOffset.left);
  const mouseY = parseInt(event.clientY - canvasOffset.top);
  if (gameCtx.isPointInPath(upArrowButton, mouseX, mouseY) ||
    gameCtx.isPointInPath(downArrowButton, mouseX, mouseY) ||
    gameCtx.isPointInPath(leftArrowButton, mouseX, mouseY) ||
    gameCtx.isPointInPath(rightArrowButton, mouseX, mouseY)) {
      document.body.style.cursor = 'pointer';
  } else {
    document.body.style.cursor = 'auto';
  }
}

function drawAndUpdate(time) {
  const timeDelta = (time - previousTime) * 0.01 * SPEED;
  previousTime = time;
  timeDeltaAcc += timeDelta;

  // Draw background
  gameCtx.fillStyle = "#2c4139";
  gameCtx.fillRect(0, 0, (borderWidth * 2) + (COLUMNS * pixelSize), (borderWidth * 2) + ((pixelSize * ROWS) + (pixelSize * 6)));
  gameCtx.fillStyle = "#7dcea5";
  gameCtx.strokeStyle = "#72c098";
  gameCtx.fillRect(borderWidth, borderWidth, COLUMNS * pixelSize, ROWS * pixelSize);

  // Draw food
  gameCtx.fillStyle = "#2c4139";
  gameCtx.fillRect(borderWidth + (food.x * pixelSize), borderWidth + food.y * pixelSize, pixelSize, pixelSize);

  // Draw snake
  snake.forEach(snakePiece => gameCtx.fillRect(borderWidth + (snakePiece.x * pixelSize), borderWidth + (snakePiece.y * pixelSize), pixelSize, pixelSize));

  // Draw borders between pixels
  for (var i = 1; i < COLUMNS; i++) {
    gameCtx.beginPath();
    gameCtx.moveTo(borderWidth + (i * pixelSize), borderWidth);
    gameCtx.lineTo(borderWidth + (i * pixelSize), borderWidth + (pixelSize * ROWS));
    gameCtx.stroke();
  }
  for (var j = 1; j < ROWS; j++) {
    gameCtx.beginPath();
    gameCtx.moveTo(borderWidth, borderWidth + (pixelSize * j));
    gameCtx.lineTo(borderWidth + (COLUMNS * pixelSize), borderWidth + (pixelSize * j));
    gameCtx.stroke();
  }

  // Define and draw arrow buttons
  gameCtx.font = "bold " + (pixelSize * 1.5) + "px Arial";
  const arrowHeight = 0.5 * ((borderWidth * 3) + (pixelSize * 4));
  const arrowWidth = arrowHeight * 1.5;
  const arrowButtonMarginLeft = borderWidth + (COLUMNS * pixelSize);
  const arrowButtonMarginTop = (borderWidth * 2) + (ROWS * pixelSize);
  const arrowMarginLeft = arrowButtonMarginLeft - (0.5 * arrowWidth);
  const arrowMarginTop = arrowButtonMarginTop + (0.5 * arrowHeight);

  gameCtx.fillStyle = "#a8ecc9";

  leftArrowButton = new Path2D();
  gameCtx.beginPath();
  leftArrowButton.rect(arrowButtonMarginLeft - (3.5 * arrowWidth) - (borderWidth * 2), arrowButtonMarginTop, arrowWidth, arrowHeight * 2 + borderWidth);
  gameCtx.fill(leftArrowButton);

  upArrowButton = new Path2D();
  gameCtx.beginPath();
  upArrowButton.rect(arrowButtonMarginLeft - (2.5 * arrowWidth) - borderWidth, arrowButtonMarginTop, arrowWidth * 1.5, arrowHeight);
  gameCtx.fill(upArrowButton);

  rightArrowButton = new Path2D();
  gameCtx.beginPath();
  rightArrowButton.rect(arrowButtonMarginLeft - arrowWidth, arrowButtonMarginTop, arrowWidth, arrowHeight * 2 + borderWidth);
  gameCtx.fill(rightArrowButton);

  downArrowButton = new Path2D();
  gameCtx.beginPath();
  downArrowButton.rect(arrowButtonMarginLeft - (2.5 * arrowWidth) - borderWidth, arrowButtonMarginTop + arrowHeight + borderWidth, arrowWidth * 1.5, arrowHeight);
  gameCtx.fill(downArrowButton);

  gameCtx.fillStyle = "#2c4139";
  gameCtx.fillText("←", arrowMarginLeft - (2.5 * arrowWidth) - (borderWidth * 2), arrowMarginTop + ((arrowHeight + borderWidth) * 0.5));
  gameCtx.fillText("↑", arrowMarginLeft - (1.25 * arrowWidth) - borderWidth, arrowMarginTop);
  gameCtx.fillText("→", arrowMarginLeft, arrowMarginTop + ((arrowHeight + borderWidth) * 0.5));
  gameCtx.fillText("↓", arrowMarginLeft - (1.25 * arrowWidth) - borderWidth, arrowMarginTop + arrowHeight + borderWidth);

  // Draw score
  const score = snakeSize - INITIAL_SNAKE_SIZE - 1;
  const correctedScore = score < 0 ? 0 : score;
  gameCtx.fillStyle = "#a8ecc9";
  gameCtx.font = (pixelSize * 2.5) + "px Georgia";
  gameCtx.textBaseline = 'middle';
  gameCtx.textAlign = "center";
  gameCtx.fillText(correctedScore, (borderWidth * 0.5) + ((arrowButtonMarginLeft - (3.5 * arrowWidth) - (borderWidth * 3)) * 0.5), (borderWidth * 1.5) + ((ROWS + 3) * pixelSize));

  // If the game is not over and movement is due, update game state
  if (!gameOver && timeDeltaAcc >= 1) {
    for (var i = 0; i < Math.floor(timeDeltaAcc); i++) {
      updateGame();
    }
    timeDeltaAcc %= 1;
  }

  requestAnimationFrame(drawAndUpdate);
}