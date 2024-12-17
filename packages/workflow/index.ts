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
}

interface TaskCreateResponse {
  task_id: string;
}

interface TaskCancelResponse {
  task_id: string;
  msg: string;
}

function parseApiKeyString(combinedKey: string): { consumerId: string; apiKey: string } {
  const [consumerId, apiKey] = combinedKey.split('#');
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
    this.consumer_id = options.consumer_id;
    this.job_id_prefix = options.job_id_prefix;
    this.timeout_seconds = options.timeout_seconds;
    this.workflow_id = options.workflow_id;
    this.api_key = options.api_key;
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
  prompt: string;
  width?: number;
  height?: number;
  length?: number;
  steps?: number;
  seed?: number;
  fps?: number;
  quality?: number;
}

export class Text2VideoTask extends WorkflowTask {
  private prompt: string;
  private width: number;
  private height: number;
  private length: number;
  private steps: number;
  private seed: number;
  private fps: number;
  private quality: number;

  constructor(options: Text2VideoTaskOptions) {
    super(options);
    this.prompt = options.prompt;
    this.width = options.width || 848;
    this.height = options.height || 480;
    this.length = options.length || 37;
    this.steps = options.steps || 30;
    this.seed = options.seed || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    this.fps = options.fps || 24;
    this.quality = options.quality || 80;
  }

  get task_type(): WorkflowTaskType {
    return WorkflowTaskType.Text2Video;
  }

  get task_details(): Record<string, any> {
    return {
      parameters: {
        prompt: this.prompt,
        width: this.width,
        height: this.height,
        length: this.length,
        steps: this.steps,
        seed: this.seed,
        fps: this.fps,
        quality: this.quality
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
      try {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const errorData: ApiResponse<T> = await response.json()
          throw new Error(errorData.error || errorData.message || 'Unknown error')
        } else {
          const errorText = await response.text()
          throw new Error(errorText || 'Unknown error')
        }
      } catch (e) {
        if (e instanceof Error) throw e
        throw new Error(response.statusText)
      }
    }

    return response.json()
  }

  async executeWorkflow(task: WorkflowTask): Promise<string> {
    await this.resourceRequest(task.consumer_id || this.defaultConsumerId)
    const task_id = await this.createTask(task)
    return task_id
  }

  async resourceRequest(consumer_id: string): Promise<string> {
    const data = {
      consumer_id,
      api_key: this.defaultApiKey
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