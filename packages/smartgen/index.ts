import { APIResource } from 'heurist/resource'
import OpenAI from 'openai'

export interface SmartGenParams {
    description: string       // description of the image like "a dog chasing a boy" or an instruction "create an image of a dog"
    width?: number
    height?: number
    image_model?: string      // default: FLUX.1-dev
    language_model?: string   // default: nvidia/llama-3.1-nemotron-70b-instruct
    is_sd?: boolean           // true if we want to use stable diffusion prompt format (comma-separated phrases)
    must_include?: string     // this word/phrase will be always included in the prompt without altering
    examples?: string[]       // example prompt(s)
    negative_prompt?: string  // only applies to SD
    quality?: 'normal' | 'high', // 20 iterations for normal, 30 iterations for high
    num_iterations?: number   // if not specified, use 20 by default. if specified, this overrides quality setting
    guidance_scale?: number
    stylization_level?: number // 1-5
    detail_level?: number      // 1-5
    color_level?: number       // 1-5
    lighting_level?: number    // 1-5
    param_only?: boolean     // default is false. if this is true, only return the prompt and other params
}

interface CreatePromptParams {
    description: string;
    is_sd?: boolean,
    language_model?: string;
    must_include?: string;
    examples?: string[];
    stylization_level?: number;
    detail_level?: number;
    color_level?: number;
    lighting_level?: number;
}

export class SmartGen extends APIResource {
    private openai: OpenAI

    constructor(client) {
        super(client)
        const apiKey = this._client.apiKey
        if (!apiKey) {
            throw new Error('HEURIST_API_KEY environment variable is required for SmartGen')
        }

        this.openai = new OpenAI({
            apiKey,
            baseURL: "https://llm-gateway.heurist.xyz",
        })
    }

    private validateDimensionLevel(level?: number): number | undefined {
        if (level === undefined) return undefined;
        return Math.min(Math.max(Math.round(level), 1), 5);
    }

    async generateImage(params: SmartGenParams): Promise<
        | { parameters: Record<string, any> }
        | { url: string; parameters: Record<string, any> }
    > {
        // Set defaults
        const {
            description,
            width = 512,
            height = 512,
            image_model = 'FLUX.1-dev',
            language_model = 'nvidia/llama-3.1-nemotron-70b-instruct',
            is_sd = false,
            must_include,
            examples,
            negative_prompt = "(worst quality: 1.4), bad quality, nsfw",
            quality = 'normal',
            num_iterations,
            guidance_scale,
            stylization_level,
            detail_level,
            color_level,
            lighting_level,
            param_only = false
        } = params;

        // Prepare LLM prompt based on model type
        let enhancedPrompt = await this.enhancePrompt({
            description: params.description,
            is_sd: params.is_sd,
            must_include: params.must_include,
            examples: params.examples,
            language_model: params.language_model,
            stylization_level: this.validateDimensionLevel(params.stylization_level),
            detail_level: this.validateDimensionLevel(params.detail_level),
            color_level: this.validateDimensionLevel(params.color_level),
            lighting_level: this.validateDimensionLevel(params.lighting_level)
        });

        // Calculate iterations
        const iterations = num_iterations ?? (quality === 'high' ? 30 : 20);

        // Prepare generation parameters
        const generationParams = {
            model: image_model,
            width: width,
            height: height,
            prompt: enhancedPrompt,
            num_iterations: iterations,
            guidance_scale: guidance_scale ?? (is_sd ? 6 : 3),
            ...(is_sd && { neg_prompt: negative_prompt })
        };

        // Return just parameters if param_only is true
        if (param_only) {
            return { parameters: generationParams };
        }

        // Generate the image
        try {
            const response = await this._client.images.generate(generationParams);
            return {
                url: response.url,
                parameters: generationParams
            };
        } catch (error) {
            console.error('Image generation failed:', error);
            throw new Error('Failed to generate image: ' + (error as Error).message);
        }
    }

    private createSystemPrompt(): string {
        return `You are an expert in writing prompts for AI art generation. You excel at creating detailed and creative visual descriptions. Maintain consistent style and tone. Incorporating specific elements naturally. Learn from examples when provided. Always aim for clear, descriptive language that paints a creative picture.`;
    }

    private getDimensionGuideline(level: number | undefined, dimensionType: string): string | null {
        if (level === undefined) return null;

        // Ensure level is between 1-5
        const validLevel = Math.min(Math.max(Math.round(level), 1), 5);

        const guidelines = {
            stylization: {
                description: 'On a scale 1~5 Controls the balance between realism and stylization\n' +
                    '1: Photorealistic - true-to-life\n' +
                    '2: High realism with slight artistic touch\n' +
                    '3: Balanced blend of realism and artistic style\n' +
                    '4: Clearly stylized art\n' +
                    '5: Highly abstract/artistic interpretation',
            },
            detail: {
                description: 'On a scale 1~5 Controls the level of detail and intricacy\n' +
                    '1: Minimalist, essential elements only\n' +
                    '2: Clean and simple\n' +
                    '3: Balanced detail level\n' +
                    '4: Rich in details\n' +
                    '5: Extremely intricate, hyper-detailed',
            },
            color: {
                description: 'On a scale 1~5 Controls color intensity and saturation\n' +
                    '1: Monochromatic/grayscale\n' +
                    '2: Muted, subdued colors\n' +
                    '3: Natural, true-to-life colors\n' +
                    '4: Enhanced vibrancy\n' +
                    '5: Hyper-saturated, intense colors',
            },
            lighting: {
                description: 'On a scale 1~5 Controls lighting intensity and contrast\n' +
                    '1: Flat, even lighting\n' +
                    '2: Soft, diffused illumination\n' +
                    '3: Natural, balanced lighting\n' +
                    '4: High contrast, dramatic lighting\n' +
                    '5: Extreme dramatic lighting',
            }
        };

        const dimensionMap = {
            stylization: 'stylization',
            detail: 'detail',
            color: 'color',
            lighting: 'lighting'
        } as const;

        const dimension = dimensionMap[dimensionType as keyof typeof dimensionMap];
        if (!dimension) return null;
        if (validLevel == 3) return null; // eliminate middle value

        return `Dimension ${dimensionType.toUpperCase()}:\n` +
            `${guidelines[dimension].description}\n\n` +
            `We want to create a prompt with ${dimensionType} level ${validLevel}. Think carefully. Naturally integrate this aspect into your final prompt without explicitly mentioning the level number.`;
    }

