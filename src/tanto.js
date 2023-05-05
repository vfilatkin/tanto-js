//Core library
(function () {
  'use strict'
  /**
   * Perform callback when document is ready.
   * @param {Function} f 
   */
  function ready(f) {
    if (document.readyState != 'loading') {
      f();
    } else {
      document.addEventListener('DOMContentLoaded', f);
    }
  }
  /* Show warning message. */
  function warn(message) {
    console.error("[Warning]: " + message);
  }

  /* Generate random id */
  function generateRandomId(length) {
    let id = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUWXYZabcdefghijklmnopqrstuwxyz0123456789';
    for (let index = 0; index < length; index++) {
      id += characters.charAt(Math.floor(Math.random() * 60));
    }
    return id;
  }
  /**
   * Router module section
   */
  var route, router;
  (function () {
    //Get URL parameters
    function getHashParameters(parameters) {
      var array = parameters.split(/\&/),
        params = {};
      array.forEach(function (parameter) {
        parameter = parameter.split(/\=/);
        params[parameter[0]] = parameter[1];
      });
      return params;
    }
    //Get path object from URL
    function parseHash(url) {
      var path = url.replace(/^\#\//, "").split(/\?/);
      return {
        path: path[0].split(/\//),
        params: path[1] ? getHashParameters(path[1]) : ""
      };
    }
    //Get path object from route template 
    function parseRouteTemplate(template) {
      var i = 0,
        segment = "",
        expression = "",
        path = template.split(/\//),
        length = path.length;
      for (; i < length; i++) {
        segment = path[i];
        expression = /\{(.*)\}/.exec(segment);
        if (expression) {
          path[i] = {
            id: expression[1]
          };
        }
      }
      return path;
    }
    //Returns object if url.path matches route.path
    function tryRoute(hashPath, routePath) {
      var i = 0,
        hashData = {},
        hashPathSegment = null,
        routePathSegment = null,
        length = hashPath.length;
      if (length == routePath.length) {
        for (; i < length; i++) {
          hashPathSegment = hashPath[i];
          routePathSegment = routePath[i];
          if (typeof routePathSegment == "string") {
            if (hashPathSegment != routePathSegment) {
              return false;
            }
          } else {
            hashData[routePath[i].id] = hashPath[i];
          }
        }
        return hashData;
      } else {
        return false;
      }
    }
    //Find route and get hash data
    function resolveRoute(hash, routes) {
      let i = 0,
        route = null,
        resolvedHashData = false,
        parsedHash = parseHash(hash),
        length = routes.length;
      for (; i < length; i++) {
        route = routes[i];
        //Get route data if match
        resolvedHashData = tryRoute(parsedHash.path, route.path);
        //Route found
        if (resolvedHashData) {
          return {
            path: route.path,
            action: route.action,
            pathData: resolvedHashData,
            pathParams: parsedHash.params
          };
        }
      }
      //Route not found
      return false;
    }
    //Apply route component
    function applyRoute(route) {
      if (typeof route.action !== "function") {
        route.action.view(
          route.action.data ? route.action.data() : {}, {
          pathData: route.pathData || {},
          pathParams: route.pathParams || {}
        }
        );
      } else {
        route.action({}, {
          pathData: route.pathData || {},
          pathParams: route.pathParams || {}
        });
      }
    }
    //Check router parameters before mount
    function validateRouterOptions(options) {
      if (options || typeof options == "object") {
        //Set routing error handler
        options.error = options.default || "default";
        if (!options.routes || options.routes.length == 0) {
          //Define routing error handler if router undefined or empty
          warn("Router undefined or empty, defaults is used.");
          options.routes = [t.route("default", {
            view: noop
          })];
          options.default = "default";
        } else {
          //Define routing error handler if hendler is not defined
          if (!resolveRoute(options.error, options.routes)) {
            warn("Router has no '" + options.error + "' error handler, defaults is used.");
            options.router.push(t.route(options.error, {
              view: noop
            }));
          }
        }
        //Application is valid
        return true;
      } else {
        //Application is NOT valid
        return false;
      }
    }
    /**
     * Parses route template string and returns route.
     * Route can have static and dynamic segments. 
     * Static segments separated by slashes.
     * Dynamic segments are enclosed in curly braces 
     * and will be passed as pathData after resolve.
     * @example
     * t.route("main/{foo}/{bar}/view", view)
     * @example
     * @param {string} template 
     * @param {function} action 
     * @returns {object} 
     */
    route = function (template, action) {
      return {
        path: parseRouteTemplate(template),
        action: action
      }
    }
    //Find route and redirect
    function handleHashChange(routes, defaultRoute) {
      var validRoute = resolveRoute(window.location.hash, routes),
        defaultRoute = resolveRoute(defaultRoute, routes);
      if (validRoute) {
        applyRoute(validRoute);
      } else {
        applyRoute(defaultRoute);
      }
    }
    //Make router options from args
    function makeRouterOptions(args) {
      var options = {};
      options.default = args[0];
      options.routes = args[1];
      return options;
    }
    /**
     * Creates a new router and adds hash change listener.
     * @example
     * t.router(
     *   "main",
     *   [
     *      t.route("main", main),
     *      t.route("search/{foo}/{bar}/view", search)
     *      //...
     *   ]
     * );
     * @example
     * @param {string} default 
     * @param {array} routes 
     */
    router = function (options) {
      options = arguments.length > 1 ?
        makeRouterOptions(arguments) :
        options;
      if (!validateRouterOptions(options))
        throw "[Error]: Application must be object";
      ready(function () {
        handleHashChange(options.routes, options.default);
        window.onhashchange = function () {
          handleHashChange(options.routes, options.default);
        }
      });
    }
  })();



  /**
   * The DOM Patcher.
   * 
   * Commands to track patcher movement. 
   * Represents opening or closing tags.
   */
  let
    patch,
    patchOuter,
    openNode,
    closeNode,
    voidElement,
    textNode,
    commentNode,
    clearNode,
    getDOMIndex,
    getPreviousNode,
    getCurrentNode,
    setCurrentNodeAttribute,
    setCurrentNodeListener,
    setCurrentNodeBinding,
    paragraphHelper,
    rawStringImpl,
    htmlTemplateImpl;

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
      //DOM index of element
      DOMIndex = 0,
      //Current patch entry point
      currentRootNode = null,
      //Current patcher namespace
      namespace = null,
      //Previous tracked command.
      previousCommand = null,
      //Current tracked command.
      currentCommand = null,
      //Current node type (equal to Node.nodeType)
      currentNodeType = null,
      //Current node in DOM-tree.
      currentNode = null,
      //Previous node in DOM-tree.
      previousNode = null,
      //Created patch. Will be attached after it is comleted.
      patchRoot = null,
      //Parent for created patch.
      patchParent = null;
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
          pPatchParent = patchParent;
        //Setup new patch context copy
        currentRootNode = element,
          namespace = namespaceURI ? { node: element, URI: namespaceURI } : null,
          previousCommand = null,
          currentCommand = OPEN_NODE,
          currentNode = element,
          currentNodeType = element.nodeType,
          previousNode = null,
          patchRoot = null,
          patchParent = null;
        try {
          patcherFn(patchFn)
        } finally {
          DOMIndex = 0,
            currentRootNode = pCurrentRootNode,
            namespace = pNamespace,
            previousCommand = pPreviousCommand,
            currentCommand = pCurrentCommand,
            currentNodeType = pCurrentNodeType,
            currentNode = pCurrentNode,
            previousNode = pPreviousNode,
            patchRoot = pPatchRoot,
            patchParent = pPatchParent;
        }
        return element;
      }
    }
    //Inner patcher
    patch = Patcher(function (patchFn) {
      currentNode = currentRootNode;
      let element = patchFn();
      removeUnopened();
      return element;
    })
    //Patch element outerHTML
    patchOuter = Patcher(function (patchFn) {
      currentNode = { firstChild: currentNode };
      return patchFn();
    })
    //True if same tag
    function isSameTag(tag1, tag2) {
      return tag1.toLowerCase() === tag2.toLowerCase();
    }
    //Patch node style
    function updateStyle(node, style) {
      if (typeof style === 'function')
        style = style()
      switch (typeof style) {
        case 'string':
          node.style = style
          break;
        case 'object':
          node.style = ''
          for (let key in style) {
            node.style.setProperty(key, style[key])
          }
          break;
      }
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
      if (name === 'style') {
        updateStyle(node, value);
        return;
      }
      if (typeof value === 'function') {
        node[name] = value
        return
      }
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
    //Set patcher namespace data
    function setPatcherNamespace(namespaceURI) {
      if (namespaceURI) {
        namespace = {};
        namespace.node = currentNode;
        namespace.URI = namespaceURI;
      }
    }
    //Set patcher namespace data
    function defaultPatcherNamespace() {
      if (namespace && namespace.node === currentNode) {
        namespace = null;
      }
    }
    //Create new element
    function createElementNode(tag) {
      var newNode;
      if (namespace) {
        newNode = document.createElementNS(namespace.URI, tag);
      } else {
        newNode = document.createElement(tag);
      }
      return newNode;
    }
    //Add new element to parent
    function insertNode(parent, newNode) {
      parent.appendChild(newNode);
      return newNode;
    }
    //Replace with new element
    function replaceNode(node, newNode) {
      node.parentNode.replaceChild(newNode, node);
      return newNode;
    }
    //Remove child nodes
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
    //Remove unopened elements
    function removeUnopened() {
      var unopened;
      if (previousNode) {
        unopened = previousNode.nextSibling
        if (unopened) {
          removeNodesFrom(unopened);
        }
      }
    }
    //Start or proceed element building
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
    //Append patch result
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
    //Move to parent element and try to apply patch
    function exitNode() {
      defaultPatcherNamespace();
      applyPatch();
      previousNode = currentNode;
      currentNode = currentNode.parentNode;
    }
    /**
     * Update current node data.
     * Patcher handles nodes of different types.
     * It can be an issue when hydrating SSR markup
     * with human readable formatting because of CR or LF.
     */
    function updateNode(tagName, nodeType, nodeData) {
      if (currentNode.nodeType === nodeType) {
        /**
        * Update nodes of the same nodeType.
        * Element node can be replaced if new tagName 
        * different. For non-element nodes only
        * text content will be changed.
        */
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
            assignElementAttributes(currentNode, nodeData)
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
    //Open node command
    openNode = function (tagName, nodeType, nodeData, namespaceURI) {
      ++DOMIndex;
      pushCommand(OPEN_NODE, tagName, nodeType, nodeData, namespaceURI);
      return currentNode;
    }
    //Close node command.
    closeNode = function () {
      var node = currentNode;
      pushCommand(CLOSE_NODE);
      return node;
    }
    /**
     * Self-closing element.
     * @param {string} text
     * @example 
     * t.void('input');
     * @example
     */
    voidElement = function (tagName, nodeData, namespaceURI) {
      var node = openNode(tagName, Node.ELEMENT_NODE, nodeData, namespaceURI);
      closeNode();
      return node;
    }
    /**
     * Creates a new text node or updates existing.
     * @example 
     * t.text('foo');
     * @example
     */

    textNode = function (value) {
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
    /* Get current DOM index. */
    getDOMIndex = function () {
      return DOMIndex;
    }
    /* Get current DOM index. */
    getPreviousNode = function () {
      return previousNode;
    }
    /* Set current node attribute. */
    setCurrentNodeAttribute = function (name, value) {
      if(namespace)
        currentNode.setAttributeNS(name, value);
      else
        currentNode.setAttribute(name, value);
    }
    /* Set current node event listener. */
    setCurrentNodeListener = function (name, callback, options) {
      currentNode.addEventListener(name, callback, options);
    }
    /* Returns true if object is instance of signal. */
    function isBinding(data) {
      return data instanceof signalInstance;
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
        if (!isBinding(value)) {
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
    /* Primitive text content bindings. */
    const
      TEXT_NODE_HANLDER = createNodeTextContentHandler(Node.TEXT_NODE),
      COMMENT_NODE_HANLDER = createNodeTextContentHandler(Node.COMMENT_NODE);
    /* Set current node bindings. */
    setCurrentNodeBinding = function (callback) {
      let _currentNode = currentNode;
      effect(function () {
        let pCurrentNode = currentNode;
        currentNode = _currentNode;
        callback.call(_currentNode);
        currentNode = pCurrentNode;
      });
    }
    /* Paragraph helper for nested strings. */
    paragraphHelper = function(...strings) {
      for (let stringIndex = 0; stringIndex < strings.length; stringIndex++) {
        textNode(strings[stringIndex]);
      }
    }
    /* 
     * Raw string implementation. 
     * Transforms template literal into paragraph.
     */
    rawStringImpl = function (elements, ...expressions) {
      for (let index = 0; index < elements.length; index++) {
        const element = elements[index];
        textNode(element);
        if (index < expressions.length) {
          textNode(expressions[index]);
        }
      }
    }
    /*
     * HTML template implementation.
     * Transforms template literal into HTML template.
     */
    htmlTemplateImpl = function (elements, ...expressions) {
      let
        templateText = elements.join('<!>'),
        templateElement = document.createElement('template');
      templateElement.innerHTML = templateText;
      return {
        clone() {
          let 
            instance = templateElement.content.firstChild.cloneNode(true),
            slots = getTemplateSlots(instance);
          applyTemplateExpressions(slots, expressions);
          currentNode.appendChild(instance);
          return instance;
        }
      }
    }
    /* Find all slots (empty comment nodes) recursively. */
    function getTemplateSlots(template) {
      let slots = [];
      function scan(node) {
        if (node.nodeType === Node.COMMENT_NODE && node.textContent.length === 0) {
          slots.push(node);
        }
        if (node.childNodes && node.childNodes.length) {
          for (let childIndex = 0; childIndex < node.childNodes.length; childIndex++) {
            scan(node.childNodes[childIndex]);
          }
        }
      }
      scan(template);
      return slots;
    }
    /* Applies template expressions. */
    function applyTemplateExpressions(slots, expressions) {
      const pCurrentNode = currentNode;
      for (let index = 0; index < slots.length; index++) {
        const slot = slots[index];
        const expression = expressions[index];
        currentNode = slot;
        if (typeof expression !== 'function') {
          let newTextNode = document.createTextNode(expression.value)
          currentNode.replaceWith(newTextNode);
          currentNode = newTextNode;
          textContentBinding(expression);
        } else {
          setCurrentNodeBinding(expression);
        }
      }
      currentNode = pCurrentNode;
    }
    /* 
     * Retruns current node context. 
     * Used in arrow functions instead of 'this'.
     */
    getCurrentNode = function () {
      return currentNode;
    }
  })();



  /**
   * Component state module.
   */
  var signal, computed, effect, signalInstance;
  (function () {
    /* Effect & computed state flags */
    const
      STALE = 1 << 0,
      RUNNING = 1 << 1;
    /* Globlas */
    let
      currentContext = null,
      effectQueue = [];

    /* Signal */
    const SIGNAL_OPTIONS = { equal: true };
    function Signal(value, options) {
      this._value = value;
      this.observers = [];
      this.options = options || SIGNAL_OPTIONS;
    }
    signalInstance = Signal;
    Object.defineProperty(Signal.prototype, "$", {
      get() {
        if (currentContext)
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
    Signal.prototype.subscribe = function (observer) {
      if (!this.observers.includes(observer))
        this.observers.push(observer);
    }
    Signal.prototype.notify = function () {
      for (let observerIndex = 0; observerIndex < this.observers.length; observerIndex++) {
        this.observers[observerIndex].notify();
      }
    }

    /* Effect */
    const EFFECT_OPTIONS = { defer: false };
    function Effect(callback, options) {
      this.callback = callback;
      this.flags = STALE;
      this.options = options || EFFECT_OPTIONS;
      this.run();
    }
    Effect.prototype.run = function () {
      if (this.flags & RUNNING)
        throw new Error("Loop detected");
      if (this.flags & STALE) {
        this.flags |= RUNNING;
        let pContext = currentContext;
        currentContext = this;
        this.callback();
        this.flags &= ~RUNNING;
        currentContext = pContext;
      }
      this.flags &= ~STALE;
    }
    Effect.prototype.notify = function () {
      if (!this.flags & STALE) {
        this.flags |= STALE;
        effectQueue.push(this);
      }
    }
    function runEffects() {
      for (let effectIndex = 0; effectIndex < effectQueue.length; effectIndex++) {
        effectQueue[effectIndex].run();
      }
      effectQueue.length = 0;
    }

    /* Computed */
    function Computed(callback) {
      this.callback = callback;
      this._value = undefined;
      this.flags = STALE;
      this.observers = [];
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
    Computed.prototype.refresh = function () {
      this._value = this.callback();
      this.flags &= ~STALE;
    }
    Computed.prototype.subscribe = function (observer) {
      if (!this.observers.includes(observer))
        this.observers.push(observer);
    }
    Computed.prototype.notify = function () {
      if (!this.flags & STALE) {
        this.flags |= STALE;
        for (let observerIndex = 0; observerIndex < this.observers.length; observerIndex++) {
          this.observers[observerIndex].notify();
        }
      }
    }
    /* Create new state */
    signal = function (value, options) {
      return new Signal(value, options);
    }
    /* Create new effect */
    effect = function (callback, options) {
      return new Effect(callback, options);
    }
    /* Create new computed */
    computed = function (callback) {
      return new Computed(callback);
    }
  })();



  /**
   * Component API module
   */
  var mount, mountComponent;
  (function () {
    /* Create new render effect */
    function createRenderEffect(callback) {
      /* 
       * Chache new effect. 
       * Component root node will be rendered 
       * with common effect call.
       */
      let _effect = effect(callback);
      /* 
       * Save rendered node.
       */
      let node = getPreviousNode();
      /* 
       * Replace callback.
       * Effect's initial callback to be replaced
       * with wrapped patcher function.
       */
      _effect.callback = function () {
        patchOuter(node, callback);
      }
      return node;
    }
    /* Mount component */
    mountComponent = function (componentFunction, ...props) {
      let component = componentFunction(...props);
      if (typeof component === 'function') {
        component = createRenderEffect(component);
      }
      return component;
    }
    /* Mount application root */
    mount = function (rootSelector, component, ...props) {
      ready(function () {
        patch(document.querySelector(rootSelector), function () {
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
   * t('div', {'style':{'display':'block'}}); t()
   * //In case of svg use it with namespace
   * t('svg',{height:"100",width:"100"},"http://www.w3.org/2000/svg");
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
  t.patch = patch;
  t.outer = patchOuter;
  t.void = voidElement;
  t.text = textNode;
  t.comment = commentNode;
  t.clear = clearNode;
  t.route = route;
  t.router = router;
  t.mount = mount;
  t.signal = signal;
  t.effect = effect;
  t.computed = computed;
  t.attr = setCurrentNodeAttribute;
  t.on = setCurrentNodeListener;
  t.node = getCurrentNode;
  t.bind = setCurrentNodeBinding;
  t.par = paragraphHelper;
  t.raw = rawStringImpl;
  t.html = htmlTemplateImpl;
  t.id = generateRandomId;
  window.t = t;
})();