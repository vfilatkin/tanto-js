let HSConverter = (function () {
  let config = {
    keepFormatting: false,
    minifyReferences: true,
  }

  const RENDERER_REFERENCES = {
    T: 't',
    ATTRIBUTE: 't.attr',
    TEXT: 't.text',
    COMMENT: 't.comment',
    LISTENER: 't.on',
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

    let DOMIndex = 0;

    const metaData = {
      tagMap: {},
      attributeMap: {},
      valueMap: {}
    }

    function VNode(node) {
      let
        tag = node.tagName ? logKey('tagMap', `'${node.tagName.toLowerCase()}'`) : null,
        [namespace, attributes, hsProps] = getVNodeAttributes(node);

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
      return key
    }

    function logAttribute(attribute) {
      return {
        name: logKey('attributeMap', `'${attribute.name}'`),
        value: logKey('valueMap', `'${attribute.value}'`)
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
                namespace = logAttribute(attribute).value;
                break;
              case 'fragment':
                hsProps[attribute.name] = attribute.value + 'Fragment';
                break;
              case 'block':
                hsProps[attribute.name] = attribute.value;
                break;
              default:
                attributes.push(logAttribute(attribute));
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

    metaData[0] = {
      [RENDERER_REFERENCES.T]: 2,
      [RENDERER_REFERENCES.ATTRIBUTE]: 2,
      [RENDERER_REFERENCES.TEXT]: 2,
      [RENDERER_REFERENCES.COMMENT]: 2,
      [RENDERER_REFERENCES.LISTENER]: 2
    }

    return [VNode(rootNode), metaData];

  }

  function numToChar(n) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let
      cL = chars.length,
      o = n - 1,
      letters = chars[o % cL];
    while ((o = Math.floor(o / cL)) > 0) {
      letters = chars[--o % cL] + letters;
    }
    return letters;
  }

  function renderKeySpace(metaData) {
    let
      index = 0,
      keys = [],
      values = [];

    for (let mapKey in metaData) {
      const map = metaData[mapKey];
      for (let key in map) {
        const string = map[key];
        if (string > 1) {
          index++;
          keys.push(map[key] = numToChar(index));
          values.push(key);
        } else {
          map[key] = `${key}`;
        }
      }
    }

    return `let [${keys.join()}]=[${values.join()}];`
  }

  function renderFragments(rootVNode, metaData) {

    let currentFragment = new CodeFormatter();
    const FRAGMENTS = { __root__: currentFragment };

    function ref(map, key) {
      return config.minifyReferences ? metaData[map][key] : key;
    }

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
            currentFragment.line(`${ref(0, RENDERER_REFERENCES.T)}(${ref('tagMap', vnode.tag)}${vnode.namespace ? `,${ref('valueMap', vnode.namespace)}` : ''}),${renderNodeAttributes(vnode.attributes)}${metaData[0][RENDERER_REFERENCES.T]}(),`);
          } else {
            currentFragment.line(`${ref(0, RENDERER_REFERENCES.T)}(${ref('tagMap', vnode.tag)}${vnode.namespace ? `,${ref('valueMap', vnode.namespace)}` : ''}),${renderNodeAttributes(vnode.attributes)}`).tab();
            renderNodeChildren(vnode.children);
            currentFragment.untab()
              .line(`${ref(0, RENDERER_REFERENCES.T)}()${root ? '' : ','}`);
          }
          break;
        case 3:
          currentFragment.line(`${ref(0, RENDERER_REFERENCES.TEXT)}\`${vnode.content}\``);
          break;
        case 8:
          currentFragment.line(`${ref(0, RENDERER_REFERENCES.COMMENT)}\`${vnode.content}\``);
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
        text += `${ref(0, RENDERER_REFERENCES.ATTRIBUTE)}(${ref('attributeMap', attribute.name)},${ref('valueMap', attribute.value)}),`
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
      [rootVNode, metaData] = toVNode(rootNode),
      keySpace = renderKeySpace(metaData);
    let
      fragments = renderFragments(rootVNode, metaData);
    delete fragments.__root__
    /* Create bunlde module. */
    let module = new CodeFormatter()
      .line(`let ${Object.keys(fragments).join()};`)
      .line('(function(){')
      .tab()
        .line(keySpace);
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