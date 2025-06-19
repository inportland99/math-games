const gridSize = 5;
let currentInput = null; // Track focused input
let pencilMode = false;
let currentBoard = [];   // 2D array of { value: string, pencil: [] }
let undoStack = [];
let redoStack = [];
const d = new Date()
const inputs = [];
let today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const rand = mulberry32(today);
let solved = false;
// Timer setup
let timerInterval;
let startTime;
let elapsed = 0;
let isPaused = false;

// Define cage colors for visual differentiation
const cageColors = [
  '#FFB3BA', // pastel red
  '#FFDFBA', // pastel orange
  '#FFFFBA', // pastel yellow
  '#BAFFC9', // pastel green
  '#BAE1FF', // pastel blue
  '#D5BAFF', // pastel purple
  '#FFCCE5', // pastel pink
  '#E6E6FA', // lavender
  '#B5EAD7', // mint green
  '#C7CEEA', // light periwinkle
  '#F6D6AD', // peach
  '#FBE7C6', // cream
  '#AFCBFF', // baby blue
  '#E2F0CB'  // pastel lime
];

window.onload = function() {
  const d = new Date();
  document.getElementById("daily-number").textContent = `🗓️ Daily Game: ${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Show intro modal on page load
window.addEventListener('DOMContentLoaded', () => {
  loadGameState();
  startTimer();
  const welcomeModal = new bootstrap.Modal(document.getElementById('welcomeModal'));

  if (elapsed == 0) {
    welcomeModal.show();
    pauseTimer(); // Pause the timer until the user starts
  }
  // Automatically start the timer when the modal is closed
  const welcomeModalEl = document.getElementById('welcomeModal');
  if (welcomeModalEl) {
    welcomeModalEl.addEventListener('hidden.bs.modal', () => {
      resumeTimer();
    });
  }

  const pauseModalEl = document.getElementById('pauseModal');
  if (pauseModalEl) {
    pauseModalEl.addEventListener('hidden.bs.modal', () => {
      resumeTimer();
    });
  }

  document.getElementById('startButton').onclick = () => {
    welcomeModal.hide();
    startTimer();
  };

  document.getElementById('pauseButton').onclick = () => {
    pauseTimer();
    const pauseModal = new bootstrap.Modal(document.getElementById('pauseModal'));
    pauseModal.show();
  };

  document.getElementById('resumeButton').onclick = () => {
    const pauseModalEl = document.getElementById('pauseModal');
    const pauseModal = bootstrap.Modal.getInstance(pauseModalEl);
    pauseModal.hide();
    resumeTimer();
  };
});

// Generate a seeded Latin square for the current date
const solution = generateSeededLatinSquare(gridSize, today);
console.log("Daily solution grid:", solution);

// Generate cages based on the solution
const cages = generateCages(solution, rand);
console.log("Generated cages:", cages);

const kenken = document.getElementById('kenken');

document.getElementById('pencilModeSwitch').addEventListener('change', (e) => {
  pencilMode = e.target.checked;
  document.querySelectorAll('.tile').forEach(tile => {
    tile.classList.toggle('pencil', pencilMode);
  });
  if (currentInput) {
    currentInput.focus();
  }
});

document.getElementById("undo-button").addEventListener("click", undoLastMove);
document.getElementById("redo-button").addEventListener("click", redoLastMove);

document.querySelectorAll('.tile').forEach(button => {
  button.addEventListener('click', () => {
    if (!currentInput) return;
    const number = button.dataset.number;
    const cell = currentInput.parentElement;
    handleInput(cell, number);
    // Restore focus to allow continued keyboard input
    currentInput.focus();
  });
});

document.getElementById("clear-game").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the puzzle and restart?")) {
    localStorage.removeItem("kenkenGameState");
    location.reload();
  }
});

// Create the grid and input cells
for (let r = 0; r < gridSize; r++) {
  inputs[r] = [];
  currentBoard[r] = [];
  for (let c = 0; c < gridSize; c++) {
    const div = document.createElement('div');
    div.classList.add('cell');
    div.dataset.row = r;
    div.dataset.col = c;

    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('inputmode', 'none'); // Prevents mobile keyboard
    input.setAttribute('readonly', 'true');  // Prevents blinking cursor and typing
    input.setAttribute('maxlength', '1');
    inputs[r][c] = input;
    input.addEventListener('focus', () => {
      if (currentInput && currentInput !== input) {
        currentInput.parentElement.classList.remove('focused');
      }
      currentInput = input;
      input.parentElement.classList.add('focused');
    });

    input.addEventListener('keydown', e => {
      const row = parseInt(div.dataset.row);
      const col = parseInt(div.dataset.col);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (row > 0) inputs[row - 1][col].focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (row < gridSize - 1) inputs[row + 1][col].focus();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (col > 0) inputs[row][col - 1].focus();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (col < gridSize - 1) inputs[row][col + 1].focus();
          break;
        case 'Backspace':
          e.preventDefault();
          if (!currentInput) break;

          if (pencilMode) {
            currentInput.parentElement.querySelector('.pencil-marks').innerHTML = ''; // Clear pencil marks
            currentBoard[row][col].pencil = []; // Clear pencil marks in board state
          } else {
            currentInput.value = ''; // Clear main value                currentBoard[row][col].pencil = [];
            currentBoard[row][col].value = ''; // Clear main value in board state
          }
          saveGameState(); // ✅ Save after change
          break;
        default:
          if (!["1", "2", "3", "4", "5", "Backspace", "Tab"].includes(e.key)) {
            e.preventDefault();
          }
          if (["1", "2", "3", "4", "5"].includes(e.key)) {
            e.preventDefault(); // prevent typing directly
            handleInput(div, e.key); // call the shared input handler
          }
      }
    });

    div.appendChild(input);
    const pencilMarks = document.createElement('div');
    pencilMarks.classList.add('pencil-marks');
    div.appendChild(pencilMarks);
    kenken.appendChild(div);

    // Initialize board state
    currentBoard[r][c] = { value: "", pencil: [] };
  }
}

// Handle clicks on number tiles including eraser or number key presses
const handleInput = (cell, number) => {
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);

  // Don't allow pencil marks if a number is already present
  const input = cell.querySelector('input');
  if (pencilMode && input.value.match(/^[1-5]$/)) return;

  // Add current state to undoStack and reset redoStack
  undoStack.push(cloneBoardState(currentBoard));
  redoStack = [];

  if (pencilMode) {
    if (number == "") {
      currentBoard[row][col].pencil = []; // Clear pencil marks in board state
    } else {
      // Make sure current pencil marks come from board state, not DOM
      let existing = currentBoard[row][col].pencil || [];

      if (existing.includes(number)) {
        existing = existing.filter(n => n !== number);
      } else {
        existing.push(number);
      }

      // Update board state
      currentBoard[row][col].pencil = [...new Set(existing)].sort();
    }

    // Update visual display
    cell.querySelector('.pencil-marks').innerText = currentBoard[row][col].pencil.join('');

  } else {
    // Normal mode — set input value
    currentInput.value = number;
    currentBoard[row][col].value = number;
    currentBoard[row][col].pencil = [];

    // Clear pencil marks
    cell.querySelector('.pencil-marks').innerHTML = '';

    currentInput.focus();

  }
  saveGameState(); // ✅ Save after change
};

// Add cage labels and colors
cages.forEach((cage, index) => {
  const color = cageColors[index % cageColors.length];
  const [firstCell] = cage.cells;
  const selector = `[data-row='${firstCell[0]}'][data-col='${firstCell[1]}']`;
  const cell = document.querySelector(selector);
  const label = document.createElement('div');
  label.classList.add('cage-label');
  label.innerText = cage.label;
  // Regex: number(s) followed by operator
  label.innerHTML = cage.label.replace(/(\d+)([+\-×÷*/])/, 
    (match, num, op) => `${num} <span class="cage-op">${op}</span>`
  );
  cell.appendChild(label);

  cage.cells.forEach(([r, c]) => {
    const cageCell = document.querySelector(`[data-row='${r}'][data-col='${c}']`);
    cageCell.style.backgroundColor = color;
  });
});

// Handle clicks on the grid to focus inputs
document.getElementById('kenken').addEventListener('click', (e) => {
  const clicked = e.target;

  if (clicked.classList.contains('pencil-marks') || clicked.classList.contains('cage-label')) {
    const cell = clicked.closest('.cell');
    const input = cell?.querySelector('input');
    if (input) input.focus();
  }
});



// Timer functions
function startTimer() {
  startTime = Date.now() - elapsed * 1000;
  timerInterval = setInterval(updateTimer, 1000); // Update every second
  isPaused = false;
}

function updateTimer() {
  if (!isPaused) {
    elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('timer').innerText = ` ${minutes}:${seconds.toString().padStart(2, '0')}`;
    saveGameState();
  }
}

function pauseTimer() {
  isPaused = true;
  clearInterval(timerInterval);
  console.log(`Timer paused at ${elapsed} seconds`);
}

function resumeTimer() {
  startTime = Date.now() - elapsed * 1000;
  timerInterval = setInterval(updateTimer, 1000);
  isPaused = false;
  console.log(`Timer resumed at ${elapsed} seconds`);
}

// Pause timer if window loses focus, resume if regains focus and not paused by user
window.addEventListener('blur', () => {
  if (!isPaused) pauseTimer();
  console.log(`Timer paused due to window blur at ${elapsed} seconds`);
});
window.addEventListener('focus', () => {
  // Only resume if not paused by user
  const pauseModal = document.getElementById('pauseModal');
  if (!pauseModal.classList.contains('show') && isPaused) resumeTimer();
  console.log(`Timer resumed due to window focus at ${elapsed} seconds`);
});

// Handle space key to toggle pencil mode
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    e.preventDefault();
    const pencilSwitch = document.getElementById('pencilModeSwitch');
    pencilSwitch.checked = !pencilSwitch.checked;
    pencilMode = pencilSwitch.checked;
    document.querySelectorAll('.tile').forEach(tile => {
      tile.classList.toggle('pencil', pencilMode);
    });

    if (currentInput) currentInput.focus();
  }
});

// Seeded random number generator using mulberry32
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Create a Latin square by rotating a base row
function generateBaseLatinSquare(n) {
  const grid = [];
  const base = [...Array(n)].map((_, i) => i + 1);
  for (let i = 0; i < n; i++) {
    grid.push([...base.slice(i), ...base.slice(0, i)]);
  }
  return grid;
}

// Fisher-Yates shuffle using seeded RNG
function shuffleArray(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Shuffle rows and columns to generate a random Latin square
function generateSeededLatinSquare(n, seedString) {
  // const seed = seedString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rand = mulberry32(seedString);
  const square = generateBaseLatinSquare(n);

  // Shuffle rows
  const rowIndices = [...Array(n).keys()];
  shuffleArray(rowIndices, rand);
  const shuffledRows = rowIndices.map(i => square[i]);

  // Shuffle columns
  const colIndices = [...Array(n).keys()];
  shuffleArray(colIndices, rand);
  const finalGrid = shuffledRows.map(row => colIndices.map(i => row[i]));

  return finalGrid;
}

// Generate cages based on the daily solution
function generateCages(solution, rand) {
  const size = solution.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const cages = [];

  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function valid(r, c) {
      return r >= 0 && r < size && c >= 0 && c < size && !visited[r][c];
  }

  function getClue(cage, values) {
    if (values.length === 1) return `${values[0]}`;
    if (values.length === 2) {
      const [a, b] = values;
      const add = a + b;
      const sub = Math.abs(a - b);
      const mul = a * b;
      const div = a > b ? a / b : b / a;
      const options = [];

      if (Number.isInteger(div)) options.push({ op: '÷', val: div });
      options.push({ op: '+', val: add });
      options.push({ op: '-', val: sub });
      options.push({ op: 'x', val: mul });

      const choice = options[Math.floor(rand() * options.length)];
      return `${choice.val}${choice.op}`;
    }
    // from cages with 3 or more cells, we can either sum or multiply
    const sum = values.reduce((a, b) => a + b, 0);
    const product = values.reduce((a, b) => a * b, 1);
    return rand() < 0.5 ? `${sum}+` : `${product}x`;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (visited[r][c]) continue;

      const cage = [[r, c]];
      visited[r][c] = true;

      const weights = [0.6, 0.3, 0.1]; // For sizes 2, 3, 4
      const randomVal = rand();
      let cageSize;
      if (randomVal < weights[0]) cageSize = 2;
      else if (randomVal < weights[0] + weights[1]) cageSize = 3;
      else cageSize = 4;

      let frontier = [[r, c]];

      while (cage.length < cageSize && frontier.length > 0) {
        const [fr, fc] = frontier.pop();
        shuffle(directions);

        for (const [dr, dc] of directions) {
          const nr = fr + dr;
          const nc = fc + dc;

          if (valid(nr, nc)) {
            cage.push([nr, nc]);
            visited[nr][nc] = true;
            frontier.push([nr, nc]);
            break;
          }
        }
      }
      const values = cage.map(([r, c]) => solution[r][c]);
      const label = getClue(cage, values);
      cages.push({ cells: cage, label });
    }
  }

  return cages;
}

// Check the puzzle for errors and validate the solution
function checkPuzzle() {
  // Check for duplicate digits in any row or column
  for (let r = 0; r < gridSize; r++) {
    const seenRow = new Set();
    const seenCol = new Set();
    for (let c = 0; c < gridSize; c++) {
      const rowVal = document.querySelector(`[data-row='${r}'][data-col='${c}'] input`).value;
      const colVal = document.querySelector(`[data-row='${c}'][data-col='${r}'] input`).value;
      if (rowVal) {
        if (seenRow.has(rowVal)) return { status: false, reason: "duplicate_in_row", row: r, value: rowVal };
        seenRow.add(rowVal);
      }
      if (colVal) {
        if (seenCol.has(colVal)) return { status: false, reason: "duplicate_in_col", col: r, value: colVal };
        seenCol.add(colVal);
      }
    }
  }

  // Check for completed cages that do not match their target
  for (const cage of cages) {
    const values = cage.cells.map(([r, c]) =>
      document.querySelector(`[data-row='${r}'][data-col='${c}'] input`).value
    );
    if (values.every(v => v)) {
      // Parse the cage label and check if the values match the target
      const nums = values.map(Number);
      const label = cage.label;
      let valid = false;
      if (/^\d+$/.test(label)) {
        valid = nums[0] === Number(label);
      } else if (label.endsWith('+')) {
        const sum = nums.reduce((a, b) => a + b, 0);
        valid = sum === Number(label.slice(0, -1));
      } else if (label.endsWith('x')) {
        const prod = nums.reduce((a, b) => a * b, 1);
        valid = prod === Number(label.slice(0, -1));
      } else if (label.endsWith('-')) {
        const diff = Math.abs(nums[0] - nums[1]);
        valid = diff === Number(label.slice(0, -1));
      } else if (label.endsWith('÷') || label.endsWith('÷')) {
        const div = nums[0] > nums[1] ? nums[0] / nums[1] : nums[1] / nums[0];
        valid = div === Number(label.slice(0, -1));
      }
      if (!valid) {
        return { status: false, reason: "cage_mismatch", cage, values: nums, label };
      }
    }
  }
  // Check if the entire grid matches the solution
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const inputVal = document.querySelector(`[data-row='${r}'][data-col='${c}'] input`).value;
      if (parseInt(inputVal) !== solution[r][c]) {
        return { status: false, reason: "not_matching_solution", row: r, col: c, value: inputVal, expected: solution[r][c] };
      }
    }
  }
  // If all checks pass and puzzle matches solutions, return success
  return { status: true };
}

function showCheckModal() {
  const result = checkPuzzle();
  const modal = document.getElementById('checkPuzzleModal');
  const modalBody = modal.querySelector('.modal-body');
  switch (result.status) {
    case true:
      solved = true;
      saveGameState(); // Save the solved state
      confetti();
      clearInterval(timerInterval);
      modalBody.innerHTML = `🎉 Problem Solved! 🎉 <br />You solved today's puzzle in ${document.getElementById('timer').innerText.trim()}!`;
      // Save the game state to prevent replay
      modalBody.innerHTML += `
        <br><button id="share-kenken-button" class="btn btn-success mt-3">
          <i class="bi bi-share"></i> Share
        </button>
      `;
      setTimeout(() => {
        const shareBtn = document.getElementById('share-kenken-button');
        if (shareBtn) {
          shareBtn.addEventListener('click', () => {
            const shareText = `MPA's Daily KenKen Challenge<br>I solved it in ${document.getElementById('timer').innerText.trim()}! https://games.mathplusacademy.com/kenken/`;
            navigator.clipboard.writeText(shareText).then(() => {
              shareBtn.innerText = "Copied!";
              setTimeout(() => shareBtn.innerHTML = `Share <i class="fa-solid fa-share-nodes"></i>`, 1500);
            });
          });
        }
        disableImputs(); // Disable inputs to prevent further changes
      }, 0);
      break;
    case false:
      switch (result.reason) {
        case "duplicate_in_row":
          // modalBody.innerHTML = `Duplicate number <b>${result.value}</b> found in row ${result.row + 1}.`;
          modalBody.innerHTML = `Check for a duplicate number in one of the rows.`;
          break;
        case "duplicate_in_col":
          modalBody.innerHTML = `Check for a duplicate number in one of the columns.`;
          break;
        case "cage_mismatch":
          modalBody.innerHTML = `Check your cages to make sure they match the target value.`;
          break;
        case "not_matching_solution":
          modalBody.innerHTML = `No duplicates or cage errors found yet... Keep going!`;
          break;
        default:
          modalBody.innerHTML = 'Not quite. Keep trying!';
      }
      break;
    default:
      modalBody.innerHTML = 'Not quite. Keep trying!';
  }
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

