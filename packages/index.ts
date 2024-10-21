import * as API from './apis'
import { readEnv } from './lib'

export interface ClientOptions {
  /**
   * Defaults to process.env['HEURIST_BASE_URL'].
   */
  baseURL?: string | null | undefined

  /**
   * Defaults to process.env['HEURIST_WORKFLOW_URL'].
   */
  workflowURL?: string | null | undefined

  /**
   * Defaults to process.env['HEURIST_API_KEY'].
   */
  apiKey?: string | undefined
}

export class Heurist {
  baseURL: string
  workflowURL: string
  apiKey: string

  constructor({
    baseURL = readEnv('HEURIST_BASE_URL'),
    workflowURL = readEnv('HEURIST_WORKFLOW_URL'),
    apiKey = readEnv('HEURIST_API_KEY'),
  }: ClientOptions = {}) {
    if (apiKey === undefined) {
      throw new Error(
        "The HEURIST_API_KEY environment variable is missing or empty; either provide it, or instantiate the Heurist client with an apiKey option, like new Heurist({ apiKey: 'My API Key' }).",
      )
    }

    this.baseURL = baseURL || 'http://sequencer.heurist.xyz'
    this.workflowURL = workflowURL
    this.apiKey = apiKey
  }

  images: API.Images = new API.Images(this)
  workflow: API.Workflow = new API.Workflow(this)
}

export * from './apis'

export default Heurist
