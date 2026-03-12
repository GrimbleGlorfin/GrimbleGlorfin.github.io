
let daily_card;
let guessCount = 0;
const todayKey = getTodaysSeed();
const guessedCards = new Set();
const checkboxes = document.querySelectorAll('.sidebar input[type="checkbox"]');
let galleryUsed = false;
let gameInitialized = false;

const DEBUG = false;

if (DEBUG) {
  console.log("DEBUG")
  localStorage.removeItem("achievements");
  localStorage.removeItem("stats");
  localStorage.removeItem(`guesses-${todayKey}`);
}

// ─── Firebase Auth & Firestore ────────────────────────────────────────────────

// currentUser is null when signed out, or a Firebase user object when signed in.
let currentUser = null;

// Called once Firebase Auth is ready (replaces the bare init() call at the bottom)
firebase.auth().onAuthStateChanged(async user => {
  currentUser = user;
  updateAuthUI(user);

  if (user) {
    // Migrate any guest localStorage data up to Firestore, then load from cloud
    await migrateLocalToFirestore(user.uid);
  }

  // Always finish initialising the game regardless of sign-in state
  if (!gameInitialized) {
    gameInitialized = true;
    init();
  }
});

function updateAuthUI(user) {
  const btn = document.getElementById("auth-btn");
  const label = document.getElementById("auth-label");
  if (user) {
    label.textContent = user.displayName || user.email || "Signed in";
    btn.textContent = "Sign Out";
  } else {
    label.textContent = "";
    btn.textContent = "Sign In";
  }
}

document.getElementById("auth-btn").onclick = async () => {
  if (currentUser) {
    await firebase.auth().signOut();
  } else {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await firebase.auth().signInWithPopup(provider);
    } catch (err) {
      console.error("Sign-in error:", err);
    }
  }
};

// ─── Stats & Achievements: cloud-aware load/save ──────────────────────────────

// Default shape shared by both cloud and local paths
function defaultStats() {
  return {
    totalGames: 0,
    wins: 0,
    guessDistribution: [0,0,0,0,0,0,0,0,0],
    avgGuess: 0,
    streak: 0,
    maxStreak: 0,
    lastWinDate: null,
  };
}

function defaultAchievements() {
  return {};
}

// ── Local (guest) helpers ──────────────────────────────────────────────────────

function loadStatsLocal() {
  return JSON.parse(localStorage.getItem("stats")) || defaultStats();
}

function saveStatsLocal(stats) {
  localStorage.setItem("stats", JSON.stringify(stats));
}

function loadAchievementsLocal() {
  return JSON.parse(localStorage.getItem("achievements")) || defaultAchievements();
}

function saveAchievementsLocal(data) {
  localStorage.setItem("achievements", JSON.stringify(data));
}

// ── Firestore helpers ──────────────────────────────────────────────────────────

function userDoc(uid) {
  return firebase.firestore().collection("users").doc(uid);
}

async function loadStatsFirestore(uid) {
  try {
    const snap = await userDoc(uid).get();
    if (snap.exists && snap.data().stats) return snap.data().stats;
  } catch (e) {
    console.warn("Firestore read failed, falling back to localStorage", e);
  }
  return defaultStats();
}

async function saveStatsFirestore(uid, stats) {
  try {
    await userDoc(uid).set({ stats }, { merge: true });
  } catch (e) {
    console.warn("Firestore write failed, saving to localStorage as backup", e);
    saveStatsLocal(stats);
  }
}

async function loadAchievementsFirestore(uid) {
  try {
    const snap = await userDoc(uid).get();
    if (snap.exists && snap.data().achievements) return snap.data().achievements;
  } catch (e) {
    console.warn("Firestore read failed, falling back to localStorage", e);
  }
  return defaultAchievements();
}

async function saveAchievementsFirestore(uid, data) {
  try {
    await userDoc(uid).set({ achievements: data }, { merge: true });
  } catch (e) {
    console.warn("Firestore write failed, saving to localStorage as backup", e);
    saveAchievementsLocal(data);
  }
}

