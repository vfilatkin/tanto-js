const delay = fn => {
  setTimeout(() => {
    fn();
  }, 2000)
}

const IntervalCounter = () => {
  let [count, setCount] = t.state(0);
  delay(()=>{setCount(++count)})
  return (t('span'),t.text(`Count: ${count}`),t())
}

const App = title => {
  return (
    t('div'),
      t.text(title),t.void('br'),
      t(IntervalCounter),
    t()
  );
}

t.ready(() => {
  t.patch(document.getElementById('app'), () => {
    t(App, 'This is async table example')
  })
})