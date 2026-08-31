/* Injects the derived bundle into the prototype template.
   console.tpl.html is the source of truth; console.html is generated.
   Run after any merge step:  node build_console.js */
const fs=require('fs');
const TPL='../../prototype/console.tpl.html', OUT='../../prototype/console.html';
const BUNDLE='../../data/derived/es-fiscal-bundle.json';
const tpl=fs.readFileSync(TPL,'utf8');
const bundle=fs.readFileSync(BUNDLE,'utf8');
if(!tpl.includes('__BUNDLE__')) throw new Error('template has no __BUNDLE__ placeholder');
JSON.parse(bundle);                                  // fail before writing a broken page
fs.writeFileSync(OUT, tpl.replace('__BUNDLE__', bundle));
console.log(`console.html ${(fs.statSync(OUT).size/1024).toFixed(0)}KB `
  +`(template ${(tpl.length/1024).toFixed(0)}KB + bundle ${(bundle.length/1024).toFixed(0)}KB)`);
