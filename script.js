// --- State Management ---
// We'll use localStorage to persist data between page loads
const state = {
    demographics: JSON.parse(localStorage.getItem('profileMeDemographics')) || {},
    scores: JSON.parse(localStorage.getItem('profileMeScores')) || {},
    currentQuizIndex: parseInt(localStorage.getItem('profileMeQuizIndex')) || 0,
    currentQuestionIndex: parseInt(localStorage.getItem('profileMeQuestionIndex')) || 0,
    quizOrder: ['quiz1_personality.json', 'quiz2_scenario.json', 'quiz3_absurdist.json'] // The sequence
};

function saveState() {
    localStorage.setItem('profileMeDemographics', JSON.stringify(state.demographics));
    localStorage.setItem('profileMeScores', JSON.stringify(state.scores));
    localStorage.setItem('profileMeQuizIndex', state.currentQuizIndex);
    localStorage.setItem('profileMeQuestionIndex', state.currentQuestionIndex);
}

function resetState() {
     localStorage.removeItem('profileMeDemographics');
     localStorage.removeItem('profileMeScores');
     localStorage.removeItem('profileMeQuizIndex');
     localStorage.removeItem('profileMeQuestionIndex');
     // Optionally clear the state object too if needed immediately
     state.demographics = {};
     state.scores = {};
     state.currentQuizIndex = 0;
     state.currentQuestionIndex = 0;
}


// --- Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'index.html' || currentPage === '') {
        // Reset state when returning to index page (optional, but good for testing)
        // resetState(); // Uncomment this if you want a fresh start every time index is loaded
        setupDemographicsPage();
    } else if (currentPage === 'quiz.html') {
        setupQuizPage();
    } else if (currentPage === 'results.html') {
        setupResultsPage();
    }
});

// --- Demographics Page Logic (index.html) ---
function setupDemographicsPage() {
    const form = document.getElementById('demographics-form');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            state.demographics.alias = document.getElementById('alias').value;
            state.demographics.ageRange = document.getElementById('age-range').value;
            state.demographics.locationType = document.getElementById('location-type').value;
            // Reset scores and progress for a new run
            state.scores = {};
            state.currentQuizIndex = 0;
            state.currentQuestionIndex = 0;
            saveState();
            window.location.href = 'quiz.html'; // Proceed to the first quiz
        });
    }
}

// --- Quiz Page Logic (quiz.html) ---
function setupQuizPage() {
    if (state.currentQuizIndex >= state.quizOrder.length) {
        // Should not happen if logic is correct, but redirect if all quizzes done
        window.location.href = 'results.html';
        return;
    }
    loadQuiz();
}

