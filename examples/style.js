import t from '../src/tanto.js';
import {style} from '../src/modules/style/style.js';

const Counter = initialCount => {
  let count = t.signal(initialCount);

  const handleClick = () => {
    count.$++;
  }

  return (
    t('div'),
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
  font-size: 16px;
}`,
`button:hover {background-color: #AAAAFF;}`
)


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
    t()
  );
}

style(App,
  `span {font-family: 'Courier New', Courier, monospace;}`
);

t.mount('#app', App, 'This is a style example');