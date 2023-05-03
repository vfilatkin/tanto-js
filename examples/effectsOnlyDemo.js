let a = t.signal('a');
t.effect(()=>{
  console.log(a.$);
  let b = t.signal('b');
  let c = t.signal('c');
  t.effect(()=>{
    console.log(b.$, c.$);
  });
  a.$ = 'A';
  b.$ = 'B';
  c.$ = 'C';
})

let firstName = t.signal('John');
let lastName = t.signal('Doe');
let fullName = t.computed(()=> firstName.$ + ' ' + lastName.$)
t.effect(()=>{
  console.log(fullName.$);
});

firstName.$ = 'Jane';