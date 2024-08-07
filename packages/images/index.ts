import { APIResource } from 'heurist/resource'
import Randomstring from 'randomstring'

export class Images extends APIResource {
  async generate(body: ImageGenerateParams): Promise<ImagesResponse> {
    try {
      const id = Randomstring.generate({
        charset: 'hex',
        length: 10,
      })

      const {
        prompt = '',
        neg_prompt,
        num_iterations,
        guidance_scale,
        width,
        height,
        seed,
        model,
        job_id_prefix = 'sdk-image',
      } = body

      let promptText = prompt

      if (model === 'Zeek') {
        promptText = promptText.replaceAll('Zeek', 'z33k')
        promptText = promptText.replaceAll('zeek', 'z33k')
      } else if (model === 'Philand') {
        promptText = promptText.replaceAll('Philand', 'ph1land')
        promptText = promptText.replaceAll('philand', 'ph1land')
      }

      const model_input = {
        prompt: promptText,
        ...(neg_prompt && { neg_prompt }),
        ...(num_iterations && { num_iterations }),
        ...(guidance_scale && { guidance_scale }),
        ...(width && { width }),
        ...(height && { height }),
        ...(seed && {
          seed:
            parseInt(seed.toString()) > Number.MAX_SAFE_INTEGER
              ? parseInt(seed.toString()) % Number.MAX_SAFE_INTEGER
              : parseInt(seed.toString()),
        }),
      }

      const params = {
        job_id: `${job_id_prefix}-${id}`,
        model_input: {
          SD: model_input,
        },
        model_type: 'SD',
        model_id: model,
        deadline: 30,
        priority: 1,
      }

      const path = `${this._client.baseURL}/submit_job`

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
          throw new Error('Generate image error. Please try again later')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const url = await response.text()
      const dataUrl = url.replaceAll('"', '')

      return {
        url: dataUrl,
        model,
        ...model_input,
      }
    } catch (error) {
      console.log(error.message, 'generate image error')
      throw new Error(
        error.message || `Generate image error. Please try again later`,
      )
    }
  }
}

export type ImageModel = string;

export interface Image extends ImageGenerateParams {
  url: string
}

export interface ImagesResponse extends Image {}

export interface ImageGenerateParams {
  /**
   * The name of the model used, which specifies the particular model used to perform the generation or iteration.
   */
  model: string

  /**
   * The main cue information used to generate the image or iteration.
   */
  prompt?: string

  /**
   * Negative cue messages used to specify that generation of content should be avoided.
   */
  neg_prompt?: string

  /**
   * Number of iterations to perform. 1-50
   */
  num_iterations?: number

  /**
   * Guidance scale for adjusting the influence of certain parameters in the generation process. 1-20
   */
  guidance_scale?: number

  /**
   * The width of the image.
   */
  width?: number

  /**
   * The height of the image.
   */
  height?: number

  /**
   * Seed value to ensure repeatability of the generated results.
   */
  seed?: number

  /**
   * The prefix for the job ID.
   */
  job_id_prefix?: string
}
