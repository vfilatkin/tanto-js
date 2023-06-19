let HSConverter = (function () {

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
      this.text.push({tabs: this.tabLevel, text:lineText });
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

  let currentBlock = new CodeFormatter();
  const BLOCKS = {__root__: currentBlock};

  function renderNode(node) {
    let
      pBlock = currentBlock,
      type = node.nodeType,
      tag = node.tagName? node.tagName.toLowerCase(): null,
      [namespace, attributes, hsProps] = getNodeAttributes(node),
      content = tag ? null : node.textContent;
      if(hsProps.block) {
        currentBlock.line(hsProps.block + '()')
        currentBlock = BLOCKS[hsProps.block] = new CodeFormatter();
      }
      switch(type){
        case 1:
          /* Node contains no child nodes. */
          if (node.children.length === 0){
            currentBlock.line(`t('${tag}'${namespace ? `,'${namespace}'` : ''}),${renderNodeAttributes(attributes)}t(),`);
          } else {
            /* Node contains child nodes. */
            currentBlock.line(`t('${tag}'${namespace ? `,'${namespace}'` : ''}),${renderNodeAttributes(attributes)}`).tab();
            renderNodeChildren(node.children);
            currentBlock.untab()
              .line('t()');
          }
          break;
        case 3:
          currentBlock.line(`${minify ? refernces.textMethodName.min : refernces.textMethodName.dev}\`${content}\``);
          break;
        case 8:
          currentBlock.line(`${minify ? refernces.commentMethodName.min : refernces.commentMethodName.dev}\`${content}\``);
          break;
      }
      currentBlock = pBlock;
  }

  function renderNodeChildren(children) {
    for (let cI = 0, cL = children.length; cI < cL; cI++) {
      const node = children[cI];
      renderNode(node);
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

  function renderBundle(data){
    /* Get first node from text or element. */
    let rootNode = getRootNode(data);


    /* Create bunlde module. */
    let module = new CodeFormatter()
    .line('(function(){')
    .tab()
      .line(minifyRendererReferences());
    renderNode(rootNode);
    console.log(BLOCKS);
    for (let block in BLOCKS) {
      console.log(block);
      module.append(BLOCKS[block])
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
