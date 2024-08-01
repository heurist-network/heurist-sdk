import { APIResource } from 'heurist/resource'
import Randomstring from 'randomstring'

export interface ComfyUIWorkflowParams {
  // TODO: Add documentation
  consumer_id: string
  task_details: Record<string, any>
  task_type: string
  workflow_id: string
  job_id_prefix?: string
}

export interface ComfyUITaskResult {
  // TODO: Add documentation
  task_id: string
  status: 'pending' | 'completed' | 'failed'
  result?: any
}

export class ComfyUI extends APIResource {
  async executeWorkflow(params: ComfyUIWorkflowParams): Promise<string> {
    await this.resourceRequest(params.consumer_id)
    const task_id = await this.createTask(params)
    return task_id;
  }

  async queryTaskResult(task_id: string): Promise<ComfyUITaskResult> {
    const url = `${this._client.baseURL}/task_result_query`
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._client.apiKey}`,
    }
    const data = { task_id }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Task result query failed: ${response.statusText}`)
    }

    return await response.json()
  }

  async resourceRequest(consumer_id: string): Promise<string> {
    const url = `${this._client.baseURL}/resource_request`
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._client.apiKey}`,
    }
    const data = { consumer_id }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Resource request failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.miner_id
  }

  async createTask(params: ComfyUIWorkflowParams): Promise<string> {
    const url = `${this._client.baseURL}/task_create`
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._client.apiKey}`,
    }
    const { job_id_prefix = 'sdk-comfyui', ...data } = params
    const id = Randomstring.generate({ charset: 'hex', length: 10 })
    const job_id = `${job_id_prefix}-${id}`

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...data, job_id }),
    })

    if (!response.ok) {
      throw new Error(`Task creation failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.task_id
  }
}