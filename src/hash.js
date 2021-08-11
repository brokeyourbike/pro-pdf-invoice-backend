import crypto from 'crypto'

function hashHtml (html) {
  return crypto.createHash('sha256').update(html).digest('hex')
}

export { hashHtml }
