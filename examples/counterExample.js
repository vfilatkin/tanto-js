const Counter = initialCount => {
  let [count, setCount] = t.state(initialCount);
  let [hitLimit, setHitLimit] = t.state(false);

  const handleClick = () => {
    setCount(++count);
    if(count === 10) setHitLimit(true);
  }

  return (
    t('div'),
      t.text('Click the button'),
      t('button', {'onclick': handleClick}),
        t.text(count),
      t(),
      (hitLimit? t.text('Limit reached!!!'): null),
    t()
  );
}

const App = title => {
  let [renderCount, setRenderCount] = t.state(1);

  const handleClick = () => {
    setRenderCount(++renderCount);
  }

  return (
    t('div'),
      t.text(title),
      t.text(`Rendered ${renderCount} times`),
      t(Counter, 3),
      t(Counter, 5),
      t(Counter, 7),
      t('button', {'onclick': handleClick}),
        t.text('reload app'),
      t(),
    t()
  );
}

t.ready(() => {
  t.patch(document.getElementById('app'), () => {
    t(App, 'This is a counter example')
  })
})

