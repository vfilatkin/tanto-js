let count = t.signal(0);
let hitLimit = t.signal(false);

const handleClick = () => {
  count.$++;
  if(count.$ === 10) hitLimit.$ = true;
}

const template = 
t.html`<div id="${t.id(8)}" hit-limit="${hitLimit}">
  HTML Template Example
  <div>
    <br> a button created by render: ${
      () => (t('button'), t.attr('id',t.id(8)), t.on('click', handleClick), t.text('click '), t())
    }
  </div>Clicks count: ${count}
</div>`;

const App = title => {
  return (
    t.text(title),
    template.clone()
  );
}

t.mount('#app', App, 'This is a template usage example');