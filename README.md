# Tanto.js
A small client-side library for building Single Page Applications combining concepts of signals and in-place DOM patching.
- [Features](#features)
- [Installation](#installation)
- [Modules](#modules)

## Features
- **Fine-grained reactivity** - Changing the state will not cause the entire component to re-render unless explicitly specified.
- **In-place DOM patching** - Instead of a virtual DOM, patching is used for rendering.
- **HyperScript-inspired syntax** - Rendering does not include the stage of parsing html templates. Function calls denote opening and closing tags. The patcher automatically detects changes by comparing data with the live DOM and changes it. Additionally this approach allows you to use tag function calls inside language constructs.
- **Functional components** - Components are declared using simple JavaScript functions.

## Installation
Just copy library file and add it as a script in header section.

## Modules 
The core library only includes the rendering engine and state management. Additional functionality can be connected separately. The repository includes several additional modules and components.

- **Router Component** - Easy to set up and use hash router.
- **Component Styling** - Component style isolation module. Using the CSS-in-JS approach, it allows you to isolate styles and classes from the rest of the components. Rules for elements and classes are applied automatically during rendering.
- **HTML Tagged Templates** - Allows you to use HTML code as tagged template literals with expression interpolation.
