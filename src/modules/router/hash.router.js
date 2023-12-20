import t from '../../tanto.js';

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
 * Route('main/{foo}/{bar}/view', view)
 * @example
 * @param {string} template 
 * @param {function} action 
 * @returns {object} 
 */

const Route = function (template, action) {
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

//Find route and redirect
function handleHashChange(routes, defaultRoute) {
  var validRoute = resolveRoute(window.location.hash, routes),
    defaultRoute = validRoute || resolveRoute(defaultRoute, routes);
  if (validRoute) {
    return validRoute;
  } else {
    return defaultRoute;
  }
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

const Router = function (defaultView, routes) {
  const currentRoute = t.signal(handleHashChange(routes, defaultView));
  window.onhashchange = function () {
    currentRoute.$ = handleHashChange(routes, defaultView);
  }
  return () => {
    currentRoute.$.action(currentRoute.value.pathData, currentRoute.value.pathParams);
  }
}

export {Router, Route}