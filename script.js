
let daily_card;
let guessCount = 0;
const todayKey = getTodaysSeed();
const guessedCards = new Set();
const checkboxes = document.querySelectorAll('.sidebar input[type="checkbox"]');
let galleryUsed = false;
//const response = fetch('cards.json');
//const globalCards = response.json();

const DEBUG = false;

if (DEBUG) {
  localStorage.removeItem("achievements");
  localStorage.removeItem("stats");
  localStorage.removeItem(`guesses-${todayKey}`);
}

const achievements = [
  {
    id: "test",
    title: "Guess What?",
    description: "Make a guess"
  },
  {
    id: "weekly_warrior",
    title: "Weekly Winner",
    description: "Get a 7 day streak"
  },
  {
    id: "fortnight_fighter",
    title: "Fortnight Finisher",
    description: "Get a 14 day streak"
  },
  {
    id: "monthly_monster",
    title: "Monthly Master",
    description: "Get a 30 day streak"
  },
  {
    id: "truly_dedicated",
    title: "Truly Dedicated",
    description: "Get a 365 day streak"
  },
  {
    id: "lucky",
    title: "Lucky?",
    description: "Guess the card in 1 guess"
  },
  {
    id: "true_talent",
    title: "True Talent",
    description: "Guess the card in 2 guesses"
  },
  {
    id: "close_call",
    title: "Close Call",
    description: "Guess the card in 8 guesses"
  },
  {
    id: "well_rounded",
    title: "Well Rounded",
    description: "Win a game with every distribution of guess"
  },
  {
    id: "blind_genius",
    title: "Blind Genius",
    description: "Win without using the Card Gallery"
  }
];

const hidden_achievements = [
  {
    id: "fully_looted",
    title: "Fully Looted",
    description: "Guess every Treasure card"
  },
  {
    id: "green_thumb",
    title: "Green Thumb",
    description: "Win after only guessing Victory cards"
  },
  {
    id: "outdated",
    title: "Outdated",
    description: "Guess the Scout card"
  },
  {
    id: "black_magic",
    title: "Black Magic",
    description: "Guess every card with 'Witch' in the name"
  },
  {
    id: "goated",
    title: "Goated",
    description: "Guess Goatherd and Prize Goat"
  },
  {
    id: "adventurous",
    title: "Adventurous",
    description: "Guess only cards from Adventures"
  }
];

const victory_cards = ["Distant Lands","Vineyard","Distant Shore","Stronghold","Territory","Estate","Duchy","Gardens","Province","Fairgrounds"
  ,"Overgrown Estate","Feodum","Dame Josephine","Humble Castle","Crumbling Castle","Small Castle","Haunted Castle","Opulent Castle","Sprawling Castle"
  ,"Grand Castle","King's Castle","Tunnel","Silk Road","Farmland","Great Hall","Mill","Duke","Harem","Nobles","Cemetery","Marchland","Colony","Island"]

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
  .then(data => {
    globalCards = data;          // store cards globally
    //renderCards(allCards);    // initial render
  })
  .catch(error => {
    console.error("Failed to load cards:", error);
  });

function loadStats() {
  return JSON.parse(localStorage.getItem("stats")) || {
    totalGames: 0,
    wins: 0,
    guessDistribution: [0,0,0,0,0,0,0,0,0], // 1–8 guesses , fails
    streak: 0,
    maxStreak: 0,
    lastWinDate: null
  };
}

function saveStats(stats) {
  localStorage.setItem("stats", JSON.stringify(stats));
}

function loadAchievements() {
  return JSON.parse(localStorage.getItem("achievements")) || {};
}

function saveAchievements(data) {
  localStorage.setItem("achievements", JSON.stringify(data));
}

function unlockAchievement(id) {
  const unlocked = loadAchievements();

  if (unlocked[id]) return; // already unlocked

  unlocked[id] = true;
  saveAchievements(unlocked);

  const achievement = achievements.find(a => a.id === id);
  if (achievement) {
    if (!document.querySelector(".modal:not(.hidden)")) {
        showAchievementToast(achievement);
    }   
  } else {
      const hidden_achievement = hidden_achievements.find(a => a.id === id);
      if (hidden_achievement) {
        if (!document.querySelector(".modal:not(.hidden)")) {
            showAchievementToast(hidden_achievement);
        } 
        achievements.push(hidden_achievement)  
      }
  }
}


