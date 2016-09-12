import { resolve as resolvePath } from 'path'
import { readFile } from 'fs'
import getTestPGClient from './getTestPGClient'

let created = false

export default async function createKitchenSinkSchema () {
  // If this function has already been run, bail early.
  if (created) return

  const testSchema = await new Promise<string>((resolve, reject) => {
    readFile(resolvePath(__dirname, 'kitchen-sink-schema.sql'), (error, data) => {
      if (error) reject(error)
      else resolve(data.toString())
    })
  })

  const client = await getTestPGClient()

  try {
    await client.query(testSchema)
  }
  catch (error) {
    // Make sure we log any errors we might run into.)
    console.error('Failed to execute kitchen sink SQL:', error.stack)
    throw error
  }

  created = true
}
