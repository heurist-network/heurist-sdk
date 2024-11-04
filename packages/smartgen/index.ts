import { APIResource } from 'heurist/resource'
import { ImageGenerateParams, ImagesResponse } from '../images'
import OpenAI from 'openai'

// Base parameters for all models
export interface BaseGenParams {
    description: string
    model: string
    num_iterations?: number
    guidance_scale?: number
    seed?: number  // Add seed
}

// Parameters specific to SD models
export interface SDParams extends BaseGenParams {
    style?: 'realistic' | 'abstract' | 'artistic' | 'balanced'
    dimension?: '2D' | '3D' | 'isometric'
    quality?: 'normal' | 'high'
}

// Parameters specific to FLUX models
export interface FluxDimensions {
    stylization_level?: number  // 1-10, default 5
    detail_level?: number      // 1-10, default 5
    color_level?: number       // 1-10, default 5
    lighting_level?: number    // 1-10, default 5
}

export interface FluxParams extends BaseGenParams {
    dimensions?: Partial<FluxDimensions>
}

// Union type for all possible parameters
export type SmartGenParams = SDParams | FluxParams

export interface GenerateParams {
    prompt: string
    num_iterations: number
    guidance_scale: number
    negative_prompt?: string
    seed?: number
    originalDescription: string  // Add this to ensure it's passed through
}