const achievementsList = document.getElementById("achievements-list");

function renderAchievements() {
  const unlocked = loadAchievements();
  const list = document.getElementById("achievements-list");

  list.innerHTML = "";

  achievements.forEach(a => {
    const div = document.createElement("div");
    div.className = "achievement";

    if (unlocked[a.id]) {
      div.classList.add("unlocked");
    }

    div.innerHTML = `
      <h4>${a.title}</h4>
      <p>${a.description}</p>
      <span>${unlocked[a.id] ? "Unlocked" : "Locked"}</span>
    `;

    list.appendChild(div);
  });
}


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
  if (e.target === achievementsModal) {
    achievementsModal.classList.add("hidden");
  }
});

document.getElementById("stats-modal").addEventListener("click", e => {
  if (e.target === document.getElementById("stats-modal")) {
    document.getElementById("stats-modal").classList.add("hidden");
  }
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
    getNewCard().then((card) => {
        daily_card = card
    });
    resetGuesses();
    showBlankCard();
    console.log("Daily Card: " + daily_card.value)
});

// Load saved preference
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
}

function resetGuesses() {
    const guessContainer = document.getElementById("guess-list");
    guessContainer.innerHTML = "";
    console.log("Feedback: " + guessContainer)
    guessCount = 0
    guessedCards.clear() 
}

function showBlankCard() {
    const images = document.querySelectorAll(".pic");
    images.forEach(img => {
        img.style.display = "none";
    });
    document.querySelector('img[alt="Blank"]').style.display = "block";
}

