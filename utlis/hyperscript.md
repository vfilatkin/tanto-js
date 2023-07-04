# Hyperscript Utility
Converts existing DOM or it's text to hyperscript function calls.
### HyperScript(element, options)
Creates a IIF module with hyperscript fragments.
* ***element*** - Existing element.
* ***options*** - Conversion options.

### Options
Options allows to configure output module text.
* ***keepFormatting*** - Keep human-readable text.
* ***useArrowFunctions*** - Use shorter function version.
* ***minifyRendererReferences*** - Minify library hyperscript functions.
* ***useRootNode*** - Export root node.

```js
  let element = document.getElementById('my-element');
  const source = HyperScript(
    element, 
    { 
      keepFormatting: true,
      useArrowFunctions: true,
      minifyRendererReferences: false,
      useRootNode: false
    }
  );
```

### Attributes
* ***fragment*** - Use DOM node to create named function.