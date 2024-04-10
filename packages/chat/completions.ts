import { APIResource } from 'heurist/resource'
import Randomstring from 'randomstring'
import { v4 as uuidv4 } from 'uuid'

export class Completions extends APIResource {
  async create(body: ChatCompletionCreateParamsNonStreaming) {
    try {
      const { messages, model, temperature = 0.75, max_tokens = 2048 } = body

      let prompt = ''

      messages.map((item) => {
        if (item.role === 'system') {
          prompt += '<|im_start|>system' + item.content + '<|im_end|>' + '\n'
        } else if (item.role === 'assistant') {
          prompt += '<|im_start|>assistant' + item.content + '<|im_end|>' + '\n'
        } else if (item.role === 'user') {
          prompt += '<|im_start|>user' + item.content + '<|im_end|>' + '\n'
        }
      })

      const id = Randomstring.generate({
        charset: 'hex',
        length: 10,
      })

      const model_input = {
        prompt,
        use_stream: false,
        temperature,
        max_tokens,
      }

      const params = {
        job_id: `heurist-llm-gateway-${id}`,
        model_input: {
          LLM: model_input,
        },
        model_type: 'LLM',
        model_id: model,
        deadline: 60,
        priority: 1,
      }

      const path = `${this._client.baseURL}/submit_job`

      const created = Math.floor(Date.now() / 1000)

      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this._client.apiKey}`,
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        if (
          String(response.status).startsWith('5') ||
          String(response.status).startsWith('4')
        ) {
          throw new Error('Completions chat error. Please try again later')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const content = await response.json()

      const result = {
        id: `chatcmpl-${uuidv4()}`,
        choices: [
          {
            finish_reason: 'stop',
            index: 0,
            message: {
              content: `\n\n${content}`,
              role: 'assistant',
            },
          },
        ],
        created,
        model,
        object: 'chat.completion',
        system_fingerprint: null,
        usage: {
          // prompt_tokens: 0,
          // completion_tokens: 0,
          // total_tokens: 0,
        },
        ended: Math.floor(Date.now() / 1000),
      }
      console.log(result, 'result')
      return result
    } catch (error) {
      console.log(error.message, 'Completions chat error')
      throw new Error(
        error.message || `Completions chat error. Please try again later`,
      )
    }
  }
}

export interface ChatCompletionMessageParam {
  /**
   * The contents of the user message.
   */
  content: string

  /**
   * The role of the messages author, in this case `user`.
   */
  role: 'user' | 'assistant' | 'system'

  /**
   * An optional name for the participant. Provides the model information to
   * differentiate between participants of the same role.
   */
  name?: string
}

export interface ChatCompletionCreateParamsNonStreaming {
  /**
   * A list of messages comprising the conversation so far.
   */
  messages: Array<ChatCompletionMessageParam>

  /**
   * ID of the model to use.
   */
  model:
    | (string & {})
    | 'mistralai/mixtral-8x7b-instruct-v0.1'
    | 'mistralai/mistral-7b-instruct-v0.2'
    | 'openhermes-2.5-mistral-7b-gptq'
    | 'openhermes-2-pro-mistral-7b'
    | 'openhermes-mixtral-8x7b-gptq'
    | 'openhermes-2-yi-34b-gptq'
    | 'meta-llama/llama-2-70b-chat'

  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
   * make the output more random, while lower values like 0.2 will make it more
   * focused and deterministic.
   */
  temperature?: number | null

  /**
   * The maximum number of [tokens](/tokenizer) that can be generated in the chat
   * completion.
   *
   * The total length of input tokens and generated tokens is limited by the model's
   * context length.
   */
  max_tokens?: number | null
}