// Daily guess key: stored inside the user's Firestore doc or localStorage
async function getTodayGuessCount() {
  if (currentUser) {
    try {
      const snap = await userDoc(currentUser.uid).get();
      if (snap.exists) return snap.data()[`guesses-${todayKey}`] ?? null;
    } catch (e) { /* fall through */ }
  }
  return localStorage.getItem(`guesses-${todayKey}`);
}

async function setTodayGuessCount(count) {
  if (currentUser) {
    try {
      await userDoc(currentUser.uid).set(
        { [`guesses-${todayKey}`]: count },
        { merge: true }
      );
      return;
    } catch (e) { /* fall through */ }
  }
  localStorage.setItem(`guesses-${todayKey}`, count);
}

// ── Public API used by the rest of the code ───────────────────────────────────
// These replace the old synchronous loadStats / saveStats.
// They are async but callers already use .then() chains, so this is safe.

async function loadStats() {
  if (currentUser) return loadStatsFirestore(currentUser.uid);
  return loadStatsLocal();
}

async function saveStats(stats) {
  if (currentUser) return saveStatsFirestore(currentUser.uid, stats);
  saveStatsLocal(stats);
}

async function loadAchievements() {
  if (currentUser) return loadAchievementsFirestore(currentUser.uid);
  return loadAchievementsLocal();
}

async function saveAchievements(data) {
  if (currentUser) return saveAchievementsFirestore(currentUser.uid, data);
  saveAchievementsLocal(data);
}

// ── One-time migration: copy localStorage data into Firestore on first sign-in ─

async function migrateLocalToFirestore(uid) {
  const localStats = localStorage.getItem("stats");
  const localAchievements = localStorage.getItem("achievements");
  if (!localStats && !localAchievements) return; // nothing to migrate

  try {
    const snap = await userDoc(uid).get();
    if (snap.exists && (snap.data().stats || snap.data().achievements)) {
      // Cloud already has data – don't overwrite it
      return;
    }

    const batch = firebase.firestore().batch();
    const ref = userDoc(uid);
    const payload = {};
    if (localStats)       payload.stats        = JSON.parse(localStats);
    if (localAchievements) payload.achievements = JSON.parse(localAchievements);

    // Also carry over today's daily key if present
    const todayVal = localStorage.getItem(`guesses-${todayKey}`);
    if (todayVal !== null) payload[`guesses-${todayKey}`] = Number(todayVal);

    batch.set(ref, payload, { merge: true });
    await batch.commit();
    console.log("Migrated localStorage data to Firestore ✓");
  } catch (e) {
    console.warn("Migration failed:", e);
  }
}

// ─── Achievements ─────────────────────────────────────────────────────────────

const achievements = [
  { id: "test",             title: "Guess What?",        description: "Make a guess" },
  { id: "weekly_warrior",   title: "Weekly Winner",      description: "Get a 7 day streak" },
  { id: "fortnight_fighter",title: "Fortnight Finisher", description: "Get a 14 day streak" },
  { id: "monthly_monster",  title: "Monthly Master",     description: "Get a 30 day streak" },
  { id: "truly_dedicated",  title: "Truly Dedicated",    description: "Get a 365 day streak" },
  { id: "lucky",            title: "Lucky?",             description: "Guess the card in 1 guess" },
  { id: "true_talent",      title: "True Talent",        description: "Guess the card in 2 guesses" },
  { id: "close_call",       title: "Close Call",         description: "Guess the card in 8 guesses" },
  { id: "well_rounded",     title: "Well Rounded",       description: "Win a game with every distribution of guess" },
  { id: "blind_genius",     title: "Blind Genius",       description: "Win without using the Card Gallery" }
];

const hidden_achievements = [
  { id: "fully_looted", title: "Fully Looted",  description: "Guess every Treasure card" },
  { id: "green_thumb",  title: "Green Thumb",   description: "Win after only guessing Victory cards" },
  { id: "outdated",     title: "Outdated",      description: "Guess the Scout card" },
  { id: "black_magic",  title: "Black Magic",   description: "Guess every card with 'Witch' in the name" },
  { id: "goated",       title: "Goated",        description: "Guess Goatherd and Prize Goat" },
  { id: "adventurous",  title: "Adventurous",   description: "Guess only cards from Adventures" }
];

