const delay = fn => {
  setTimeout(() => {
    fn();
  }, 2000)
}

const IntervalCounter = initialValue => {
  let [count, setCount] = t.state(initialValue);
  delay(()=>{setCount(++count)})

  t.effect(()=>{
    console.log('Initial value ' + initialValue);
  },[]);
  
  t.effect(()=>{
    document.title = 'The count is ' + count;
  }, [count]);

  return (t('span'),t.text(`Count: ${count}`),t())

}

const App = title => {
  return (
    t('div'),
      t.text(title),t.void('br'),
      t(IntervalCounter, 0),
    t()
  );
}

t.ready(() => {
  t.patch(document.getElementById('app'), () => {
    t(App, 'This is a timeout counter example')
  })
})