import dotenv from 'dotenv'
import express from 'express'
import asyncHandler from 'express-async-handler'
import puppeteer from 'puppeteer'
import Joi from 'joi'
import * as Sentry from '@sentry/node'
import { hashHtml } from './hash.js'
import { Bucket } from './storage.js'

dotenv.config()

const app = express()

Sentry.init({ dsn: process.env.SENTRY_DSN })

app.use(Sentry.Handlers.requestHandler())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.post('/export/pdf', asyncHandler(async (req, res) => {
  const schema = Joi.object({
    html: Joi.string().min(1).required()
  })

  const { error, value } = schema.validate(req.body)

  if (error) {
    return res.status(400).send({ status: false, error })
  }

  const hash = hashHtml(value.html)
  const filePath = `${hash}.pdf`

  const bucket = new Bucket(process.env.GOOGLE_STORAGE_CREDENTIALS)

  if (bucket.isFileExist(filePath) === true) {
    const signedUrl = await bucket.generateSignedUrl(filePath)
    return res.json({ success: true, pdf: signedUrl })
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    headless: true,
    devtools: false
  })

  const page = await browser.newPage()
  await page.setJavaScriptEnabled(false)
  await page.setDefaultNavigationTimeout(5000)

  await page.setContent(value.html, { waitUntil: 'networkidle0' })

  const pdf = await page.pdf({
    path: process.env.DEBUG_MODE === 'true' ? `${hash}.pdf` : null,
    format: 'A4',
    margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' }
  })

  await bucket.uploadFile(pdf, filePath)
  const signedUrl = await bucket.generateSignedUrl(filePath)

  return res.status(200).json({ success: true, pdf: signedUrl })
}))

app.use(Sentry.Handlers.errorHandler())

app.use(function onError (err, req, res, next) {
  res.status(200).send({
    success: false,
    message: `Exception during request. Trace ID: ${res.sentry}`
  })
})

app.listen(3000)
