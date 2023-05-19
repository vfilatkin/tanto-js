let count = t.signal(1);
let hitLimit = t.signal(false);

const handleClick = () => {
  count.$++;
  if (count.$ === 10) hitLimit.$ = true;
}

const template = html`<div>
  HTML template example
  <div>
    <br> a button created by render: ${()=>(t('button'), t.on('click', () => count.$++), t.text`click`, t())}
  </div>
  Clicks count: ${count}
</div>`;
const App = title => {
  return (
    template.clone()
  );
}

t.mount('#app', App, 'This demo contains template rendering.')