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
  collection, addDoc, query, orderBy, limit, getDocs, deleteDoc, runTransaction, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Your Firebase config
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

  // Defensive init: if tally is missing, compute it from existing orders.
  try {
    const exists = await getDoc(tallyRef);
    if (!exists.exists()) {
      // Aggregate from orders (client-side)
      const snap = await getDocs(ordersCol);
      let patties = 0, buns = 0, cheddar = 0, pepperjack = 0;
      snap.forEach((d) => {
        const o = d.data();
        const p = o.size === 'double' ? 2 : 1;
        patties += p;
        buns += 2;
        if (o.cheeseSlices > 0) {
          if (o.cheeseType === 'cheddar') cheddar += o.cheeseSlices;
          if (o.cheeseType === 'pepperjack') pepperjack += o.cheeseSlices;
        }
      });

      // Set in a transaction to avoid races
      await runTransaction(db, async (tx) => {
        const again = await tx.get(tallyRef);
        if (!again.exists()) {
          tx.set(tallyRef, { patties, buns, cheddar, pepperjack });
          console.log("[init] tally created from existing orders", { patties, buns, cheddar, pepperjack });
        } else {
          console.log("[init] tally existed during init, skipped create");
        }
      });
    } else {
      console.log("[init] tally exists");
    }
  } catch (e) {
    console.error("[init] failed to ensure tally", e);
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

  // Robust cheese-type toggle
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

  // Submit order
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

  // Reset shared tally (allowed only if your rules permit decreases)
  resetBtn.addEventListener('click', async () => {
    try {
      await setDoc(tallyRef, { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 });
      console.log("[reset] tally set to zero by client request");
    } catch (e) {
      alert('Reset may be blocked by security rules. Use the Firebase Console or temporary relaxed rules.');
      console.error(e);
    }
  });

  // Hidden Full Reset (orders + tally), works only if rules allow deletes/decreases
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
      await setDoc(tallyRef, { patties: 0, buns: 0, cheddar: 0, pepperjack: 0 });
      alert('All orders deleted and tally reset (if rules allow).');
      console.log("[full-reset] all orders deleted; tally set to zero");
    } catch (e) {
      console.error('Full reset failed:', e);
      alert('Full reset likely blocked by rules. Use console or temporary relaxed rules. See console for details.');
    }
  });
}

init();
