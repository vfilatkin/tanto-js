let HSConverter = (function () {

  function CodeFormatter(tabSpaces) {
    this.tabSpaces = tabSpaces || 2;
    this.tabLevel = 0;
    this.text = [];
    this.data = {};
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
          let spaces = ' '.repeat(this.tabSpaces).repeat(this.tabLevel + line.tabs)
          text += spaces + (line.text ? line.text : '') + '\n';
        }
      }
      return text;
    }
  }

  let minify = true;

  let refernces = {
    attributeMethodName: { dev: 't.attr', min: 'a' },
    textMethodName: { dev: 't.text', min: 'T' },
    commentMethodName: { dev: 't.comment', min: 'c' },
    eventListenerMethodName: { dev: 't.on', min: 'o' },
  }

  let currentFragment = new CodeFormatter();
  const FRAGMENTS = { __root__: currentFragment };

  function renderNode(node) {
    let
      pFragment = currentFragment,
      type = node.nodeType,
      tag = node.tagName ? node.tagName.toLowerCase() : null,
      [namespace, attributes, hsProps] = getNodeAttributes(node),
      content = tag ? null : node.textContent;
    if (hsProps.fragment) {
      currentFragment.line(hsProps.fragment + '(),')
      currentFragment = FRAGMENTS[hsProps.fragment] = new CodeFormatter();
    }
    let prefix = '';
    if (hsProps.block) {
      prefix = `e.${hsProps.block}=`;
      currentFragment.data.hasBlocks = true;
    }
    switch (type) {
      case 1:
        /* Node contains no child nodes. */
        if (node.children.length === 0) {
          currentFragment.line(`${prefix}t('${tag}'${namespace ? `,'${namespace}'` : ''}),${renderNodeAttributes(attributes)}t(),`);
        } else {
          /* Node contains child nodes. */
          currentFragment.line(`${prefix}t('${tag}'${namespace ? `,'${namespace}'` : ''}),${renderNodeAttributes(attributes)}`).tab();
          renderNodeChildren(node.children);
          currentFragment.untab()
            .line(`t(),`);
        }
        break;
      case 3:
        currentFragment.line(`${minify ? refernces.textMethodName.min : refernces.textMethodName.dev}\`${content}\``);
        break;
      case 8:
        currentFragment.line(`${minify ? refernces.commentMethodName.min : refernces.commentMethodName.dev}\`${content}\``);
        break;
    }
    currentFragment = pFragment;
  }

  function renderNodeChildren(children) {
    for (let cI = 0, cL = children.length; cI < cL; cI++) {
      const node = children[cI];
      renderNode(node, (cI + 1) === cL);
    }
  }

  function getNodeAttributes(node) {
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
              attributes.push({ name: attribute.name, value: attribute.value });
          }
        }
      }
    }
    return [namespace, attributes, hsProps];
  }

  function renderNodeAttributes(attributes) {
    let text = '';
    for (let aI = 0, aL = attributes.length; aI < aL; aI++) {
      const attribute = attributes[aI];
      text += `${minify ? refernces.attributeMethodName.min : refernces.attributeMethodName.dev}('${attribute.name}','${attribute.value}'),`
    }
    return text;
  }

  function cleanHtml(innerHTML) {
    return innerHTML.trim().replaceAll(/[\r\n\t]/gi, '').replaceAll(/\s\s+/gi, ' ').replaceAll(/>\s</gi, '><');
  }

  function getRootNode(data) {
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
      .tab();
      if(code.data.hasBlocks) {
        fragment.line('let e={};');
        fragment
        .tab()
        .append(code)
        .untab();
        fragment.line('return e;');
        fragment.untab()
        .line('}');
      } else {
        fragment
        .line('return (')
        .tab()
        .tab()
        .append(code)
        .untab()
        .untab()
        .line(');')
        .untab()
        .line('}');
      }

    return fragment;
  }

  function renderBundle(data) {
    /* Get first node from text or element. */
    let rootNode = getRootNode(data);

    renderNode(rootNode);
    delete FRAGMENTS.__root__
    /* Create bunlde module. */
    let module = new CodeFormatter()
      .line(`let ${Object.keys(FRAGMENTS).join()};`)
      .line('(function(){')
      .tab()
      .line(minifyRendererReferences());
    
    for (let block in FRAGMENTS) {
      module.append(renderFragment(block, FRAGMENTS[block]))
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