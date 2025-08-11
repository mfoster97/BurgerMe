const sizeEl = document.getElementById('size');
const proteinEl = document.getElementById('protein');
const cheeseSlicesEl = document.getElementById('cheese-slices');
const cheeseTypeEl = document.getElementById('cheese-type');

const pattiesCountEl = document.getElementById('patties-count');
const bunsCountEl = document.getElementById('buns-count');
const cheddarCountEl = document.getElementById('cheddar-count');
const pepperjackCountEl = document.getElementById('pepperjack-count');

const resetBtn = document.getElementById('reset');

let tally = JSON.parse(localStorage.getItem('tally')) || {
  patties: 0,
  buns: 0,
  cheddar: 0,
  pepperjack: 0
};

function updateDisplay() {
  pattiesCountEl.textContent = tally.patties;
  bunsCountEl.textContent = tally.buns;
  cheddarCountEl.textContent = tally.cheddar;
  pepperjackCountEl.textContent = tally.pepperjack;
}

function saveTally() {
  localStorage.setItem('tally', JSON.stringify(tally));
}

document.getElementById('order-form').addEventListener('submit', (e) => {
  e.preventDefault();

  // Patties
  tally.patties += (sizeEl.value === 'double') ? 2 : 1;

  // Buns (always 2 per burger)
  tally.buns += 2;

  // Cheese
  const slices = parseInt(cheeseSlicesEl.value, 10);
  if (slices > 0) {
    if (cheeseTypeEl.value === 'cheddar') {
      tally.cheddar += slices;
    } else if (cheeseTypeEl.value === 'pepperjack') {
      tally.pepperjack += slices;
    }
  }

  saveTally();
  updateDisplay();
});

cheeseSlicesEl.addEventListener('change', () => {
  cheeseTypeEl.disabled = (cheeseSlicesEl.value === "0");
});

resetBtn.addEventListener('click', () => {
  if (confirm('Reset today’s tally?')) {
    tally = { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 };
    saveTally();
    updateDisplay();
  }
});

// Initial display
updateDisplay();