const victory_cards = ["Distant Lands","Vineyard","Distant Shore","Stronghold","Territory","Estate","Duchy","Gardens","Province","Fairgrounds"
  ,"Overgrown Estate","Feodum","Dame Josephine","Humble Castle","Crumbling Castle","Small Castle","Haunted Castle","Opulent Castle","Sprawling Castle"
  ,"Grand Castle","King's Castle","Tunnel","Silk Road","Farmland","Great Hall","Mill","Duke","Harem","Nobles","Cemetery","Marchland","Colony","Island"];
const witch_cards = ["Witch","Sea Witch","Old Witch","Young Witch","Snake Witch","Witch's Hut"];

async function unlockAchievement(id) {
  const unlocked = await loadAchievements();
  if (unlocked[id]) return;

  unlocked[id] = true;
  await saveAchievements(unlocked);

  const achievement = achievements.find(a => a.id === id);
  if (achievement) {
    if (!document.querySelector(".modal:not(.hidden)")) showAchievementToast(achievement);
  } else {
    const hidden_achievement = hidden_achievements.find(a => a.id === id);
    if (hidden_achievement) {
      if (!document.querySelector(".modal:not(.hidden)")) showAchievementToast(hidden_achievement);
      achievements.push(hidden_achievement);
    }
  }
}

const achievementsList = document.getElementById("achievements-list");

async function renderAchievements() {
  const unlocked = await loadAchievements();
  const list = document.getElementById("achievements-list");
  list.innerHTML = "";

  achievements.forEach(a => {
    const div = document.createElement("div");
    div.className = "achievement";
    if (unlocked[a.id]) div.classList.add("unlocked");
    div.innerHTML = `
      <h4>${a.title}</h4>
      <p>${a.description}</p>
      <span>${unlocked[a.id] ? "Unlocked" : "Locked"}</span>
    `;
    list.appendChild(div);
  });
}

// ─── UI wiring ────────────────────────────────────────────────────────────────

const sidebar = document.querySelector(".sidebar");
const galleryDrawer = document.getElementById("gallery-drawer");
const Gallery = document.getElementById("easy-mode");

document.getElementById("open-filters").onclick = () => {
  sidebar.classList.add("open");
  document.body.classList.add("no-scroll");
};

document.getElementById("close-filters").onclick = () => {
  sidebar.classList.remove("open");
  document.body.classList.remove("no-scroll");
};

document.getElementById("open-gallery").onclick = () => {
  galleryDrawer.classList.add("open");
  document.body.classList.add("drawer-open");
  Gallery.classList.add("open");
  document.body.classList.add("no-scroll");
};

document.getElementById("close-gallery").onclick = () => {
  galleryDrawer.classList.remove("open");
  document.body.classList.remove("drawer-open");
  Gallery.classList.remove("open");
  document.body.classList.remove("no-scroll");
};

fetch("cards.json")
  .then(response => response.json())
  .then(data => { globalCards = data; })
  .catch(error => { console.error("Failed to load cards:", error); });

const achievementsModal = document.getElementById("achievement-modal");

document.getElementById("open-achievements").onclick = () => {
  achievementsModal.classList.remove("hidden");
  document.body.classList.add("no-scroll");
  renderAchievements();
};

document.getElementById("close-achievements").onclick = () => {
  achievementsModal.classList.add("hidden");
  document.body.classList.remove("no-scroll");
};

achievementsModal.addEventListener("click", e => {
  if (e.target === achievementsModal) achievementsModal.classList.add("hidden");
});

document.getElementById("stats-modal").addEventListener("click", e => {
  if (e.target === document.getElementById("stats-modal"))
    document.getElementById("stats-modal").classList.add("hidden");
});

document.getElementById("stats-btn").onclick = () => {
  renderStats();
  document.getElementById("stats-modal").classList.remove("hidden");
  document.body.classList.add("no-scroll");
};

