import { APIResource } from 'heurist/resource'
import Randomstring from 'randomstring'

export enum WorkflowTaskType {
  Upscaler = 'upscaler'
}

interface WorkflowTaskOptions {
  consumer_id: string;
  workflow_id: string;
  job_id_prefix?: string;
}

abstract class WorkflowTask {
  public consumer_id: string;
  public workflow_id: string;
  public job_id_prefix?: string;
  
  constructor(options: WorkflowTaskOptions) {
    this.consumer_id = options.consumer_id;
    this.workflow_id = options.workflow_id;
    this.job_id_prefix = options.job_id_prefix;
  }

  abstract get task_type(): WorkflowTaskType;
  abstract get task_details(): Record<string, any>;
}

interface UpscalerTaskOptions extends WorkflowTaskOptions {
  image_url: string;
}

export class UpscalerTask extends WorkflowTask {
  private image_url: string;

  constructor(options: UpscalerTaskOptions) {
    super(options);
    this.image_url = options.image_url;
  }

  get task_type(): WorkflowTaskType {
    return WorkflowTaskType.Upscaler;
  }

  get task_details(): Record<string, any> {
    return { parameters: { image: this.image_url } };
  }
}

export interface WorkflowTaskResult {
  task_id: string
  status: 'waiting' | 'running' | 'finished' | 'failed'
  result?: any
}

export class Workflow extends APIResource {
  async executeWorkflow(task: WorkflowTask): Promise<string> {
    await this.resourceRequest(task.consumer_id)
    const task_id = await this.createTask(task)
    return task_id;
  }

  async queryTaskResult(task_id: string): Promise<WorkflowTaskResult> {
    const url = `${this._client.workflowURL}/task_result_query`
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
    const url = `${this._client.workflowURL}/resource_request`
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

  async createTask(task: WorkflowTask): Promise<string> {
    const url = `${this._client.workflowURL}/task_create`
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._client.apiKey}`,
    }
    const { job_id_prefix = 'sdk-workflow' } = task;
    const id = Randomstring.generate({ charset: 'hex', length: 10 })
    const job_id = `${job_id_prefix}-${id}`

    const data = {
      consumer_id: task.consumer_id,
      task_type: task.task_type,
      task_details: task.task_details,
      workflow_id: task.workflow_id,
      job_id
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Task creation failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.task_id
  }

  async executeWorkflowAndWaitForResult(
    task: WorkflowTask,
    timeout: number = 300000,
    interval: number = 10000
  ): Promise<WorkflowTaskResult> {
    const task_id = await this.executeWorkflow(task);
    const startTime = Date.now();

    while (true) {
      const result = await this.queryTaskResult(task_id);
      if (result.status === 'finished' || result.status === 'failed') {
        return result;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for task result');
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}