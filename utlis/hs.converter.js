let HSConverter = (function () {
  function CodeFormatter(readable, tabSpaces){
    this.readable = readable || false;
    this.tabSpaces = tabSpaces || 2;
    this.tabLevel = 0;
    this.text = '';

    this.tab = function (){
      this.tabLevel++;
      return this;
    }

    this.untab = function (){
      this.tabLevel--;
      return this;
    }
    function unformatted(lineText){
      this.text += lineText? lineText : '';
    }
    this.line = function ( lineText ){
      if(!lineText) return this;
      if(this.readable){
        var spaces = ' '.repeat(this.tabSpaces).repeat(this.tabLevel)
        this.text += spaces + (lineText? lineText : '') + '\n';
        return this;
      }
      unformatted(lineText)
      return this;
    }
  }

  let minify = true;
  let refernces = {
    attributeMethodName: { dev: 't.attr', min: 'a' },
    textMethodName: { dev: 't.text', min: 'T' },
    commentMethodName: { dev: 't.comment', min: 'c' },
    eventListenerMethodName: { dev: 't.on', min: 'o' },
  }
  function getVNode(node) {
    let
      tag = node.tagName,
      [namespace, attributes] = getVNodeAttributes(node);
    return {
      type: node.nodeType,
      tag: tag ? tag.toLowerCase() : null,
      namespace: namespace,
      attributes: attributes,
      children: getVNodeChildren(node),
      content: tag ? null : node.textContent
    }
  }

  function getVNodeChildren(node) {
    let
      children = [],
      cL;
    if (node.childNodes && (cL = node.childNodes.length)) {
      for (let cI = 0; cI < cL; cI++) {
        children.push(getVNode(node.childNodes[cI]));
      }
    }
    return children;
  }

  function getVNodeAttributes(node) {
    let namespace,
      attributes = [];
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.hasAttributes()) {
        for (const attribute of node.attributes) {
          if (attribute.name === 'xmlns') {
            namespace = attribute.value;
          } else {
            attributes.push({ name: attribute.name, value: attribute.value });
          }
        }
      }
    }
    return [namespace, attributes];
  }

  function renderHyperScriptNode(vnode, formatter) {
    if (vnode.tag){
      if(vnode.children.length === 0)
        return formatter.line(`t('${vnode.tag}'${vnode.namespace ? `,'${vnode.namespace}'` : ''}),${renderHyperScriptNodeAttributes(vnode.attributes)}t(),`)
      return formatter.line(`t('${vnode.tag}'${vnode.namespace ? `,'${vnode.namespace}'` : ''}),${renderHyperScriptNodeAttributes(vnode.attributes)}`)
      .tab()
        .line(renderHyperScriptNodeChildren(vnode.children, formatter))
        .untab()
      .line('t(),');
    }
    if (vnode.type === 3)
      return formatter.line(`${minify ? refernces.textMethodName.min : refernces.textMethodName.dev}\`${vnode.content}\``);
    if (vnode.type === 8)
      return formatter.line(`${minify ? refernces.commentMethodName.min : refernces.commentMethodName.dev}\`${vnode.content}\``);
  }

  function renderHyperScriptNodeChildren(children, formatter) {
    for (let cI = 0, cL = children.length; cI < cL; cI++) {
      const vnode = children[cI];
      renderHyperScriptNode(vnode, formatter);
    }
  }

  function renderHyperScriptNodeAttributes(attributes) {
    let text = '';
    for (let aI = 0, aL = attributes.length; aI < aL; aI++) {
      const attribute = attributes[aI];
      text += `${minify ? refernces.attributeMethodName.min : refernces.attributeMethodName.dev}('${attribute.name}','${attribute.value}'),`
    }
    return text;
  }

  function cleanHtml(innerHTML) {
    return innerHTML.replaceAll(/[\r\n\t]/gi, '').replaceAll(/\s\s+/gi, ' ').replaceAll(/>\s</gi, '><');
  }

  function convertToVNode(data) {
    let element;
    if (typeof data === 'string') {
      element = document.createElement('div');
      element.innerHTML = cleanHtml(data);
      return getVNode(element.firstElementChild);
    }
    element = data.cloneNode(true);
    element.innerHTML = cleanHtml(element.innerHTML);
    return getVNode(element);
  }

  function convertToHS(data, formatter) {
    renderHyperScriptNode(convertToVNode(data), formatter);
  }

  function minifyReferences() {
    let methods = [];
    for (const method in refernces) {
      methods.push(`${refernces[method].min}=${refernces[method].dev}`);
    }
    return 'let ' + methods.join(',') + ';'
  }

  function makeBundle(data) {
    let bundle = new CodeFormatter(true)
    .line('(function(){')
    .tab()
      .line(minifyReferences())
      .line('let ' + Object.keys(data).join() + ';');
    for (let element in data) {
      bundle
      .line(`${element}=function(){`)
      .tab()
        .line(convertToHS(data[element], bundle))
        .untab()
      .line('}')
    }
    bundle
    .untab()
    .line('})();')
    return bundle.text;
  }

  return {
    convert: convertToHS,
    bundle: makeBundle
  };
})();