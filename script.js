// --- State Management ---
// We'll use localStorage to persist data between page loads
const state = {
    demographics: JSON.parse(localStorage.getItem('profileMeDemographics')) || {},
    scores: JSON.parse(localStorage.getItem('profileMeScores')) || {},
    traitQuestionCounts: JSON.parse(localStorage.getItem('profileMeTraitCounts')) || {},
    currentQuizIndex: parseInt(localStorage.getItem('profileMeQuizIndex')) || 0,
    currentQuestionIndex: parseInt(localStorage.getItem('profileMeQuestionIndex')) || 0,
    quizOrder: ['quiz1_personality.json', 'quiz2_scenario.json', 'quiz3_absurdist.json'] // The sequence
};

function saveState() {
    localStorage.setItem('profileMeDemographics', JSON.stringify(state.demographics));
    localStorage.setItem('profileMeScores', JSON.stringify(state.scores));
    localStorage.setItem('profileMeTraitCounts', JSON.stringify(state.traitQuestionCounts));
    localStorage.setItem('profileMeQuizIndex', state.currentQuizIndex);
    localStorage.setItem('profileMeQuestionIndex', state.currentQuestionIndex);
}

function resetState() {
     localStorage.removeItem('profileMeDemographics');
     localStorage.removeItem('profileMeScores');
     localStorage.removeItem('profileMeTraitCounts');
     localStorage.removeItem('profileMeQuizIndex');
     localStorage.removeItem('profileMeQuestionIndex');
     // Optionally clear the state object too if needed immediately
     state.demographics = {};
     state.scores = {};
     state.traitQuestionCounts = {};
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
    // Track how many questions affect each trait
    for (const trait in scores) {
        if (state.traitQuestionCounts.hasOwnProperty(trait)) {
            state.traitQuestionCounts[trait]++;
        } else {
            state.traitQuestionCounts[trait] = 1;
        }
    }

    // Add raw scores to the state
    for (const trait in scores) {
        if (state.scores.hasOwnProperty(trait)) {
            state.scores[trait] += scores[trait];
        } else {
            state.scores[trait] = scores[trait];
        }
    }

    // Move to next question or next quiz
    state.currentQuestionIndex++;
    
    if (state.currentQuestionIndex < quizData.questions.length) {
        displayQuestion(quizData);
    } else {
        state.currentQuestionIndex = 0;
        state.currentQuizIndex++;
        
        if (state.currentQuizIndex < state.quizOrder.length) {
            loadQuiz();
        } else {
            // Normalize scores before going to results
            normalizeScores();
            window.location.href = 'results.html';
        }
    }

    saveState();
}

// Add this new function to normalize scores
function normalizeScores() {
    for (const trait in state.scores) {
        if (state.traitQuestionCounts[trait] > 0) {
            // Normalize score to a 0-10 range
            state.scores[trait] = (state.scores[trait] / state.traitQuestionCounts[trait]) * 10;
        }
    }
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
                <h2>Profile Analysis</h2>
                <div class="profile-analysis">
                    <div class="chart-container">
                        <canvas id="traitChart"></canvas>
                    </div>
                    <div class="analysis-text">
                        ${generateProfileAnalysis(state.scores, traitDefinitions)}
                    </div>
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

        // Create the chart after the DOM is updated
        createTraitChart(state.scores, traitDefinitions);
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

function createTraitChart(scores, definitions) {
    const ctx = document.getElementById('traitChart').getContext('2d');
    const traits = Object.keys(scores);
    const userScores = traits.map(trait => scores[trait]);
    const averageScores = traits.map(trait => 5); // Assuming 5 is the average score

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: traits.map(trait => trait.replace(/_/g, ' ')),
            datasets: [
                {
                    label: 'Your Scores',
                    data: userScores,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Average Scores',
                    data: averageScores,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        stepSize: 2
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function generateProfileAnalysis(scores, definitions) {
    const analysis = [];
    const highTraits = [];
    const lowTraits = [];
    
    // Categorize traits
    for (const trait in scores) {
        if (scores[trait] >= 7) {
            highTraits.push(trait);
        } else if (scores[trait] <= 3) {
            lowTraits.push(trait);
        }
    }

    // Generate analysis text
    if (highTraits.length > 0) {
        analysis.push(`Your profile shows elevated levels in ${highTraits.map(t => t.replace(/_/g, ' ')).join(', ')}.`);
    }
    
    if (lowTraits.length > 0) {
        analysis.push(`You demonstrate lower than average tendencies in ${lowTraits.map(t => t.replace(/_/g, ' ')).join(', ')}.`);
    }

    // Add specific observations
    if (scores.DarkTriad_Psychopathy > 7) {
        analysis.push("Your responses suggest a tendency towards impulsive decision-making and a lower concern for social norms.");
    }
    
    if (scores.SelfControl > 7) {
        analysis.push("You show strong self-regulation and thoughtful consideration in your responses.");
    }
    
    if (scores.Orderliness > 7) {
        analysis.push("Your answers indicate a preference for structure and systematic thinking.");
    }

    // Add overall assessment
    const averageScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
    if (averageScore > 7) {
        analysis.push("Overall, your profile shows above-average intensity in most measured traits.");
    } else if (averageScore < 3) {
        analysis.push("Overall, your profile shows below-average intensity in most measured traits.");
    } else {
        analysis.push("Overall, your profile shows a balanced distribution of traits.");
    }

    return analysis.map(text => `<p>${text}</p>`).join('');
}

// Set current date
currentDate.textContent = date.toLocaleDateString();