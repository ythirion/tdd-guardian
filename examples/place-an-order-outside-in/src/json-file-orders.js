'use strict'
const fs = require('node:fs')
const { Order } = require('./order')

// Orders adapter storing orders in a JSON file, checked by the same contract test as the Fake.
class JsonFileOrders {
  constructor(file) {
    this.file = file
  }

  async save(order) {
    const all = this.readAll()
    all[order.id] = { id: order.id, lines: order.lines, country: order.country }
    fs.writeFileSync(this.file, JSON.stringify(all, null, 2))
  }

  async byId(id) {
    const data = this.readAll()[id]
    return data && new Order(data.id, data.lines, data.country)
  }

  readAll() {
    return fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : {}
  }
}

module.exports = { JsonFileOrders }
