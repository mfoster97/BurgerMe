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

// ---------- FIREBASE (client SDK via CDN) ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, doc, setDoc, updateDoc, increment, onSnapshot,
  collection, addDoc, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Your Firebase config (from your message)
const firebaseConfig = {
  apiKey: "AIzaSyD4jy8pF6ySC1HSUP0Y3KpVH6QTKLqvjuo",
  authDomain: "burgerme-85c06.firebaseapp.com",
  projectId: "burgerme-85c06",
  storageBucket: "burgerme-85c06.firebasestorage.app",
  messagingSenderId: "37629570300",
  appId: "1:37629570300:web:b5c8452d69ec46bec4fb79",
  measurementId: "G-Z3K14KLE48"
};

// Wrap async startup to avoid top-level await
async function init() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const tallyRef = doc(db, "meta", "tally");
  const ordersCol = collection(db, "orders");

  // Ensure a tally doc exists (merge keeps existing values)
  try {
    await setDoc(
      tallyRef,
      { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 },
      { merge: true }
    );
  } catch (e) {
    console.error("Error ensuring tally doc:", e);
  }

  // ---------- LIVE SUBSCRIPTIONS ----------
  // Tally listener (updates the numbers in real time)
  onSnapshot(tallyRef, (snap) => {
    const t = snap.data() || { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 };
    pattiesCountEl.textContent = t.patties ?? 0;
    bunsCountEl.textContent = t.buns ?? 0;
    cheddarCountEl.textContent = t.cheddar ?? 0;
    pepperjackCountEl.textContent = t.pepperjack ?? 0;
  });

  // Order history listener (most recent first; limit to 200)
  onSnapshot(query(ordersCol, orderBy("ts", "desc"), limit(200)), (snap) => {
    orderHistoryEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const o = docSnap.data();
      const li = document.createElement('li');
      const cheesePart = (o.cheeseSlices > 0)
        ? `, ${o.cheeseSlices} slice(s) ${o.cheeseType}`
        : ', no cheese';
      li.textContent = `${o.name} - ${o.size} ${o.protein} burger${cheesePart}`;
      orderHistoryEl.appendChild(li);
    });
  });

  // ---------- FORM BEHAVIOR ----------
  function setCheeseTypeState() {
    const value = cheeseSlicesEl.value;
    const needsCheeseType = value !== "" && parseInt(value, 10) > 0;
    cheeseTypeEl.disabled = !needsCheeseType;
    cheeseTypeEl.required = needsCheeseType;
    if (!needsCheeseType) cheeseTypeEl.value = "";
  }
  cheeseSlicesEl.addEventListener('change', setCheeseTypeState);
  setCheeseTypeState();

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    const name = nameEl.value.trim();
    const size = sizeEl.value;               // 'single' | 'double'
    const protein = proteinEl.value;         // 'beef' | 'chicken'
    const cheeseSlices = parseInt(cheeseSlicesEl.value, 10);
    const cheeseType = cheeseSlices > 0 ? cheeseTypeEl.value : null;

    const deltas = {
      patties: size === 'double' ? 2 : 1,
      buns: 2,
      cheddar: (cheeseSlices > 0 && cheeseType === 'cheddar') ? cheeseSlices : 0,
      pepperjack: (cheeseSlices > 0 && cheeseType === 'pepperjack') ? cheeseSlices : 0
    };

    const order = {
      name, size, protein,
      cheeseSlices,
      cheeseType,
      ts: Date.now()
    };

    try {
      // Add order to history
      await addDoc(ordersCol, order);
      // Atomically increment tallies
      await updateDoc(tallyRef, {
        patties: increment(deltas.patties),
        buns: increment(deltas.buns),
        cheddar: increment(deltas.cheddar),
        pepperjack: increment(deltas.pepperjack)
      });
    } catch (e) {
      console.error("Error writing order/tally:", e);
      alert("Could not submit order. Please try again.");
      return;
    }

    // Reset form to placeholders
    formEl.reset();
    setCheeseTypeState();
  });

  // ---------- RESET (shared) ----------
  resetBtn.addEventListener('click', async () => {
    if (!confirm('Reset the shared tally to zero? (Order history remains)')) return;
    try {
      await setDoc(tallyRef, { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 });
    } catch (e) {
      console.error("Error resetting tally:", e);
    }
  });
}

init();
