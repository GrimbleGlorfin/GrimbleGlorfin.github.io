
let daily_card;





function filterImages(event) {
    event.preventDefault();
    const search = document.getElementById("search-input").value.toLowerCase();
    const images = document.querySelectorAll(".pic");
    const input = document.getElementById("search-input");

    

    let found = false;

    //loop through images looking for guessed image
    images.forEach(img => {
      if (img.alt.toLowerCase() === search) {
          img.style.display = "block";
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

    //Clear search bar
    input.value = "";

    //Put cursor back into search bar
    input.focus();

    
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

function addBoxWrapper(row,label_text,id,box_text,color) {
    const box_wrapper = document.createElement("div");
    const label = document.createElement("div");
    const box = document.createElement("div");

    box_wrapper.className = "box-wrapper";
    label.className = "label";
    box.className = "box";
    box.id = id
    box.textContent = box_text
    box.style.backgroundColor = color
    label.textContent = label_text

    box_wrapper.appendChild(label);
    box_wrapper.appendChild(box);
    row.appendChild(box_wrapper);
}

function addGuessRows(search) {
    const rows = document.querySelector(".feedback");
    const row = document.createElement("div");

    row.className = "guess-rows";
    console.log("Created row:", row);
    console.log("Row className:", row.className);

    rows.appendChild(row);
    console.log("Appended row to feedback");

    findCard(search).then(card => {

        if (card) {
            console.log("Found card:", card);
            addBoxWrapper(row,"Name","name_" + Date.now(),card["name"],compareCard(card["name"],daily_card["name"]))
            addBoxWrapper(row,"Cost","cost_" + Date.now(),card["cost"],compareCard(card["cost"],daily_card["cost"]))
            addBoxWrapper(row,"Type","type_" + Date.now(),card["type"],compareCard(card["type"],daily_card["type"]))
            addBoxWrapper(row,"Color","color_" + Date.now(),card["color"],compareCard(card["color"],daily_card["color"]))
            addBoxWrapper(row,"Expansion","expansion_" + Date.now(),card["expansion"],compareCard(card["expansion"],daily_card["expansion"]))
            console.log("Row after adding boxes:", row);
            /*
            const card_cost = document.getElementById("card_cost") //.textContent = card["cost"];
            card_cost.textContent = card["cost"];
            card_cost.style.backgroundColor = compareCard(card["cost"],daily_card["cost"]);
            const card_type = document.getElementById("card_type")
            card_type.textContent = card["type"];
            card_type.style.backgroundColor = compareCard(card["type"],daily_card["type"]);
            const card_color = document.getElementById("card_color") //.textContent = card["color"];
            card_color.textContent = card["color"];
            card_color.style.backgroundColor = compareCard(card["color"],daily_card["color"]);
            const card_expansion = document.getElementById("card_expansion") //.textContent = card["expansion"];
            card_expansion.textContent = card["expansion"];
            card_expansion.style.backgroundColor = compareCard(card["expansion"],daily_card["expansion"]);
            const card_name = document.getElementById("card_name") //.textContent = card["name"];
            card_name.textContent = card["name"];
            card_name.style.backgroundColor = compareCard(card["name"],daily_card["name"]);
            */
        }
    });

    
}

function compareCard(attribute,daily_attribute) {
    if (attribute === daily_attribute) {
        return "green"
    } 
    if (typeof attribute === 'string' || Array.isArray(attribute)) {
        if (attribute.includes(daily_attribute)) {
            return "yellow"
        } else if (daily_attribute.includes(attribute)) {
            return "yellow"
        }
    }
    return "red"
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

  fetch("cards.json")
    .then(response => response.json())
    .then(cards => {
        const container = document.querySelector(".card-images");
        const datalist = document.getElementById("search-options");
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
        });
  });
}


init();