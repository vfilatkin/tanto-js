# Style plugin
Style is a CSS-in-JS plugin uses component hooks to isolate component style. 
Allows to use identical selectors in different components.
- [style](#style)
- [rule](#rule)
### style(component)
Applies style to component. Isolated style will be applied to component instances 
and updated when component re-rendered or class attribute changes. Returns function
wich transforms rules and and renders style text.
### rule(selector)
Accepts selector and returns tagged template function.
```js
style(App)(
  rule('span')`font-family: 'Courier New', Courier, monospace;`,
  //...
  rule('.my-button:hover')`display: flex;`
);
// ...
// span.t-j8g7 {
//   font-family: 'Courier New', Courier, monospace;
// }
// .my-button:hover.t-j8g7 {
//   display: flex;
// }
```