
import Randomstring from 'randomstring'

class Heurist {

  static renderImage() {
    console.log('ok')
  }
  /**
   * 
   * 根据给定的参数创建一个图像。
   * @param {Object} config - 包含图像创建选项的对象。
   * @param {string} config.AUTH_KEY - 用于身份验证的授权密钥，确保调用者有权访问该功能。
   * @param {number} config.width - 图像的宽度。
   * @param {number} config.height - 图像的高度。
   * @param {number} config.num_iterations - 执行迭代的次数。1-50
   * @param {number} config.guidance_scale - 指导尺度，用于调整生成过程中的某些参数影响力。1-20
   * @param {string} config.model - 使用的模型名称，指定进行生成或迭代使用的特定模型。
   * @param {string} [config.prompt] - （可选）用于生成图像或迭代的主要提示信息。
   * @param {string} [config.neg_prompt] - （可选）用于指定应避免生成内容的负面提示信息。
   * @param {number} [config.seed] - （可选）种子值，用于确保生成结果的可重复性。
   * @return {Object} 返回一个对象，其中包含一个`data`对象。`data`对象内部包含一个`url`属性，该属性是生成图像的URL链接。
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
