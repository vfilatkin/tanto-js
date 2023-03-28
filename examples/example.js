const Input = (value, validator) => {
  let input;
  return (
    t('div'),
      input = t.void('input', {
        'value': value, 
        'onchange':
          (e) => {
            valid = validator(input.value);
            value = valid ? input.value : value;
            console.log(valid, value);
          }
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
  let input1, input2, button;
  return (
    t('div'),
      t.text(title),
      input1 = t(Input, 123, value => { return value < 100 }),
      input2 = t(Input, 10, value => { return value >= 0 }),
      button = t(Button, 'OK'),
    t()
  );
}

t.ready(() => {
  t.patch(document.getElementById('app'), () => {
    t(App, 'This is a input component validation example')
  })
})

