let HSConverter = (function () {

  let config = {
    keepDOMStructure: false,
    keepFormatting: true,
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
        hsProps: hsProps
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
                hsProps[attribute.name] = attribute.value + 'Fragment';
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
    let vnodes = [];

    function flatVNode(vnode){
      vnodes.push({tag: vnode.tag, namespace: vnode.namespace, attributes: vnode.attributes});
      flatVNodeChildren(vnode.children)
    }

    function flatVNodeChildren(children){
      for (let cI = 0, cL = children.length; cI < cL; cI++) {
        flatVNode(children[cI]);
      }
    }

    flatVNode(rootVNode);

    console.log(vnodes);
  }

  function renderFragments(rootVNode) {

    let currentFragment = new CodeFormatter();
    const FRAGMENTS = { __root__: currentFragment };

    function renderNode(vnode, root) {
      let pFragment = currentFragment;
      if (vnode.hsProps.fragment) {
        currentFragment.line(vnode.hsProps.fragment + '(),')
        currentFragment = FRAGMENTS[vnode.hsProps.fragment] = new CodeFormatter();
        root = true;
      }
      switch (vnode.type) {
        case 1:
          if (vnode.children.length === 0) {
            currentFragment.line(`t('${vnode.tag}'${vnode.namespace ? `,'${vnode.namespace}'` : ''}),${renderNodeAttributes(vnode.attributes)}t(),`);
          } else {
            currentFragment.line(`t('${vnode.tag}'${vnode.namespace ? `,'${vnode.namespace}'` : ''}),${renderNodeAttributes(vnode.attributes)}`).tab();
            renderNodeChildren(vnode.children);
            currentFragment.untab()
              .line(`t()${root ? '' : ','}`);
          }
          break;
        case 3:
          currentFragment.line(`t.text\`${vnode.content}\``);
          break;
        case 8:
          currentFragment.line(`t.comment\`${vnode.content}\``);
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

    function renderNodeAttributes(attributes) {
      let text = '';
      for (let aI = 0, aL = attributes.length; aI < aL; aI++) {
        const attribute = attributes[aI];
        text += `t.attr('${attribute.name}','${attribute.value}'),`
      }
      return text;
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
      .line(`${name}=function(){`)
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
      fragments = renderFragments(rootVNode);
    optimizeDOMStructure(rootVNode);
    delete fragments.__root__
    /* Create bunlde module. */
    let module = new CodeFormatter()
      .line(`let ${Object.keys(fragments).join()};`)
      .line('(function(){')
      .tab();
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