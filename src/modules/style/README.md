# Style plugin
Style is a tanto-js CSS-in-JS plugin. 
Allows to use identical selectors in different components.
### style(component, ...rules)
Applies style to component. Isolated style will be applied to component instances 
and updated when component re-rendered or class attribute changes. Returns style UID.
* ***component*** - Existing tanto-js component.
* ***...rules*** - CSS rules.

## Quick example
In example below CSS rules in form of raw text passed with component's
function to ***style()*** method.
```js
style(App,
  `span{font-family: 'Courier New', Courier, monospace;}`,
  `.my-button:hover{display: flex;}`
);
```

```css
span.t-j8g7 {
  font-family: 'Courier New', Courier, monospace;
}
.my-button:hover.t-j8g7 {
  display: flex;
}
```