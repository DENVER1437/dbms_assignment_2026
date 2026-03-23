const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Extract CSS
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>') + 8;
let cssContent = html.substring(styleStart + 7, styleEnd - 8).trim();

const cssHeader = '/* ═══════════════════════════════════════════════════\n   NormalizerPro — Main Stylesheet\n   DBMS Normalization Tool | 24BCE380 & 24BCE374\n   Sections: Variables → Layout → Components → \n             Light Mode → Animations → Print\n═══════════════════════════════════════════════════ */\n\n';
fs.writeFileSync('css/style.css', cssHeader + cssContent);

// 1b. Replace <style> with <link>
html = html.substring(0, styleStart) + '<link rel="stylesheet" href="css/style.css"/>' + html.substring(styleEnd);

// 2. Extract JS
const scriptStart = html.lastIndexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
let jsContent = html.substring(scriptStart + 8, scriptEnd).trim();

// find split points
const algoStart = jsContent.indexOf('let _globalAttrs');
const uiStart = jsContent.indexOf('function buildDepGraph');
const appStart = jsContent.indexOf('function generateSQL');

let showPageLogic = jsContent.substring(0, algoStart).trim();
let algoLogic = jsContent.substring(algoStart, uiStart).trim();
let uiLogic = jsContent.substring(uiStart, appStart).trim();
let appLogic = jsContent.substring(appStart).trim();

// algorithms.js
const algoHeader = '/**\n * algorithms.js — NormalizerPro\n * Pure DBMS logic: parsing, closure, candidate keys,\n * partial/transitive dependencies, decomposition to 2NF/3NF/BCNF\n * No DOM access. No HTML. Pure functions only.\n */\n\n';
fs.writeFileSync('js/algorithms.js', algoHeader + algoLogic);

// ui.js
const uiHeader = '/**\n * ui.js — NormalizerPro\n * UI rendering: card builders, dependency graph,\n * output cards for each normal form, runNormalization(),\n * print report generator, stats bar.\n * Depends on: algorithms.js (must load first)\n */\n\n';
fs.writeFileSync('js/ui.js', uiHeader + uiLogic);

// app.js
const appHeader = '/**\n * app.js — NormalizerPro\n * Interactive features: SQL generator, replay mode,\n * FD live indicators, file upload parser, attribute\n * highlight, history (localStorage), theme toggle.\n * Depends on: algorithms.js + ui.js (must load first)\n */\n\n';
fs.writeFileSync('js/app.js', appHeader + showPageLogic + '\n\n' + appLogic);

// 2b. Replace <script> with src links
const scripts = '<script src="js/algorithms.js"></script>\n<script src="js/ui.js"></script>\n<script src="js/app.js"></script>';
html = html.substring(0, scriptStart) + scripts + html.substring(scriptEnd + 9);

fs.writeFileSync('index.html', html.trim());
console.log('Split successful');
