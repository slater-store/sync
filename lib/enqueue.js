const wait = require("w2t");

let running = false;
const queue = [];
const batch = [];

module.exports = async function enqueue(fn) {
  queue.push(fn);

  if (running) {
    return Promise.all(batch);
  }

  while (queue.length) {
    running = true;
    await wait(500);
    batch.push(queue.pop()());
    running = false;
  }

  return Promise.all(batch);
};
