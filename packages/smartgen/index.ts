import { APIResource } from 'heurist/resource'
import { ImageGenerateParams, ImagesResponse } from '../images'
import OpenAI from 'openai'

export interface SmartGenParams {
    description: string
    style?: 'realistic' | 'abstract' | 'artistic' | 'balanced'
    dimension?: '2D' | '3D' | 'isometric'
    quality?: 'draft' | 'balanced' | 'high-detail'
    model: string
}

// Adding the missing interface definition
export interface SmartGenResponse extends ImagesResponse {
    originalDescription: string
    enhancedPrompt: string
}

export class SmartGen extends APIResource {
    private openai: OpenAI

    constructor(client) {
        super(client)
        this.openai = new OpenAI({
            apiKey: "mingruidev#5gds35j",
            baseURL: "https://llm-gateway.heurist.xyz",
        })
    }

    private async enhancePromptWithLLM(description: string, style?: string, dimension?: string, model?: string): Promise<string> {
        const isFluxModel = model?.includes('FLUX')

        const systemPrompt = isFluxModel ?
            `You are an expert in creating prompts for Flux AI art. Important techniques to create high-quality prompts: 
            1. Focus on detailed visual descriptions
            2. Include character details, environments, and lighting
            3. Describe the scene in a clear, narrative way
            4. Keep descriptions under 50 words
            5. Be direct and straightforward
            6. Avoid metaphors or "like" comparisons
            Example: A blonde anime character in a white dress stands confidently in a modern trading room. Holographic stock charts float around her. Moonlight streams through tall windows, casting blue highlights on her determined expression.` :
            `You are an expert in writing AI image generation prompts for Stable Diffusion. Important techniques:
            1. Separate tags with commas
            2. Use technical tags (4k, wide-angle, UHD)
            3. Use () with numbers for emphasis (element:1.3)
            4. Include lighting and environment tags
            5. Maximum 16 tags
            6. Keep each tag brief`

        const userPrompt = isFluxModel ?
            `Create a detailed visual description for: "${description}". Include the visual style ${style || 'balanced'} and ${dimension || '2D'} perspective. Be descriptive and direct. Return only the description without quotes.` :
            `Create a detailed prompt for: "${description}". Style should be ${style || 'balanced'} and perspective ${dimension || '2D'}. Return only comma-separated tags without quotes.`

        const completion = await this.openai.chat.completions.create({
            model: "mistralai/mixtral-8x7b-instruct",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            max_tokens: 300,
            temperature: 0.7
        })

        let enhancedPrompt = completion.choices[0]?.message?.content?.trim() || description

        // Clean up any extra quotes or formatting
        enhancedPrompt = enhancedPrompt.replace(/^["']|["']$/g, '').trim()

        return enhancedPrompt
    }

    private getParametersForQuality(quality: string = 'balanced'): Pick<ImageGenerateParams, 'num_iterations' | 'guidance_scale'> {
        switch (quality) {
            case 'draft':
                return {
                    num_iterations: 20,
                    guidance_scale: 5
                }
            case 'high-detail':
                return {
                    num_iterations: 40,
                    guidance_scale: 8
                }
            default:
                return {
                    num_iterations: 30,
                    guidance_scale: 7
                }
        }
    }

    async create(params: SmartGenParams): Promise<SmartGenResponse> {
        const {
            description,
            style = 'balanced',
            dimension = '2D',
            quality = 'balanced',
            model
        } = params

        // Get enhanced prompt from LLM
        const enhancedPrompt = await this.enhancePromptWithLLM(description, style, dimension, model)
        console.log('enhancedPrompt', enhancedPrompt)

        // Get optimal parameters
        const qualityParams = this.getParametersForQuality(quality)

        // Generate the image
        const response = await this._client.images.generate({
            model,
            prompt: enhancedPrompt,
            ...qualityParams
        })

        return {
            ...response,
            originalDescription: description,
            enhancedPrompt
        }
    }
}