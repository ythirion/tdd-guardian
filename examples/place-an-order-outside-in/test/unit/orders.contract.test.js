'use strict'
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { ordersContract } = require('../contracts/orders-contract')
const { InMemoryOrders } = require('../fakes/in-memory-orders')
const { JsonFileOrders } = require('../../src/json-file-orders')

ordersContract('InMemoryOrders (Fake)', async () => new InMemoryOrders())
ordersContract('JsonFileOrders (adapter)', async () =>
  new JsonFileOrders(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'orders-')), 'orders.json')))
