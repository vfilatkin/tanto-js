import t from '../../tanto.js';

let style, keyframes;

const 
  KEY = Symbol('component.scope.key'),
  PREFIX = 't-',
  ID = {},
  SCOPES = {};

const STYLE_SHEET = new CSSStyleSheet();

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
function generateUID(length) {
  let uid = generateRandomId(length);
  while (ID[uid])
    uid = generateRandomId(length);
  return uid;
}

/* Create style for component. */
style = function (component, ...componentRules) {
  let uid = generateUID(4);
  /* Add UID to component function object. */
  component[KEY] = uid;
  /* Store UID in scopes map. */
  SCOPES[uid] = {};
  /* Process component rules. */
  componentRules.forEach(componentRule => {
    let 
      ruleIndex = STYLE_SHEET.insertRule(componentRule, STYLE_SHEET.cssRules.length),
      rule = STYLE_SHEET.cssRules[ruleIndex],
      selector = rule.selectorText;
    /* Apply changes only to STYLE_RULEs. */
    if(rule.type === 1){
      if(selector[0] === '.'){
        SCOPES[uid][rule.selectorText.substr(1, selector.length - 1)] = true;
      } else {
        SCOPES[uid][selector] = true;
      }
      /* Modify rule selector. */
      rule.selectorText = `${selector}.${PREFIX + uid}`;
    }
  });
  
  return uid;
}

/* Create keyframes. */
keyframes = function(rule) {
  let uid = generateUID(4);
  STYLE_SHEET.insertRule(`@keyframes ${PREFIX}${uid}{${rule}}`, STYLE_SHEET.cssRules.length);
  return PREFIX + uid;
}

let 
  currentScope = null,
  previousScope = null;
/* Connect to tanto.js render hooks */
t.module({
  openRoot: function(){
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, STYLE_SHEET];
  },
  openComponent: function(component){
    previousScope = currentScope;
    currentScope = component[KEY];
  },
  openNode: function (tagName, nodeType){
    let scope = SCOPES[currentScope];
    if(nodeType === Node.ELEMENT_NODE){
      if(scope && scope[tagName]){
        t.node().classList.add(PREFIX + currentScope);
      }
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