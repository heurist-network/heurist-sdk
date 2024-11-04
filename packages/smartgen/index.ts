import { APIResource } from 'heurist/resource'
import { ImageGenerateParams, ImagesResponse } from '../images'
import OpenAI from 'openai'

export interface SmartGenParams {
    description: string
    style?: 'realistic' | 'abstract' | 'artistic' | 'balanced'
    dimension?: '2D' | '3D' | 'isometric'
    quality?: 'normal' | 'high'
    model: string
    // Optional manual overrides
    num_iterations?: number
    guidance_scale?: number
}

export interface SmartGenResponse extends ImagesResponse {
    originalDescription: string
    enhancedPrompt: string
}

export class SmartGen extends APIResource {
    private openai: OpenAI

    constructor(client) {
        super(client)
        this.openai = new OpenAI({
            apiKey: process.env.HEURIST_API_KEY,
            baseURL: "https://llm-gateway.heurist.xyz",
        })
    }

    private async enhancePromptWithLLM(description: string, style?: string, dimension?: string, model?: string): Promise<string> {
        const isFluxModel = model?.includes('FLUX')

        const systemPrompt = "You are an expert in writing prompts for AI art. You use accurate, descriptive, and creative language."

        const userPrompt = isFluxModel ?
            // Flux prompt template
            `Important techniques to create high-quality prompts: 
            1. Focus on detailed visual descriptions
            2. Include character details, environments, and lighting
            3. Describe the scene in a clear, narrative way
            4. Keep descriptions under 50 words
            5. Be direct and straightforward
            6. Avoid metaphors or "like" comparisons
            Example: A girl with blonde ponytail in a white dress stands confidently in a modern trading room. Holographic stock charts float around her. Moonlight streams through tall windows, casting blue highlights on her determined expression.
            Create a detailed about: "${description}". Include the visual style ${style || 'balanced'} and ${dimension || '2D'} perspective. Be descriptive and direct. Return only the description without quotes.` :
            // SD prompt template
            `Important techniques to create high-quality prompts:
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

        try {
            // Check if the response is a JSON string
            if (enhancedPrompt.startsWith('[') || enhancedPrompt.startsWith('{')) {
                const parsed = JSON.parse(enhancedPrompt)
                if (Array.isArray(parsed)) {
                    enhancedPrompt = parsed[0]?.message?.content?.trim() || description
                }
            }
        } catch (e) {
            // If JSON parsing fails, use the original string
            console.log('Error parsing LLM response:', e)
        }

        // Clean up any extra quotes or formatting
        enhancedPrompt = enhancedPrompt.replace(/^["'\s]+|["'\s]+$/g, '')

        return enhancedPrompt
    }

    private getDefaultParameters(model: string, quality: string = 'normal'): Pick<ImageGenerateParams, 'num_iterations' | 'guidance_scale'> {
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

    async create(params: SmartGenParams): Promise<SmartGenResponse> {
        const {
            description,
            style = 'balanced',
            dimension = '2D',
            quality = 'normal',
            model,
            // Allow optional parameter overrides
            num_iterations,
            guidance_scale
        } = params

        // Get enhanced prompt from LLM
        const enhancedPrompt = await this.enhancePromptWithLLM(description, style, dimension, model)
        console.log('enhancedPrompt', enhancedPrompt)

        // Get default parameters based on model and quality
        const defaultParams = this.getDefaultParameters(model, quality)

        // Override with user-provided parameters if they exist
        const finalParams = {
            ...defaultParams,
            ...(num_iterations && { num_iterations }),
            ...(guidance_scale && { guidance_scale })
        }

        // Generate the image
        const response = await this._client.images.generate({
            model,
            prompt: enhancedPrompt,
            ...finalParams
        })

        // Return only necessary fields
        return {
            url: response.url,
            model: response.model,
            enhancedPrompt,
            originalDescription: description
        }
    }
}