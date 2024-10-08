import t from '../src/tanto.js';

let testSignal = t.signal(123);

let task = setInterval(()=>{
  console.log(testSignal.$)
}, 700);

t.effect(()=>{
  console.log(1,testSignal.$);
  t.effect(() => {
    console.log(2,testSignal.$);
    t.cleanup(() => {
      console.log('cleanup 2');
    })
    t.effect(() => {
      console.log(3,testSignal.$);
      t.cleanup(() => {
        console.log('cleanup 3');
        clearInterval(task);
      })
    });
  });
});

setTimeout(()=>{
  testSignal.$ = 321;
}, 3000);

let firstName = t.signal('John')
let lastName = t.signal('Doe')

let fullName = t.computed(()=> firstName.$ + ' ' + lastName.$)
t.effect(()=>{
  console.log(fullName.$);
});

setTimeout(()=>{
  firstName.$ = 'Jane';
}, 5000)