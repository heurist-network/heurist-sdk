import { APIResource } from 'heurist/resource'
import Randomstring from 'randomstring'

export enum WorkflowTaskType {
  Upscaler = 'upscaler',
  FluxLora = 'flux-lora'
}

interface WorkflowTaskOptions {
  consumer_id: string;
  job_id_prefix?: string;
  timeout_seconds?: number;
}

abstract class WorkflowTask {
  public consumer_id: string;
  public job_id_prefix?: string;
  public timeout_seconds?: number;

  constructor(options: WorkflowTaskOptions) {
    this.consumer_id = options.consumer_id;
    this.job_id_prefix = options.job_id_prefix;
    this.timeout_seconds = options.timeout_seconds;
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

interface FluxLoraTaskOptions extends WorkflowTaskOptions {
  prompt: string;
  aspect_ratio?: string;
  width?: number;
  height?: number;
  guidance?: number;
  steps?: number;
  lora_name: string;
}

export class FluxLoraTask extends WorkflowTask {
  private prompt: string;
  private aspect_ratio: string;
  private width: number;
  private height: number;
  private guidance: number;
  private steps: number;
  private lora_name: string;

  constructor(options: FluxLoraTaskOptions) {
    super(options);
    this.prompt = options.prompt;
    this.aspect_ratio = options.aspect_ratio || 'custom';
    this.width = options.width || 1024;
    this.height = options.height || 1024;
    this.guidance = options.guidance || 6;
    this.steps = options.steps || 20;
    this.lora_name = options.lora_name;
  }

  get task_type(): WorkflowTaskType {
    return WorkflowTaskType.FluxLora;
  }

  get task_details(): Record<string, any> {
    return {
      parameters: {
        prompt: this.prompt,
        aspect_ratio: this.aspect_ratio,
        width: this.width,
        height: this.height,
        guidance: this.guidance,
        steps: this.steps,
        lora_name: this.lora_name
      }
    };
  }
}

export interface WorkflowTaskResult {
  task_id: string
  status: 'waiting' | 'running' | 'finished' | 'failed' | 'canceled'
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

    const data: any = {
      consumer_id: task.consumer_id,
      task_type: task.task_type,
      task_details: task.task_details,
      job_id
    };

    if (task.timeout_seconds !== undefined) {
      data.timeout_seconds = task.timeout_seconds;
    }

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
    if (interval < 1000) {
      throw new Error('Interval should be more than 1000 (1 second)')
    }

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

  async cancelTask(task_id: string): Promise<{ task_id: string; msg: string }> {
    const url = `${this._client.workflowURL}/task_cancel`
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
      throw new Error(`Task cancellation failed: ${response.statusText}`)
    }

    return await response.json()
  }
}