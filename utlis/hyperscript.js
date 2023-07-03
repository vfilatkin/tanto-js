let HyperScript = (function () {
  let 
  config = {
    keepFormatting: false,
    useArrowFunctions: true,
    minifyRendererReferences: true,
    renderReferences: {
      T: {dev: 't', min: 't', module: true}, 
      T_ATTR: {dev: 't.attr', min: 'a'}, 
      T_ON: {dev: 't.on', min: 'e'}, 
      T_TEXT: {dev: 't.text', min: 'T'}, 
      T_COMMENT: {dev: 't.comment', min: 'C'}, 
    }
  }

  function CodeFormatter(tabSpaces) {
    this.tabSpaces = tabSpaces || 2;
    this.tabLevel = 0;
    this.text = [];
    this.tab = function () {
      this.tabLevel++;
      return this;
    }

    this.untab = function () {
      this.tabLevel--;
      return this;
    }

    this.append = function (formatter) {
      formatter.tabSpaces = this.tabSpaces;
      formatter.tabLevel = this.tabLevel;
      this.text.push(formatter);
      return this;
    }

    this.line = function (lineText) {
      if (!lineText) return this;
      this.text.push({ tabs: this.tabLevel, text: lineText });
      return this;
    }

    this.insert = function(text){
      this.text[this.text.length - 1].text += text;
    }

    this.render = function () {
      let text = '';
      for (let lI = 0, tL = this.text.length; lI < tL; lI++) {
        let line = this.text[lI];
        if (line instanceof CodeFormatter) {
          text += line.render();
        } else {
          if (config.keepFormatting) {
            let spaces = ' '.repeat(this.tabSpaces).repeat(this.tabLevel + line.tabs)
            text += spaces + (line.text ? line.text : '') + '\n';
          } else {
            text += line.text ? line.text : '';
          }
        }
      }
      return text;
    }
  }

  function renderFunction(name, parameters, body){
    let fn = new CodeFormatter();
    if(config.useArrowFunctions){
      return fn.line(`${name}=(${parameters})=>(`)
        .tab()
          .tab()
            .append(body)
            .untab()
          .untab()
        .line(')');
    }
    return fn.line(`function ${name}(${parameters}){`)
    .tab()
      .line('return (')
      .tab()
        .tab()
          .append(body)
          .untab()
        .untab() 
      .line(')')
      .untab()
    .line('};')
  }

  function renderDeclarationBlock(declarations){
    let 
      block = new CodeFormatter(), 
      declaration, 
      dI = 0, 
      dL = declarations.length - 1;

    if(config.useArrowFunctions){
      block.line('let ').tab();
      for(; dI < dL; dI++){
        declaration = declarations[dI];
        block.append(declaration);
        declaration.insert(',');
      }
      declaration = declarations[dL];
      declaration.insert(';');
      block.append(declaration)
      return block;
    }
    for(; dI < dL + 1; dI++){
      declaration = declarations[dI];
      block.append(declaration);
    }
    return block;
  }

  function toVNode(rootNode) {

    let 
      DOMIndex = 0,
      DOMDepth = 0;

    function VNode(node) {
      let
        tag = node.tagName? node.tagName.toLowerCase() : null,
        [namespace, attributes, hsProps] = getVNodeAttributes(node);

      return {
        index: DOMIndex++,
        depth: DOMDepth,
        type: node.nodeType,
        tag: tag,
        namespace: namespace,
        attributes: attributes,
        children: VNodeChildren(node),
        content: tag ? null : node.textContent,
        hsProps: hsProps,
        reference: undefined, 
      }
    }

    function getVNodeAttributes(node) {

      let
        namespace,
        attributes = [],
        hsProps = {};

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.hasAttributes()) {
          for (const attribute of node.attributes) {
            switch (attribute.name) {
              case 'xmlns':
                namespace = attribute.value;
                break;
              case 'fragment':
                hsProps[attribute.name] = attribute.value;
                break;
              default:
                attributes.push({name: attribute.name, value: attribute.value});
            }
          }
        }
      }
      return [namespace, attributes, hsProps];
    }

    function VNodeChildren(node) {
      let
        children = [],
        cL;
      DOMDepth++;
      if (node.childNodes && (cL = node.childNodes.length)) {
        for (let cI = 0; cI < cL; cI++) {
          children.push(VNode(node.childNodes[cI]));
        }
      }
      DOMDepth--;
      return children;
    }

    return VNode(rootNode);

  }

  function renderRef(key){
    return config.minifyRendererReferences? config.renderReferences[key].min : config.renderReferences[key].dev; 
  }

  const EVENT__NAMES = Object.keys(window).filter(function(key) {return /^on/.test(key)});

  function isEventAttribute(name) {
    return EVENT__NAMES.indexOf(name) !== -1;
  }

  function optimizeDOMStructure(rootVNode){
    let vNodeReferences = {};
    /**
     * If attribute name or value can change -
     * keep it's index as key in respective map.
     */
    function mapMutableAttributes(vNodeGroup, vNode){
      for (let aI = 0, aL = vNode.attributes.length; aI < aL; aI++) {
        let 
          vNodeAttribute = vNode.attributes[aI],
          vNodeGroupAttribute = vNodeGroup.attributes[aI];
        if(vNodeAttribute.name !== vNodeGroupAttribute.name) vNodeGroup.mutableNamesMap[aI] = true;
        if(vNodeAttribute.value !== vNodeGroupAttribute.value) vNodeGroup.mutableValuesMap[aI] = true;
      }
    }
    /* Get virtual node and push it into array. */
    function fetchVNode(vNode){
      let 
        /**
         * Reference key assumes two similarities 
         * between nodes - tag and number of
         * attributes.
        */
        vNodeReferenceKey = vNode.tag + vNode.attributes.length,
        /* Find reference (if it's exists). */
        vNodeReference = vNodeReferences[vNodeReferenceKey];
        /* Assign reference to VNode. */
        vNode.reference = vNodeReferenceKey;

      if(vNodeReference){
        vNodeReference.vNodes.push(vNode);
        mapMutableAttributes(vNodeReference, vNode);
        vNodeReference.leaf = vNodeReference.leaf? true : vNode.children.length === 0;
      } else {
        vNodeReferences[vNodeReferenceKey] = {
          tag: vNode.tag,
          namespace: vNode.namespace,
          attributes: vNode.attributes,
          mutableNamesMap: {},
          mutableValuesMap: {},
          vNodes: [vNode],
          used: false,
          template: null,
          leaf: false,
        };
      }

      fetchVNodeChildren(vNode.children);
    }

    function fetchVNodeChildren(children){
      for (let cI = 0, cL = children.length; cI < cL; cI++) {
        fetchVNode(children[cI]);
      }
    }

    function renderVNodeReferenceTemplate(vNodeReference){
      let 
        parameters = [];
        elementAttributes = [];

      for(let aI = 0, attributes = vNodeReference.attributes, aL = attributes.length; aI < aL; aI++ ){
        let attribute = attributes[aI];
        let 
          name = `'${attribute.name}'`,
          value = `'${attribute.value}'`;
        if(vNodeReference.mutableNamesMap[aI]) { parameters.push(name = ('a' + aI));}
        if(vNodeReference.mutableValuesMap[aI]) { parameters.push(value = ('v' + aI));}
        elementAttributes.push(`${renderRef('T_ATTR')}(${name},${value})`)
      }
      
      return renderFunction(
        vNodeReference.name, 
        parameters.join(), 
        new CodeFormatter()
        .line(`t('${vNodeReference.tag}'${vNodeReference.namespace ? `,'${vNodeReference.namespace}'` : ''}),${elementAttributes.join()}${vNodeReference.leaf? ',t()': ''}`));
    }

    function createReferences(){
      fetchVNode(rootVNode);
      let vNodeReferenceIndex = 0;
      for(let vNodeReferenceKey in vNodeReferences){
        let vNodeReference = vNodeReferences[vNodeReferenceKey];
        if(vNodeReference.vNodes.length > 1) {
          vNodeReference.name = 'f' + vNodeReferenceIndex;
          vNodeReference.template = renderVNodeReferenceTemplate(vNodeReference);
          vNodeReference.used = true;
          vNodeReferenceIndex++;
        } 
      }
      return vNodeReferences;
    }

    return createReferences();
  }

  function renderNodeHeader(vNode, reference){
    if(!reference || !reference.used) return `t('${vNode.tag}'${vNode.namespace ? `,'${vNode.namespace}'` : ''}),${renderElementNodeAttributes(vNode.attributes)}`;
    return `${reference.name}(${renderElementNodeAttributes(vNode.attributes, reference)})`;
  }

  function renderElementNodeAttributes(attributes, reference) {
    let text = [];
    for (let aI = 0, aL = attributes.length; aI < aL; aI++) {
      const attribute = attributes[aI];
      if(!reference){
        if(isEventAttribute(attribute.name)){
          text.push(`${renderRef('T_ON')}('${attribute.name.substring(2, attribute.name.length)}',${attribute.value})`);
        } else {
          text.push(`${renderRef('T_ATTR')}('${attribute.name}','${attribute.value}')`)
        }
      } else {
        if(reference.mutableNamesMap[aI]) text.push(`'${attribute.name}'`);
        if(reference.mutableValuesMap[aI]) text.push(`'${attribute.value}'`);
      }
    }
    return text.join();
  }

  function renderFragments(rootVNode, references) {

    let currentFragment = new CodeFormatter();
    const FRAGMENTS = { __root__: currentFragment };

    function renderElementNode(vNode, root){
      let reference = references[vNode.reference];
      if (vNode.children.length === 0) {
        currentFragment.line(`${renderNodeHeader(vNode, reference)}${reference.leaf? '': ',t()'},`);
      } else {
        currentFragment.line(`${renderNodeHeader(vNode, reference)},`)
        .tab();
          renderNodeChildren(vNode.children);
          currentFragment.untab()
        .line(`t()${root ? '' : ','}`);
      }
    }

    function renderNode(vNode, root) {
      let pFragment = currentFragment;
      if (vNode.hsProps.fragment) {
        currentFragment.line(vNode.hsProps.fragment + '(),')  
        currentFragment = FRAGMENTS[vNode.hsProps.fragment] = new CodeFormatter();
        root = true;
      }
      switch (vNode.type) {
        case 1:
          renderElementNode(vNode, root);
          break;
        case 3:
          currentFragment.line(`${renderRef('T_TEXT')}\`${vNode.content}\`,`);
          break;
        case 8:
          currentFragment.line(`${renderRef('T_COMMENT')}\`${vNode.content}\`,`);
          break;
      }
      currentFragment = pFragment;
    }

    function renderNodeChildren(children) {
      for (let cI = 0, cL = children.length; cI < cL; cI++) {
        const vnode = children[cI];
        renderNode(vnode);
      }
    }

    renderNode(rootVNode, true);

    return FRAGMENTS;
  }

  function cleanHtml(innerHTML) {
    return innerHTML
      .trim()
      .replaceAll(/[\r\n\t]/gi, '')
      .replaceAll(/\s\s+/gi, ' ')
      .replaceAll(/>\s</gi, '><');
  }

  function toRootNode(data) {
    let element;
    if (typeof data === 'string') {
      element = document.createElement('div');
      element.innerHTML = cleanHtml(data);
      return element.firstElementChild;
    }
    element = data.cloneNode(true);
    element.innerHTML = cleanHtml(element.innerHTML);
    return element;
  }

  function rendererReferences(){
    let references = Object.values(config.renderReferences).filter(function(r){return !r.module;});
    return `let [${references.map(function(r){return r.min}).join()}]=[${references.map(function(r){return r.dev}).join()}];`
  }

  function renderModule(data) {
    /* Get first node from text or element. */
    let
      rootNode = toRootNode(data),
      rootVNode = toVNode(rootNode),
      references = optimizeDOMStructure(rootVNode),
      fragments = renderFragments(rootVNode, references);
    delete fragments.__root__
    /* Create module. */
    let module = new CodeFormatter()

    .line(`let ${Object.keys(fragments).join()};`)
    .line('(function(){')
    .tab();

    if(config.minifyRendererReferences)
      module.line(rendererReferences());

    module.append(renderDeclarationBlock(Object.values(references).filter(function(r){return r.used;}).map(function(r){ return r.template;})));

    for (let fragmentKey in fragments) {
      module.append(renderFunction(fragmentKey, '', fragments[fragmentKey]))
    }

    module
      .untab()
      .line('})();')
    return module.render();
  }

  return {
    renderModule: renderModule
  };
})();