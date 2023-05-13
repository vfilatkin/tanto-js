let style, rule;
(function () {
  if(!window.t)
    throw "Cannot initialize plugin.";
  
  const SCOPE_PREFIX = 't-';

  function toMap(array){
    var m = {};
    for (var i = 0; i < array.length; i++) {
        m[array[i]] = true;
    }
    return function (v) { return m[v]; };
  }

  function byLength(arr) {
    let res = {};
    for(let i = 0, aL = arr.length; i < aL; i++){
      const
        tg = arr[i],
        tL = tg.length,
        g = res[tL];
      if(!g){
        res[tL] = [tg]
      } else {
        g.push(tg);
      }
    }
    return res;
  }

  const tags = byLength((
    'a,abbr,address,area,article,aside,audio,'+
    'b,base,bdi,bdo,blockquote,body,br,button,'+
    'canvas,caption,cite,code,col,colgroup,data,'+
    'datalist,dd,del,details,dfn,dialog,div,dl,dt,'+
    'em,embed,fieldset,figcaption,figure,footer,'+
    'form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,'+
    'html,i,iframe,img,input,ins,kbd,label,legend,'+
    'li,link,main,map,mark,menu,meta,meter,nav,'+
    'noscript,object,ol,optgroup,option,output,p,'+
    'picture,pre,progress,q,rp,rt,ruby,s,samp,'+
    'script,section,select,slot,small,source,span,'+
    'strong,style,sub,summary,sup,table,tbody,td,'+
    'template,textarea,tfoot,th,thead,time,title,'+
    'tr,track,u,ul,var,video,wbr,a,animate,'+
    'animateMotion,animateTransform,audio,canvas,'+
    'circle,clipPath,defs,desc,discard,ellipse,'+
    'feBlend,feColorMatrix,feComponentTransfer,'+
    'feComposite,feConvolveMatrix,feDiffuseLighting,'+
    'feDisplacementMap,feDistantLight,feDropShadow,'+
    'feFlood,feFuncA,feFuncB,feFuncG,feFuncR,'+
    'feGaussianBlur,feImage,feMerge,feMergeNode,'+
    'feMorphology,feOffset,fePointLight,'+
    'feSpecularLighting,feSpotLight,feTile,'+
    'feTurbulence,filter,foreignObject,g,iframe,'+
    'image,line,linearGradient,marker,mask,metadata,'+
    'mpath,path,pattern,polygon,polyline,'+
    'radialGradient,rect,script,set,stop,style,svg,'+
    'switch,symbol,text,textPath,title,tspan,'+
    'unknown,use,video,view'
  ).split(','));
  
  Object.keys(tags).forEach(function(key) { return tags[key] = toMap(tags[key]) });

  function isTag(s){
    let g = tags[s.length];
    return g && g(s);
  }

  /* Generate random id */
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

  /* Add map entry. */
  function writeToMap(map, key, id) {
    map[map[id] = key] = id;
  }

  /* Component scope map. */
  const scopes = {};

  /* Add new component scope. */
  function setScope(component) {
    let uid = scopes[component];
    if (uid) return uid;
    uid = generateUID(scopes, 4);
    writeToMap(scopes, component, uid);
    return uid;
  }

  /* Retrieve component scope by constructor. */
  function getScope(component) {
    return scopes[component];
  }

  /* Components styles data */
  const styles = {};

  /* Get tag selectors from rule */
  function getScopeTags(rules){
    let ruleTags = [];
    rules.forEach(function(rData){
      const sel = rData.selector;
      if(isTag(sel)){
        ruleTags.push(sel)
      }
    })
    return ruleTags;
  }

  /* Add new style. */
  function addStyle(uid, rules){
    styles[uid] = {
      tags: getScopeTags(rules),
      rules: rules
    }
  }

  function normalizeRuleString(elements, ...expressions){
    let res = '', l = elements.length;
    for(let i = 0; i < l - 1; i++){
      const ex = expressions[i]
      res += elements[i] + (typeof ex === 'function'? ex() : ex);
    }
    return res += elements[l - 1];
  }

  function renderStyleRules(uid, rules) {
    let styleRulesText = '';
    rules.forEach(function(r){
      styleRulesText += `${r.selector}.${SCOPE_PREFIX + uid}{${r.declarations}}`;
    })
    return styleRulesText;
  }

  function renderStyles(){
    let stylesText = '';
    Object.keys(styles).forEach(function(key) {
      stylesText += renderStyleRules(key, styles[key].rules);
    });
    return stylesText;
  }

  /* Create style for component. */
  style = function (component) {
    let uid = setScope(component);
    return function (...rules) {
      addStyle(uid, rules);
    }
  }

  /* Create CSS rule. */
  rule = function (selector) {
    return function (elements, ...expressions) {
      return { selector: selector, declarations: normalizeRuleString(elements, expressions) }
    }
  }

  let 
    currentScope = null,
    previousScope = null;
  /* Connect to tanto.js render hooks */
  t.plugin({
    openRoot: function(){
      let styleSheet = document.createElement('style');
      styleSheet.type="text/css";
      styleSheet.textContent = renderStyles();
      document.head.appendChild(styleSheet);
    },
    openComponent: function(component){
      previousScope = currentScope;
      currentScope = getScope(component);
    },
    openNode: function (tagName, nodeType){
      if(nodeType === Node.ELEMENT_NODE){
        const styleData = styles[currentScope];
        if(styleData.tags.indexOf(tagName) > -1)
          t.node().classList.add(SCOPE_PREFIX + currentScope);
      }
    },
    setAttribute: function(name){
      if(name === 'class')
        t.node().classList.add(SCOPE_PREFIX + currentScope);
    },
    closeComponent: function(){
      currentScope = previousScope;
      previousScope = currentScope;
    }
  })
})();