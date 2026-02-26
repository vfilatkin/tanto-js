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

/* Concat template string and run expressions. */
function normalizeTemplateString(strings, expressions){
  let res = '', l = strings.length;
  for(let i = 0; i < l; i++){
    const ex = expressions[i];
    res += strings[i] + (ex? (typeof ex === 'function'? ex() : ex): '');
  }
  return res;
}

/* Returns true if CSSStyleRule. */
function isStyleRule(rule){
  return rule.selectorText;
}

function modifySelectorText(selectorText, uid){

  let selectorClasses = [];
  let selectorExpressions = selectorText
  .split(',')
  .map(selector => selector.split(/(\b\s\b|\>|\~|\+)/));
  
  selectorText = selectorExpressions.map(expression => {
    return expression.map(selectorToken =>{
      if(selectorToken.match(/\>|\~|\+/) || selectorToken === ' ') return selectorToken;
      return selectorToken
      .trim()
      .split(/(\.)/)
      .map(selector => {
        if(selector === '' || selector === '.') return selector;
        selector = selector.split(/(\:|\[)/);
        selectorClasses.push(selector[0])
        selector[0] = `${[selector[0]]}.${PREFIX}${uid}`;
        return selector.join('');
      }).join('');
    }).join('');
  }).join();

  return [selectorText, selectorClasses]
}

/* Modify current rule. */
function modifyRule(rule, uid){
  let [selectorText, selectorClasses] = modifySelectorText(rule.selectorText, uid);
  
  selectorClasses.forEach(selectorClass => {SCOPES[uid][selectorClass] = true})

  /* Modify rule selector. */
  rule.selectorText = selectorText;
  
  modifyRules(rule.cssRules, uid);
}

/* Modify cssRules of current rule. */
function modifyRules(rules, uid){
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    modifyRule(rule, uid);
  }
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
      rule = STYLE_SHEET.cssRules[ruleIndex];
    /* Apply scope. */
    if(isStyleRule(rule)){
      modifyRule(rule, uid);
    } else {
      modifyRules(rule.cssRules, uid);
    }
  });
  return uid;
}

/* Create keyframes. */
keyframes = function(strings, ...expressions) {
  let uid = generateUID(4);
  STYLE_SHEET.insertRule(`@keyframes ${PREFIX}${uid}{${normalizeTemplateString(strings, expressions)}}`, STYLE_SHEET.cssRules.length);
  return PREFIX + uid;
}

/* Gets a current component scope prefix. */
function getScope(){
  return t.component()[KEY];
}

/* Connect to tanto.js render hooks */
t.module({
  openRoot: function () {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, STYLE_SHEET];
  },
  openNode: function (tagName, nodeType) {
    let currentScope = getScope();
    let scope = SCOPES[currentScope];
    if(nodeType === Node.ELEMENT_NODE){
      if(scope && scope[tagName]){
        t.node().classList.add(PREFIX + currentScope);
      }
    }
  },
  setAttribute: function (name) {
    let currentScope = getScope();
    let scope = SCOPES[currentScope];
    if(name === 'class' && scope)
      t.node().classList.add(PREFIX + currentScope);
  },
});

export {style, keyframes}