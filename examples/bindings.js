const Counter = initialCount => {
  let count = t.signal(initialCount);
  let hitLimit = t.signal(false);

  const handleClick = () => {
    count.$++;
    if(count.$ === 10) hitLimit.$ = true;
  }

  function disableOnLimit() {
    if (hitLimit.$) this.setAttribute('disabled', '');
  }

  return (
    t('div'),
      t.comment(count),
      t('button'),
        t.on('click', handleClick),
        t.bind(disableOnLimit),
        t('span'),
          t.text(`Clicked `),
          t.text(count),
        t(),
      t(),
    t()
  );
}

const App = title => {
  let renderCount = t.signal(1);

  const handleClick = () => {
    renderCount.$++;
  }

  return () => (
    t('div'),
      t('div'),
        t.text(title),
        t.void('br'),
        t.text(`Rendered ${renderCount.$} times`),
      t(),
      t(Counter, 3),
      t(Counter, 5),
      t(Counter, 7),
      t('button', {'onclick': handleClick}),
        t.text('reload app'),
      t(),
    t()
  );
}

t.mount('#app', App, 'This is a counter example')
