/**
 * FrontendMastery Interactive Quiz Application
 * Vanilla JavaScript (ES6+) implementation with Fetch API, elapsed-time tracking,
 * single-answer locking, accessible DOM updates, and local JSON result export.
 */

const QUESTIONS_DATA_URL = 'data/questions.json';
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

/**
 * Centralized application state
 */
const quizState = {
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  hasAnsweredCurrent: false,
  userSelections: [],
  elapsedSeconds: 0,
  timerIntervalId: null,
  completedAt: null,
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'active' | 'completed' | 'error'
};

/**
 * Cached DOM element references
 */
const dom = {
  // Screens
  loadingScreen: document.getElementById('loading-screen'),
  errorScreen: document.getElementById('error-screen'),
  startScreen: document.getElementById('start-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  resultsScreen: document.getElementById('results-screen'),

  // Header & Navigation
  brandLink: document.getElementById('brand-link'),
  headerStartBtn: document.getElementById('header-start-btn'),
  navLinks: document.querySelectorAll('.nav-link'),

  // Start Screen Elements
  totalQuestionsMeta: document.getElementById('total-questions-meta'),
  statQuestionCount: document.getElementById('stat-question-count'),
  startBtn: document.getElementById('start-btn'),

  // Error Screen Elements
  errorMessage: document.getElementById('error-message'),
  retryBtn: document.getElementById('retry-btn'),

  // Quiz Screen Elements
  questionCounter: document.getElementById('question-counter'),
  questionCategory: document.getElementById('question-category'),
  questionDifficulty: document.getElementById('question-difficulty'),
  timerDisplay: document.getElementById('timer-display'),
  scoreDisplay: document.getElementById('score-display'),
  progressBar: document.getElementById('progress-bar'),
  progressFill: document.getElementById('progress-fill'),
  progressPercentage: document.getElementById('progress-percentage'),
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  feedbackContainer: document.getElementById('feedback-container'),
  feedbackBadge: document.getElementById('feedback-badge'),
  feedbackCorrectAnswer: document.getElementById('feedback-correct-answer'),
  feedbackExplanation: document.getElementById('feedback-explanation'),
  quizHelperText: document.getElementById('quiz-helper-text'),
  nextBtn: document.getElementById('next-btn'),

  // Results Screen Elements
  resultsDomainMeta: document.getElementById('results-domain-meta'),
  resultsHeading: document.getElementById('results-heading'),
  performanceMessage: document.getElementById('performance-message'),
  finalScore: document.getElementById('final-score'),
  finalPercentage: document.getElementById('final-percentage'),
  finalTime: document.getElementById('final-time'),
  finalCorrect: document.getElementById('final-correct'),
  finalIncorrect: document.getElementById('final-incorrect'),
  categoryBreakdown: document.getElementById('category-breakdown'),
  reviewList: document.getElementById('review-list'),
  restartBtn: document.getElementById('restart-btn'),
  downloadJsonBtn: document.getElementById('download-json-btn'),
  overviewBtn: document.getElementById('overview-btn'),
};

/**
 * Formats integer seconds as MM:SS for display.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatElapsedTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Updates the visible timer readout in the quiz header.
 */
function updateTimerUI() {
  if (dom.timerDisplay) {
    dom.timerDisplay.textContent = formatElapsedTime(quizState.elapsedSeconds);
  }
}

/**
 * Stops and cleans up any running interval timer.
 */
function stopTimer() {
  if (quizState.timerIntervalId !== null) {
    clearInterval(quizState.timerIntervalId);
    quizState.timerIntervalId = null;
  }
}

/**
 * Resets and starts the elapsed-time counter for a new quiz session.
 */
function startTimer() {
  stopTimer();
  quizState.elapsedSeconds = 0;
  updateTimerUI();

  quizState.timerIntervalId = window.setInterval(() => {
    if (quizState.status === 'active') {
      quizState.elapsedSeconds += 1;
      updateTimerUI();
    }
  }, 1000);
}

/**
 * Switches visible screen while hiding all other view containers.
 * @param {'loading' | 'error' | 'start' | 'quiz' | 'results'} screenName
 */
function showScreen(screenName) {
  const screenMap = {
    loading: dom.loadingScreen,
    error: dom.errorScreen,
    start: dom.startScreen,
    quiz: dom.quizScreen,
    results: dom.resultsScreen,
  };

  Object.entries(screenMap).forEach(([key, element]) => {
    if (!element) return;
    if (key === screenName) {
      element.classList.remove('hidden');
    } else {
      element.classList.add('hidden');
    }
  });

  if (dom.headerStartBtn) {
    if (screenName === 'quiz' || screenName === 'results') {
      dom.headerStartBtn.textContent = 'Restart Quiz';
    } else {
      dom.headerStartBtn.textContent = 'Start Quiz';
    }
  }
}

/**
 * Validates that the loaded JSON array adheres to the required question schema.
 * @param {unknown} data
 * @returns {Array<Object>}
 */
function validateQuestionsData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('The question bank JSON must be a non-empty array of question objects.');
  }

  return data.map((item, idx) => {
    if (
      !item ||
      typeof item.question !== 'string' ||
      !Array.isArray(item.options) ||
      item.options.length !== 4
    ) {
      throw new Error(`Question at index ${idx} is missing a valid prompt or 4 options.`);
    }

    const resolvedCorrectIndex =
      typeof item.correctIndex === 'number'
        ? item.correctIndex
        : item.options.indexOf(item.correctAnswer);

    if (resolvedCorrectIndex < 0 || resolvedCorrectIndex > 3) {
      throw new Error(`Question at index ${idx} does not specify a valid correct option.`);
    }

    return {
      id: item.id ?? idx + 1,
      category: item.category || 'Frontend',
      difficulty: item.difficulty || 'Intermediate',
      question: item.question,
      options: item.options.map(String),
      correctIndex: resolvedCorrectIndex,
      correctAnswer: item.options[resolvedCorrectIndex],
      explanation: item.explanation || 'No explanation provided for this question.',
    };
  });
}

