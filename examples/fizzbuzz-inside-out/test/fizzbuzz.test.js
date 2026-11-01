'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { fizzbuzz } = require('../src/fizzbuzz')
const { forAll, integers } = require('./support/properties')

describe('FizzBuzz', () => {
  it('says 1 for 1', () => {
    assert.equal(fizzbuzz(1), '1')
  })

  it('says 2 for 2', () => {
    assert.equal(fizzbuzz(2), '2')
  })

  it('says Fizz for a multiple of 3', () => {
    assert.equal(fizzbuzz(6), 'Fizz')
  })

  it('says Buzz for a multiple of 5', () => {
    assert.equal(fizzbuzz(10), 'Buzz')
  })

  it('says FizzBuzz for every multiple of 15', () => {
    forAll(integers({ min: 1, max: 10_000 }), (n) => fizzbuzz(15 * n) === 'FizzBuzz')
  })
})