export interface SmartGenResponse extends ImagesResponse {
    originalDescription: string
    enhancedPrompt: string
}

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
            stylization_level: 5,
            detail_level: 5,
            color_level: 5,
            lighting_level: 5
        }
    }

    private createFluxPrompt(params: { description: string } & FluxDimensions): string {
        return `
Important techniques to create high-quality prompts: 
1. Focus on detailed visual descriptions
2. Include character details, environments, and lighting
3. Describe the scene in a clear, narrative way
4. Keep descriptions under 50 words
5. Be direct and straightforward
6. Avoid metaphors or "like" comparisons
Example: A girl with blonde ponytail in a white dress stands confidently in a modern trading room. Holographic stock charts float around her. Moonlight streams through tall windows, casting blue highlights on her determined expression.
Create a detailed prompt about: "${params.description}". We should control the prompt in these dimensions:
Dimension: Stylization Level
Controls the balance between realism and stylization
1 --------- 5 --------- 10
Photorealistic    Semi-Stylized    Highly Stylized

1-2: Photorealistic, true-to-life
3-4: High realism with slight artistic touch
5-6: Balanced semi-stylized
7-8: Clearly stylized art
9-10: Highly abstract/artistic interpretation

Dimension: Detail Complexity
Controls the level of detail and intricacy
1 --------- 5 --------- 10
Minimal         Balanced        Intricate

1-2: Minimalist, essential elements only
3-4: Clean and simple
5-6: Balanced detail level
7-8: Rich in detail
9-10: Extremely intricate, hyper-detailed

Dimension: Color Intensity
Controls color saturation and vibrancy
1 --------- 5 --------- 10
Muted           Natural         Vibrant

1-2: Monochromatic/grayscale
3-4: Muted, subdued colors
5-6: Natural, true-to-life colors
7-8: Enhanced vibrancy
9-10: Hyper-saturated, intense colors

Dimension: Lighting Drama
Controls lighting intensity and contrast
1 --------- 5 --------- 10
Soft            Balanced        Dramatic

1-2: Flat, even lighting
3-4: Soft, diffused lighting
5-6: Standard balanced lighting
7-8: High contrast, dramatic
9-10: Extreme dramatic lighting

Read the instruction and think carefully: We want to create a prompt about "${params.description}". Stylization level is ${params.stylization_level}. Detail complexity level is ${params.detail_level}. Color intensity level is ${params.color_level}. Lighting drama level is ${params.lighting_level}. You should integrate descriptions about these dimensions in a natural way.

Be descriptive and creative. Return only the prompt without quotes or other messages.`
    }

    private async enhanceFluxPrompt(description: string, dimensions?: Partial<FluxDimensions>): Promise<string> {
        const finalDimensions = {
            ...this.getDefaultFluxDimensions(),
            ...dimensions
        }

        const promptParams = {
            description,
            ...finalDimensions
        }

        const messages = [
            {
                role: "system" as const,
                content: "You are an expert in writing prompts for AI art. You use accurate, descriptive, and creative language."
            },
            {
                role: "user" as const,
                content: this.createFluxPrompt(promptParams)
            }
        ]

        const completion = await this.openai.chat.completions.create({
            model: "mistralai/mixtral-8x7b-instruct",
            messages,
            temperature: 0.5,  // Lowered for more consistent results
            max_tokens: 200
        })

        // Apply cleanPrompt to the LLM response
        const rawPrompt = completion.choices[0]?.message?.content?.trim() || description
        return this.cleanPrompt(rawPrompt)
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

        // Apply cleanPrompt to the LLM response
        const rawPrompt = completion.choices[0]?.message?.content?.trim() || description
        return this.cleanPrompt(rawPrompt)
    }

    private cleanPrompt(prompt: string): string {
        try {
            // First clean any control characters
            prompt = prompt.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')

            if (prompt.startsWith('[') || prompt.startsWith('{')) {
                try {
                    const parsed = JSON.parse(prompt)
                    if (Array.isArray(parsed)) {
                        // Handle array format
                        prompt = parsed[0]?.message?.content?.trim() || prompt
                    } else if (parsed.message?.content) {
                        // Handle single object format
                        prompt = parsed.message.content.trim()
                    } else if (typeof parsed === 'string') {
                        // Handle string format
                        prompt = parsed.trim()
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

            // Clean up any remaining quotes, whitespace, and escaped characters
            prompt = prompt
                .replace(/^["'\s]+|["'\s]+$/g, '')  // Remove quotes and whitespace at ends
                .replace(/\\n/g, ' ')  // Replace escaped newlines with spaces
                .replace(/\\"/g, '"')  // Replace escaped quotes with regular quotes
                .replace(/\s+/g, ' ')  // Replace multiple spaces with single space

            return prompt
        } catch (e) {
            console.log('Error cleaning prompt:', e)
            return prompt
        }
    }

    private getDefaultParameters(model: string, quality?: string): Pick<ImageGenerateParams, 'num_iterations' | 'guidance_scale'> {
        const isFluxModel = model?.includes('FLUX')
        // Set default iterations based on quality
        const iterations = quality === 'high' ? 30 : 20
        // Set default guidance scale based on model type
        const defaultGuidance = isFluxModel ? 3 : 6

        return {
            num_iterations: iterations,
            guidance_scale: defaultGuidance
        }
    }

    // Update getPrompt return type
    async getPrompt(params: SmartGenParams): Promise<GenerateParams> {
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

        const defaultParams = this.getDefaultParameters(
            params.model,
            isFluxModel ? undefined : (params as SDParams).quality
        )

        return {
            prompt,
            originalDescription: params.description,
            ...defaultParams,
            ...(params.num_iterations && { num_iterations: params.num_iterations }),
            ...(params.guidance_scale && { guidance_scale: params.guidance_scale }),
            ...(params.seed && { seed: params.seed })  // Pass seed through
        }
    }

    // Update generate method
    async generate(model: string, params: GenerateParams): Promise<SmartGenResponse> {
        const response = await this._client.images.generate({
            model,
            prompt: params.prompt,
            num_iterations: params.num_iterations,
            guidance_scale: params.guidance_scale,
            ...(params.negative_prompt && { negative_prompt: params.negative_prompt }),
            ...(params.seed && { seed: params.seed })  // Include seed in generation
        })

        return {
            url: response.url,
            model,
            enhancedPrompt: params.prompt,
            originalDescription: params.originalDescription  // Use the passed originalDescription
        }
    }

    // One-step convenience method remains the same
    async createImage(params: SmartGenParams): Promise<SmartGenResponse> {
        const generationParams = await this.getPrompt(params)
        return this.generate(params.model, generationParams)
    }
}