'use strict'
const { describe, it } = require('node:test')
const { aBigOrder, aSmallOrder } = require('../builders/order-builder')
const { theOrder } = require('../assertions/order-assertions')

describe('Shipping fees of an order', () => {
  it('are free above 50 euros', () => {
    theOrder(aBigOrder().build()).isShippedFreeOfCharge()
  })

  it('are 5 euros below 50 euros', () => {
    theOrder(aSmallOrder().build()).costsShipping(5)
  })
})