function filterImages(event) {
    event.preventDefault();
    const search = document.getElementById("search-input").value.toLowerCase();
    const images = document.querySelectorAll(".pic");
    const input = document.getElementById("search-input");
    const easyMode = document.getElementById("easy-mode");
    const easyToggle = document.getElementById("easy-toggle");

    // Checks for real queary
    if (!(search === "")) {

      let found = false;

      //loop through images looking for guessed image
      images.forEach(img => {
        if (img.alt.toLowerCase() === search) {
            img.style.display = "block";
            // Track that this card was guessed
            console.log("Added " + input.value)
            guessedCards.add(input.value);
            found = true;
        } else {
            img.style.display = "none";
        }
      });

      addGuessRows(search)

      // Show blank card if no card matched
      if (!found) {
          document.querySelector('img[alt="Blank"]').style.display = "block";
      }

      const shownCard = document.querySelector(".card-images img:not([style*='display: none'])");
      if (shownCard) {
          shownCard.classList.add("flip");

        // Remove class after animation so it can flip again later
        setTimeout(() => shownCard.classList.remove("flip"), 600);
      }

      //Clear search bar
      input.value = "";

      //Put cursor back into search bar
      if (window.screen.width > 800) {
        input.focus();
      }
      

      // After processing guess, hide guessed cards in Easy Mode
      document.querySelectorAll(".easy-card").forEach(img => {
          if (guessedCards.has(img.alt)) {
              img.style.display = "none";
          }
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
  
  // Use the cards
  const card = cards.find(card => card["name"].toLowerCase() === cardName);
  return card;
}



//<div class="feedback">
//  <div class="box-wrapper">
//    <div class="label">Name</div>
//    <div class="box" id="card_name">Blank</div>

function addBoxWrapper(row,label_text,id,box_text,color,delay=0) {
    const box_wrapper = document.createElement("div");
    const label = document.createElement("div");
    const box = document.createElement("div");

    box_wrapper.className = "box-wrapper";
    label.className = "label";
    box.className = "box";
    box.id = id
    box.textContent = box_text
    box.style.backgroundColor = document.body.classList.contains('dark') ? '#1a1a1a' : '#e8e8e8';
    box.style.color = document.body.classList.contains('dark') ? '#1a1a1a' : '#e8e8e8';
    label.textContent = label_text

    box_wrapper.appendChild(label);
    box_wrapper.appendChild(box);
    row.appendChild(box_wrapper);

    setTimeout(() => {
        box.classList.add('flip');
        // After flip completes, set the background color permanently
        setTimeout(() => {
            box.style.backgroundColor = color;
            console.log("color " + color)
            if (color === "var(--soft-yellow)" || color.includes("yellow") || color === "#F1DE77") {
                box.classList.add('yellow-box');
            } else {
                box.style.color = document.body.classList.contains('dark') ? '#e8e8e8' : '#1a1a1a';
            }
        }, 300); // Half of the 0.6s animation
    }, delay);
}

function addGuessRows(search) {
    const rows = document.querySelector(".feedback");
    const row = document.createElement("div");
    guessCount += 1
    unlockAchievement("test")
    //console.log("Guessed cards" + guessedCards)

    row.className = "guess-rows";
    console.log("Created row:", row);
    console.log("Row className:", row.className);

    rows.appendChild(row);
    console.log("Appended row to feedback");

    

    findCard(search).then(card => {
        const stats = loadStats();
        if (card) {
            console.log("Found card:", card);
            addBoxWrapper(row,"Color","color_" + Date.now(),card["color"],compareCard(card["color"],daily_card["color"]),0)
            addBoxWrapper(row,"Type","type_" + Date.now(),card["type"],compareCard(card["type"],daily_card["type"]),300)
            addBoxWrapper(row,"Expansion","expansion_" + Date.now(),card["expansion"],compareCard(card["expansion"],daily_card["expansion"]),600)
            addBoxWrapper(row,"Text","text_" + Date.now(),card["text"],compareCard(card["text"],daily_card["text"]),900)
            addBoxWrapper(row,"Cost","cost_" + Date.now(),card["cost"],compareCard(card["cost"],daily_card["cost"]),1200)
            addBoxWrapper(row,"Name","name_" + Date.now(),card["name"],compareCard(card["name"],daily_card["name"]),1500)
            console.log("Row after adding boxes:", row);
        }
        if (card["name"] === daily_card["name"]) {
            if (!localStorage.getItem(`guesses-${todayKey}`)) {
                localStorage.setItem(`guesses-${todayKey}`, guessCount);
                stats.totalGames++;
                stats.wins++;
                stats.guessDistribution[guessCount - 1]++; // e.g., stats[3]++ for 4 guesses
                if (stats.lastWinDate === getYesterdayKey()) {
                    stats.streak++;
                } else {
                    stats.streak = 1;
                }
                stats.lastWinDate = todayKey;
                stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
                saveStats(stats);
                setTimeout(() => {
                    showModal("You Win!", `Correct - the card was ${daily_card["name"]}.`);
                }, 1800);
                if (stats.streak >= 7) {
                    unlockAchievement("weekly_warrior")
                }
                if (stats.streak >= 14) {
                    unlockAchievement("fortnight_fighter")
                }
                if (stats.streak >= 30) {
                    unlockAchievement("monthly_monster")
                }
                if (stats.streak >= 365) {
                    unlockAchievement("truly_dedicated")
                }
                if (!galleryUsed) {
                    unlockAchievement("blind_genius")
                }
                if (guessCount === 2) {
                    unlockAchievement("true_talent")
                }
                if (guessCount === 1) {
                    unlockAchievement("lucky")
                }
                if (guessCount === 2) {
                    unlockAchievement("close_call")
                }
                if (guessedCards.has("Goatherd") && guessedCards.has("Prize Goat")) {
                    unlockAchievement("goated")
                }
                if (guessedCards.has("Scout")) {
                    unlockAchievement("outdated")
                }
                const thumb = true
                guessedCards.forEach((item) => {
                  if (!victory_cards.has(item)) {
                    thumb = false
                  }
                });
                if (thumb) {
                  unlockAchievement("green_thumb")
                }
                const some_bool = true
                stats.guessDistribution.forEach((item) => {
                  if (item === 0) {
                    some_bool = false
                  }
                });
                if (some_bool) {
                  unlockAchievement("well_rounded")
                }
            } 
        }
        if (guessCount >= 8 && card["name"] !== daily_card["name"]) {
            if (!localStorage.getItem(`guesses-${todayKey}`)) {
                localStorage.setItem(`guesses-${todayKey}`, guessCount);
                stats.totalGames++;
                stats.guessDistribution[8]++;
                stats.streak = 0;
                stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
                saveStats(stats);
                setTimeout(() => {
                    showModal("You Lose!", `The correct card was ${daily_card["name"]}.`);
                }, 1800);
            } 
        }
    
    });

}

function showAchievementToast(achievement) {
  const container = document.getElementById("achievement-toast-container");

  const toast = document.createElement("div");
  toast.className = "achievement-toast";

  toast.innerHTML = `
    <strong>${achievement.title}</strong><br>
    <span>${achievement.description}</span>
  `;

  container.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";

    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function compareCard(attribute,daily_attribute) {
    if (attribute === daily_attribute) {
        return "#8BC79A" //"green"
    } 
    if (typeof attribute === 'string' || Array.isArray(attribute)) {
        if (attribute.includes(daily_attribute)) {
            return "#F1DE77"//"yellow"
        } 
    }
    if (typeof daily_attribute === 'string' || Array.isArray(daily_attribute)) {
        if (daily_attribute.includes(attribute)) {
            return "#F1DE77"//"yellow"
        }
    }    
    return "#E28C8C"//"red"
}

function renderStats() {
  const stats = loadStats();
  document.getElementById("stat-played").textContent = stats.totalGames;
  document.getElementById("stat-winrate").textContent =
    stats.totalGames ? Math.round((stats.wins / stats.totalGames) * 100) + "%" : "0%";
  document.getElementById("stat-streak").textContent = stats.streak;
  document.getElementById("stat-maxstreak").textContent = stats.maxStreak;

  const container = document.getElementById("guess-histogram");
  container.innerHTML = "";

  const max = Math.max(...stats.guessDistribution, 1);

  stats.guessDistribution.forEach((count, i) => {
    const row = document.createElement("div");
    row.className = "histogram-row";

    const label = document.createElement("div");
    label.className = "histogram-label";
    label.textContent = i + 1;
    if (i === 8) {
        label.textContent = "Fail"
    }

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
  // Use year, month, and day to create a unique number for today
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  
  // Combine into a single number (e.g., 20231215 for Dec 15, 2023)
  return year * 10000 + month * 100 + day;
}

function getYesterdayKey() {
  const today = new Date();
  // Use year, month, and day to create a unique number for yesterday
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate() - 1;
  if (day === 0) {
    day = 30;
  }
  
  return year * 10000 + month * 100 + day;
}

function seededRandom(seed) {
  // Simple seeded random number generator
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

async function getNewCard() {
  const response = await fetch('cards.json');
  const cards = await response.json();
  
  const index = Math.floor(Math.random() * cards.length);
  
  return cards[index];
}

function parseCost(cost) {
    // Convert to string in case the JSON mixes numbers/strings
    cost = String(cost).trim();

    // Potion cost (if you ever add Alchemy cards)
    if (cost.includes("P")) {
        return { coins: Number(cost.replace("P","")), potion: 1, star: 0, debt: 0};
    }

    // Debt cost 
    if (cost.includes("D")) {
        if (cost.includes("-")) {return {coins: 8, potion: 0, star: 0, debt: Number(cost.replace("D",""))}};
        return { coins: 0, potion: 0, star: 0, debt: Number(cost.replace("D","")) };
    }

    // Star costs "5*" or "7*"
    if (cost.includes("*")) {
        return { coins: Number(cost.replace("*","")), potion: 0, star: 1, debt: 0 };
    }

    // Normal numeric cost
    return { coins: Number(cost), potion: 0, star: 0, debt: 0 };
}

async function getTodaysCard() {
  const response = await fetch('cards.json');
  const cards = await response.json();
  
  const seed = getTodaysSeed();
  const randomValue = seededRandom(seed);
  const index = Math.floor(randomValue * cards.length);
  
  return cards[index];
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
            // 1. Sort by expansion
            const expCompare = a.expansion.localeCompare(b.expansion);
            if (expCompare !== 0) return expCompare;

            // 2. Parse costs
            const costA = parseCost(a.cost);
            const costB = parseCost(b.cost);

            // First compare coins
            if (costA.coins !== costB.coins)
                return costA.coins - costB.coins;

            // Then debt cost
            if (costA.debt !== costB.debt)
                return costA.debt - costB.debt;

            // Then potion cost
            if (costA.potion !== costB.potion)
                return costA.potion - costB.potion;

            // Then star cost ("*")
            if (costA.star !== costB.star)
                return costA.star - costB.star;

            // 3. Finally sort by name
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

            // EASY MODE CARD
            const easyImg = document.createElement("img");
            easyImg.src = `cards/${cardName}.jpg`;
            easyImg.alt = cardName;
            easyImg.className = "easy-card";

            // When clicked, auto-fill the guess and run filter
            easyImg.onclick = () => {
                document.getElementById("search-input").value = cardName;
                
                // Track that this card was guessed
                console.log("ADDED " + cardName)
                guessedCards.add(cardName);

                // Hide this card from easy mode
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



checkboxes.forEach(cb => {
  cb.addEventListener('change', applyFilters);
});

document.querySelectorAll(".check-all-btn").forEach(button => {
  button.addEventListener("click", () => {
    const details = button.closest("details");
    const checkboxes = details.querySelectorAll(
      'input[type="checkbox"]'
    );

    const allChecked = [...checkboxes].every(cb => cb.checked);

    checkboxes.forEach(cb => cb.checked = !allChecked);

    button.textContent = allChecked ? "Check All" : "Uncheck All";

    applyFilters();
  });
});

function applyFilters() {
    //const response = await fetch('cards.json');
    //const cards = await response.json();
  // 1. Get selected expansions from checkboxes
  const textCheckBox = document.querySelectorAll(".textCheckBox");
  const expCheckBox = document.querySelectorAll(".expansionCheckBox");
  const costCheckBox = document.querySelectorAll(".costCheckBox");
  const typeCheckBox = document.querySelectorAll(".typeCheckBox");
  const colorCheckBox = document.querySelectorAll(".colorCheckBox");
  const activeExpansions = Array.from(expCheckBox)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  const activeText = Array.from(textCheckBox)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  const activeCost = Array.from(costCheckBox)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  const activeType = Array.from(typeCheckBox)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  const activeColor = Array.from(colorCheckBox)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  // 2. Filter Expansions
  const filteredCards = globalCards.filter(card => {
    correctExp = activeExpansions.includes(card.expansion),
    correctCardText = activeText.includes(card.text)
    correctCardCost = activeCost.includes(parseCost(card.cost).coins.toString())
    //console.log("activeCost " + activeCost)
    //console.log("parseCost(card.cost).coins " + parseCost(card.cost).coins)
    //console.log("correctCardCost " + correctCardCost)
    //partialCardCost = card.cost.includes(activeCost)
    includesAllText = true
    includesAllColor = true
    includesAllType = true
    activeText.forEach(element => {
        tempBool = card.text.includes(element)
        includesAllText = includesAllText && tempBool
    });
    //activeCost.forEach(element => {
    //   tempBool = parseCost(card.cost).coins.includes(element)
    //    includesAllCost = includesAllCost && tempBool
    //});
    activeType.forEach(element => {
        tempBool = card.type.includes(element)
        includesAllType = includesAllType && tempBool
    });
    activeColor.forEach(element => {
        tempBool = card.color.includes(element)
        includesAllColor = includesAllColor && tempBool
    });
    //partialCardText = card.text.includes(activeText)
    //console.log("activeColor " + activeColor)
    return correctExp && includesAllText && includesAllColor && includesAllType && correctCardCost //(correctCardCost || partialCardCost)//(correctCardText || includesAllText)
});

  const cardNames = []

  filteredCards.forEach(card_name => {
    cardNames.push(card_name.name)
  });

  //
    //console.log(cardNames)
    document.querySelectorAll(".easy-card").forEach(img => {
        if (!cardNames.includes(img.alt)) {
            img.style.display = "none";
            //console.log("Found Card " + img.alt)
        } else {
            //console.log("Lost Card " + img.alt)
            //console.log(filteredCards[0])
            img.style.display = "block";
        }
    });
    console.log("activeExpansions " + activeExpansions)
    //console.log("filteredCards" + filteredCards)
}

document.addEventListener("click", e => {
    const btn = e.target.closest(".filter-toggle");
    if (!btn) return;

    const targetId = btn.dataset.target;
    const panel = document.getElementById(targetId);

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
    galleryUsed = true
    // Update arrow
    document.getElementById("easy-toggle").textContent =
        panel.classList.contains("open") ?
        "Card Gallery ▲" : "Card Gallery ▼";
};

init();