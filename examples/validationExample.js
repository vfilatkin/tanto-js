const Input = (initialValue, validator) => {
  let valid = t.signal(validator(initialValue));

  const handleChange = event => {
    let inputValue = event.target.value;
    if (validator(inputValue)) {
      valid.$ = true;
    } else {
      valid.$ = false;
    }
  }

  return () => (
    t('div'),
      t.void('input', {
        'value': initialValue, 
        'onchange': handleChange
      }),
      (valid.$? t.text('  \u2713'): t.text('  \u2717')),
    t()
  );
}

const Button = text => {
  return (
    t('button'),
      t.text(text),
    t()
  );
}

const App = title => {
  return (
    t('div'),
      t.text(title),
      t(Input, 123, value => { return value < 100 }),
      t(Input, 10, value => { return value >= 0 }),
      t(Button, 'OK'),
    t()
  );
}

t.mount('#app', App, 'This is a input component validation example.')