    private createFluxUserPrompt(params: CreatePromptParams): string {
        const {
            description,
            must_include,
            examples,
            stylization_level,
            detail_level,
            color_level,
            lighting_level
        } = params;

        let prompt = `Create a detailed visual prompt following these guidelines:
    
    KEY REQUIREMENTS:
    - The prompt describes the contents and styles of the image. Don't say "create an image of ..." but just write the description.
    - Keep the final prompt under 50 words
    - Focus on visual elements and composition
    - Be direct and straightforward
    - Avoid metaphors or "like" comparisons
    - Integrate technical terms in photography or digital illustration
    
    CORE IMAGE DESCRIPTION:
    "${description}"
    `;

        if (must_include) {
            prompt += `\nREQUIRED ELEMENTS:
    Must include this description without altering the texts: "${must_include}"`;
        }

        if (examples) {
            prompt += `\nPROMPT FORMAT REFERENCE:
    Example prompt(s) to match format: ${examples.map((example, index) => `${index + 1}. ${example}`).join('\n    ')}`;
        }

        // Only add dimension guidelines section if any dimensions are specified
        const dimensions = [
            this.getDimensionGuideline(stylization_level, 'stylization'),
            this.getDimensionGuideline(detail_level, 'detail'),
            this.getDimensionGuideline(color_level, 'color'),
            this.getDimensionGuideline(lighting_level, 'lighting')
        ].filter(Boolean);

        if (dimensions.length > 0) {
            prompt += '\n\nYou should integrate descriptions about style dimensions in a natural way NEVER explicitly mention level number. NEVER say X/Y or Level X or dimension:X. NEVER copy guideline language. Let the dimension influence your word choice and descriptive style rather than listing them directly. Treat them as creative inspiration rather than technical requirements.\n' + dimensions.join('\n\n');
        }

        prompt += '\n\nReturn only the final prompt without any explanations or quotes. Ensure all specified aspects are implemented accurately.';

        return prompt;
    }

    private createStableDiffusionUserPrompt(params: CreatePromptParams): string {
        const {
            description,
            must_include,
            examples,
            stylization_level,
            detail_level,
            color_level,
            lighting_level
        } = params;

        let prompt = `Create a detailed visual prompt following these guidelines:

    - Structure: comma-separated descriptive words and phrases only
    - Length: maximum 15 tags
    - How to emphasis a keyword: use a tag like (keyword) or (keyword:1.2) for slight boost, (keyword:1.4) for strong boost. Never boost above 1.4.
    - Core elements first: subject, style, lighting, composition
    - Avoid complete sentences, action words (use, make, create), or metaphors
    - Be descriptive and straightforward and creative
    
    CORE IMAGE DESCRIPTION:
    "${description}"
    `;

        if (must_include) {
            prompt += `\nREQUIRED ELEMENTS:
    Must include this description without altering the texts: "${must_include}"`;
        }

        if (examples) {
            prompt += `\nPROMPT FORMAT REFERENCE:
    Example prompt(s) to match format: ${examples}`;
        }

        // Only add dimension guidelines section if any dimensions are specified
        const dimensions = [
            this.getDimensionGuideline(stylization_level, 'stylization'),
            this.getDimensionGuideline(detail_level, 'detail'),
            this.getDimensionGuideline(color_level, 'color'),
            this.getDimensionGuideline(lighting_level, 'lighting')
        ].filter(Boolean);

        if (dimensions.length > 0) {
            prompt += '\n\nYou should integrate descriptions about style dimensions in a natural way NEVER explicitly mention level number. NEVER say X/Y or Level X or dimension:X. NEVER copy guideline language. Let the dimension influence your word choice and descriptive style rather than listing them directly. Treat them as creative inspiration rather than technical requirements.\n' + dimensions.join('\n\n');
        }

        prompt += '\n\nReturn only the final prompt without any explanations or quotes. Ensure all specified aspects are implemented accurately.';

        return prompt;
    }

    private async enhancePrompt(params: CreatePromptParams): Promise<string> {
        const messages = [
            {
                role: "system" as const,
                content: this.createSystemPrompt()
            },
            {
                role: "user" as const,
                content: params.is_sd ? this.createStableDiffusionUserPrompt(params) : this.createFluxUserPrompt(params)
            }
        ];

        try {
            const completion = await this.openai.chat.completions.create({
                model: params.language_model ?? "mistralai/mixtral-8x7b-instruct",
                messages,
                temperature: 0.7,
                max_tokens: 200
            });

            const rawPrompt = completion.choices[0]?.message?.content?.trim() || params.description;
            return this.cleanPrompt(rawPrompt);
        } catch (error) {
            console.error('Failed to enhance FLUX prompt:', error);
            return params.description;
        }
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
                .replace(/;/g, ',')  // Replace semicolons with commas

            return prompt
        } catch (e) {
            console.log('Error cleaning prompt:', e)
            return prompt
        }
    }
}