const gridSize = 5;
let currentInput = null; // Track focused input
let pencilMode = false;
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
const d = new Date()
const inputs = [];
let today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const rand = mulberry32(today);

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

// Create the grid and input cells
for (let r = 0; r < gridSize; r++) {
  inputs[r] = [];
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
    kenken.appendChild(div);
  }
}
// handle clicks on number tiles or keydowns
const handleInput = (cell, number) => {
  // Don't allow pencil marks if a number is already present
  const input = cell.querySelector('input');
  if (pencilMode && input.value.match(/^[1-5]$/)) return;

  if (pencilMode) {
    // Do NOT update input value
    let markDiv = cell.querySelector('.pencil-marks');
    if (!markDiv) {
      markDiv = document.createElement('div');
      markDiv.classList.add('pencil-marks');
      cell.appendChild(markDiv);
    }

    const existing = markDiv.innerText.split('').filter(n => n !== '');
    if (existing.includes(number)) {
      markDiv.innerText = existing.filter(n => n !== number).join('');
    } else {
      existing.push(number);
      markDiv.innerText = [...new Set(existing)].sort().join('');
    }
  } else {
    // Normal mode — set input value
    currentInput.value = number;

    // Clear pencil marks
    const markDiv = cell.querySelector('.pencil-marks');
    if (markDiv) markDiv.remove();

    currentInput.focus();
  }
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
  cell.appendChild(label);

  cage.cells.forEach(([r, c]) => {
    const cageCell = document.querySelector(`[data-row='${r}'][data-col='${c}']`);
    cageCell.style.backgroundColor = color;
  });
});

// Timer setup
let timerInterval;
let startTime = Date.now();
timerInterval = setInterval(() => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const paddedSeconds = seconds.toString().padStart(2, '0'); // ensures 0–9 become "00"–"09"
  document.getElementById('timer').innerText = ` ${minutes}:${paddedSeconds}`;
}, 1000);

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

      // const cageSize = 1 + Math.floor(rand() * 3); // cage size: 1 to 3
      const weights = [0.45, 0.45, 0.10]; // For sizes 2, 3, 4
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

function checkPuzzle() {
  let correct = true;
  outer: for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const input = document.querySelector(`[data-row='${r}'][data-col='${c}'] input`).value;
      if (parseInt(input) !== solution[r][c]) {
        correct = false;
        break outer;
      }
    }
  }
  clearInterval(timerInterval);
  const modal = document.getElementById('modal');
  const modalText = document.getElementById('modalText');
  if (correct) {
    confetti();
    modalText.innerText = 'Congratulations! You solved it!';
  } else {
    modalText.innerText = 'Not quite. Keep trying!';
  }
  modal.style.display = 'flex';
}
