const Input = (initialValue, validator) => {
  let [valid, setValid] = t.state(validator(initialValue));
  let [value, setValue] = t.state(initialValue);
  const handleChange = event => {
    let inputValue = event.target.value;
    if (validator(inputValue)) {
      setValid(true)
    } else {
      setValid(false)
    }
  }
  t.effect(() => {
    if (valid())
      console.log(value());
  })

  //t.effect(() => {
  //  console.log(valid() + " #2");
  //})
  return (
    t('div'),
    t.void('input', {
      'value': initialValue,
      'oninput': handleChange
    }),
    (valid() ? t.text('  \u2713') : t.text('  \u2717')),
    t()
  );
}

const TabButton = (text, action) => {
  return (
    t('button', {
      'onclick': action
    }),
    t.text(text),
    t()
  );
}

const Tab = (title, view) => {
  return {
    title: title,
    view: view,
  }
}

const TabView = (view) => {
  return view();
}

const Button = text => {
  let [active, setActive] = t.state(true);
  return (
    t('button'),
    t.text(text),
    t()
  );
}

const Tabs = tabs => {
  let [currentTab, setCurrentTab] = t.state(0);
  return () => (
    t('div'),
    t('div'),
    tabs.forEach((tab, i) => {
      t(TabButton, tab.title, () => { setCurrentTab(i); })
    }),
    t(),
    t('div'),
    t(TabView, tabs[currentTab()].view),
    t(),
    t()
  );
}

const RenderEffect = (text) => {
  let [count, setCount] = t.state(0);
  const handleClick = () => {
    setCount(count() + 1);
  }
  return () => (
    t('div'),
      t('button', {'onclick': handleClick} ),
        t.text(text + ' ' + count()),
      t(),
      t(RenderEffectPart, 'RenderEffectPart'),
      t(RenderEffectPart, 'RenderEffectPart'),
    t()
  )
}

const RenderEffectPart = (text) => {
  let [count, setCount] = t.state(0);
  const handleClick = () => {
    setCount(count() + 1);
  }
  return () => (
    t('button', {'onclick': handleClick} ),
      t.text(text + ' ' + count()),
    t()
  )
}


const App = title => {
  return (
    t(RenderEffect, 'RenderEffect'),
    t('div'), t.text(title), t(),
    t(Tabs,
      [
        Tab('Inputs', () => {
          t('div'),
            t.text('Inputs demo...'),
            t(Input, 123, value => { return value < 100 }),
            t(Input, 10, value => { return value >= 0 }),
            t(Input, 10, value => { return value >= 0 }),
            t(Input, 10, value => { return value >= 0 }),
            t(Input, 10, value => { return value >= 0 }),
            t(Input, 10, value => { return value >= 0 }),
            t(Input, 10, value => { return value >= 0 }),
            t(Button, 'OK'),
            t()
        }),
        Tab('Buttons', () => {
          t('div'),
            t.text('Buttons demo...'),
            t(Button, 'OK'),
            t(Button, 'Cancel'),
            t()
        }),
        Tab('Text', () => {
          t.text('Just text...')
          t(Input, 'abc.js', value => { return /[a-z]/i.test(value); })
        })
      ]
    )
  );
}

t.mount('#app', App, 'This demo contains complex rendering.')