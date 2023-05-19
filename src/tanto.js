(function () {
  'use strict'

  function noop() { };
  function ready(f) {
    if (document.readyState != 'loading') {
      f();
    } else {
      document.addEventListener('DOMContentLoaded', f);
    }
  }

  let moduleImpl, modules;
  (function () {
    modules = {
      openRoot: [],
      openComponent: [],
      closeComponent: [],
      openNode: [],
      closeNode: [],
      setAttribute: []
    }
    moduleImpl = function (hooks) {
      for (let key in modules) {
        if (hooks[key])
          modules[key].push(hooks[key])
      }
    }
  })();

  /**
   * Component state module.
   */
  let
    signalImpl,
    computedImpl,
    effectImpl,
    rootImpl,
    cleanupImpl,
    getEffectContext,
    returnEffect,
    isSignal;
  (function () {
    /* Effect & computed state flags */
    const
      STALE = 1 << 0,
      RUNNING = 1 << 1,
      REMOVED = 1 << 2;
    let
      currentContext = null,
      effectQueue = [];
    const SIGNAL_OPTIONS = { equal: true };
    function Signal(value, options) {
      this._value = value;
      this.targets = [];
      this.options = options || SIGNAL_OPTIONS;
    }
    isSignal = function (object) {
      return object instanceof Signal;
    };
    Object.defineProperty(Signal.prototype, "$", {
      get() {
        this.subscribe(currentContext);
        return this._value;
      },
      set(newValue) {
        if (this._value === newValue && this.options.equal)
          return this._value;
        this._value = newValue;
        this.notify();
        runEffects();
        return this._value;
      }
    });
    Object.defineProperty(Signal.prototype, "value", {
      get() {
        return this._value;
      },
      set(newValue) {
        this._value = newValue;
        return this._value;
      }
    });
    Signal.prototype.addTarget = function (target) {
      if (!this.targets.includes(target))
        this.targets.push(target);
    }
    Signal.prototype.subscribe = function () {
      if (!currentContext) return;
      if (currentContext instanceof Effect) {
        this.addTarget(currentContext);
        currentContext.addSource(this);
      }
    }
    Signal.prototype.unsubscribe = function (target) {
      let targets = [];
      for (let tI = 0, tL = this.targets.length; tI < tL; tI++) {
        const targetAt = this.targets[tI];
        if (targetAt !== target)
          targets.push(target);
      }
      this.targets = targets;
    }
    Signal.prototype.notify = function () {
      for (let tI = 0; tI < this.targets.length; tI++) {
        this.targets[tI].notify();
      }
    }
    Signal.prototype.toString = function () {
      return "[object Signal]";
    }
    signalImpl = function (value, options) {
      return new Signal(value, options);
    }

    const EFFECT_OPTIONS = { defer: false };
    function Effect(fn, options) {
      this.fn = fn;
      this.sources = [];
      this.hosted = [];
      this.cleanups = null;
      this.flags = STALE;
      this.options = options || EFFECT_OPTIONS;
      this.run();
    }
    Effect.prototype.run = function () {
      if (this.flags & RUNNING)
        throw new Error("Loop detected");
      if (this.flags & STALE) {
        this.flags |= RUNNING;
        this.addHosted();
        let pContext = currentContext;
        currentContext = this;
        this.fn();
        this.flags &= ~RUNNING;
        currentContext = pContext;
      }
      this.flags &= ~STALE;
    }
    Effect.prototype.notify = function () {
      if (this.flags & STALE || this.flags & REMOVED) return;
      this.flags |= STALE;
      this.clearHosted();
      effectQueue.push(this);
    }
    function runEffects() {
      for (let eI = 0, eQL = effectQueue.length; eI < eQL; eI++) {
        effectQueue[eI].run();
      }
      effectQueue.length = 0;
    }
    Effect.prototype.addSource = function (source) {
      if (!this.sources.includes(source))
        this.sources.push(source);
    }
    Effect.prototype.addHosted = function () {
      if (!currentContext) return;
      if (!currentContext.hosted)
        throw 'Computed cannot have nested effects.'
      currentContext.hosted.push(this);
    }
    Effect.prototype.runCleanups = function () {
      if (!this.cleanups) return;
      for (let cI = 0, cL = this.cleanups.length; cI < cL; cI++) {
        this.cleanups[cI]();
      }
      this.cleanups.length = 0;
    }
    Effect.prototype.clearHosted = function () {
      for (let hI = 0, hL = this.hosted.length; hI < hL; hI++) {
        const hosted = this.hosted[hI];
        hosted.clear();
      }
      this.hosted.length = 0;
    }
    Effect.prototype.unsubscribeFromSources = function () {
      for (let sI = 0, sL = this.sources.length; sI < sL; sI++) {
        this.sources[sI].unsubscribe(this);
      }
      this.sources.length = 0;
    }
    Effect.prototype.clear = function () {
      this.fn = undefined;
      this.flags |= REMOVED;
      this.options = undefined;
      this.runCleanups();
      this.unsubscribeFromSources();
      this.clearHosted();
    }
    returnEffect = function (fn, options) {
      return new Effect(fn, options);
    }
    getEffectContext = function () {
      return currentContext;
    }
    Effect.prototype.toString = function () {
      return "[object Effect]";
    }
    effectImpl = function (fn, options) {
      new Effect(fn, options);
    }

    function Root(fn) {
      this.hosted = [];
      this.cleanups = null;
      this.addHosted();
      let pContext = currentContext;
      currentContext = this;
      fn();
      currentContext = pContext;
    }
    Root.prototype.addHosted = function () {
      if (!currentContext) return;
      if (!currentContext.hosted)
        throw 'Computed cannot have roots.'
      currentContext.hosted.push(this);
    }
    Root.prototype.runCleanups = function () {
      if (!this.cleanups) return;
      for (let cI = 0, cL = this.cleanups.length; cI < cL; cI++) {
        this.cleanups[cI]();
      }
      this.cleanups.length = 0;
    }
    Root.prototype.clearHosted = function () {
      for (let hI = 0, hL = this.hosted.length; hI < hL; hI++) {
        const hosted = this.hosted[hI];
        hosted.clear();
      }
      this.hosted.length = 0;
    }
    Root.prototype.clear = function () {
      this.runCleanups();
      this.clearHosted();
    }
    rootImpl = function (fn) {
      new Root(fn);
    }

    function Computed(fn) {
      this.fn = fn;
      this._value = undefined;
      this.flags = STALE;
      this.sources = [];
      this.targets = [];
    }
    Object.defineProperty(Computed.prototype, "$", {
      get() {
        if (this.flags & STALE) {
          const pContext = currentContext;
          currentContext = this;
          this.refresh();
          currentContext = pContext;
        }
        if (currentContext) {
          this.subscribe(currentContext);
        }
        return this._value;
      }
    });
    Computed.prototype.addSource = function (source) {
      if (!this.sources.includes(source))
        this.sources.push(source);
    }
    Computed.prototype.addTarget = function (target) {
      if (!this.targets.includes(target))
        this.targets.push(target);
    }
    Computed.prototype.subscribe = function () {
      if (!currentContext) return;
      this.addTarget(currentContext);
      currentContext.addSource(this);
    }
    Computed.prototype.refresh = function () {
      this._value = this.fn();
      this.flags &= ~STALE;
    }
    Computed.prototype.notify = function () {
      if (!this.flags & STALE) {
        this.flags |= STALE;
        for (let tI = 0, tL = this.targets.length; tI < tL; tI++) {
          this.targets[tI].notify();
        }
      }
    }
    Computed.prototype.unsubscribe = function (target) {
      let targets = [];
      for (let tI = 0, tL = this.targets.length; tI < tL; tI++) {
        const targetAt = this.targets[tI];
        if (targetAt !== target)
          targets.push(target);
      }
      this.targets = targets;
    }
    Computed.prototype.toString = function () {
      return "[object Computed]";
    }
    computedImpl = function (fn) {
      return new Computed(fn);
    }
    cleanupImpl = function (fn) {
      if (!currentContext)
        throw "Cannot add cleanup function without context.";
      if (currentContext.cleanups === null)
        currentContext.cleanups = [fn];
      else
        currentContext.cleanups.push(fn);
    }
  })();

  /**
   * The DOM Patcher.
   */
  let
    patchInner,
    patchOuter,
    openNode,
    closeNode,
    commentNode,
    clearNode,
    getPreviousNode,
    useCurrentNode,
    setCurrentNodeAttribute,
    setCurrentNodeClassAttribute,
    setCurrentNodeListener,
    setCurrentNodeBinding,
    createTextNodes;
  let
    mount,
    mountComponent;

  (function () {
    const
      OPEN_NODE = 1,
      CLOSE_NODE = 2;
    /**
     * Main patcher parameters.
     * Each time on patch() function call
     * these parameters will be copied and
     * restored after patching is done.
     * It helps to perform nested calls of 
     * patch() function.
     */
    var
      currentRootNode = null,
      namespace = null,
      previousCommand = null,
      currentCommand = null,
      currentNodeType = null,
      currentNode = null,
      previousNode = null,
      patchRoot = null,
      patchParent = null,
      currentComponent = null;
    /**
     * Patches elements of DOM-tree
     * @param {element} element - Entry element of patch.
     * @param {function} patchFn - Patch function. Contain patcher commands.
     * @param {string} namespaceURI - Patch initial namespace
     * @returns {element} - Returns patched element.
     */
    function Patcher(patcherFn) {
      return function (element, patchFn, namespaceURI) {
        /*
          * Preserve patcher context and restore 
          * it after patching is done
          */
        var
          pCurrentRootNode = currentRootNode,
          pNamespace = namespace,
          pPreviousCommand = previousCommand,
          pCurrentCommand = currentCommand,
          pCurrentNodeType = currentNodeType,
          pCurrentNode = currentNode,
          pPreviousNode = previousNode,
          pPatchRoot = patchRoot,
          pPatchParent = patchParent,
          pCurrentComponent = currentComponent;
        //Setup new patch context copy
        currentRootNode = element;
        namespace = namespaceURI ? { node: element, URI: namespaceURI } : null;
        previousCommand = null;
        currentCommand = OPEN_NODE;
        currentNode = element;
        currentNodeType = element.nodeType;
        previousNode = null;
        patchRoot = null;
        patchParent = null;
        currentComponent = null;
        try {
          patcherFn(patchFn)
        } finally {
          currentRootNode = pCurrentRootNode;
          namespace = pNamespace;
          previousCommand = pPreviousCommand;
          currentCommand = pCurrentCommand;
          currentNodeType = pCurrentNodeType;
          currentNode = pCurrentNode;
          previousNode = pPreviousNode;
          patchRoot = pPatchRoot;
          patchParent = pPatchParent;
          currentComponent = pCurrentComponent;
        }
        return element;
      }
    }
    //Inner patcher.
    patchInner = Patcher(function (patchFn) {
      currentNode = currentRootNode;
      let element = patchFn();
      removeUnopened();
      return element;
    })

    //Patch element's outerHTML.
    patchOuter = Patcher(function (patchFn) {
      currentNode = { firstChild: currentNode };
      return patchFn();
    })
    
    function isSameTag(tag1, tag2) {
      return tag1.toLowerCase() === tag2.toLowerCase();
    }

    //Returns two arrays. First contains used keys, second contains unused.
    function diffKeys(aKeys, bKeys) {
      var
        used = [],
        unused = [];
      aKeys.forEach(function (aKey) {
        var index = bKeys.indexOf(aKey);
        if (index === -1) {
          unused.push(aKey)
        } else {
          used.push(aKey)
        }
      })
      return [used, unused]
    }
    //Returns the keys and flag of the operation needed to resolve the differences.
    function diffObjectKeys(aObj, bObj) {
      var
        flag,
        used,
        unused,
        aKeys = Object.keys(aObj),
        bKeys = Object.keys(bObj);
      if (aKeys.length >= bKeys.length) {
        //The difference is negative. Need to delete keys.
        [used, unused] = diffKeys(aKeys, bKeys)
        flag = false
      } else {
        //The difference is positive. Need to add keys.
        [used, unused] = diffKeys(bKeys, aKeys)
        flag = true
      }
      return [flag, used, unused]
    }
    //Get array of node's current attributes
    function getNodeCurrentAttributes(node) {
      var
        currentAttributes = {},
        attributes = node.attributes;
      for (let attribute of attributes) {
        currentAttributes[attribute.name] = attribute.value
      }
      return currentAttributes;
    }
    function setNodeAttribute(node, name, value) {
      node.setAttribute(name, value)
    }
    function removeNodeAttribute(node, name) {
      node.removeAttribute(name)
    }
    //Update node attributes
    function updateNodeAttributes(node, keys, newAttributes, updateFn) {
      keys.forEach(function (key) {
        updateFn(node, key, newAttributes[key])
      });
    }
    //Assign attributes and listeners
    function assignElementAttributes(node, newAttributes) {
      newAttributes = newAttributes || {}
      var oldAttributes = getNodeCurrentAttributes(node);
      var [flag, used, unused] = diffObjectKeys(oldAttributes, newAttributes)
      updateNodeAttributes(node, used, newAttributes, setNodeAttribute)
      if (flag) {
        updateNodeAttributes(node, unused, newAttributes, setNodeAttribute)
      } else {
        updateNodeAttributes(node, unused, newAttributes, removeNodeAttribute)
      }
    }

    function setPatcherNamespace(namespaceURI) {
      if (namespaceURI) {
        namespace = {};
        namespace.node = currentNode;
        namespace.URI = namespaceURI;
      }
    }

    function defaultPatcherNamespace() {
      if (namespace && namespace.node === currentNode) {
        namespace = null;
      }
    }

    function createElementNode(tag) {
      var newNode;
      if (namespace) {
        newNode = document.createElementNS(namespace.URI, tag);
      } else {
        newNode = document.createElement(tag);
      }
      return newNode;
    }

    function insertNode(parent, newNode) {
      parent.appendChild(newNode);
      return newNode;
    }

    function replaceNode(node, newNode) {
      node.parentNode.replaceChild(newNode, node);
      return newNode;
    }

    function removeChildNodes(node) {
      while (node.firstChild) {
        node.removeChild(node.lastChild);
      }
    }
    //Remove rest child elements
    function removeNodesFrom(node) {
      var parent = node.parentNode,
        child = parent.lastChild;
      do {
        child = parent.lastChild;
        parent.removeChild(child);
      } while (child != node)
    }
    function removeUnopened() {
      var unopened;
      if (previousNode) {
        unopened = previousNode.nextSibling
        if (unopened) {
          removeNodesFrom(unopened);
        }
      }
    }
    function buildPatch(parent, newNode) {
      if (patchRoot) {
        insertNode(currentNode, newNode);
      } else {
        patchParent = parent;
        patchRoot = newNode;
        currentNode = newNode;
      }
      return newNode;
    }
    function applyPatch() {
      if (currentNode === patchRoot) {
        if (patchParent.nodeType !== patchRoot.nodeType) {
          patchParent.replaceWith(patchRoot);
        } else {
          patchParent.appendChild(patchRoot);
        }
        patchParent = null;
        patchRoot = null;
      }
    }
    //Move to parent element and try to apply patch.
    function exitNode() {
      defaultPatcherNamespace();
      applyPatch();
      previousNode = currentNode;
      currentNode = currentNode.parentNode;
    }
    function updateNode(tagName, nodeType, nodeData) {
      if (currentNode.nodeType === nodeType) {
        switch (currentNode.nodeType) {
          case Node.ELEMENT_NODE:
            if (!isSameTag(currentNode.tagName, tagName)) {
              currentNode = replaceNode(currentNode, createElementNode(tagName));
            }
            assignElementAttributes(currentNode, nodeData)
            return
          case Node.TEXT_NODE:
          case Node.COMMENT_NODE:
            currentNode.textContent = nodeData;
            return
        }
      } else {
        switch (nodeType) {
          case Node.ELEMENT_NODE:
            currentNode = replaceNode(currentNode, createElementNode(tagName));
            assignElementAttributes(currentNode, nodeData)
            return
          case Node.TEXT_NODE:
            currentNode = replaceNode(currentNode, document.createTextNode(nodeData));
            return
          case Node.COMMENT_NODE:
            currentNode = replaceNode(currentNode, document.createComment(nodeData));
            return
        }
      }
    }
    /**
     * Enter current node
     */
    function enterNode(node, tagName, nodeType, nodeData, namespaceURI) {
      setPatcherNamespace(namespaceURI);
      /**
       * Begin new patch if node does not exist.
       * New element is completed when command is CLOSE
       * and current element is patch root.
      */
      if (!node) {
        switch (nodeType) {
          case Node.ELEMENT_NODE:
            currentNode = buildPatch(currentNode, createElementNode(tagName));
            assignElementAttributes(currentNode, nodeData);
            return
          case Node.TEXT_NODE:
            currentNode = insertNode(currentNode, document.createTextNode(nodeData));
            return
          case Node.COMMENT_NODE:
            currentNode = insertNode(currentNode, document.createComment(nodeData));
            return
        }
      } else {
        currentNode = node
        updateNode(tagName, nodeType, nodeData)
      }
    }
    /**
     * Main patcher navigation method.
     */
    function moveToNextNode(tagName, nodeType, nodeData, namespaceURI) {
      /**
       * Enter node when current command is OPEN.
       * Manipulate the node.
       */
      if (previousCommand == OPEN_NODE && currentCommand == OPEN_NODE) {
        enterNode(currentNode.firstChild, tagName, nodeType, nodeData, namespaceURI)
        return
      }
      if (previousCommand == CLOSE_NODE && currentCommand == OPEN_NODE) {
        enterNode(previousNode.nextSibling, tagName, nodeType, nodeData, namespaceURI)
        return
      }
      /**
       * Exit node when current command is CLOSE.
       * Remove the unvisited nodes.
       */
      if (
        previousCommand == OPEN_NODE &&
        currentCommand == CLOSE_NODE
      ) {
        removeChildNodes(currentNode);
        exitNode();
        return
      }
      if (previousCommand == CLOSE_NODE &&
        currentCommand == CLOSE_NODE) {
        removeUnopened();
        exitNode();
        return
      }
    }
    //Push new command and navigate patcher.
    function pushCommand(command, tagName, nodeType, nodeData, namespaceURI) {
      previousCommand = currentCommand;
      currentCommand = command;
      moveToNextNode(tagName, nodeType, nodeData, namespaceURI)
    }
    
    openNode = function (tagName, nodeType, nodeData, namespaceURI) {
      pushCommand(OPEN_NODE, tagName, nodeType, nodeData, namespaceURI);
      modules.openNode.forEach(hook => hook(tagName, nodeType, nodeData, namespaceURI));
      return currentNode;
    }

    closeNode = function () {
      var node = currentNode;
      pushCommand(CLOSE_NODE);
      modules.closeNode.forEach(hook => hook());
      return node;
    }
    /* Creates an effect for text binding. */
    function textContentBinding(binding) {
      setCurrentNodeBinding(function () {
        this.textContent = binding.$;
      });
    }
    /**
     * Creates a new text node or updates existing.
     */
    function textNode(value) {
      return TEXT_NODE_HANLDER(value);
    }
    /**
     * Creates a new comment node or updates existing.
     * @example 
     * t.comment('foo');
     * @example
     */
    commentNode = function (value) {
      return COMMENT_NODE_HANLDER(value);
    }
    /**
     * Removes child nodes.
     * @example 
     * t.clear();
     * @example
     */
    clearNode = function () {
      var node = currentNode.firstChild;
      if (node) {
        removeNodesFrom(node);
      }
    }
    /**
     * Retruns or sets current node.
     * To set node - just pass new node value as parameter.
     * @example 
     * t.node(node);
     * @example
     * To get node - just call it without parameter.
     * @example 
     * t.node();
     * @example
     * @param {Node} node    - New current node.
     * @returns {Node}       - Current node.
     */
    useCurrentNode = function (node) {
      if (node) return currentNode = node;
      return currentNode;
    }
    /* Get current DOM index. */
    getPreviousNode = function () {
      return previousNode;
    }
    /* Set current node attribute. */
    function setCurrentNodeAttributeNS(name, value) {
      if (namespace)
        currentNode.setAttributeNS(name, value);
      else
        currentNode.setAttribute(name, value);
      modules.setAttribute.forEach(hook => hook(name, value));
    }
    /* Sets attribute value or creates a binding. */
    function interpolateAttributeExpression(attribute, expression) {
      if (typeof expression === 'function') {
        setCurrentNodeBinding(function () {
          setCurrentNodeAttributeNS(attribute, expression());
        });
        return currentNode;
      }
      setCurrentNodeAttributeNS(attribute, expression);
      return currentNode;
    }
    /* Set current node attribute with interpolation. */
    setCurrentNodeAttribute = interpolateAttributeExpression;
    /* Set current node 'class' attribute with interpolation. */
    setCurrentNodeClassAttribute = function (value) {
      interpolateAttributeExpression('class', value);
    }
    /* Set current node event listener. */
    setCurrentNodeListener = function (name, fn, options) {
      let node = currentNode;
      node.addEventListener(name, fn, options);
      let context = getEffectContext();
      if (!context) return;
      cleanupImpl(function () {
        node.removeEventListener(name, fn, options);
      })
    }
    /* Resolves text content binding. */
    function createNodeTextContentHandler(nodeType) {
      return function (value) {
        let node;
        if (typeof value === 'function') {
          node = openNode(null, nodeType, value);
          setCurrentNodeBinding(function () {
            currentNode.textContent = value();
          });
          closeNode();
          return node;
        }
        if (!isSignal(value)) {
          node = openNode(null, nodeType, value);
          closeNode();
          return node;
        }
        node = openNode(null, nodeType, '');
        textContentBinding(value);
        closeNode();
        return node;
      }
    }
    /* Creates an effect for text binding. */
    function textContentBinding(binding) {
      setCurrentNodeBinding(function () {
        currentNode.textContent = binding.$;
      });
    }
    /* Reusable text content bindings. */
    const
      TEXT_NODE_HANLDER = createNodeTextContentHandler(Node.TEXT_NODE),
      COMMENT_NODE_HANLDER = createNodeTextContentHandler(Node.COMMENT_NODE);
    /* Set current node bindings. */
    setCurrentNodeBinding = function (fn) {
      let
        _currentNode = currentNode,
        _currentComponent = currentComponent;
      effectImpl(function () {
        let pCurrentNode = currentNode,
          pCurrentComponent = currentComponent;
        currentNode = _currentNode;
        currentComponent = _currentComponent;
        fn.call(_currentNode);
        currentNode = pCurrentNode;
        currentComponent = pCurrentComponent;
      });
    }
    /* 
     * Creates text node or transforms template 
     * literal into paragraph.
     */
    createTextNodes = function (elements, ...expressions) {
      if (expressions.length === 0) {
        textNode(elements);
        return currentNode;
      }
      for (let index = 0; index < elements.length; index++) {
        const element = elements[index];
        textNode(element);
        if (index < expressions.length) {
          textNode(expressions[index]);
        }
      }
      return currentNode;
    }
    function createRenderEffect(fn, component) {
      let 
        _effect = returnEffect(fn),
        node = getPreviousNode();
      _effect.fn = function () {
        modules.openComponent.forEach(hook => hook(component));
        patchOuter(node, fn);
        modules.closeComponent.forEach(hook => hook(component));
      }
      return node;
    }
    mountComponent = function (componentFunction, ...props) {
      modules.openComponent.forEach(hook => hook(componentFunction, ...props));
      let component;
      rootImpl(function () {
        component = componentFunction(...props);
        if (typeof component === 'function') {
          component = createRenderEffect(component, componentFunction);
        }
      });
      modules.closeComponent.forEach(hook => hook(componentFunction, ...props));
      return component;
    }
    /* Mount application root */
    mount = function (rootSelector, component, ...props) {
      ready(function () {
        patchInner(document.querySelector(rootSelector), function () {
          modules.openRoot.forEach(hook => hook(rootSelector, component, ...props));
          mountComponent(component, ...props);
        })
      })
    }
  })();

  /**
   * Manipulates patcher movement through DOM-tree nodes of an element.
   * Performs 'in-place' diffing of the node.
   * @example
   * //Simple div element
   * t('div', {}); t()
   * //In case of svg use it with namespace
   * t('svg', {},"http://www.w3.org/2000/svg");
   * @example
   * 
   * New element parameters 
   * @param {string} type          - New element tag type
   * @param {object} attributes    - Tag attributes
   * @param {string} namespaceURI  - New element namespace 
   * @returns {element}            - Result node
   * 
   * Components are mounted by passing its function and its properties.
   * @example
   * //Simple component example
   * t(AJAXTableComponent, '/data')
   * @example
   * 
   * Component parameters
   * @param {function} component   - Component function
   * @param {...any} properties    - Component properties
   * @returns {element}            - Result node
   */
  function t(type, ...args) {
    //Close current node
    if (type === undefined) {
      return closeNode();
    } else {
      //Open new DOM node
      if (typeof type === 'string')
        return openNode(type, Node.ELEMENT_NODE, ...args)
      //Mount component
      if (typeof type === 'function') {
        return mountComponent(type, ...args)
      }
    }
  }

  //Expose API
  t.ready = ready;
  t.patch = patchInner;
  t.outer = patchOuter;
  t.comment = commentNode;
  t.clear = clearNode;
  t.mount = mount;
  t.signal = signalImpl;
  t.effect = effectImpl;
  t.computed = computedImpl;
  t.root = rootImpl;
  t.cleanup = cleanupImpl;
  t.attr = setCurrentNodeAttribute;
  t.class = setCurrentNodeClassAttribute;
  t.on = setCurrentNodeListener;
  t.node = useCurrentNode;
  t.bind = setCurrentNodeBinding;
  t.text = createTextNodes;
  t.module = moduleImpl;
  window.t = t;
})();