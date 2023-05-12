const Counter = initialCount => {
  return (
    t('div'),
      t('button'), t.class('active'),
        t('span'), t.class('active'),
          t.raw`Click`,
        t(),
      t(),
    t()
  );
}

t.style(Counter)(
  t.rule('div')`background-color: lightblue;`
);

const App = title => {
  return (
    t('div'), t.class('active'),
      t('div'),
        t.text(title),
        t.void('br'),
      t(),
      t(Counter, 1),
      t(Counter, 5),
      t(Counter, 7),
    t()
  );
}

t.style(App)(
  t.rule('div')`border-radius: 5px;`
);

t.mount('#app', App, 'This is a style example');