document.getElementById("close-stats").onclick = () => {
  document.getElementById("stats-modal").classList.add("hidden");
  document.body.classList.remove("no-scroll");
};

document.getElementById("dark-toggle").onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
};

document.getElementById("new-card").addEventListener("click", () => {
  getNewCard().then(card => { daily_card = card; });
  resetGuesses();
  showBlankCard();
  console.log("New Daily Card: " + daily_card.name);
});

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

// ─── Game logic ───────────────────────────────────────────────────────────────

function resetGuesses() {
  const guessContainer = document.getElementById("guess-list");
  guessContainer.innerHTML = "";
  guessCount = 0;
  guessedCards.clear();
}

function showBlankCard() {
  const images = document.querySelectorAll(".pic");
  images.forEach(img => { img.style.display = "none"; });
  document.querySelector('img[alt="Blank"]').style.display = "block";
}

function filterImages(event) {
  event.preventDefault();
  const search = document.getElementById("search-input").value.toLowerCase();
  const images = document.querySelectorAll(".pic");
  const input = document.getElementById("search-input");
  const easyMode = document.getElementById("easy-mode");
  const easyToggle = document.getElementById("easy-toggle");

  if (!(search === "")) {
    let found = false;

    images.forEach(img => {
      if (img.alt.toLowerCase() === search) {
        img.style.display = "block";
        guessedCards.add(input.value);
        found = true;
      } else {
        img.style.display = "none";
      }
    });

    addGuessRows(search);

    if (!found) {
      document.querySelector('img[alt="Blank"]').style.display = "block";
    }

    const shownCard = document.querySelector(".card-images img:not([style*='display: none'])");
    if (shownCard) {
      shownCard.classList.add("flip");
      setTimeout(() => shownCard.classList.remove("flip"), 600);
    }

    input.value = "";
    if (window.screen.width > 800) input.focus();

    document.querySelectorAll(".easy-card").forEach(img => {
      if (guessedCards.has(img.alt)) img.style.display = "none";
    });

    if (easyMode.classList.contains("open")) {
      easyMode.classList.remove("open");
      easyToggle.textContent = "Card Gallery ▼";
    }
  }
}

async function findCard(cardName) {
  const response = await fetch('cards.json');
  const cards = await response.json();
  return cards.find(card => card["name"].toLowerCase() === cardName);
}

function addBoxWrapper(row, label_text, id, box_text, color, delay = 0) {
  const box_wrapper = document.createElement("div");
  const label = document.createElement("div");
  const box = document.createElement("div");

  box_wrapper.className = "box-wrapper";
  label.className = "label";
  box.className = "box";
  box.id = id;
  box.textContent = box_text;
  box.style.backgroundColor = document.body.classList.contains('dark') ? '#1a1a1a' : '#e8e8e8';
  box.style.color = document.body.classList.contains('dark') ? '#1a1a1a' : '#e8e8e8';
  label.textContent = label_text;

  box_wrapper.appendChild(label);
  box_wrapper.appendChild(box);
  row.appendChild(box_wrapper);

  setTimeout(() => {
    box.classList.add('flip');
    setTimeout(() => {
      box.style.backgroundColor = color;
      if (color === "var(--soft-yellow)" || color.includes("yellow") || color === "#F1DE77") {
        box.classList.add('yellow-box');
      } else {
        box.style.color = document.body.classList.contains('dark') ? '#e8e8e8' : '#1a1a1a';
      }
    }, 300);
  }, delay);
}

