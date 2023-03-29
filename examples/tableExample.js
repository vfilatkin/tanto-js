/**
 * fetch() replacement for async operations example.
 */
const fetch$ = (url) => {
  const delay = ms => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, ms)
    });
  }
  const tableData = (length) => {
    let tableData = [];
    for (let index = 1; index <= length; index++) {
      tableData.push({id: index, name: 'name' + index, value: 'value' + index})
    }
    return tableData;
  }
  const getApiData = () => {
    switch (url) {
      case 'api/table':
        return tableData(5);
    }
  }

  return Promise.race([
    delay(2000).then( () => {return getApiData()}),
    new Promise((_, fail) => setTimeout(() => fail(new Error('Timeout')), 5000))
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
      t(TableCell, element);
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
    t('tbody'),
      tableData.forEach(rowData => {
        t(TableRow, rowData)
      }),
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

}


const App = title => {
  return (
    t('div'),
      t.text(title),
      t(Table, 'api/table'),
    t()
  );
}

t.ready(() => {
  t.patch(document.getElementById('app'), () => {
    t(App, 'This is async table example')
  })
})