
let daily_card;
let guessCount = 0;
const guessedCards = new Set();


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
    input.focus();

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

    row.className = "guess-rows";
    console.log("Created row:", row);
    console.log("Row className:", row.className);

    rows.appendChild(row);
    console.log("Appended row to feedback");

    

    findCard(search).then(card => {

        if (card) {
            console.log("Found card:", card);
            addBoxWrapper(row,"Expansion","expansion_" + Date.now(),card["expansion"],compareCard(card["expansion"],daily_card["expansion"]),0)
            addBoxWrapper(row,"Color","color_" + Date.now(),card["color"],compareCard(card["color"],daily_card["color"]),300)
            addBoxWrapper(row,"Type","type_" + Date.now(),card["type"],compareCard(card["type"],daily_card["type"]),600)
            addBoxWrapper(row,"Text","text_" + Date.now(),card["text"],compareCard(card["text"],daily_card["text"]),900)
            addBoxWrapper(row,"Cost","cost_" + Date.now(),card["cost"],compareCard(card["cost"],daily_card["cost"]),1200)
            addBoxWrapper(row,"Name","name_" + Date.now(),card["name"],compareCard(card["name"],daily_card["name"]),1500)
            console.log("Row after adding boxes:", row);
        }
        if (card["name"] === daily_card["name"]) {
            setTimeout(() => {
                showModal("You Win!", `Correct – the card was ${daily_card["name"]}.`);
            }, 1800);
        }
        if (guessCount >= 8 && card["name"] !== daily_card["name"]) {
            setTimeout(() => {
                showModal("You Lose!", `The correct card was ${daily_card["name"]}.`);
            }, 1800);
        }
    
    });


    
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

function getTodaysSeed() {
  const today = new Date();
  // Use year, month, and day to create a unique number for today
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  
  // Combine into a single number (e.g., 20231215 for Dec 15, 2023)
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
            };

            easyGrid.appendChild(easyImg);
        });
  });
}

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

    // Update arrow
    document.getElementById("easy-toggle").textContent =
        panel.classList.contains("open") ?
        "Card Gallery ▲" : "Card Gallery ▼";
};

init();