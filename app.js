// ---------- UI ELEMENTS ----------
const formEl = document.getElementById('order-form');
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
const fullResetBtn = document.getElementById('full-reset');
const logoBtn = document.getElementById('logo');
const hintEl = document.getElementById('full-reset-hint');

// ---------- FIREBASE (client SDK via CDN) ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, doc, setDoc, updateDoc, increment, onSnapshot,
  collection, addDoc, query, orderBy, limit, getDocs, deleteDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Your Firebase config (from your earlier message)
const firebaseConfig = {
  apiKey: "AIzaSyD4jy8pF6ySC1HSUP0Y3KpVH6QTKLqvjuo",
  authDomain: "burgerme-85c06.firebaseapp.com",
  projectId: "burgerme-85c06",
  storageBucket: "burgerme-85c06.firebasestorage.app",
  messagingSenderId: "37629570300",
  appId: "1:37629570300:web:b5c8452d69ec46bec4fb79",
  measurementId: "G-Z3K14KLE48"
};

async function init() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const tallyRef = doc(db, "meta", "tally");
  const ordersCol = collection(db, "orders");

  // Ensure tally doc exists ONCE (avoid decreasing on every load)
  try {
    const existing = await getDoc(tallyRef);
    if (!existing.exists()) {
      await setDoc(tallyRef, { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 });
    }
  } catch (e) {
    console.error("Init tally failed:", e);
  }

  // Live tally
  onSnapshot(tallyRef, (snap) => {
    const t = snap.data() || { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 };
    pattiesCountEl.textContent = t.patties ?? 0;
    bunsCountEl.textContent = t.buns ?? 0;
    cheddarCountEl.textContent = t.cheddar ?? 0;
    pepperjackCountEl.textContent = t.pepperjack ?? 0;
  });

  // Live order history (most recent first)
  onSnapshot(query(ordersCol, orderBy("ts", "desc"), limit(200)), (snap) => {
    orderHistoryEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const o = docSnap.data();
      const cheesePart = (o.cheeseSlices > 0)
        ? `, ${o.cheeseSlices} slice(s) ${o.cheeseType}`
        : ', no cheese';
      const li = document.createElement('li');
      li.innerHTML = `<span>${o.name} — <strong>${o.size}</strong> ${o.protein} burger${cheesePart}</span>
                      <span class="meta">${new Date(o.ts).toLocaleTimeString()}</span>`;
      orderHistoryEl.appendChild(li);
    });
  });

  // Form behavior (robust cheese-type toggle)
  function setCheeseTypeState() {
    const v = cheeseSlicesEl.value;
    const n = Number(v);
    const needsCheeseType = Number.isFinite(n) && n > 0;
    cheeseTypeEl.disabled = !needsCheeseType;
    cheeseTypeEl.required = needsCheeseType;
    if (!needsCheeseType) {
      cheeseTypeEl.value = "";
    } else if (!cheeseTypeEl.value) {
      cheeseTypeEl.value = "";
    }
  }
  ["change","input"].forEach(evt => cheeseSlicesEl.addEventListener(evt, setCheeseTypeState));
  document.addEventListener("DOMContentLoaded", setCheeseTypeState);
  formEl.addEventListener("reset", () => setTimeout(setCheeseTypeState, 0));
  setCheeseTypeState();

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    const name = nameEl.value.trim();
    const size = sizeEl.value;
    const protein = proteinEl.value;
    const cheeseSlices = parseInt(cheeseSlicesEl.value, 10);
    const cheeseType = cheeseSlices > 0 ? cheeseTypeEl.value : null;

    const deltas = {
      patties: size === 'double' ? 2 : 1,
      buns: 2,
      cheddar: (cheeseSlices > 0 && cheeseType === 'cheddar') ? cheeseSlices : 0,
      pepperjack: (cheeseSlices > 0 && cheeseType === 'pepperjack') ? cheeseSlices : 0
    };

    const order = { name, size, protein, cheeseSlices, cheeseType, ts: Date.now() };

    try {
      await addDoc(ordersCol, order);
      await updateDoc(tallyRef, {
        patties: increment(deltas.patties),
        buns: increment(deltas.buns),
        cheddar: increment(deltas.cheddar),
        pepperjack: increment(deltas.pepperjack)
      });
      formEl.reset();
      setCheeseTypeState();
    } catch (err) {
      alert("Could not submit order. Please try again.");
      console.error(err);
    }
  });

  // Reset shared tally (strict rules will block decreases)
  resetBtn.addEventListener('click', async () => {
    try {
      await setDoc(tallyRef, { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 });
    } catch (e) {
      alert('Reset is blocked by security rules (decreases not allowed). Use the Firebase Console or temporary relaxed rules.');
      console.error(e);
    }
  });

  // Hidden Full Reset (orders + tally), likely blocked by strict rules
  let taps = 0, timer = null;
  logoBtn.addEventListener('click', () => {
    taps += 1;
    if (taps === 1) timer = setTimeout(() => { taps = 0; }, 2000);
    if (taps >= 5) {
      clearTimeout(timer); taps = 0;
      fullResetBtn.classList.remove('ghost');
      hintEl.classList.add('ghost');
      fullResetBtn.focus();
    }
  });

  fullResetBtn.addEventListener('click', async () => {
    const phrase = prompt('Type DELETE to remove ALL orders and reset tally:');
    if (phrase !== 'DELETE') return;
    try {
      const snapshot = await getDocs(ordersCol);
      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
      }
      try {
        await setDoc(tallyRef, { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 });
      } catch (e) {
        console.error('Tally reset blocked by rules:', e);
      }
      alert('All orders deleted and tally reset (if rules allow).');
    } catch (e) {
      console.error('Full reset failed:', e);
      alert('Full reset blocked by security rules. Use console or temporary relaxed rules. See console for details.');
    }
  });
}

init();
