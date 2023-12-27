import t from '../../tanto.js';

let style, keyframes;
const KEY = Symbol('component.scope.key');
const PREFIX = 't-';
const SCOPES = {};
let STYLE_CONTENT = [];

/* Generate random id. */
function generateRandomId(length) {
  let id = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUWXYZabcdefghijklmnopqrstuwxyz0123456789';
  for (let index = 0; index < length; index++) {
    id += characters.charAt(Math.floor(Math.random() * 60));
  }
  return id;
}

/* Generate unique id within provided map. */
function generateUID(map, length) {
  let uid = generateRandomId(length);
  while (map[uid])
    uid = generateRandomId(length);
  return uid;
}

/* Create style for component. */
style = function (component, ...rules) {
  let uid = generateUID(SCOPES, 4);
  component[KEY] = uid;
  let styleSheet = new CSSStyleSheet();
  rules.forEach(rule => {
    styleSheet.insertRule(rule);
  });
  SCOPES[uid] = {};
  Object.values(styleSheet.cssRules).forEach((rule) => {
    let selector = rule.selectorText;
    if(rule.type === 1){
      if(selector[0] === '.'){
        SCOPES[uid][rule.selectorText.substr(1, selector.length - 1)] = true;
      } else {
        SCOPES[uid][selector] = true;
      }
      STYLE_CONTENT.push(`${selector}.${PREFIX + uid}{${rule.style.cssText}}`);
    }
  });
  return uid;
}

let 
  currentScope = null,
  previousScope = null;
/* Connect to tanto.js render hooks */
t.module({
  openRoot: function(){
    let styleSheet = document.createElement('style');
    styleSheet.id = 't-style-section'
    styleSheet.type='text/css';
    styleSheet.textContent = STYLE_CONTENT.join('');
    document.head.appendChild(styleSheet);
    STYLE_CONTENT = null;
  },
  openComponent: function(component){
    previousScope = currentScope;
    currentScope = component[KEY];
  },
  openNode: function (tagName, nodeType){
    let scope = SCOPES[currentScope];
    if(nodeType === Node.ELEMENT_NODE){
      if(scope && scope[tagName])
        t.node().classList.add(PREFIX + currentScope);
    }
  },
  setAttribute: function(name){
    let scope = SCOPES[currentScope];
    if(name === 'class' && scope)
      t.node().classList.add(PREFIX + currentScope);
  },
  closeComponent: function(){
    currentScope = previousScope;
    previousScope = currentScope;
  }
});

export {style, keyframes}