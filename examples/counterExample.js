const Counter = initialCount => {
  let [count, setCount] = t.state(initialCount);
  let [hitLimit, setHitLimit] = t.state(false);

  const handleClick = event => {
    setCount(++count);
    if(count === 10) setHitLimit(true);
  }

  return (
    t('button', {'onclick': handleClick}),
      t.text(count),
    t()
  );
}

const App = title => {
  return (
    t('div'),
      t.text(title),
      t(Counter, 3),
      t(Counter, 33),
    t()
  );
}

t.ready(() => {
  t.patch(document.getElementById('app'), () => {
    t(App, 'This is a counter example')
  })
})

