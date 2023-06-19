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

  let DOMIndex = 0;
  function VNode(node) {
    let
      tag = node.tagName,
      [namespace, attributes, hsProps] = getVNodeAttributes(node);
    return {
      index: DOMIndex++,
      type: node.nodeType,
      tag: tag ? tag.toLowerCase() : null,
      namespace: namespace,
      attributes: attributes,
      children: VNodeChildren(node),
      content: tag ? null : node.textContent,
      hsProps: hsProps
    }
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

  function renderHyperScriptNode(vnode, formatter) {
    if (vnode.type === 1) {
      if (vnode.children.length === 0)
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
    return innerHTML.trim().replaceAll(/[\r\n\t]/gi, '').replaceAll(/\s\s+/gi, ' ').replaceAll(/>\s</gi, '><');
  }

  function convertToVNode(data) {
    let element;
    if (typeof data === 'string') {
      element = document.createElement('div');
      element.innerHTML = cleanHtml(data);
      return VNode(element.firstElementChild);
    }
    element = data.cloneNode(true);
    element.innerHTML = cleanHtml(element.innerHTML);
    return VNode(element);
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

  function renderBundle(data) {
    let bundle = new CodeFormatter()
      .line('let ' + Object.keys(data).join() + ';')
      .line('(function(){')
      .tab()
      .line(minifyReferences());
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
    return bundle.render();
  }

  return {
    convert: convertToHS,
    bundle: renderBundle
  };
})();
