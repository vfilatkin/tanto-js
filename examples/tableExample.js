/**
 * fetch() replacement for async operations example.
 */
const fetch$ = (url, delayTime = 3000, timeOut = 5000) => {
  const delay = ms => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, ms)
    });
  }
  const tableData = (length, text) => {
    text = text || '';
    let tableData = [];
    for (let index = 1; index <= length; index++) {
      tableData.push({id: index, name: 'name'+ text + index, value: 'value' + text + index})
    }
    return tableData;
  }
  const getApiData = () => {
    switch (url) {
      case 'api/table':
        return tableData(5);
      case 'api/table?rows=10':
          return tableData(10);
      case 'api/table?filter=foo':
        return tableData(5, 'foo');
    }
  }

  return Promise.race([
    delay(delayTime).then( () => {return getApiData()}),
    new Promise((_, fail) => setTimeout(() => fail(new Error('Timeout')), timeOut))
  ]);
}

const TableCell = value => {
  return (
    t('td'),
      t.text(value),
    t()
  );
}

const TableRow = rowData => {
  const renderRow = () => {
    for (const key in rowData) {
      const element = rowData[key];
      TableCell(element);
    }
  }
  return (
    t('tr'),
      renderRow(),
    t()
  );
}

const TableBody = tableData => {
  return (
    t('table'),
      t('tbody'),
        tableData.forEach(rowData => {
          TableRow(rowData)
        }),
      t(),
    t()
  );
}


const TablePending = () => {
  return (
    t('div'),
      t.text('Loading...'),
    t()
  )
}

const TableError = () => {
  return (
    t('div'),
      t.text('Error!'),
    t()
  )
}

const Table = api => {
  let [apiUrl, setApiUrl] = t.state(api);
  let [data, setData] = t.state(null);

  const apiCall = api => {
    fetch$(api)
    .then(
      tableData => setData(tableData)
    )
  }

  if(!data){
    apiCall(apiUrl);
    return t(TablePending);
  } else {
    return t(TableBody, data);
  }
}

const App = title => {
  return (
    t('div'),
      t.text(title),
      t(Table, 'api/table'),
    t()
  );
}

t.mount('#app', App, 'This is async table example')