let html;
(function () {
  if (!window.t)
    throw "Cannot initialize module.";
    
  function getAttributeSlots(node, slots) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.hasAttributes()) {
        for (const attribute of node.attributes) {
          if (attribute.nodeValue === SLOT_TAG)
            slots.push([node, attribute.name]);
        }
      }
    }
  }
  function getSlots(instance) {
    let slots = [];
    function scan(node) {
      getAttributeSlots(node, slots);
      if (node.nodeType === Node.COMMENT_NODE && node.textContent === SLOT_NAME) {
        slots.push(node);
      }
      let cL;
      if (node.childNodes && (cL = node.childNodes.length)) {
        for (let cI = 0; cI < cL; cI++) {
          scan(node.childNodes[cI]);
        }
      }
    }
    scan(instance);
    return slots;
  }
  function interpolateExpressions(slots, expressions) {
    const pCurrentNode = t.node();
    for (let sI = 0, sL = slots.length; sI < sL; sI++) {
      const slot = slots[sI];
      const expression = expressions[sI];
      if (slot.nodeType) {
        if (typeof expression !== 'function') {
          let newTextNode = document.createTextNode(expression.value);
          slot.replaceWith(newTextNode)
          t.node(newTextNode);
          t.bind(function(){
            newTextNode.textContent = expression.$;
          });
        } else {
          t.node(slot);
          t.bind(expression);
        }
      } else {
        t.node(slot[0]);
        t.attr(slot[1], expression);
      }
    }
    t.node(pCurrentNode);
  }
  const
    SLOT_NAME = '__t:slot__',
    SLOT_TAG = '<!--' + SLOT_NAME + '-->';
  html = function(templateElements, ...templateExpressions) {
    let
      templateHTMLText = templateElements.join(SLOT_TAG),
      templateElement = document.createElement('template');
    templateElement.innerHTML = templateHTMLText;
    return {
      clone() {
        let
          instance = templateElement.content.firstChild.cloneNode(true),
          slots = getSlots(instance);
        interpolateExpressions(slots, templateExpressions)
        t.node().appendChild(instance);
        return instance;
      }
    }
  }
})();