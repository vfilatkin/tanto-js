# Router component.
The repository includes very basic hash router component.
- [Router](#router)
- [Route](#route)
### Router(default, routes)
Router must be mounted as a component.
* ***default*** - Default route name.
* ***routes*** - Array of routes.

### Route(template, action)
Route uses path template and action.
* ***template*** - Path template. Path template is a string represents static and dynamic segments of the route. Dynamic segments will be passed to action as pathData object and can be absolutely random. To make a dynamic route segment set it's name in curly braces.
* ***action*** - Route action. Action is a function that handles hash change and gets *pathData* and *pathParams* objects. *pathData* contatins only dynamic segments while *pathParams* contains URI parameters. It can use rendering to visualise new page or do any other job.
```js
  ...
  t(Router,
    'main',
    [
      Route('main', MainView),
      Route('search/{foo}/{bar}/view', SearchView),
    ]
  ),
  ...
```
