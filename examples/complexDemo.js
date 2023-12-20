import t from '../src/tanto.js';

const Input = (initialValue, validator) => {

  let valid = t.signal(validator(initialValue));
  let value = t.signal(initialValue);

  const handleInput = event => {
    let inputValue = event.target.value;
    if (validator(inputValue)) {
      valid.$ = true;
    } else {
      valid.$ = false;
    }
  }
  return (
    t('div'),
      t('input'),
        t.attr('value', initialValue),
        t.on('input', handleInput),
      t(),
      t.text(()=> ` ${valid.$? '\u2713' : '\u2717'}`),
    t()
  );
}

const TabButton = (text, action) => {
  return (
    t('button'),
      t.on('click', action),
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
  let active = t.signal(true);
  return (
    t('button'),
      t.text(text),
    t()
  );
}

const Tabs = tabs => {
  let currentTab = t.signal(0);
  return () => (
    t('div'),
      t('div'),
        tabs.forEach((tab, i) => {
          t(TabButton, tab.title, () => { currentTab.$ = i; })
        }),
      t(),
      t('div'),
        t(TabView, tabs[currentTab.$].view),
      t(),
    t()
  );
}

const SVGImage = () => {
  return (
    t('svg','http://www.w3.org/2000/svg'),t.attr('width','16'),t.attr('height','16'),t.attr('version','1.1'),t.attr('viewBox','0 0 4.2 4.2'),t('g'),t.attr('fill','none'),t.attr('stroke','#000'),t.attr('stroke-linecap','round'),t.attr('stroke-linejoin','round'),t.attr('stroke-width','.3'),t('path'),t.attr('d','m2.9 0.53-2.1 2.1-0.26 0.79 0.79-0.26 2.1-2.1s0.26-0.26 0-0.53c-0.26-0.26-0.53 0-0.53 0z'),t(),t('path'),t.attr('d','m0.53 4h3.2'),t(),t(),t()
  );
}

const App = title => {
  return (
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
        }),
        Tab('SVG', () => {
          SVGImage()
        })
      ]
    )
  );
}

t.mount('#app', App, 'This demo contains complex rendering.')