async function addGuessRows(search) {
  const rows = document.querySelector(".feedback");
  const row = document.createElement("div");
  guessCount += 1;
  unlockAchievement("test");

  row.className = "guess-rows";
  rows.appendChild(row);

  const card = await findCard(search);
  const stats = await loadStats();

  let total_guess = 0;
  let guess_num = 0;

  if (card) {
    addBoxWrapper(row, "Color",     "color_"     + Date.now(), card["color"],     compareCard(card["color"],     daily_card["color"]),     0);
    addBoxWrapper(row, "Type",      "type_"      + Date.now(), card["type"],      compareCard(card["type"],      daily_card["type"]),      300);
    addBoxWrapper(row, "Expansion", "expansion_" + Date.now(), card["expansion"], compareCard(card["expansion"], daily_card["expansion"]), 600);
    addBoxWrapper(row, "Text",      "text_"      + Date.now(), card["text"],      compareCard(card["text"],      daily_card["text"]),      900);
    addBoxWrapper(row, "Cost",      "cost_"      + Date.now(), card["cost"],      compareCard_Cost(card["cost"], daily_card["cost"]),      1200);
    addBoxWrapper(row, "Name",      "name_"      + Date.now(), card["name"],      compareCard(card["name"],      daily_card["name"]),      1500);
  }

  if (card["name"] === daily_card["name"]) {
    const existing = await getTodayGuessCount();
    if (existing === null || existing === undefined) {
      await setTodayGuessCount(guessCount);
      stats.totalGames++;
      stats.wins++;
      stats.guessDistribution[guessCount - 1]++;
      total_guess = 0;
      guess_num = 1;
      stats.guessDistribution.forEach(guess => {
        total_guess += guess_num * guess;
        guess_num++;
      });
      stats.avgGuess = (total_guess / stats.totalGames).toFixed(2);
      if (stats.lastWinDate === getYesterdayKey()) {
        stats.streak++;
      } else {
        stats.streak = 1;
      }
      stats.lastWinDate = todayKey;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      await saveStats(stats);
      setTimeout(() => { showModal("You Win!", `Correct - the card was ${daily_card["name"]}.`); }, 1800);
      if (stats.streak >= 7)   unlockAchievement("weekly_warrior");
      if (stats.streak >= 14)  unlockAchievement("fortnight_fighter");
      if (stats.streak >= 30)  unlockAchievement("monthly_monster");
      if (stats.streak >= 365) unlockAchievement("truly_dedicated");
      if (!galleryUsed)        unlockAchievement("blind_genius");
      if (guessCount === 2)    unlockAchievement("true_talent");
      if (guessCount === 1)    unlockAchievement("lucky");
      if (guessCount === 8)    unlockAchievement("close_call");
      if (guessedCards.has("Goatherd") && guessedCards.has("Prize Goat")) unlockAchievement("goated");
      if (guessedCards.has("Scout")) unlockAchievement("outdated");

      let thumb = true;
      guessedCards.forEach(item => { if (!victory_cards.includes(item)) thumb = false; });
      if (thumb) unlockAchievement("green_thumb");

      let some_bool = true;
      stats.guessDistribution.forEach(item => { if (item === 0) some_bool = false; });
      if (some_bool) unlockAchievement("well_rounded");
    }
  }

  if (guessCount >= 8 && card["name"] !== daily_card["name"]) {
    const existing = await getTodayGuessCount();
    if (existing === null || existing === undefined) {
      await setTodayGuessCount(guessCount);
      stats.totalGames++;
      stats.guessDistribution[8]++;
      total_guess = 0;
      guess_num = 1;
      stats.guessDistribution.forEach(guess => {
        total_guess += guess_num * guess;
        guess_num++;
      });
      stats.avgGuess = total_guess;
      stats.streak = 0;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      await saveStats(stats);
      setTimeout(() => { showModal("You Lose!", `The correct card was ${daily_card["name"]}.`); }, 1800);
    }
  }
}