/**
 * Asynchronously fetches questions from data/questions.json using the Fetch API.
 * @param {string} [urlOverride]
 * @returns {Promise<boolean>}
 */
async function loadQuestions(urlOverride = QUESTIONS_DATA_URL) {
  stopTimer();
  quizState.status = 'loading';
  showScreen('loading');

  try {
    const response = await fetch(urlOverride, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch "${urlOverride}".`);
    }

    const rawData = await response.json();
    const validatedQuestions = validateQuestionsData(rawData);

    quizState.questions = validatedQuestions;
    quizState.status = 'ready';

    const totalCount = validatedQuestions.length;
    if (dom.totalQuestionsMeta) {
      dom.totalQuestionsMeta.textContent = `${totalCount} Questions`;
    }
    if (dom.statQuestionCount) {
      dom.statQuestionCount.textContent = String(totalCount);
    }

    showScreen('start');
    return true;
  } catch (error) {
    quizState.status = 'error';
    if (dom.errorMessage) {
      dom.errorMessage.textContent =
        error instanceof Error
          ? `Could not load quiz questions (${error.message}). Verify that data/questions.json is accessible and contains valid JSON.`
          : 'An unexpected network error occurred while loading the quiz questions.';
    }
    showScreen('error');
    return false;
  }
}

/**
 * Resets all quiz state variables, restarts the elapsed timer, and renders Question 1
 * without reloading the page.
 */
async function startOrRestartQuiz() {
  if (quizState.questions.length === 0) {
    const loaded = await loadQuestions();
    if (!loaded) return;
  }

  quizState.currentQuestionIndex = 0;
  quizState.score = 0;
  quizState.hasAnsweredCurrent = false;
  quizState.userSelections = [];
  quizState.completedAt = null;
  quizState.status = 'active';

  startTimer();
  showScreen('quiz');
  renderCurrentQuestion();
}

/**
 * Updates the live score display and progress bar indicators.
 */
function updateScoreAndProgressUI() {
  const total = quizState.questions.length;
  const currentNumber = quizState.currentQuestionIndex + 1;
  const percentage = total > 0 ? Math.round((currentNumber / total) * 100) : 0;

  if (dom.questionCounter) {
    dom.questionCounter.textContent = `Question ${currentNumber} of ${total}`;
  }

  if (dom.scoreDisplay) {
    dom.scoreDisplay.textContent = `${quizState.score} / ${total}`;
  }

  if (dom.progressFill) {
    dom.progressFill.style.width = `${percentage}%`;
  }

  if (dom.progressBar) {
    dom.progressBar.setAttribute('aria-valuenow', String(percentage));
  }

  if (dom.progressPercentage) {
    dom.progressPercentage.textContent = `${percentage}%`;
  }
}

/**
 * Renders the active question prompt, metadata, and 4 answer buttons.
 */
function renderCurrentQuestion() {
  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  const total = quizState.questions.length;

  if (!currentQuestion) return;

  quizState.hasAnsweredCurrent = false;
  updateScoreAndProgressUI();

  if (dom.questionCategory) {
    dom.questionCategory.textContent = currentQuestion.category;
  }
  if (dom.questionDifficulty) {
    dom.questionDifficulty.textContent = currentQuestion.difficulty;
  }

  if (dom.questionText) {
    dom.questionText.textContent = currentQuestion.question;
  }

  // Reset and hide feedback container
  if (dom.feedbackContainer) {
    dom.feedbackContainer.classList.add('hidden');
    dom.feedbackContainer.classList.remove('is-correct', 'is-incorrect');
  }
  if (dom.feedbackBadge) {
    dom.feedbackBadge.textContent = '';
  }
  if (dom.feedbackCorrectAnswer) {
    dom.feedbackCorrectAnswer.textContent = '';
  }
  if (dom.feedbackExplanation) {
    dom.feedbackExplanation.textContent = '';
  }

  // Build 4 option buttons using DocumentFragment
  if (dom.optionsContainer) {
    dom.optionsContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    currentQuestion.options.forEach((optionText, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-btn';
      button.dataset.index = String(index);
      button.setAttribute('aria-label', `Option ${OPTION_KEYS[index]}: ${optionText}`);

      const leftGroup = document.createElement('span');
      leftGroup.className = 'option-left';

      const keyBadge = document.createElement('span');
      keyBadge.className = 'option-key';
      keyBadge.setAttribute('aria-hidden', 'true');
      keyBadge.textContent = OPTION_KEYS[index];

      const labelSpan = document.createElement('span');
      labelSpan.className = 'option-text';
      labelSpan.textContent = optionText;

      const statusTag = document.createElement('span');
      statusTag.className = 'option-status-tag';
      statusTag.setAttribute('aria-hidden', 'true');
      statusTag.textContent = '';

      leftGroup.appendChild(keyBadge);
      leftGroup.appendChild(labelSpan);
      button.appendChild(leftGroup);
      button.appendChild(statusTag);

      fragment.appendChild(button);
    });

    dom.optionsContainer.appendChild(fragment);
  }

  if (dom.nextBtn) {
    dom.nextBtn.disabled = true;
    const isLastQuestion = quizState.currentQuestionIndex === total - 1;
    dom.nextBtn.textContent = isLastQuestion ? 'View Final Results' : 'Next Question';
  }

  if (dom.quizHelperText) {
    dom.quizHelperText.textContent =
      'Choose one option above to check your answer.';
  }
}

/**
 * Handles user selection of an answer option.
 * Enforces single-answer locking, updates score, highlights correct/incorrect buttons,
 * and reveals the explanation box.
 * @param {number} selectedIndex
 */
function handleSelectOption(selectedIndex) {
  if (quizState.status !== 'active' || quizState.hasAnsweredCurrent) {
    return;
  }

  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  if (!currentQuestion || selectedIndex < 0 || selectedIndex >= currentQuestion.options.length) {
    return;
  }

  quizState.hasAnsweredCurrent = true;
  const correctIndex = currentQuestion.correctIndex;
  const isCorrect = selectedIndex === correctIndex;

  if (isCorrect) {
    quizState.score += 1;
  }

  quizState.userSelections.push({
    questionId: currentQuestion.id,
    category: currentQuestion.category,
    difficulty: currentQuestion.difficulty,
    question: currentQuestion.question,
    selectedIndex,
    selectedText: currentQuestion.options[selectedIndex],
    correctIndex,
    correctText: currentQuestion.options[correctIndex],
    isCorrect,
    explanation: currentQuestion.explanation,
  });

  updateScoreAndProgressUI();

  const optionButtons = dom.optionsContainer.querySelectorAll('.option-btn');
  optionButtons.forEach((button, idx) => {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    const statusTag = button.querySelector('.option-status-tag');

    if (idx === correctIndex) {
      button.classList.add('correct');
      if (statusTag) {
        statusTag.textContent = 'Correct';
      }
    } else if (idx === selectedIndex && !isCorrect) {
      button.classList.add('incorrect');
      if (statusTag) {
        statusTag.textContent = 'Your Answer';
      }
    } else {
      button.classList.add('muted-option');
    }
  });

  if (dom.feedbackContainer) {
    dom.feedbackContainer.classList.remove('hidden', 'is-correct', 'is-incorrect');
    dom.feedbackContainer.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
  }

  if (dom.feedbackBadge) {
    dom.feedbackBadge.textContent = isCorrect ? 'Correct:' : 'Incorrect:';
  }

  if (dom.feedbackCorrectAnswer) {
    dom.feedbackCorrectAnswer.textContent = `Correct Answer: ${currentQuestion.options[correctIndex]}`;
  }

  if (dom.feedbackExplanation) {
    dom.feedbackExplanation.textContent = currentQuestion.explanation;
  }

  if (dom.nextBtn) {
    dom.nextBtn.disabled = false;
  }

  if (dom.quizHelperText) {
    const isLast = quizState.currentQuestionIndex === quizState.questions.length - 1;
    dom.quizHelperText.textContent = isLast
      ? 'Final question answered. Click "View Final Results" to see your summary.'
      : 'Answer locked. Click "Next Question" to continue.';
  }
}

/**
 * Advances to the next question or transitions to the final results screen.
 */
function handleNextQuestion() {
  if (quizState.status !== 'active' || !quizState.hasAnsweredCurrent) {
    return;
  }

  if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
    quizState.currentQuestionIndex += 1;
    renderCurrentQuestion();
  } else {
    renderResultsScreen();
  }
}

/**
 * Returns an honest, specific performance summary based on accuracy percentage.
 * @param {number} percentage
 * @param {number} correctCount
 * @param {number} total
 * @returns {string}
 */
function getPerformanceMessage(percentage, correctCount, total) {
  if (percentage === 100) {
    return `You answered all ${total} questions accurately across HTML5, CSS3, JavaScript ES6+, DOM manipulation, and web accessibility.`;
  }
  if (percentage >= 80) {
    return `You answered ${correctCount} of ${total} questions accurately. Review any missed questions in the log below to check the specific details.`;
  }
  if (percentage >= 60) {
    return `You answered ${correctCount} of ${total} questions accurately. Use the subject breakdown and answer log below to identify topics for further review.`;
  }
  return `You answered ${correctCount} of ${total} questions accurately. Read the technical explanations in the log below and restart the quiz when you are ready to try again.`;
}

/**
 * Builds the structured JSON object for exporting quiz results.
 * @returns {Object}
 */
function buildExportPayload() {
  const total = quizState.questions.length;
  const correctCount = quizState.score;
  const incorrectCount = total - correctCount;
  const accuracyPercentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const domainMap = new Map();
  quizState.questions.forEach((q) => {
    if (!domainMap.has(q.category)) {
      domainMap.set(q.category, { category: q.category, correct: 0, total: 0 });
    }
    domainMap.get(q.category).total += 1;
  });

  quizState.userSelections.forEach((entry) => {
    if (entry.isCorrect && domainMap.has(entry.category)) {
      domainMap.get(entry.category).correct += 1;
    }
  });

  const subjectBreakdown = Array.from(domainMap.values()).map((item) => ({
    category: item.category,
    correct: item.correct,
    total: item.total,
    accuracyPercentage: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0,
  }));

  return {
    application: 'FrontendMastery',
    completedAt: quizState.completedAt || new Date().toISOString(),
    totalQuestions: total,
    score: correctCount,
    correctCount,
    incorrectCount,
    accuracyPercentage,
    elapsedSeconds: quizState.elapsedSeconds,
    elapsedFormatted: formatElapsedTime(quizState.elapsedSeconds),
    subjectBreakdown,
    responses: quizState.userSelections.map((entry, idx) => ({
      questionNumber: idx + 1,
      questionId: entry.questionId,
      category: entry.category,
      difficulty: entry.difficulty,
      question: entry.question,
      selectedOption: entry.selectedText,
      correctOption: entry.correctText,
      isCorrect: entry.isCorrect,
      explanation: entry.explanation,
    })),
  };
}

/**
 * Triggers a client-side file download of the quiz results as a formatted JSON file.
 */
function downloadResultsAsJson() {
  if (quizState.userSelections.length === 0) return;

  const payload = buildExportPayload();
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);

  const dateStamp = payload.completedAt.slice(0, 10);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `frontendmastery-results-${dateStamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 250);
}

/**
 * Stops the timer and renders the final results screen, domain breakdown, and question review.
 */
function renderResultsScreen() {
  stopTimer();
  quizState.status = 'completed';
  quizState.completedAt = new Date().toISOString();

  const total = quizState.questions.length;
  const correctCount = quizState.score;
  const incorrectCount = total - correctCount;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  if (dom.resultsDomainMeta) {
    dom.resultsDomainMeta.textContent = `${total} Questions Answered`;
  }
  if (dom.finalScore) {
    dom.finalScore.textContent = `${correctCount} / ${total}`;
  }
  if (dom.finalPercentage) {
    dom.finalPercentage.textContent = `${percentage}%`;
  }
  if (dom.finalTime) {
    dom.finalTime.textContent = formatElapsedTime(quizState.elapsedSeconds);
  }
  if (dom.finalCorrect) {
    dom.finalCorrect.textContent = String(correctCount);
  }
  if (dom.finalIncorrect) {
    dom.finalIncorrect.textContent = String(incorrectCount);
  }
  if (dom.performanceMessage) {
    dom.performanceMessage.textContent = getPerformanceMessage(percentage, correctCount, total);
  }

  // Render per-subject score breakdown
  if (dom.categoryBreakdown) {
    dom.categoryBreakdown.innerHTML = '';
    const payload = buildExportPayload();
    const domainFragment = document.createDocumentFragment();

    payload.subjectBreakdown.forEach((stats) => {
      const box = document.createElement('div');
      box.className = 'category-stat-item';

      const nameEl = document.createElement('span');
      nameEl.className = 'category-stat-name';
      nameEl.textContent = stats.category;

      const scoreEl = document.createElement('span');
      scoreEl.className = 'category-stat-score tabular-nums';
      scoreEl.textContent = `${stats.correct} / ${stats.total} (${stats.accuracyPercentage}%)`;

      box.appendChild(nameEl);
      box.appendChild(scoreEl);
      domainFragment.appendChild(box);
    });

    dom.categoryBreakdown.appendChild(domainFragment);
  }

  // Render question-by-question answer review
  if (dom.reviewList) {
    dom.reviewList.innerHTML = '';
    const reviewFragment = document.createDocumentFragment();

    quizState.userSelections.forEach((item, idx) => {
      const reviewItem = document.createElement('div');
      reviewItem.className = 'review-item';

      const metaRow = document.createElement('div');
      metaRow.className = 'review-item-meta';

      const qNum = document.createElement('span');
      qNum.className = 'tabular-nums';
      qNum.textContent = `Question ${idx + 1}`;

      const sep1 = document.createElement('span');
      sep1.setAttribute('aria-hidden', 'true');
      sep1.textContent = '/';

      const catSpan = document.createElement('span');
      catSpan.textContent = item.category;

      const sep2 = document.createElement('span');
      sep2.setAttribute('aria-hidden', 'true');
      sep2.textContent = '/';

      const statusSpan = document.createElement('span');
      statusSpan.className = item.isCorrect ? 'review-status-correct' : 'review-status-incorrect';
      statusSpan.textContent = item.isCorrect ? 'Correct' : 'Incorrect';

      metaRow.append(qNum, sep1, catSpan, sep2, statusSpan);

      const qTitle = document.createElement('h4');
      qTitle.className = 'review-question-title';
      qTitle.textContent = item.question;

      const answersRow = document.createElement('div');
      answersRow.className = 'review-answers-row';

      const userAns = document.createElement('p');
      userAns.className = 'review-user-answer';
      userAns.textContent = `Selected answer: ${item.selectedText}`;
      answersRow.appendChild(userAns);

      if (!item.isCorrect) {
        const correctAns = document.createElement('p');
        correctAns.className = 'review-correct-answer';
        correctAns.textContent = `Correct answer: ${item.correctText}`;
        answersRow.appendChild(correctAns);
      }

      const explanationP = document.createElement('p');
      explanationP.className = 'review-explanation-text';
      explanationP.textContent = item.explanation;

      reviewItem.append(metaRow, qTitle, answersRow, explanationP);
      reviewFragment.appendChild(reviewItem);
    });

    dom.reviewList.appendChild(reviewFragment);
  }

  showScreen('results');
  if (dom.resultsHeading) {
    dom.resultsHeading.focus();
  }
}

/**
 * Stops the timer and returns to the Start / Overview screen without reloading the page.
 */
function returnToOverview() {
  stopTimer();
  quizState.status = 'ready';
  quizState.currentQuestionIndex = 0;
  quizState.score = 0;
  quizState.hasAnsweredCurrent = false;
  quizState.userSelections = [];
  quizState.elapsedSeconds = 0;
  quizState.completedAt = null;
  updateTimerUI();
  showScreen('start');
}

/**
 * Binds event listeners for buttons, option delegation, and page cleanup.
 */
function bindEventListeners() {
  if (dom.startBtn) {
    dom.startBtn.addEventListener('click', () => {
      startOrRestartQuiz();
    });
  }

  if (dom.headerStartBtn) {
    dom.headerStartBtn.addEventListener('click', () => {
      startOrRestartQuiz();
    });
  }

  if (dom.restartBtn) {
    dom.restartBtn.addEventListener('click', () => {
      startOrRestartQuiz();
    });
  }

  if (dom.downloadJsonBtn) {
    dom.downloadJsonBtn.addEventListener('click', () => {
      downloadResultsAsJson();
    });
  }

  if (dom.overviewBtn) {
    dom.overviewBtn.addEventListener('click', () => {
      returnToOverview();
    });
  }

  if (dom.brandLink) {
    dom.brandLink.addEventListener('click', (event) => {
      if (quizState.status === 'active' || quizState.status === 'completed') {
        event.preventDefault();
        returnToOverview();
      }
    });
  }

  dom.navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      dom.navLinks.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      if (quizState.status === 'active' || quizState.status === 'completed') {
        returnToOverview();
      }
    });
  });

  if (dom.retryBtn) {
    dom.retryBtn.addEventListener('click', () => {
      loadQuestions();
    });
  }

  if (dom.optionsContainer) {
    dom.optionsContainer.addEventListener('click', (event) => {
      const targetButton = event.target.closest('.option-btn');
      if (!targetButton || targetButton.disabled) return;

      const selectedIndex = Number(targetButton.dataset.index);
      if (!Number.isNaN(selectedIndex)) {
        handleSelectOption(selectedIndex);
      }
    });
  }

  if (dom.nextBtn) {
    dom.nextBtn.addEventListener('click', () => {
      handleNextQuestion();
    });
  }

  window.addEventListener('pagehide', () => {
    stopTimer();
  });
}

/**
 * Initialize application when DOM is ready.
 */
function initQuizApp() {
  bindEventListeners();
  loadQuestions();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuizApp);
} else {
  initQuizApp();
}

// Expose state and helpers for programmatic testing
window.quizApp = {
  getState: () => ({ ...quizState }),
  loadQuestions,
  startOrRestartQuiz,
  handleSelectOption,
  handleNextQuestion,
  returnToOverview,
  buildExportPayload,
  downloadResultsAsJson,
  stopTimer,
};
