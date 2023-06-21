let HSConverter = (function () {
  let config = {
    minifyReferences: true,
    minifyFragments: false,
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
          if (config.minifyFragments) {
            text += line.text ? line.text : '';
          } else {
            let spaces = ' '.repeat(this.tabSpaces).repeat(this.tabLevel + line.tabs)
            text += spaces + (line.text ? line.text : '') + '\n';
          }
        }
      }
      return text;
    }
  }

  let refernces = {
    attributeMethodName: { dev: 't.attr', min: 'a' },
    textMethodName: { dev: 't.text', min: 'T' },
    commentMethodName: { dev: 't.comment', min: 'c' },
    eventListenerMethodName: { dev: 't.on', min: 'o' },
  }

  function toVNode(rootNode) {

    let DOMIndex = 0;

    const metaData = {
      tagMap: {},
      attributeMap: {},
      valueMap: {}
    }

    function VNode(node) {
      let
        tag = node.tagName ? node.tagName.toLowerCase(): null,
        [namespace, attributes, hsProps] = getVNodeAttributes(node);
      logKey('tagMap', tag);
      return {
        index: DOMIndex++,
        type: node.nodeType,
        tag: tag,
        namespace: namespace,
        attributes: attributes,
        children: VNodeChildren(node),
        content: tag ? null : node.textContent,
        hsProps: hsProps
      }
    }

    function logKey(map, key) {
      if (metaData[map][key]) {
        metaData[map][key]++;
      } else {
        metaData[map][key] = 1
      }
    }
    
    function logAttribute(attribute) {
      logKey('attributeMap', attribute.name);
      logKey('valueMap', attribute.value);
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
                logAttribute(attribute);
                break;
              case 'fragment':
                hsProps[attribute.name] = attribute.value + 'Fragment';
                break;
              case 'block':
                hsProps[attribute.name] = attribute.value;
                break;
              default:
                logAttribute(attribute);
                attributes.push({ name: attribute.name, value: attribute.value });
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
      if (node.childNodes && (cL = node.childNodes.length)) {
        for (let cI = 0; cI < cL; cI++) {
          children.push(VNode(node.childNodes[cI]));
        }
      }
      return children;
    }

    return [VNode(rootNode), metaData];

  }


  function renderFragments(rootVNode, meta) {

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
          currentFragment.line(`${config.minifyReferences ? refernces.textMethodName.min : refernces.textMethodName.dev}\`${vnode.content}\``);
          break;
        case 8:
          currentFragment.line(`${config.minifyReferences ? refernces.commentMethodName.min : refernces.commentMethodName.dev}\`${vnode.content}\``);
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
        text += `${config.minifyReferences ? refernces.attributeMethodName.min : refernces.attributeMethodName.dev}('${attribute.name}','${attribute.value}'),`
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

  function minifyRendererReferences() {
    let methods = [];
    for (const method in refernces) {
      methods.push(`${refernces[method].min}=${refernces[method].dev}`);
    }
    return 'let ' + methods.join(',') + ';'
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
      [rootVNode, metaData] = toVNode(rootNode),
      fragments = renderFragments(rootVNode);
    console.log(metaData);
    delete fragments.__root__
    /* Create bunlde module. */
    let module = new CodeFormatter()
      .line(`let ${Object.keys(fragments).join()};`)
      .line('(function(){')
      .tab()
      .line(minifyRendererReferences());
    
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