const nameEl = document.getElementById('customer-name');
const sizeEl = document.getElementById('size');
const proteinEl = document.getElementById('protein');
const cheeseSlicesEl = document.getElementById('cheese-slices');
const cheeseTypeEl = document.getElementById('cheese-type');

const pattiesCountEl = document.getElementById('patties-count');
const bunsCountEl = document.getElementById('buns-count');
const cheddarCountEl = document.getElementById('cheddar-count');
const pepperjackCountEl = document.getElementById('pepperjack-count');

const orderHistoryEl = document.getElementById('order-history');
const resetBtn = document.getElementById('reset');

let tally = JSON.parse(localStorage.getItem('tally')) || {
  patties: 0,
  buns: 0,
  cheddar: 0,
  pepperjack: 0
};

let orders = JSON.parse(localStorage.getItem('orders')) || [];

function updateDisplay() {
  pattiesCountEl.textContent = tally.patties;
  bunsCountEl.textContent = tally.buns;
  cheddarCountEl.textContent = tally.cheddar;
  pepperjackCountEl.textContent = tally.pepperjack;

  orderHistoryEl.innerHTML = "";
  orders.forEach(order => {
    const li = document.createElement('li');
    const cheesePart = order.cheeseSlices > 0 ? `, ${order.cheeseSlices} slice(s) ${order.cheeseType}` : ', no cheese';
    li.textContent = `${order.name} - ${order.size} ${order.protein} burger${cheesePart}`;
    orderHistoryEl.appendChild(li);
  });
}

function saveData() {
  localStorage.setItem('tally', JSON.stringify(tally));
  localStorage.setItem('orders', JSON.stringify(orders));
}

function setCheeseTypeState() {
  const value = cheeseSlicesEl.value;
  const needsCheeseType = value !== "" && parseInt(value, 10) > 0;
  cheeseTypeEl.disabled = !needsCheeseType;
  // Only require cheese type when slices > 0
  cheeseTypeEl.required = needsCheeseType;
  // If no cheese needed, reset cheese type to placeholder
  if (!needsCheeseType) {
    cheeseTypeEl.value = "";
  }
}

document.getElementById('order-form').addEventListener('submit', (e) => {
  e.preventDefault();

  // Let HTML5 validation handle empty selections
  if (!e.target.checkValidity()) {
    e.target.reportValidity();
    return;
  }

  const name = nameEl.value.trim();
  const size = sizeEl.value;          // 'single' | 'double'
  const protein = proteinEl.value;    // 'beef' | 'chicken'
  const slicesStr = cheeseSlicesEl.value;
  const cheeseSlices = parseInt(slicesStr, 10);
  const cheeseType = cheeseSlices > 0 ? cheeseTypeEl.value : null;

  // Update tally
  tally.patties += (size === 'double') ? 2 : 1;
  tally.buns += 2;
  if (cheeseSlices > 0) {
    if (cheeseType === 'cheddar') {
      tally.cheddar += cheeseSlices;
    } else if (cheeseType === 'pepperjack') {
      tally.pepperjack += cheeseSlices;
    }
  }

  // Add to orders
  orders.push({ name, size, protein, cheeseSlices, cheeseType });

  saveData();
  updateDisplay();

  // Reset form back to placeholders and disable cheese type
  e.target.reset();
  setCheeseTypeState();
});

cheeseSlicesEl.addEventListener('change', setCheeseTypeState);

// On load, ensure cheese type starts disabled
setCheeseTypeState();

// Initial display
updateDisplay();