async function loadQuiz() {
    const quizFileName = state.quizOrder[state.currentQuizIndex];
    const progressIndicator = document.getElementById('progress-indicator');

    if (!quizFileName) {
        console.error("Invalid quiz index or filename.");
        // Handle error, maybe redirect to results or index
        window.location.href = 'results.html'; // Go to results if out of quizzes
        return;
    }
     if (progressIndicator) {
        progressIndicator.textContent = `Module ${state.currentQuizIndex + 1} of ${state.quizOrder.length}`;
    }


    try {
        const response = await fetch(`quizzes/${quizFileName}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const quizData = await response.json();
        displayQuestion(quizData);
    } catch (error) {
        console.error("Error loading quiz data:", error);
        // Display error to user?
        const titleElement = document.getElementById('quiz-title');
         if (titleElement) titleElement.textContent = "Error loading module.";
         const questionContainer = document.getElementById('question-container');
         if(questionContainer) questionContainer.innerHTML = `<p>Could not load quiz file: ${quizFileName}. Please check the console.</p>`;
    }
}

// Add this utility function at the top of the file
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function displayQuestion(quizData) {
    const question = quizData.questions[state.currentQuestionIndex];
    const titleElement = document.getElementById('quiz-title');
    const questionTextElement = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const questionProgress = document.getElementById('question-progress');

    if (titleElement) titleElement.textContent = quizData.quizTitle || "Evaluation Module";
    if (questionTextElement) questionTextElement.textContent = question.text;
    if (optionsContainer) optionsContainer.innerHTML = ''; // Clear previous options
    if (questionProgress) {
        questionProgress.textContent = `Question ${state.currentQuestionIndex + 1} of ${quizData.questions.length}`;
    }

    // Shuffle the options before displaying them
    const shuffledOptions = shuffleArray(question.options);
    
    shuffledOptions.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.text;
        button.onclick = () => handleAnswer(option.scores, quizData);
        if (optionsContainer) optionsContainer.appendChild(button);
    });
}

function handleAnswer(scores, quizData) {
    // Add scores to the state
    for (const trait in scores) {
        if (state.scores.hasOwnProperty(trait)) {
            state.scores[trait] += scores[trait];
        } else {
            state.scores[trait] = scores[trait];
        }
    }

    // Move to next question or next quiz
    state.currentQuestionIndex++;
    
    // Check if there are more questions in the current quiz
    if (state.currentQuestionIndex < quizData.questions.length) {
        // More questions in current quiz
        displayQuestion(quizData);
    } else {
        // No more questions in current quiz, move to next quiz
        state.currentQuestionIndex = 0; // Reset for the next quiz
        state.currentQuizIndex++;      // Move to the next quiz file index
        
        // Check if there are more quizzes
        if (state.currentQuizIndex < state.quizOrder.length) {
            loadQuiz(); // Load the next quiz file
        } else {
            // All quizzes are completed
            window.location.href = 'results.html';
        }
    }

    saveState();
}


// --- Results Page Logic (results.html) ---
async function setupResultsPage() {
    // Load trait definitions
    let traitDefinitions;
    try {
        const response = await fetch('quizzes/trait_definitions.json');
        traitDefinitions = await response.json();
    } catch (error) {
        console.error("Error loading trait definitions:", error);
        return;
    }

    // Display demographics in police report style
    const reportContainer = document.getElementById('report-container');
    if (reportContainer) {
        reportContainer.innerHTML = `
            <div class="report-header">
                <h1>${traitDefinitions.reportTemplate.header}</h1>
                <div class="report-meta">
                    <span class="report-date">Date: ${new Date().toLocaleDateString()}</span>
                    <span class="report-id">Case #: ${generateCaseNumber()}</span>
                </div>
            </div>
            
            <section class="report-section">
                <h2>${traitDefinitions.reportTemplate.sections[0]}</h2>
                <div class="subject-info">
                    <p><strong>Alias:</strong> ${state.demographics.alias || 'UNKNOWN'}</p>
                    <p><strong>Age Range:</strong> ${state.demographics.ageRange || 'UNKNOWN'}</p>
                    <p><strong>Location Type:</strong> ${state.demographics.locationType || 'UNKNOWN'}</p>
                </div>
            </section>

            <section class="report-section">
                <h2>${traitDefinitions.reportTemplate.sections[1]}</h2>
                <div class="trait-analysis">
                    ${generateTraitAnalysis(state.scores, traitDefinitions)}
                </div>
            </section>

            <section class="report-section">
                <h2>${traitDefinitions.reportTemplate.sections[2]}</h2>
                <div class="risk-evaluation">
                    ${generateRiskEvaluation(state.scores, traitDefinitions)}
                </div>
            </section>

            <section class="report-section">
                <h2>${traitDefinitions.reportTemplate.sections[3]}</h2>
                <div class="recommendations">
                    ${generateRecommendations(state.scores, traitDefinitions)}
                </div>
            </section>

            <section class="glossary-section">
                <h2>TERMINOLOGY GLOSSARY</h2>
                <div class="glossary-grid">
                    ${generateGlossary(state.scores, traitDefinitions)}
                </div>
            </section>

            <div class="report-footer">
                <p>${traitDefinitions.reportTemplate.footer}</p>
            </div>
        `;
    }
}

function generateCaseNumber() {
    const date = new Date();
    const random = Math.floor(Math.random() * 10000);
    return `PR-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${random.toString().padStart(4, '0')}`;
}

function generateTraitAnalysis(scores, definitions) {
    let html = '<div class="trait-grid">';
    
    for (const trait in scores) {
        if (definitions.traits[trait]) {
            const traitData = definitions.traits[trait];
            const range = findTraitRange(scores[trait], traitData.ranges);
            
            html += `
                <div class="trait-card ${traitData.severity.toLowerCase()}">
                    <h3>${trait.replace(/_/g, ' ')}</h3>
                    <div class="trait-score">Score: ${scores[trait]}</div>
                    <div class="trait-label">${range.label}</div>
                    <div class="trait-description">${range.description}</div>
                </div>
            `;
        }
    }
    
    html += '</div>';
    return html;
}

function generateRiskEvaluation(scores, definitions) {
    const highRiskTraits = [];
    const mediumRiskTraits = [];
    
    for (const trait in scores) {
        if (definitions.traits[trait]) {
            const traitData = definitions.traits[trait];
            const range = findTraitRange(scores[trait], traitData.ranges);
            
            if (traitData.severity === 'High' && scores[trait] > 3) {
                highRiskTraits.push({
                    trait: trait,
                    score: scores[trait],
                    description: range.description
                });
            } else if (traitData.severity === 'Medium' && scores[trait] > 5) {
                mediumRiskTraits.push({
                    trait: trait,
                    score: scores[trait],
                    description: range.description
                });
            }
        }
    }
    
    let html = '<div class="risk-evaluation-content">';
    
    if (highRiskTraits.length > 0) {
        html += `
            <div class="risk-level high">
                <h3>HIGH RISK INDICATORS</h3>
                <ul>
                    ${highRiskTraits.map(trait => `
                        <li>
                            <strong>${trait.trait.replace(/_/g, ' ')}</strong> (Score: ${trait.score})
                            <p>${trait.description}</p>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    if (mediumRiskTraits.length > 0) {
        html += `
            <div class="risk-level medium">
                <h3>MEDIUM RISK INDICATORS</h3>
                <ul>
                    ${mediumRiskTraits.map(trait => `
                        <li>
                            <strong>${trait.trait.replace(/_/g, ' ')}</strong> (Score: ${trait.score})
                            <p>${trait.description}</p>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    if (highRiskTraits.length === 0 && mediumRiskTraits.length === 0) {
        html += '<p class="low-risk">No significant risk indicators detected. Subject profile within normal parameters.</p>';
    }
    
    html += '</div>';
    return html;
}

function generateRecommendations(scores, definitions) {
    const allRecommendations = new Set();
    
    for (const trait in scores) {
        if (definitions.traits[trait]) {
            const traitData = definitions.traits[trait];
            if (scores[trait] > 3) { // Only include recommendations for elevated scores
                traitData.recommendations.forEach(rec => allRecommendations.add(rec));
            }
        }
    }
    
    let html = '<div class="recommendations-content">';
    
    if (allRecommendations.size > 0) {
        html += '<ul>';
        allRecommendations.forEach(rec => {
            html += `<li>${rec}</li>`;
        });
        html += '</ul>';
    } else {
        html += '<p>No specific recommendations required. Subject profile within normal parameters.</p>';
    }
    
    html += '</div>';
    return html;
}

function generateGlossary(scores, definitions) {
    const relevantTraits = new Set();
    
    // Add all traits that have scores
    for (const trait in scores) {
        if (definitions.traits[trait]) {
            relevantTraits.add(trait);
        }
    }

    let html = '';
    for (const trait of relevantTraits) {
        const traitData = definitions.traits[trait];
        html += `
            <div class="glossary-term">
                <h3>${trait.replace(/_/g, ' ')}</h3>
                <p><strong>Category:</strong> ${traitData.category}</p>
                <p><strong>Severity:</strong> ${traitData.severity}</p>
                <p><strong>Description:</strong> ${traitData.ranges[0].description}</p>
            </div>
        `;
    }
    return html;
}

function findTraitRange(score, ranges) {
    for (const range of ranges) {
        if (score >= range.min && score <= range.max) {
            return range;
        }
    }
    return ranges[ranges.length - 1]; // Return highest range if score exceeds all ranges
}

// Set current date
currentDate.textContent = date.toLocaleDateString();