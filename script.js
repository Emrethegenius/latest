// Theme setup
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = localStorage.getItem('theme') === 'dark';
        
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
});

// Global variables
let marker = null;
let correctMarker = null;
let line = null;
let currentQuestion = 0;
let allGuesses = [];
let allMarkers = [];
let allLines = [];
let map, correctLocation, canGuess = true, totalScore = 0, roundsPlayed = 0;
let currentGuess = null;

// Initial theme setup
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Questions array
const questions = [
    {
        question: "Where is the world's oldest stock exchange still in operation?",
        answer: [52.3702, 4.8952],
        name: "Amsterdam Stock Exchange",
        image: "images/Hendrick_de_Keyser_exchange-1024x808.jpg",
        info: "Established in 1602 by the Dutch East India Company, the Amsterdam Stock Exchange is considered the world's oldest 'modern' securities market. It pioneered many financial innovations including continuous trading and options trading."
    },
    {
        question: "Where is the coldest permanently inhabited place on Earth?",
        answer: [63.4641, 142.7737],
        name: "Oymyakon, Russia",
        image: "images/oymyakon-1[3].jpg",
        info: "Oymyakon in Siberia holds the record for the coldest permanently inhabited place, with temperatures dropping to -71.2°C (-96.16°F). Around 500 people live in this extreme environment where ground is permanently frozen."
    },
    {
        question: "Where was the Apollo 11 command module recovered after splashdown?",
        answer: [13.3290, 169.1490],
        name: "Pacific Ocean Recovery Site",
        image: "images/Splashdown_3.jpg",
        info: "On July 24, 1969, Apollo 11 splashed down 900 miles southwest of Hawaii. The USS Hornet recovered the command module Columbia and its crew, marking the successful completion of the first human moon landing mission."
    },
    {
        question: "Where was the first written peace treaty in history signed?",
        answer: [34.5679, 36.0513],
        name: "Kadesh, Syria",
        image: "images/200px-Treaty_of_Kadesh.jpg",
        info: "The Treaty of Kadesh (1259 BCE), signed between Egyptian Pharaoh Ramesses II and Hittite King Hattusili III, is the oldest known peace treaty. A copy is displayed at the UN Headquarters as a symbol of diplomatic relations."
    },
    {
        question: "Where was the first successful human heart transplant performed?",
        answer: [-33.94113063924009, 18.462912490286236],
        name: "Groote Schuur Hospital, Cape Town",
        image: "images/treaty-of-kadesh-3.jpg",
        info: "On December 3, 1967, Dr. Christiaan Barnard performed the world's first successful human heart transplant at Groote Schuur Hospital. The patient, Louis Washkansky, lived for 18 days after the groundbreaking surgery."
    }
];

// Icon definitions
const userIcon = L.divIcon({
    className: 'user-guess-pin',
    html: `
        <div class="pin-wrapper">
            <div class="pin-head"></div>
            <div class="pin-point"></div>
        </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

const correctIcon = L.divIcon({
    className: 'correct-pin',
    html: `
        <div class="fancy-plus">
            <div class="plus-circle">
                <span class="plus-icon">+</span>
            </div>
            <div class="pulse-ring"></div>
            <div class="pulse-ring delay"></div>
        </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25]
});

// Core functions
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function handleGuess(e) {
    if (!canGuess) return;
    
    const userGuess = e.latlng;
    currentGuess = userGuess;
    
    if (marker && map) {
        map.removeLayer(marker);
    }
    
    marker = L.marker([userGuess.lat, userGuess.lng], { icon: userIcon }).addTo(map);
    document.getElementById('submit-guess').style.display = 'block';
}

function showGuessAndCorrectLocation(userGuess, correctLatLng) {
    console.log("Adding correct marker at:", correctLatLng);
    correctMarker = L.marker([correctLatLng.lat, correctLatLng.lng], {
        icon: correctIcon
    }).addTo(map);
    
    const currentQuestionInfo = questions[currentQuestion];
    const popupContent = `
        <div class="location-info">
            <h3>${currentQuestionInfo.name}</h3>
            <img src="${currentQuestionInfo.image}" alt="${currentQuestionInfo.name}">
            <p>${currentQuestionInfo.info}</p>
        </div>
    `;
    
    correctMarker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'location-popup'
    });
    
    const bounds = L.latLngBounds([
        [userGuess.lat, userGuess.lng],
        [correctLatLng.lat, correctLatLng.lng]
    ]);
    map.fitBounds(bounds, { padding: [50, 50] });
}

