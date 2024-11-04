import { APIResource } from 'heurist/resource'
import { ImageGenerateParams, ImagesResponse } from '../images'
import OpenAI from 'openai'
import {
    FluxDimensions,
    FluxParams,
    GenerationParams,
    SDParams,
    SmartGenParams,
    SmartGenResponse
} from './types'

export * from './types'


export class SmartGen extends APIResource {
    private openai: OpenAI

    constructor(client) {
        super(client)
        const apiKey = process.env.HEURIST_API_KEY
        if (!apiKey) {
            throw new Error('HEURIST_API_KEY environment variable is required for SmartGen')
        }

        this.openai = new OpenAI({
            apiKey,
            baseURL: "https://llm-gateway.heurist.xyz",
        })
    }

    private getDefaultFluxDimensions(): FluxDimensions {
        return {
            stylization_level: 5,  // Balanced semi-stylized
            detail_level: 5,       // Balanced detail
            color_level: 5,        // Natural colors
            lighting_level: 5      // Balanced lighting
        }
    }

    private async enhanceFluxPrompt(description: string, dimensions?: Partial<FluxDimensions>): Promise<string> {
        const finalDimensions = {
            ...this.getDefaultFluxDimensions(),
            ...dimensions
        }

        const fluxPrompt = `
    Important techniques to create high-quality prompts: 
    1. Focus on detailed visual descriptions
    2. Include character details, environments, and lighting
    3. Describe the scene in a clear, narrative way
    4. Keep descriptions under 50 words
    5. Be direct and straightforward
    6. Avoid metaphors or "like" comparisons
    7. Match exactly the specified level for each dimension
    
    Example: A girl with blonde ponytail in a white dress stands confidently in a modern trading room. Holographic stock charts float around her. Moonlight streams through tall windows, casting blue highlights on her determined expression.
    
    Create a detailed prompt about: "${description}". We should control the prompt in these dimensions:
    
    Dimension: Stylization Level (Your target: ${finalDimensions.stylization_level})
    Controls the balance between realism and stylization
    1 --------- 5 --------- 10
    Photorealistic    Semi-Stylized    Highly Stylized
    
    1-2: Photorealistic, true-to-life
    3-4: High realism with slight artistic touch
    5-6: Balanced semi-stylized
    7-8: Clearly stylized art
    9-10: Highly abstract/artistic interpretation
    
    Dimension: Detail Complexity (Your target: ${finalDimensions.detail_level})
    Controls the level of detail and intricacy
    1 --------- 5 --------- 10
    Minimal         Balanced        Intricate
    
    1-2: Minimalist, essential elements only
    3-4: Clean and simple
    5-6: Balanced detail level
    7-8: Rich in detail
    9-10: Extremely intricate, hyper-detailed
    
    Dimension: Color Intensity (Your target: ${finalDimensions.color_level})
    Controls color saturation and vibrancy
    1 --------- 5 --------- 10
    Muted           Natural         Vibrant
    
    1-2: Monochromatic/grayscale
    3-4: Muted, subdued colors
    5-6: Natural, true-to-life colors
    7-8: Enhanced vibrancy
    9-10: Hyper-saturated, intense colors
    
    Dimension: Lighting Drama (Your target: ${finalDimensions.lighting_level})
    Controls lighting intensity and contrast
    1 --------- 5 --------- 10
    Soft            Balanced        Dramatic
    
    1-2: Flat, even lighting
    3-4: Soft, diffused lighting
    5-6: Standard balanced lighting
    7-8: High contrast, dramatic
    9-10: Extreme dramatic lighting
    
    Your task: Create a prompt about "${description}" that EXACTLY matches these levels:
    - Stylization level: ${finalDimensions.stylization_level}
    - Detail complexity: ${finalDimensions.detail_level}
    - Color intensity: ${finalDimensions.color_level}
    - Lighting drama: ${finalDimensions.lighting_level}
    
    Be descriptive and creative while strictly adhering to each dimension's specified level. Return only the prompt without quotes or other messages.`

        const completion = await this.openai.chat.completions.create({
            model: "mistralai/mixtral-8x7b-instruct",
            messages: [
                {
                    role: "system",
                    content: "You are an expert in writing prompts for AI art. Create prompts that precisely match the specified dimension levels."
                },
                {
                    role: "user",
                    content: fluxPrompt
                }
            ],
            max_tokens: 300,
            temperature: 0.7
        })

        return this.cleanPrompt(completion.choices[0]?.message?.content?.trim() || description)
    }

