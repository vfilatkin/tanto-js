const Input = (value, validator) => {

  const handleChange = event => {
    let inputValue = event.target.value;
    let valid = validator(inputValue);
    value = valid ? inputValue : value;
    console.log(valid, value);
  }

  return (
    t('div'),
      t.void('input', {
        'value': value, 
        'onchange': handleChange
      }),
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

t.ready(() => {
  t.patch(document.getElementById('app'), () => {
    t(App, 'This is a input component validation example')
  })
})