function showAchievementToast(achievement) {
  const container = document.getElementById("achievement-toast-container");
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.innerHTML = `<strong>${achievement.title}</strong><br><span>${achievement.description}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function compareCard_Cost(attribute, daily_attribute) {
  if (attribute === daily_attribute) return "#8BC79A";
  if (typeof attribute === 'string' || Array.isArray(attribute)) {
    if (attribute.includes(daily_attribute)) return "#F1DE77";
  }
  if (typeof daily_attribute === 'string' || Array.isArray(daily_attribute)) {
    if (daily_attribute.includes(attribute)) return "#F1DE77";
  }
  return "#E28C8C";
}

function compareCard(attribute, daily_attribute) {
  if (attribute === daily_attribute) return "#8BC79A";
  if (typeof attribute === 'string' || Array.isArray(attribute)) {
    const attr_list = attribute.split(" - ");
    const d_attr_list = daily_attribute.split(" - ");
    for (let element of attr_list) {
      if (d_attr_list.includes(element)) return "#F1DE77";
    }
  }
  return "#E28C8C";
}

async function renderStats() {
  const stats = await loadStats();
  document.getElementById("stat-played").textContent = stats.totalGames;
  document.getElementById("stat-winrate").textContent =
    stats.totalGames ? Math.round((stats.wins / stats.totalGames) * 100) + "%" : "0%";
  document.getElementById("stat-streak").textContent = stats.streak;
  document.getElementById("stat-maxstreak").textContent = stats.maxStreak;
  document.getElementById("stat-guessavg").textContent = stats.avgGuess;

  const container = document.getElementById("guess-histogram");
  container.innerHTML = "";
  const max = Math.max(...stats.guessDistribution, 1);

  stats.guessDistribution.forEach((count, i) => {
    const row = document.createElement("div");
    row.className = "histogram-row";
    const label = document.createElement("div");
    label.className = "histogram-label";
    label.textContent = i === 8 ? "Fail" : i + 1;
    const bar = document.createElement("div");
    bar.className = "histogram-bar";
    bar.style.width = `${(count / max) * 100}%`;
    bar.textContent = count;
    row.appendChild(label);
    row.appendChild(bar);
    container.appendChild(row);
  });
}

function getTodaysSeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate();
}

function getYesterdayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  let day = today.getDate() - 1;
  if (day === 0) {
    if ([1,3,5,7,8,10,12].includes(month)) day = 31;
    else if ([4,6,9,11].includes(month)) day = 30;
    else if (month === 2) day = 28;
  }
  return year * 10000 + month * 100 + day;
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

async function getNewCard() {
  const response = await fetch('cards.json');
  const cards = await response.json();
  return cards[Math.floor(Math.random() * cards.length)];
}

function parseCost(cost) {
  cost = String(cost).trim();
  if (cost.includes("P")) return { coins: Number(cost.replace("P","")), potion: 1, star: 0, debt: 0 };
  if (cost.includes("D")) {
    if (cost.includes("-")) return { coins: 8, potion: 0, star: 0, debt: Number(cost.replace("D","")) };
    return { coins: 0, potion: 0, star: 0, debt: Number(cost.replace("D","")) };
  }
  if (cost.includes("*")) return { coins: Number(cost.replace("*","")), potion: 0, star: 1, debt: 0 };
  return { coins: Number(cost), potion: 0, star: 0, debt: 0 };
}

async function getTodaysCard() {
  const response = await fetch('cards.json');
  const cards = await response.json();
  const seed = getTodaysSeed();
  const randomValue = seededRandom(seed);
  return cards[Math.floor(randomValue * cards.length)];
}

async function init() {
  daily_card = await getTodaysCard();
  console.log(daily_card.name);
  const easyGrid = document.getElementById("easy-grid");

  fetch("cards.json")
    .then(response => response.json())
    .then(cards => {
      const container = document.querySelector(".card-images");
      const datalist = document.getElementById("search-options");

      cards.sort((a, b) => {
        const expCompare = a.expansion.localeCompare(b.expansion);
        if (expCompare !== 0) return expCompare;
        const costA = parseCost(a.cost);
        const costB = parseCost(b.cost);
        if (costA.coins !== costB.coins) return costA.coins - costB.coins;
        if (costA.debt  !== costB.debt)  return costA.debt  - costB.debt;
        if (costA.potion !== costB.potion) return costA.potion - costB.potion;
        if (costA.star  !== costB.star)  return costA.star  - costB.star;
        return a.name.localeCompare(b.name);
      });

      cards.forEach(card => {
        const cardName = card["name"];

        const img = document.createElement("img");
        img.className = "pic";
        img.src = `cards/${cardName}.jpg`;
        img.alt = cardName;
        container.appendChild(img);

        const option = document.createElement("option");
        option.value = cardName;
        datalist.appendChild(option);

        const easyImg = document.createElement("img");
        easyImg.src = `cards/${cardName}.jpg`;
        easyImg.alt = cardName;
        easyImg.className = "easy-card";

        easyImg.onclick = () => {
          document.getElementById("search-input").value = cardName;
          guessedCards.add(cardName);
          easyImg.style.display = "none";
          filterImages(new Event("submit"));
          galleryDrawer.classList.remove("open");
          document.body.classList.remove("drawer-open");
          Gallery.classList.remove("open");
          document.body.classList.remove("no-scroll");
        };

        easyGrid.appendChild(easyImg);
      });
    });
}

checkboxes.forEach(cb => { cb.addEventListener('change', applyFilters); });

document.querySelectorAll(".check-all-btn").forEach(button => {
  button.addEventListener("click", () => {
    const details = button.closest("details");
    const checkboxes = details.querySelectorAll('input[type="checkbox"]');
    const allChecked = [...checkboxes].every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    button.textContent = allChecked ? "Check All" : "Uncheck All";
    applyFilters();
  });
});

function applyFilters() {
  const textCheckBox  = document.querySelectorAll(".textCheckBox");
  const expCheckBox   = document.querySelectorAll(".expansionCheckBox");
  const costCheckBox  = document.querySelectorAll(".costCheckBox");
  const typeCheckBox  = document.querySelectorAll(".typeCheckBox");
  const colorCheckBox = document.querySelectorAll(".colorCheckBox");

  const activeExpansions = Array.from(expCheckBox).filter(cb => cb.checked).map(cb => cb.value);
  const activeText       = Array.from(textCheckBox).filter(cb => cb.checked).map(cb => cb.value);
  const activeCost       = Array.from(costCheckBox).filter(cb => cb.checked).map(cb => cb.value);
  const activeType       = Array.from(typeCheckBox).filter(cb => cb.checked).map(cb => cb.value);
  const activeColor      = Array.from(colorCheckBox).filter(cb => cb.checked).map(cb => cb.value);

  const filteredCards = globalCards.filter(card => {
    const correctExp = activeExpansions.includes(card.expansion);
    const correctCardCost = activeCost.includes(parseCost(card.cost).coins.toString());
    let includesAllText  = true;
    let includesAllColor = true;
    let includesAllType  = true;
    activeText.forEach(el  => { includesAllText  = includesAllText  && card.text.includes(el); });
    activeType.forEach(el  => { includesAllType  = includesAllType  && card.type.includes(el); });
    activeColor.forEach(el => { includesAllColor = includesAllColor && card.color.includes(el); });
    return correctExp && includesAllText && includesAllColor && includesAllType && correctCardCost;
  });

  const cardNames = filteredCards.map(c => c.name);

  document.querySelectorAll(".easy-card").forEach(img => {
    img.style.display = cardNames.includes(img.alt) ? "block" : "none";
  });
}

document.addEventListener("click", e => {
  const btn = e.target.closest(".filter-toggle");
  if (!btn) return;
  const panel = document.getElementById(btn.dataset.target);
  panel.classList.toggle("open");
  btn.textContent = btn.textContent.includes("▾")
    ? btn.textContent.replace("▾", "▸")
    : btn.textContent.replace("▸", "▾");
});

function showModal(title, message) {
  const modal = document.getElementById("game-modal");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-message").textContent = message;
  modal.classList.remove("hidden");
}

document.getElementById("modal-close").onclick = () => {
  document.getElementById("game-modal").classList.add("hidden");
};

document.getElementById("easy-toggle").onclick = () => {
  const panel = document.getElementById("easy-mode");
  panel.classList.toggle("open");
  galleryUsed = true;
  document.getElementById("easy-toggle").textContent =
    panel.classList.contains("open") ? "Card Gallery ▲" : "Card Gallery ▼";
};

// Note: init() is now called inside onAuthStateChanged above, not here directly.