    private async enhanceSDPrompt(description: string, style?: string, dimension?: string): Promise<string> {
        const userPrompt = `Important techniques to create high-quality prompts:
            1. Always use tags separated by commas
            2. Use technical tags such as 4k, wide-angle, UHD
            3. Use () with numbers for emphasis (element:1.3)
            4. Include lighting and environment tags
            5. Maximum 16 tags
            6. Keep each tag brief
            Create a detailed prompt for: "${description}". Style should be ${style || 'balanced'} and perspective ${dimension || '2D'}. Return only comma-separated tags without quotes.`

        const completion = await this.openai.chat.completions.create({
            model: "mistralai/mixtral-8x7b-instruct",
            messages: [
                {
                    role: "system",
                    content: "You are an expert in writing prompts for AI art. You use accurate, descriptive, and creative language."
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            max_tokens: 300,
            temperature: 0.7
        })

        return this.cleanPrompt(completion.choices[0]?.message?.content?.trim() || description)
    }

    private cleanPrompt(prompt: string): string {
        try {
            // First clean any control characters that might cause JSON parsing issues
            prompt = prompt.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')

            if (prompt.startsWith('[') || prompt.startsWith('{')) {
                try {
                    const parsed = JSON.parse(prompt)
                    if (Array.isArray(parsed)) {
                        prompt = parsed[0]?.message?.content?.trim() || prompt
                    } else if (parsed.message?.content) {
                        prompt = parsed.message.content.trim()
                    }
                } catch (parseError) {
                    console.log('JSON parse error:', parseError)
                    // If JSON parsing fails, try to extract content using regex
                    const contentMatch = prompt.match(/"content":\s*"([^"]+)"/)
                    if (contentMatch && contentMatch[1]) {
                        prompt = contentMatch[1]
                    }
                }
            }
        } catch (e) {
            console.log('Error cleaning prompt:', e)
        }

        // Clean up any remaining quotes and whitespace
        prompt = prompt.replace(/^["'\s]+|["'\s]+$/g, '')

        return prompt || 'Default prompt if cleaning fails'
    }

    private getDefaultParameters(model: string, quality?: string): Pick<ImageGenerateParams, 'num_iterations' | 'guidance_scale'> {
        const isFluxModel = model?.includes('FLUX')

        const iterations = quality === 'high' ? 30 : 20
        const defaultGuidance = isFluxModel ? 3 : 6

        return {
            num_iterations: iterations,
            guidance_scale: defaultGuidance
        }
    }

    // Step 1: Get generation parameters
    async getGenerationParams(params: SmartGenParams): Promise<GenerationParams & { originalDescription: string }> {
        const isFluxModel = params.model?.includes('FLUX')
        let prompt: string

        if (isFluxModel) {
            const fluxParams = params as FluxParams
            prompt = await this.enhanceFluxPrompt(
                fluxParams.description,
                fluxParams.dimensions
            )
        } else {
            const sdParams = params as SDParams
            prompt = await this.enhanceSDPrompt(
                sdParams.description,
                sdParams.style,
                sdParams.dimension
            )
        }

        // Get default parameters
        const defaultParams = this.getDefaultParameters(
            params.model,
            isFluxModel ? undefined : (params as SDParams).quality
        )

        // Override with user-provided parameters
        const finalParams = {
            prompt,
            originalDescription: params.description,
            ...defaultParams,
            ...(params.num_iterations && { num_iterations: params.num_iterations }),
            ...(params.guidance_scale && { guidance_scale: params.guidance_scale }),
            ...(params.seed && { seed: params.seed }) // Add seed if provided
        }

        return finalParams
    }

    // Step 2: Generate image using parameters
    async generateImage(
        model: string,
        params: GenerationParams & { originalDescription: string }
    ): Promise<SmartGenResponse> {
        const response = await this._client.images.generate({
            model,
            prompt: params.prompt,
            num_iterations: params.num_iterations,
            guidance_scale: params.guidance_scale,
            ...(params.seed && { seed: params.seed }), // Add seed if provided
            ...(params.negative_prompt && { negative_prompt: params.negative_prompt })
        })

        return {
            url: response.url,
            model,
            enhancedPrompt: params.prompt,
            originalDescription: params.originalDescription
        }
    }

    // Convenience method that combines both steps
    async createAndGenerate(params: SmartGenParams): Promise<SmartGenResponse> {
        const generationParams = await this.getGenerationParams(params)
        console.log('generationParams', generationParams)
        return this.generateImage(params.model, generationParams)
    }
}