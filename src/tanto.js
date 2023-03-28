//Core library
(function() {
  'use strict'
  /**
   * Perform callback when document is ready
   * @param {Function} f 
   */
  function ready(f) {
    if (document.readyState != 'loading') {
      f();
    } else {
      document.addEventListener('DOMContentLoaded', f);
    }
  }
  //Show warning message
  function warn(message) {
    console.error("[Warning]: " + message);
  }
  //Get URL parameters
  function getHashParameters(parameters) {
    var array = parameters.split(/\&/),
      params = {};
    array.forEach(function(parameter) {
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
  function route(template, action) {
    return {
      path: parseRouteTemplate(template),
      action: action
    }
  }
  //Find route and redirect
  function handleHashChange(routes, defaultRoute) {
    var validRoute = resolveRoute(window.location.hash, routes),
      defaultRoute = resolveRoute(defaultRoute, routes);
    console.log(window.location.hash);
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
  function router(options) {
    options = arguments.length > 1 ?
      makeRouterOptions(arguments) :
      options;
    if (!validateRouterOptions(options))
      throw "[Error]: Application must be object";
    ready(function() {
      handleHashChange(options.routes, options.default);
      window.onhashchange = function() {
        handleHashChange(options.routes, options.default);
      }
    });
  }
  /**
   * Built-in AJAX method.
   * It is strongly recomended to use 
   * modern APIs such as fetch() instead.
   * @param {object} options                    - An object containing the fields below.
   * @param {string} options.url                - Request URL
   * @param {string} options.method             - Request method ('set' or 'get')
   * @param {boolean} options.async             - Request async ('set' or 'get')
   * @param {object} options.data               - Request body.
   * @param {string | function} options.convert - Callback function or 'json'.
   * @param {function} options.resolve          - Callback if request successful.
   * @param {function} options.reject           - Callback if request failed.
   * @param {function} options.pending          - Callback after request sended.
   */
  //Main ajax method
  function request(options) {
    //set options default values
    if (options.url !== undefined) {
      options.method = options.method || 'get';
      options.async = options.async || true;
      //XHR
      var xhr = new XMLHttpRequest();
      xhr.open(
        options.method,
        options.url,
        options.async
      );
      xhr.onload = function() {
        var response;
        if (this.status >= 200 && this.status < 300) {
          response = xhr.response;
          //handle raw data
          if (typeof options.convert !== undefined) {
            if (typeof options.convert === 'function') {
              //custom callback
              response = options.convert(response);
            } else {
              //convert to json
              if (typeof options.convert === 'string') {
                if (options.convert === 'json')
                  response = JSON.parse(response);
              }
            }
          }
          //callback on response
          if (typeof options.resolve === 'function')
            options.resolve(response);
        } else {
          //callback on reject
          if (typeof options.reject === 'function')
            options.reject(xhr);
        }
      }
      //callback on pending (safe call)
      //(i.e. separate function to draw loading screen etc.)
      if (typeof options.pending === 'function')
        options.pending();
      //callback to prepare data (if defined)
      if (typeof options.beforeSend === 'function')
        options.data = options.beforeSend(options.data);
      //send request
      if (options.method === 'post') {
        xhr.send(options.data);
      } else {
        xhr.send();
      }
    }
  }
  /**
   * Built-in additional group for JSON handling methods.
   */
  var json = {
   /**
    * Converts json to FormData.
    * @param {JSON} json - JSON object for conversion.
    * @returns {FormData} - AJAX-ready data.
    */
    form: function(json) {
      var data = new FormData();
      for (var key in json) {
        data.append(key, json[key]);
      }
      return data;
    },
    /**
    * Shorthand function. Fetch JSON from server [GET]
    * @param {string} url - Request URL
    * @param {function} resolve - Callback if request successful.
    * @param {function} reject  - Callback if request failed.
    * @param {function} pending - Callback after request sended.
    */
    get: function(url, resolve, reject, pending) {
      request({
        url: url,
        convert: "json",
        resolve: resolve || noop,
        reject: reject || noop,
        pending: pending || noop
      });
    },
    /**
    * Shorthand function. Fetch JSON from server [POST]
    * @param {string} url - Request URL
    * @param {object} data - Request body.
    * @param {function} resolve - Callback if request successful.
    * @param {function} reject  - Callback if request failed.
    * @param {function} pending - Callback after request sended.
    */
    post: function(url, data, resolve, reject, pending) {
      request({
        url: url,
        method: "post",
        data: data,
        convert: "json",
        resolve: resolve || noop,
        reject: reject || noop,
        pending: pending || noop
      });
    }
  };
  /**
   * The DOM Patcher.
   * 
   * Commands to track patcher movement. 
   * Represents opening or closing tags.
   */
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
      patchParent = null,
      //Added event listeners.
      eventListeners = null,
      //Current component
      currentComponent = null;
  /**
   * Patches elements of DOM-tree
   * @param {element} element - Entry element of patch.
   * @param {function} patchFn - Patch function. Contain patcher commands.
   * @param {string} namespaceURI - Patch initial namespace
   * @returns {element} - Returns patched element.
   */
  function Patcher(patcherFn){
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
        pEventListeners = eventListeners,
        pCurrentComponent = currentComponent;
      //Setup new patch context copy
      currentRootNode = element, 
      namespace = namespaceURI ? { node: element, URI: namespaceURI } : null, 
      previousCommand = null, 
      currentCommand = OPEN_NODE, 
      currentNode = element,
      currentNodeType = element.nodeType,
      previousNode = null, 
      patchRoot = null, 
      patchParent = null,
      eventListeners = [];
      try{
        patcherFn(patchFn)
      } finally {
        currentRootNode = pCurrentRootNode, 
        namespace = pNamespace, 
        previousCommand = pPreviousCommand, 
        currentCommand = pCurrentCommand, 
        currentNodeType = pCurrentNodeType,
        currentNode = pCurrentNode, 
        previousNode = pPreviousNode, 
        patchRoot = pPatchRoot, 
        patchParent = pPatchParent,
        eventListeners = pEventListeners,
        currentComponent = pCurrentComponent;
      }
      return element;
    }
  }
  //Inner patcher
  var patch = Patcher(function(patchFn){
    currentNode = currentRootNode;
    patchFn();
    removeUnopened();
  })
  //Patch element outerHTML
  var patchOuter = Patcher(function(patchFn){
    currentNode = {firstChild : currentNode}
    patchFn();
  })
  //True if same tag
  function isSameTag(tag1, tag2) {
    return tag1.toLowerCase() === tag2.toLowerCase();
  }
  //Patch node style
  function updateStyle(node, style){
    if(typeof style === 'function')
      style = style()
    switch(typeof style){
      case 'string':
        node.style = style
        break;
      case 'object':
        node.style = ''
        for(let key in style){
          node.style.setProperty(key, style[key]) 
        }
        break;
    } 
  }
  //Returns two arrays. First contains used keys, second contains unused.
  function diffKeys(aKeys, bKeys){
    var 
        used = [], 
        unused = [];
    aKeys.forEach(function(aKey){
      var index = bKeys.indexOf(aKey);
      if(index === -1){
        unused.push(aKey)
      } else {
        used.push(aKey)
      }
    })
    return [used, unused]
  }
  //Returns the keys and flag of the operation needed to resolve the differences.
  function diffObjectKeys(aObj, bObj){
    var 
      flag,
      used,
      unused,
      aKeys = Object.keys(aObj),
      bKeys = Object.keys(bObj);
    if(aKeys.length >= bKeys.length){
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
  function getNodeCurrentAttributes(node){
    var 
      currentAttributes = {},
      attributes = node.attributes;
    for (let attribute of attributes) {
      currentAttributes[attribute.name] = attribute.value
    }
    return currentAttributes;
  }
  function setNodeAttribute(node, name, value){
    if(name === 'style'){
      updateStyle(node, value);
      return;
    }
    if(typeof value === 'function'){
      node[name] = value
      return
    }
    node.setAttribute(name, value)
  }
  function removeNodeAttribute(node, name){
    node.removeAttribute(name)
  }
  //Update node attributes
  function updateNodeAttributes(node, keys, newAttributes, updateFn){
    keys.forEach(function(key) {
      updateFn(node, key, newAttributes[key])
    });
  }
  //Assign attributes and listeners
  function assignElementAttributes(node, newAttributes) {
    newAttributes = newAttributes || {}
    var oldAttributes = getNodeCurrentAttributes(node);
    var [flag, used, unused] = diffObjectKeys(oldAttributes, newAttributes)
    updateNodeAttributes(node, used, newAttributes, setNodeAttribute)
    if(flag){
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
  function removeChildNodes(node){
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
      patchParent.appendChild(patchRoot);
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
  function updateNode(tagName, nodeType, nodeData){
    if(currentNode.nodeType === nodeType){
      /**
      * Update nodes of the same nodeType.
      * Element node can be replaced if new tagName 
      * different. For non-element nodes only
      * text content will be changed.
      */
      switch(currentNode.nodeType){
        case Node.ELEMENT_NODE:
          if(!isSameTag(currentNode.tagName, tagName)){
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
      switch(nodeType){
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
    if(!node){
      switch(nodeType){
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
  //Push new command and navigate patcher
  function pushCommand(command, tagName, nodeType, nodeData, namespaceURI) {
    previousCommand = currentCommand;
    currentCommand = command;
    moveToNextNode(tagName, nodeType, nodeData, namespaceURI)
  }
  //Open node command
  function openNode(tagName, nodeType, nodeData, namespaceURI) {
    pushCommand(OPEN_NODE, tagName, nodeType, nodeData, namespaceURI);
    return currentNode;
  }
  //Close node command
  function closeNode() {
    var node = currentNode
    pushCommand(CLOSE_NODE);
    return node
  } 
  /**
   * Self-closing element.
   * @param {string} text
   * @example 
   * t.void('input');
   * @example
   */
  function voidElement(tagName, nodeData, namespaceURI) {
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
  function textNode(value) {
    var node = openNode(null, Node.TEXT_NODE, value);
    closeNode();
    return node;
  }
  /**
   * Creates a new text node or updates existing.
   * @example 
   * t.comment('foo');
   * @example
   */
  function commentNode(value) {
    var node = openNode(null,Node.COMMENT_NODE, value);
    closeNode();
    return node;
  }
  /**
   * Removes child nodes
   * @example 
   * t.clear();
   * @example
   */
  function clearNode() {
    var node = currentNode.firstChild;
    if (node) {
      removeNodesFrom(node);
    }
  }
  /**
   * Get current node in rendering
   */
  function self(){
    return currentNode;
  }
  /**
   * Component API.
   * Each component declared by factory function.
   * Resulted object represents component inner state.
   * Upon mounting data will be wrapped into component node.
   */
  function mount(componentFn, ...args){
    currentComponent = componentFn;
    const component = componentFn(...args);
    return component;
  }
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
        return mount(type, ...args)
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
  t.request = request;
  t.route = route;
  t.router = router;
  t.json = json;
  t.self = self;
  window.t = t;
})();