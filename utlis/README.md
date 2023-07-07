# Hyperscript Utility
Converts existing DOM or it's text to hyperscript function calls. 
Creates a IIF module with hyperscript fragments.
### renderElement(element, options)
Creates hyperscript from existing DOM element or text.
* ***element*** - Existing element.
* ***options*** - Conversion options.
```js
  let element = document.getElementById('my-element');
  const source = HyperScript.renderElement(element);
```

### renderBundle(bundle, options)
Creates hyperscript from bunlde object wich keys is fragments names and values is HTML text.
* ***element*** - Existing element.
* ***options*** - Conversion options.
```js
  const source = HyperScript.renderBundle({
    'myDiv': '<div></div>',
    'mySpan': '<span>...</span>',
  });
```

### Options
Options allows to configure output module text.
* ***keepFormatting*** - Keep human-readable text.
* ***useArrowFunctions*** - Use shorter function version.
* ***minifyRendererReferences*** - Minify library hyperscript functions.
* ***useRootNode*** - Export root node.

```js
  let element = document.getElementById('my-element');
  const source = HyperScript.renderElement(
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