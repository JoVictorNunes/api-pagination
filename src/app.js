const express = require('express')
const { sequelize } = require('../models')
const { ValidationError } = require('sequelize')

const { Product } = sequelize.models

const app = express()

app.use(express.query())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.get('/products', async (request, response, next) => {
  let { page = 1, limit = 10 } = request.query
  page = Number(page)
  limit = Number(limit)

  let products

  try {
    products = await Product.findAll({ offset: (page - 1) * limit, limit })
    const total = await Product.count()
    const totalPages = Math.ceil(total / limit)
  
    response.status(200).json({
      products,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages
    })
  }
  catch (e) {
    next(e)
  }
})

app.post('/products', async (request, response, next) => {
  const { data } = request.body

  if (!data) {
    Promise.resolve().then(() => {
      throw new Error('Invalid input data.')
    }).catch(next)
    return
  }

  if (Array.isArray(data)) {
    sequelize.transaction(async (transaction) => {
      const promises = data.map(async product => {
        const createdProduct = await Product.create(product, { transaction })
        return createdProduct
      })

      const resultData = await Promise.all(promises)
      return resultData
    })
    .then(createdData => {
      response.status(201).json({ createdData })
    })
    .catch(next)
  }
  else {
    Promise.resolve().then(async () => {
      const product = await Product.create(data)
      response.status(201).json({ product })
    }).catch(next)
  }
})

app.use((err, request, response, next) => {
  if (err instanceof ValidationError) {
    const errors = err.errors.map(error => {
      if (error.type === 'notNull Violation') {
        return {
          type: 'not_null_violation',
          message: error.message.split('.')[1]
        }
      }
      else {
        return {
          type: error.type,
          message: error.message
        }
      }
    })

    response.status(400).json({ errors })
  }
  else if (err instanceof Error) {
    response.status(500).json({ error: err.message })
  }
  else {
    response.status(500).end()
  }
})

app.listen(3006, () => { console.log(`App running on port ${3006}`) })