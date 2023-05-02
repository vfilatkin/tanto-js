let a = t.signal('a');
t.effect(()=>{
  console.log(a.$);
  let b = t.signal('b');
  let c = t.signal('c');
  t.effect(()=>{
    console.log(b.$, c.$);
  });
  b.$ = 'B';
  c.$ = 'C';
  a.$ = 'a';
})