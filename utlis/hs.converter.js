let HSConverter = (function(){
  let minify = true;
  let refernces = {
    attributeMethodName: { dev: 't.attr', min: 'a'},
    textMethodName: { dev: 't.text', min: 'T'}
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
      content: tag? null : node.textContent
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
            namespace = attribute.value
          } else {
            attributes.push({ name: attribute.name, value: attribute.value });
          }
        }
      }
    }
    return [namespace, attributes];
  }
  
  function renderHyperScriptNode(vnode) {
    if (vnode.tag)
      return `t('${vnode.tag}'${vnode.namespace ? `,'${vnode.namespace}'`: ''}),${renderHyperScriptNodeAttributes(vnode.attributes)}${renderHyperScriptNodeChildren(vnode.children)}t(),`;
    return `${minify? refernces.textMethodName.min : refernces.textMethodName.dev}\`${vnode.content}\`,`;
  }
  
  function renderHyperScriptNodeChildren(children) {
    let text = '';
    for (let cI = 0, cL = children.length; cI < cL; cI++) {
      const vnode = children[cI];
      text += renderHyperScriptNode(vnode);
    }
    return text;
  }
  
  function renderHyperScriptNodeAttributes(attributes) {
    let text = '';
    for (let aI = 0, aL = attributes.length; aI < aL; aI++) {
      const attribute = attributes[aI];
      text += `${minify? refernces.attributeMethodName.min : refernces.attributeMethodName.dev}('${attribute.name}','${attribute.value}'),`
    }
    return text;
  }
  
  function cleanHtml(innerHTML) {
    return innerHTML.replaceAll(/[\r\n\t]/gi, '').replaceAll(/\s\s+/gi, ' ').replaceAll(/>\s</gi, '><');
  }
  
  function convertToVNode(data){
    let element;
    if(typeof data === 'string'){
      element = document.createElement('div');
      element.innerHTML = cleanHtml(data);
      return getVNode(element.firstElementChild);
    }
    element = data.cloneNode();
    element.innerHTML = cleanHtml(element.innerHTML);
    return getVNode(element);
  }

  function convertToHS(data){
    return renderHyperScriptNode(convertToVNode(data));
  }

  function minifyReferences(){
    let methods =  [];
    for (const method in refernces) {
      methods.push(`${refernces[method].min}=${refernces[method].dev}`);
    }
    return 'let ' + methods.join(',') + ';'
  }

  function makeBundle(data,){
    let declarations = 'let ' + Object.keys(data).join() + ';';
    let blocks = [];
    for(let element in data){
      blocks.push(`${element}=function(){${convertToHS(data[element])}}`)
    }
    return `${declarations}(function(){${minifyReferences()}${blocks.join(';')}})();`;
  }

  return {
    convert: convertToHS,
    bundle: makeBundle
  };
})();