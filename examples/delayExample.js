const delay = fn => {
  setTimeout(() => {
    fn();
  }, 2000)
}

const IntervalCounter = initialValue => {
  let count = t.signal(initialValue);
  delay(()=>{++count.$});
  
  return ()=> {t('span'),t.text(`Count: ${count.$}`),t()};
}

const App = title => {
  let visible = t.signal(true);
  const counterVisibility = () => {
    !visible.$;
  }
  return () =>(
    (visible.$? 
    (t('div'),
      t.text(title),t.void('br'),
      t(IntervalCounter, 0),
    t()) :
    (t('div'),
      t.text(title),t.void('br'),
      t.text('...'),
    t())),
    (t('button', {'onclick': counterVisibility}),
    t('span'),t.text(visible.$? 'hide counter': 'show counter'),t(),
    t())
  );
}

t.mount('#app', App, 'This is a timeout counter example')