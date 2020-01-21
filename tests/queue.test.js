const test = require('ava');
const enqueue = require('../lib/enqueue.js');

test('works', async t => {
  let i = 0;

  enqueue(() => i++);
  enqueue(() => i++);
  enqueue(() => i++);

  await new Promise(r => {
    setTimeout(() => {
      t.is(i, 2);
      r();
    }, 1500);
  });
});
