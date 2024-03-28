
import Randomstring from 'randomstring'

class Heurist {

  /**
   * 
   * Creates an image according to the given parameters.
   * @param {Object} config - An object for the image creation option.
   * @param {string} config.AUTH_KEY - An authorization key for authentication, ensuring that the caller has access to the feature.
   * @param {number} config.width - The width of the image.
   * @param {number} config.height - The height of the image.
   * @param {number} config.num_iterations - Number of iterations to perform. 1-50
   * @param {number} config.guidance_scale - Guidance scale for adjusting the influence of certain parameters in the generation process. 1-20
   * @param {string} config.model - The name of the model used, which specifies the particular model used to perform the generation or iteration.
   * @param {string} [config.prompt] - (Optional) The main cue information used to generate the image or iteration.
   * @param {string} [config.neg_prompt] - (Optional) Negative cue messages used to specify that generation of content should be avoided.
   * @param {number} [config.seed] - (Optional) Seed value to ensure repeatability of the generated results.
   * @return {Object} Returns an object containing a `data` object. The `data` object internally contains a `url` attribute which is the URL link to the generated image.
   */
  static async generateImage(config = {}) {
    try {
      const data = {
        prompt: config['prompt'],
        neg_prompt: config['neg_prompt'],
        num_iterations: config['num_iterations'],
        guidance_scale: config['guidance_scale'],
        width: config['width'],
        height: config['height'],
        seed: config['seed'],
        model: config['model'],
      }
      const BASE_URL = config['BASE_URL'] || 'http://sequencer.heurist.xyz'
      const AUTH_KEY = config['AUTH_KEY']
      if (!AUTH_KEY) {
        console.error('AUTH_KEY are required')
        return
      }
      const id = Randomstring.generate({
        charset: 'hex',
        length: 10,
      })

      const model_input = {
        prompt: data.prompt || '',
      }

      if (data.num_iterations) {
        model_input.num_iterations = Number(data.num_iterations)
      }
      if (data.neg_prompt) {
        model_input.neg_prompt = data.neg_prompt
      }
      if (data.guidance_scale) {
        model_input.guidance_scale = Number(data.guidance_scale)
      }
      if (data.width) {
        model_input.width = Number(data.width)
      }
      if (data.height) {
        model_input.height = Number(data.height)
      }
      if (data.seed) {
        let seed = parseInt(data.seed)
        if (seed > Number.MAX_SAFE_INTEGER) {
          seed = seed % Number.MAX_SAFE_INTEGER
        }
        model_input.seed = seed
      }

      const params = {
        job_id: `imagine-${id}`,
        model_input: {
          SD: model_input,
        },
        model_type: 'SD',
        model_id: data.model,
        deadline: 30,
        priority: 1,
      }

      const path = `${BASE_URL}/submit_job`

      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_KEY}`,
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        if (
          String(response.status).startsWith('5') ||
          String(response.status).startsWith('4')
        ) {
          throw new Error(`Request timed out. Please try again`)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const url = await response.text()
      const dataUrl = url.replaceAll('"', '')

      return {
        status: 200,
        data: {
          url: dataUrl,
          prompt: data.prompt,
          neg_prompt: data.neg_prompt,
          num_iterations: Number(data.num_iterations),
          guidance_scale: Number(data.guidance_scale),
          width: Number(data.width),
          height: Number(data.height),
          seed: data.seed,
        },
      }
    } catch (error) {
      console.log(error.message, 'generateImage error')
      return { status: 500, message: error.message }
    }
  }
}

// 导出ImageRenderer类以便在其他文件中使用
export default Heurist;
