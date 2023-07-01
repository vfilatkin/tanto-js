let HSConverter = (function () {

  let config = {
    keepDOMStructure: false,
    keepFormatting: false,
    useArrowFunctionTemplates: true
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
              case 'block':
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
        elementAttributes.push(`t.attr(${name},${value})`)
      }
      
      return new CodeFormatter()
      .line(config.useArrowFunctionTemplates? 
        `${vNodeReference.name}=(${parameters.join()})=>{`:
        `function ${vNodeReference.name}(${parameters.join()}){`
      )
      .tab()
        .line(`return t('${vNodeReference.tag}'${vNodeReference.namespace ? `,'${vNodeReference.namespace}'` : ''}),${elementAttributes.join()}`)
        .untab()
      .line('};');
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

  function renderFragments(rootVNode, references) {

    let currentFragment = new CodeFormatter();
    const FRAGMENTS = { __root__: currentFragment };

    function renderNodeHeader(vNode, reference){
      if(!reference.used) return `t('${vNode.tag}'${vNode.namespace ? `,'${vNode.namespace}'` : ''}),${renderElementNodeAttributes(vNode.attributes)}`;
      return `${reference.name}(${renderElementNodeAttributes(vNode.attributes, reference)})`;
    }

    function renderElementNodeAttributes(attributes, reference) {
      let text = [];
      for (let aI = 0, aL = attributes.length; aI < aL; aI++) {
        const attribute = attributes[aI];
        if(!reference){
          text.push(`t.attr('${attribute.name}','${attribute.value}')`)
        } else {
          if(reference.mutableNamesMap[aI]) text.push(`'${attribute.name}'`);
          if(reference.mutableValuesMap[aI]) text.push(`'${attribute.value}'`);
        }
      }
      return text.join();
    }

    function renderElementNode(vNode, root){
      let reference = references[vNode.reference];
      if (vNode.children.length === 0) {
        currentFragment.line(`${renderNodeHeader(vNode, reference)},t(),`);
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
          currentFragment.line(`t.text\`${vNode.content}\``);
          break;
        case 8:
          currentFragment.line(`t.comment\`${vNode.content}\``);
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

  function renderFragment(name, code) {
    let fragment = new CodeFormatter()
      .line(`${name}=${config.useArrowFunctionTemplates? `()=>{`: `function (){`}`)
      .tab()
        .line('return (')
          .tab()
          .tab()
          .append(code)
          .untab()
          .untab()
        .line(')')
        .untab()
      .line('};');
    return fragment;
  }

  function renderBundle(data) {
    /* Get first node from text or element. */
    let
      rootNode = toRootNode(data),
      rootVNode = toVNode(rootNode),
      references = optimizeDOMStructure(rootVNode),
      fragments = renderFragments(rootVNode, references);
    delete fragments.__root__
    /* Create bunlde module. */
    let module = new CodeFormatter()
      .line(`let ${Object.keys(fragments).join()};`)
      .line('(function(){')
      .tab();
    for (let referenceKey in references) {
      const reference = references[referenceKey];
      if(reference.used)
        module.append(reference.template);
    }
    for (let block in fragments) {
      module.append(renderFragment(block, fragments[block]))
    }
    module
      .untab()
      .line('})();')
    return module.render();
  }

  return {
    bundle: renderBundle
  };
})();