import { ImagesResponse } from '../images'

// Base parameters for all models
export interface BaseGenParams {
    description: string
    model: string
    num_iterations?: number
    guidance_scale?: number
    seed?: number
}

// Parameters specific to SD models
export interface SDParams extends BaseGenParams {
    style?: 'realistic' | 'abstract' | 'artistic' | 'balanced'
    dimension?: '2D' | '3D' | 'isometric'
    quality?: 'normal' | 'high'
}

// Parameters specific to FLUX models
export interface FluxDimensions {
    stylization_level?: number  // 1-10
    detail_level?: number      // 1-10
    color_level?: number       // 1-10
    lighting_level?: number    // 1-10
}

export interface FluxParams extends BaseGenParams {
    dimensions?: Partial<FluxDimensions>
}

// Union type for all possible parameters
export type SmartGenParams = SDParams | FluxParams

export interface GenerationParams {
    prompt: string
    num_iterations: number
    guidance_scale: number
    negative_prompt?: string  // Only for SD models
    seed?: number
}

export interface SmartGenResponse extends ImagesResponse {
    originalDescription: string
    enhancedPrompt: string
}