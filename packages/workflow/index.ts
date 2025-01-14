import { APIResource } from '../resource'
import Randomstring from 'randomstring'

// Response interfaces
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

interface MinerResponse {
  miner_id: string;
  msg?: string;
}

interface TaskCreateResponse {
  task_id: string;
}

interface TaskCancelResponse {
  task_id: string;
  msg: string;
}

function parseApiKeyString(combinedKey: string): { consumerId: string; apiKey: string } {
  let parts: string[];

  if (combinedKey.includes('#')) {
    parts = combinedKey.split('#');
  } else {
    parts = combinedKey.split('-');
  }

  const [consumerId, apiKey] = parts;
  return {
    consumerId: consumerId || '',
    apiKey: apiKey || ''
  };
}

export enum WorkflowTaskType {
  Upscaler = 'upscaler',
  FluxLora = 'flux-lora',
  Text2Video = 'txt2vid'
}

interface WorkflowTaskOptions {
  consumer_id?: string;
  job_id_prefix?: string;
  timeout_seconds?: number;
  workflow_id?: string;
  api_key?: string;
}

abstract class WorkflowTask {
  public consumer_id?: string;
  public job_id_prefix?: string;
  public timeout_seconds?: number;
  public workflow_id?: string;
  public api_key?: string;

  constructor(options: WorkflowTaskOptions) {
    if (options.consumer_id !== undefined) this.consumer_id = options.consumer_id;
    if (options.job_id_prefix !== undefined) this.job_id_prefix = options.job_id_prefix;
    if (options.timeout_seconds !== undefined) this.timeout_seconds = options.timeout_seconds;
    if (options.workflow_id !== undefined) this.workflow_id = options.workflow_id;
    if (options.api_key !== undefined) this.api_key = options.api_key;
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

interface Text2VideoTaskOptions extends WorkflowTaskOptions {
  prompt: string;        // Only required parameter
  width?: number;
  height?: number;
  steps?: number;
  length?: number;
  seed?: number;
  fps?: number;
  quality?: number;
}

export class Text2VideoTask extends WorkflowTask {
  private prompt: string;
  private width?: number;
  private height?: number;
  private length?: number;
  private steps?: number;
  private seed?: number;
  private fps?: number;
  private quality?: number;

  constructor(options: Text2VideoTaskOptions) {
    super(options);
    this.prompt = options.prompt;

    // Only assign properties if they're provided
    if (options.width !== undefined) this.width = options.width;
    if (options.height !== undefined) this.height = options.height;
    if (options.length !== undefined) this.length = options.length;
    if (options.steps !== undefined) this.steps = options.steps;
    if (options.seed !== undefined) this.seed = options.seed;
    if (options.fps !== undefined) this.fps = options.fps;
    if (options.quality !== undefined) this.quality = options.quality;
  }

  get task_type(): WorkflowTaskType {
    return WorkflowTaskType.Text2Video;
  }

  get task_details(): Record<string, any> {
    const parameters: Record<string, any> = {
      prompt: this.prompt
    };

    // Only include parameters if they exist on the instance
    if ('width' in this) parameters.width = this.width;
    if ('height' in this) parameters.height = this.height;
    if ('length' in this) parameters.length = this.length;
    if ('steps' in this) parameters.steps = this.steps;
    if ('seed' in this) parameters.seed = this.seed;
    if ('fps' in this) parameters.fps = this.fps;
    if ('quality' in this) parameters.quality = this.quality;

    return { parameters };
  }
}

export interface WorkflowTaskResult {
  task_id: string
  status: 'waiting' | 'running' | 'finished' | 'failed' | 'canceled'
  result?: any
}

export class Workflow extends APIResource {
  private defaultConsumerId: string;
  private defaultApiKey: string;

  constructor(client: any) {
    super(client);
    const { consumerId, apiKey } = parseApiKeyString(this._client.apiKey);
    this.defaultConsumerId = consumerId;
    this.defaultApiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this._client.workflowURL}/${endpoint}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : { message: await response.text() }

      const error = new Error()
      error.message = errorData.message || errorData.error || 'Unknown error'
      error['errorDetails'] = {
        status_code: response.status,
        error_type: response.status >= 500 ? 'server_error' : 'client_error',
        message: error.message
      }
      throw error
    }

    return response.json()
  }

  async executeWorkflow(task: WorkflowTask): Promise<string> {
    // Pass workflow_id to resourceRequest
    await this.resourceRequest(
      task.consumer_id || this.defaultConsumerId,
      task.workflow_id,
      task.task_type
    )
    const task_id = await this.createTask(task)
    return task_id
  }

  async resourceRequest(consumer_id: string, workflow_id?: string, task_type?: WorkflowTaskType): Promise<string> {
    const data = {
      consumer_id,
      api_key: this.defaultApiKey,
      workflow_id,
      task_type
    }
    const result = await this.makeRequest<MinerResponse>('resource_request', data)
    return result.miner_id
  }

  async createTask(task: WorkflowTask): Promise<string> {
    const id = Randomstring.generate({ charset: 'hex', length: 10 })
    const data = {
      consumer_id: task.consumer_id || this.defaultConsumerId,
      api_key: task.api_key || this.defaultApiKey,
      task_type: task.task_type,
      task_details: task.task_details,
      job_id: `${task.job_id_prefix || 'sdk-workflow'}-${id}`,
      workflow_id: task.workflow_id,
      ...(task.timeout_seconds && { timeout_seconds: task.timeout_seconds })
    }

    const result = await this.makeRequest<TaskCreateResponse>('task_create', data)
    return result.task_id
  }

  async queryTaskResult(task_id: string): Promise<WorkflowTaskResult> {
    return this.makeRequest<WorkflowTaskResult>('task_result_query', {
      task_id,
      api_key: this.defaultApiKey
    })
  }

  async executeWorkflowAndWaitForResult(
    task: WorkflowTask,
    timeout: number = 300000,
    interval: number = 10000
  ): Promise<WorkflowTaskResult> {
    if (interval < 1000) {
      throw new Error('Interval should be more than 1000 (1 second)')
    }

    const task_id = await this.executeWorkflow(task)
    const startTime = Date.now()

    while (true) {
      const result = await this.queryTaskResult(task_id)
      if (result.status === 'finished' || result.status === 'failed') {
        return result
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for task result')
      }

      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }

  async cancelTask(task_id: string): Promise<TaskCancelResponse> {
    return this.makeRequest<TaskCancelResponse>('task_cancel', {
      task_id,
      api_key: this.defaultApiKey
    })
  }
}