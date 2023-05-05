let count = t.signal(0);
const template = 
t.html`<div>HTML Template Example<div><br> a button created by render: ${
() => (t('button'), t.attr('id',t.id(8)), t.on('click', () => count.$++), t.text('click '), t())
}</div>Clicks count: ${count}</div>`;

const App = title => {
  return () => (
    t.text(title),
    template.clone()
  );
}

t.mount('#app', App, 'This is a template usage example');