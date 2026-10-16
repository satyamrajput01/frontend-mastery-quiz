# FrontendMastery | Interactive Quiz Website

A responsive, accessible frontend development quiz built with HTML5, CSS3, and Vanilla JavaScript.

🚀 Live Demo

Try FrontendMastery Quiz here: https://satyamrajput01.github.io/Frontend-mastery-quiz/


## Features

- 15 questions covering HTML5, CSS3, JavaScript, DOM manipulation, and web accessibility.
- Instant answer feedback with explanations.
- Live score tracking and quiz progress.
- Elapsed-time tracking.
- Downloadable quiz results in JSON format.
- Restart functionality without reloading the page.
- Responsive layout for mobile, tablet, and desktop.
- Dedicated Privacy Policy and Terms and Conditions pages.

## Tech Stack

- HTML5
- CSS3 (Grid and Flexbox)
- Vanilla JavaScript (ES6+)
- JSON
- Vite

## Project Structure

```text
frontendmastery-quiz/
├── index.html
├── privacy.html
├── terms.html
├── favicon.svg
├── css/
│   └── style.css
├── js/
│   └── script.js
├── data/
│   └── questions.json
├── screenshots/
└── README.md
```

## Run Locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Open the local URL displayed in your terminal.

## How It Works

Questions are loaded asynchronously from a JSON file. JavaScript manages answer selection, scoring, progress, and timing. At completion, users can review their performance and export their results as a JSON file.


## Deployment

Hosted using GitHub Pages.
