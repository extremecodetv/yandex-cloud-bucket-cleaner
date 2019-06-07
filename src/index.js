
require('dotenv').config()

const pMap = require('p-map')
const AWS = require('aws-sdk')
const endpoint = new AWS.Endpoint('storage.yandexcloud.net')

const s3 = new AWS.S3({
  endpoint: endpoint,
  accessKeyId: process.env.YANDEX_STORAGE_KEY_ID,
  secretAccessKey: process.env.YANDEX_STORAGE_ACCESS_KEY,
  region: 'us-east-1',
  httpOptions: {
    timeout: 10000,
    connectTimeout: 10000
  }
})

const getObjects = async (bucket) => {
  const raw = await s3.listObjects({ Bucket: bucket }).promise()
  return raw.Contents.map((c) => {
    return {
      Key: c.Key
    }
  })
}

const dropBucket = async (bucket) => {
  try {
    const keys = await getObjects(bucket)

    const params = {
      Bucket: bucket,
      Delete: {
        Objects: keys,
        Quiet: false
      }
    }

    let state = await s3.deleteObjects(params).promise()
    if (state.Errors.length !== 0) {
      throw new Error(state)
    }

    return s3.deleteBucket({ Bucket: bucket }).promise()
  } catch (e) {
    throw e
  }
}

const main = async () => {
  try {
    const fs = require('fs')
    const lists = fs.readFileSync('./buckets.txt').toLocaleString().split('\r\n')

    const states = await pMap(lists, async bucket => {
      try {
        if (bucket !== '') {
          const state = await dropBucket(bucket)
          return state
        }
      } catch (e) {
        console.log(`Bucker ${bucket} error:`)
        console.error(e)
      }
    })

    return states
  } catch (e) {
    throw e
  }
}

main().then(() => console.log('done'))
