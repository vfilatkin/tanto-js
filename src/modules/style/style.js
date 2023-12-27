import t from '../../tanto.js';

let style, keyframes;
const COMPONENT__SCOPE__KEY = Symbol('component.scope.key');
const COMPONENT__SCOPE__CLASS__PREFIX = 't-';
let COMPONENTS__UID__MAP = {};
let STYLE = [];

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
  let uid = generateUID(COMPONENTS__UID__MAP, 4);
  component[COMPONENT__SCOPE__KEY] = uid;
  let styleSheet = new CSSStyleSheet();
  rules.forEach(rule => {
    styleSheet.insertRule(rule);
  });
  Object.values(styleSheet.cssRules).forEach((rule) => {
    STYLE.push(`${rule.selectorText}.${COMPONENT__SCOPE__CLASS__PREFIX + uid}{${rule.style.cssText}}`);
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
    styleSheet.type="text/css";
    styleSheet.textContent = STYLE.join('');
    document.head.appendChild(styleSheet);
    STYLE = null;
    COMPONENTS__UID__MAP = null;
  },
  openComponent: function(component){
    previousScope = currentScope;
    currentScope = component[COMPONENT__SCOPE__KEY];
    console.log(currentScope);
  },
  openNode: function (tagName, nodeType){
    // if(nodeType === Node.ELEMENT_NODE){
    //   if(styleData && styleData.tags.indexOf(tagName) > -1)
    //     t.node().classList.add(SCOPE_PREFIX + currentScope);
    // }
  },
  setAttribute: function(name){
    // if(name === 'class')
    //   t.node().classList.add(SCOPE_PREFIX + currentScope);
  },
  closeComponent: function(){
    currentScope = previousScope;
    previousScope = currentScope;
  }
});

export {style, keyframes}