// Create a deep clone of the board state for undo functionality
function cloneBoardState(board) {
  return board.map(row =>
    row.map(cell => ({
      value: cell.value,
      pencil: [...cell.pencil]
    }))
  );
}

// Save game state to localStorage
function saveGameState() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const data = {
    board: currentBoard,
    pencilMode: pencilMode,
    elapsed: elapsed,
    solved: solved,
    date: new Date().toISOString().slice(0, 10)
  };
  localStorage.setItem("kenkenGameState", JSON.stringify(data));
}

// Load game state from localStorage
function loadGameState() {
  const saved = localStorage.getItem("kenkenGameState");
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    const today = new Date().toISOString().slice(0, 10);

    if (data.date === today) {
      currentBoard = data.board;
      pencilMode = data.pencilMode ?? false;
      solved = data.solved;
      if (data.date === today) {
        restoreBoardToDOM();
      }
      elapsed = data.elapsed || 0;
    } else {
      localStorage.removeItem("kenkenGameState");
    }
  } catch (e) {
    console.error("Could not load saved game:", e);
  }
}

// Restore the board state to the DOM
function restoreBoardToDOM() {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = inputs[r][c].parentElement;
      const val = currentBoard[r][c].value;
      const pencil = currentBoard[r][c].pencil;
      inputs[r][c].value = val || "";
      cell.querySelector('.pencil-marks').innerHTML = pencil.join('') || "";
      document.getElementById('timer').innerText = ` ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
    }
  }
  if (solved) disableImputs();
}

// Undo functionality
function undoLastMove() {
  if (undoStack.length === 0) return;
  redoStack.push(cloneBoardState(currentBoard));
  currentBoard = undoStack.pop();
  restoreBoardToDOM();
  saveGameState(); // Keep localStorage updated
}

// Redo functionality
function redoLastMove() {
  if (redoStack.length === 0) return;
  undoStack.push(cloneBoardState(currentBoard));
  currentBoard = redoStack.pop();
  restoreBoardToDOM();
  saveGameState(); // Keep localStorage updated
}

// Disable inputs and change the check puzzle button to share after solving
function disableImputs(){
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.add('disabled-cell');
  });
  // change check puzzle to share button
  document.getElementById('checkPuzzle').innerHTML = `Share <i class="fa-solid fa-share-nodes"></i>`;
  // disable reset puzzle, paus, undo, redo buttons
  document.getElementById('clear-game').disabled = true;
  document.getElementById('undo-button').disabled = true;
  document.getElementById('redo-button').disabled = true;
  document.getElementById('pauseButton').disabled = true;
}

// ADDITIONAL FEATURES
// DONE - Make the timer only run when the window is focused and pause it when not focused
// DONE - Create a start modal that allows the user to start a new game or continue an existing one
// Check for more than one solution and change the cages accordingly
// Copy this into a 4x4 version
// DONE - Don't allow replay after completion
// DONE - Add a Share button to checkPuzzle modal
// DONE - Don't load yesterdays game today
// DONE - Save timer to localStorage and restore on load
// DONE - Restart timer if check puzzle fails (on closing the check modal)
// DONE - Add commentary to the checkPuzzle modal - check row/col integrity, check cage integrity keep going.
// DONE - Fix erasers so they udpate the board state not just the DOM
// DONE - Put instructions in help modal
// DONE - Create a component that adds modals programmatically (see tutorial)
// DONE - Delete key should erase the number or pencil marks
// DONE - Undo/Redo functionality
// DONE - Make clue and pencil marks clickable to change input