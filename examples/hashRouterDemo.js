const MainView = (pathData, pathParams) => {
  return t('div'), t.text`Main page.`, t();
}

const SearchView = (pathData, pathParams) => {
  return (
    t('div'), t.text`
      Search page.
      Path data:${JSON.stringify(pathData)}\n
      Path params: ${pathParams}`,
    t()
  );
}

const App = title => {
  return (
    t('div'),
      t(Router,
        'main',
        [
          Route('main', MainView),
          Route('search/{foo}/{bar}/view', SearchView),
        ]
      ),
    t()
  );
}

t.mount('#app', App, 'This is a router example');