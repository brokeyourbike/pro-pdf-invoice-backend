import { Storage } from '@google-cloud/storage'

class Bucket {
  constructor (credentialsPath) {
    const storage = new Storage({ keyFilename: credentialsPath })
    this.bucket = storage.bucket(process.env.BUCKET_NAME)
  }

  async uploadFile (data, filename) {
    const file = this.bucket.file(filename)

    const result = await file.save(data, {
      resumable: false
    })

    return result
  }

  async isFileExist (filename) {
    const file = this.bucket.file(filename)
    const [exist] = await file.exists()
    return exist
  }

  async generateSignedUrl (filename) {
    const currentYear = new Date().getFullYear()

    const options = {
      version: 'v2',
      action: 'read',
      expires: new Date(new Date().setFullYear(currentYear + 1))
    }

    const file = this.bucket.file(filename)
    const [url] = await file.getSignedUrl(options)
    return url
  }
}

export {
  Bucket
}
