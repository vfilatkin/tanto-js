
# API
Library includes rendering and state management mechanisms.
- [Rendering](#rendering)
- [State management](#state-management)
- [Components](#components)
## Rendering
### t()
Depending on the arguments it's used for markup or component mounting.
Pass valid tag name as first argument to initiate element patching or open next node. 
To close tag pass no arguments.
Despite its similarities with HyperScript, tag functions will not always create a new node. Patcher uses calls to navigate within DOM tree and reconcile changes. I.e. creates, replaces and updates nodes.
```js
t('div'),t()
```
Example above demonstrates simple patch for div element. If patcher target is already div, node will not be replaced.

To mount existing component it's function must be used as first argument.
```js
t(MyComponent, …props)
```
### t.patch(element, patchFn, namespaceURI)
Main patcher function. Reconciles target node inner DOM structure.
* ***element*** - Patcher target element. Node of any type.
* ***patchFn*** - Patch callback, containing calls of t-function.
* ***namespaceURI*** - namespace of the patch.
```js
t.patch(element,()=>{
  t('div'),t()
});
```
### t.outer(element, patchFn, namespaceURI)
Same as **t.patch()** but updates target node as well as it's inner DOM structure.
Technically every component render function or binding is wrapped with outer patcher.
* ***element*** - Patcher target element. Node of any type.
* ***patchFn*** - Patch callback, containing calls of t-function.
* ***namespaceURI*** - namespace of the patch.
```js
t.outer(element,()=>{
  t('div'),t()
});
```
### t.comment(text)
Creates a new comment node or modifying content of existing comment node.
```js
t.comment('foo');
```
### t.clear()
Removes every child node.
```js
t.clear();
```
### t.mount(rootSelector, component, ...props)
Sets application and patcher entry point.
* ***rootSelector*** - Selector for an root element.
* ***component*** - Root component.
* ***props*** - Root component properties.
```js
t.mount('#app', App, …props);
```
### t.attr(name, value)
Sets current node attribute. If function or signal used as value binding will be created.
* ***name*** - Attribute name.
* ***value*** - Value or binding.
```js
let fooSignal = t.signal(true)
t('div'),
  t.attr('id','foo')
  t.attr('foo', ()=> fooSignal.$? 'yes': 'no')
t()
```
### t.class(value)
Sets 'class' attribute. Shorthand for **t.attr('class', value)**.
* ***value*** - Value or binding.
```js
t('div'),
  t.class('foo')
t()
```
### t.on(name, handler)
Adds event listener to current element. Unobtrusively connected with library's component logic. When component re-rendered, listeners created by this method will be removed.
* ***name*** - Event name.
* ***handler*** - Event handler.
```js
t('div'),
  t.on('click', ()=>{})
t()
```
### t.node(node)
Returns current node or sets patcher context. Can be useful within bindings created by arrow functions or modules.
* ***node*** - Existing node.
```js
let currentNode = t.node();
t.node(currentNode);

```
### t.bind(fn)
Creates binding. Binding is an effect(see **state management** section) wich is rerun when state changes. Binding is wrapped with **t.patch()** so inner DOM structure can be changed.
* ***fn*** - Effects function.
```js
let isDiv = t.signal(true)
t('div'),
  t.bind(()=>{
    mySignal.$? (t('div'),t()): (t('span'),t())
  })
t()
```
### t.text(text)
Creates a text node. Can be used as tagged template literal. Every function or signal will be interpolated as binding.
* ***text*** - String, binding or signal.
```js
let count = t.signal(true)
//…
t.text('foo'),
t.text`Clicked ${count} ${()=> count.$ === 1? 'time': 'times' }`
//…
```
## State management.
### t.signal(data)
Returns a signal object. Signal is a reactive data container. Tracks the context of the calculations in which the it's data is used. Automatically creates dependencies that will be updated when the signal receives new data.
* ***data*** - Any data.
```js
let mySignal = t.signal(true);
//…
console.log(mySignal.$);
mySignal.$ = false;
//…
```
### t.effect(fn)
Creates a side effect for changing the data of the input signals. Executed upon creation and called whenever the data of the signals used in the calculations is changed.
* ***fn*** - An effect's function.
```js
let foo = t.signal('foo');
t.effect(()=>{
  console.log(foo.$);
});
//output: foo
foo.$ = 'bar';
//output: bar
```
Effects can be nested. Each time parent effect called it's child effects will be wiped out and created anew. This approach avoids memory leaks.
### t.computed(fn)
Returns computed signal. Combines the behavior of a signal and an effect. Receives new data when the used signals change and notifies dependent effects.
changed.
* ***fn*** - A function wich uses data signals. And returning new signal value.
```js
let firstName = t.signal('John')
let lastName = t.signal('Doe')
let fullName = t.computed(()=> firstName.$ + ' ' + lastName.$)
t.effect(()=>{
  console.log(fullName.$);
});
//output: John Doe
firstName.$ = 'Jane';
//output: Jane Doe
```
Computed signals cannot have nested effects.
### t.root(fn)
Creates a computation root, a context similar to an effect but without an executable function. It can have child effects and cleanups but not executed.
* ***fn*** - A function containing data signals, effects and cleanups.
```js
t.root(()=>{
  t.effect(() => {
    //…
  });
});
```
Every component have a computation root.
### t.cleanup(fn)
Executed when effect or root about to be wiped out.
* ***fn*** - A function containing cleanup logic.
```js
t.effect(()=>{
  t.cleanup(()=>{/* Cancel API request, etc… */});
});
```
### t.module(hooks)
Allows to perform functions within lifecycle.
```js
t.module({
  openRoot:()=>{},
  openComponent:()=>{},
  closeComponent:()=>{},
  openNode:()=>{},
  closeNode:()=>{},
  setAttribute:()=>{},  
});
```
## Components
Components are declared as functions.  The key difference is that component is not invoked on its own. It must be called with a HyperScript function or mounted as an application entry point.
Here is a simple counter example:
```js
const Counter = initialCount => {
  let count = t.signal(initialCount);
  let limit = t.signal(false);

  const handleClick = () => {
    count.$++;
    if(count.$ === 10) limit.$ = true;
  }

  function disableOnLimit() {
    if (limit.$) this.setAttribute('disabled', '');
  }

  return (
    t('div'), 
      t('button'),
        t.on('click', handleClick),
        t.bind(disableOnLimit),
        t('span'),
          t.text`Clicked ${count} ${()=> count.$ === 1? 'time': 'times' }`,
        t(),
      t(),
    t()
  );
}
```
In the example, the component returns a DOM node. This is good practice, although it is not required to do so. the component may not return anything since the markup functions are executed in the context of the patcher. The component is rendered once and only those nodes that have associated data assigned are updated.
```js
const App = () => {
  return (
    t('div'),
      t(Counter, 1),
      t(Counter, 5),
      t(Counter, 7),
    t()
  );
}

t.mount('#app', App, 'This is a counter example')
```
Components are passed to the markup function with parameters. In example the top level component App creates several instances of the Counter component with different parameters. 

The whole DOM tree of App component will not be re-rendered again because it's called only once. Changing data will cause only particular changes.

To make component re-render it's whole DOM structure component must return function.
```js
const Counter = initialCount => {
  //…
  return ()=>{
    t('div'), 
      t('button'),
        t.on('click', handleClick),
        //…
        t('span'),
          t.text`Clicked ${count.$}`,
        t(),
      t(),
    t()
  }
}
```

