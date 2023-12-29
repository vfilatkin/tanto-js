import t from '../src/tanto.js';
import {style, keyframes} from '../src/modules/style/style.js';

const Counter = initialCount => {
  let count = t.signal(initialCount);

  const handleClick = () => {
    count.$++;
  }

  return (
    t('div'),
      t.class('my-rule'),
      t('button'),
        t.on('click', handleClick),
        t('span'),
          t.text`Click ${count}`,
        t(),
      t(),
    t()
  );
}

style(
Counter,
`.my-rule {color: white;}`,
`span {font-weight: bold;}`,
`button {
  background-color: #7777DD;
  border: none;
  color: white;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  margin: 4px 2px;
  cursor: pointer;
  padding: 10px 24px;
  border-radius: 5px;
  font-size: 16px
}`,
`button:hover {background-color: #AAAAFF;}`
);

const AnimatedSquare = () => {
  return (
    t('div'),t()
  );
}

let rotate = keyframes`
0% {transform:rotate(0deg);}
100% {transform:rotate(360deg);}`;

style(
AnimatedSquare,
`div {
  position: absolute;
  width: 50px;
  height: 50px;
  background-color: #b94ccd;
  animation: ${rotate} 3s linear infinite;
}`);

const App = title => {
  return (
    t('div'),
      t('div'),
        t('span'),t.text(title),t(),
        t('br'),t(),
      t(),
      t(Counter, 1),
      t(Counter, 5),
      t(Counter, 7),
      t(AnimatedSquare),
    t()
  );
}

style(App,`span {font-family: 'Courier New', Courier, monospace;}`);

t.mount('#app', App, 'This is a style example');