function endGame() {
    const statsContainer = document.querySelector('.stats-container');
    const questionContainer = document.getElementById('question-container');
    const placeholder = document.createElement('div');
    
    placeholder.style.height = questionContainer.offsetHeight + 'px';
    placeholder.id = 'question-placeholder';
    
    questionContainer.parentNode.replaceChild(placeholder, questionContainer);
    statsContainer.style.display = 'none';
    const endScreen = document.getElementById('end-screen');
    const finalScore = document.getElementById('final-score');
    const finalStats = document.getElementById('final-stats');
    
    let totalDistance = 0;
    let guessDetails = '';
    
    questions.forEach((question, index) => {
        const guess = allGuesses[index];
        const distance = calculateDistance(guess.lat, guess.lng, question.answer[0], question.answer[1]);
        totalDistance += distance;
        
        guessDetails += `
            <div class="guess-detail">
                Round ${index + 1} - Your guess was ${Math.round(distance)} kilometers away
            </div>
        `;
    });
    
    const averageDistance = totalDistance / questions.length;
    const accuracy = Math.max(0, 100 - (averageDistance / 100));
    
    finalScore.textContent = `Final Score: ${totalScore}`;
    finalStats.innerHTML = `
        <div class="accuracy">Accuracy: ${accuracy.toFixed(1)}%</div>
        <div class="guess-history">
            <h3>Your Guesses:</h3>
            ${guessDetails}
        </div>
    `;
    
    endScreen.style.display = 'flex';
    setupMinimizeButton();
}

function setupMinimizeButton() {
    const endScreen = document.getElementById('end-screen');
    const endContent = document.querySelector('.end-content');
    const minimizeButton = document.createElement('button');
    minimizeButton.className = 'minimize-button';
    minimizeButton.innerHTML = '−';
    
    function toggleMinimize() {
        endContent.classList.toggle('minimized');
        endScreen.classList.toggle('minimized');
        minimizeButton.innerHTML = endContent.classList.contains('minimized') ? '+' : '−';
        
        const map = document.getElementById('map');
        if (endContent.classList.contains('minimized')) {
            map.style.height = 'calc(100vh - 80px)';
            endScreen.style.pointerEvents = 'none';
            endContent.style.pointerEvents = 'all';
        } else {
            map.style.height = 'calc(100vh - 250px)';
            endScreen.style.pointerEvents = 'all';
        }
    }
    
    minimizeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMinimize();
    });
    
    endContent.addEventListener('click', (e) => {
        if (endContent.classList.contains('minimized')) {
            toggleMinimize();
        }
    });
    
    endContent.appendChild(minimizeButton);
}

// Main game initialization and event listeners
document.addEventListener('DOMContentLoaded', () => {
    const startGame = document.getElementById("start-game");
    if (startGame) {
        startGame.onclick = function() {
            const heroContainer = document.querySelector('.hero-container');
            const gameSection = document.getElementById('game-section');
            
            if (heroContainer && gameSection) {
                heroContainer.style.display = "none";
                gameSection.style.display = "block";
                
                map = L.map('map', {
                    minZoom: 2,
                    maxZoom: 18,
                    maxBounds: [[-90, -180], [90, 180]],
                    maxBoundsViscosity: 1.0
                }).setView([20, 0], 2);
                
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '©OpenStreetMap, ©CartoDB'                 
                }).addTo(map);
            
                document.getElementById("question").textContent = questions[currentQuestion].question;
                map.on('click', handleGuess);
            }
        };
    }
    
    document.getElementById('submit-guess').addEventListener('click', function() {
        if (!currentGuess) return;
        
        canGuess = false;
        const correctAnswer = questions[currentQuestion].answer;
        const distance = calculateDistance(currentGuess.lat, currentGuess.lng, correctAnswer[0], correctAnswer[1]);
        
        allGuesses.push(currentGuess);

        const nextButton = document.querySelector('.next-button');
        nextButton.style.display = 'block';
        this.style.display = 'none';
        
        document.getElementById("distance").textContent = `${Math.round(distance)} km`;
        const points = Math.round(4000 * Math.exp(-distance / 2000));
        totalScore += points;
        document.getElementById("score").textContent = `${totalScore}`;
        
        showGuessAndCorrectLocation(currentGuess, L.latLng(correctAnswer[0], correctAnswer[1]));
        
        line = L.polyline([[currentGuess.lat, currentGuess.lng], correctAnswer], {
            color: '#7ac5f0',
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1,
            dashArray: '10',
            className: 'animated-line'
        }).addTo(map);
    });
    
    document.querySelector('.next-button').addEventListener('click', function() {
        if (currentQuestion < questions.length - 1) {
            currentQuestion++;
            canGuess = true;
            currentGuess = null;
            
            if (marker) map.removeLayer(marker);
            if (correctMarker) map.removeLayer(correctMarker);
            if (line) map.removeLayer(line);
            
            map.setView([20, 0], 2);
            
            document.getElementById('question').textContent = questions[currentQuestion].question;
            
            this.style.display = 'none';
            document.getElementById('submit-guess').style.display = 'none';
        } else {
            endGame();
        }
    });
});
