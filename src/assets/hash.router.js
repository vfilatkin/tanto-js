let Route, Router;
(function () {
  if(!window.t)
    throw "Cannot initialize.";
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
  Route = function (template, action) {
    return {
      path: parseRouteTemplate(template),
      action: action
    }
  }
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
        console.warn("Router undefined or empty, defaults is used.");
        options.routes = [t.route("default", {
          view: noop
        })];
        options.default = "default";
      } else {
        //Define routing error handler if hendler is not defined
        if (!resolveRoute(options.error, options.routes)) {
          console.warn("Router has no '" + options.error + "' error handler, defaults is used.");
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
  function makeRouterOptions(defaultRoute, ...routes) {
    var options = {};
    options.default = defaultRoute;
    options.routes = routes;
    return options;
  }
  /**
   * Creates a new router and adds hash change listener.
   * @example
   * t(Router,
   *   "main",
   *   [
   *      Route("main", main),
   *      Route("search/{foo}/{bar}/view", search)
   *      //...
   *   ]
   * );
   * @example
   * @param {string} default 
   * @param {array} routes 
   */
  Router = function (options) {
    options = arguments.length > 1 ?
      makeRouterOptions(arguments) :
      options;
    if (!validateRouterOptions(options))
      throw "Router options must be an object.";
    handleHashChange(options.routes, options.default);
    window.onhashchange = function () {
      handleHashChange(options.routes, options.default);
    }
  }
})();