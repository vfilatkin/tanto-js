let a = t.signal('a');
document.addEventListener('click', () => a.$ = a.$);
t.effect(() => {
  console.log(a.$);
  let b = t.signal('b');
  let c = t.signal('c');
  t.effect(() => {
    console.log(b.$, c.$);
  });
  a.$ = 'AA';
  b.$ = 'B';
  c.$ = 'C';
})

let firstName = t.signal('John');
let lastName = t.signal('Doe');

let fullName = t.computed(() => firstName.$ + " " + lastName.$);

t.effect(() => {
  console.log(fullName.$);
});

console.log('Before computation...');
console.log(`get: ${firstName.value} ${lastName.value}`);
firstName.value = 'Bob'
console.log(`get: ${firstName.value} ${lastName.value}`);

console.log('After computation...');
firstName.$ = 'Jane';
console.log('get:' + firstName.value);