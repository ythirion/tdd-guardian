'use strict'
// A tiny, deterministic property runner so this example needs no dependency.
// In a real project use fast-check (JS/TS), FsCheck (C#), jqwik (Java) or Hypothesis (Python):
//   fc.assert(fc.property(fc.integer({ min: 1, max: 10_000 }), (n) => fizzbuzz(15 * n) === 'FizzBuzz'))

const integers = ({ min, max }) => (random) => min + Math.floor(random() * (max - min + 1))

function forAll(generator, property, { runs = 100, seed = 42 } = {}) {
  let state = seed
  const random = () => {
    state = (state * 1103515245 + 12345) % 2 ** 31
    return state / 2 ** 31
  }
  for (let run = 0; run < runs; run++) {
    const value = generator(random)
    if (!property(value)) throw new Error(`Property falsified after ${run + 1} runs, counter-example: ${JSON.stringify(value)}`)
  }
}

module.exports = { forAll, integers }
