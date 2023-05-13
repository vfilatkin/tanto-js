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
        t.class('f1'),
        t.on('click', handleClick),
        t.bind(disableOnLimit),
        t('span'),
          t.text`Clicked ${count} ${()=> count.$ === 1? 'time': 'times' }`,
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
        t('br'),t(),
        t.text`Rendered ${renderCount.$} ${() => renderCount.$ === 1? 'time' : 'times'}. \n`,
      t(),
      t(Counter, 1),
      t(Counter, 5),
      t(Counter, 7),
      t('button', {'onclick': handleClick}),
        t.text`reload app`,
      t(),
    t()
  );
}

t.mount('#app', App, 'This is a counter example')