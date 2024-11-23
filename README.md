# Heurist TypeScript API Library

[![NPM version](https://img.shields.io/npm/v/heurist.svg)](https://npmjs.org/package/heurist)

This library provides convenient access to the Heurist REST API from TypeScript or JavaScript.

The full API documentation can be found in [docs](https://sdk.heurist.ai/).

## Requirements

TypeScript >= 4.5 is supported.

The following runtimes are supported:

- Node.js 18 LTS or later ([non-EOL](https://endoflife.date/nodejs)) versions.
- Vercel Edge Runtime.

## Installation

```sh
pnpm add heurist
```

## Get an API Key

Submit this form: https://dev-api-form.heurist.ai/ with a valid email and description of your use case.

## Usage

```ts
import Heurist from 'heurist'

const heurist = new Heurist({
  apiKey: process.env['HEURIST_API_KEY'], // This is the default and can be omitted
})

async function generateImage() {
  const response = await heurist.images.generate({
    model: 'BrainDance',
    prompt: '1girl',
    // below are optional
    neg_prompt: 'worst quality',
    num_iterations: 25,
    guidance_scale: 7.5,
    width: 1024,
    height: 768,
    seed: -1
  })

  // response
  // {
  //   "url": "https://heurist-images.s3.us-east-1.amazonaws.com/**********.png"
  //   ...
  // }
}

  async function workflow() {
    const upscalerTask = new UpscalerTask({
        consumer_id: 'example-id',
        image_url: 'https://example.com/sample.jpg',
        timeout_seconds: 300 // optional
    });

    const response = await heurist.workflow.executeWorkflowAndWaitForResult(upscalerTask);
  }

  // response
  // {
  //    "result": "xxxxxxx.png"
  //    ...
  // }

```

## SmartGen for Image Generation (Experimental)
> ⚠️ **Experimental Feature**: SmartGen is currently in beta. APIs and behaviors may change.

### Overview
SmartGen provides a high-level interface for generating images with enhanced prompt engineering and dimension controls. It supports both FLUX and Stable Diffusion models.

### Basic Example
```ts
import Heurist from 'heurist'

const heurist = new Heurist({
  apiKey: process.env['HEURIST_API_KEY']
})

const response = await heurist.smartgen.generateImage({
  description: "A futuristic cyberpunk portrait of a young woman",
  image_model: "FLUX.1-dev",
  stylization_level: 3,
  detail_level: 4,
  color_level: 5,
  lighting_level: 2
})
```

### Parameters and Controls
SmartGen accepts the following key parameters:
```ts
{
    // Basic settings
    description: string,    // Main image description
    width?: number
    height?: number

    // AI model settings
    image_model?: string,   // Default: FLUX.1-dev
    is_sd?: boolean          // Default: false. Set it to true if we want to use stable diffusion prompt format (comma-separated phrases)
    language_model?: string  // Default: nvidia/llama-3.1-nemotron-70b-instruct. For image prompt generation
    
    // Dimension controls (all optional, scale 1-5)
    stylization_level: number,  // Realism vs artistic style. 1: Photorealistic 5: Highly artistic
    detail_level: number,       // Amount of detail. 1: Minimalist 5: Extreme intricate
    color_level: number,        // Color intensity. 1: Monochromatic 5: Hyper-saturated
    lighting_level: number,     // Lighting drama. 1: Flat, even lighting 5: Extreme dramatic lighting
    
    // Optional parameters
    must_include?: string,       // Elements to always include without altering
    examples?: string[],         // Example prompts for reference
    quality?: 'normal' | 'high', // Controls iteration count
    num_iterations?: number      // Default is 20. If specified, this overrides quality setting
    guidance_scale?: number      // Default is 3 for Flux and 6 for Stable Diffusion
    negative_prompt?: string     // Negative prompt, only applies to Stable Diffusion
    param_only?: boolean         // Default: false. Set it to true if we want to return params without generating the image
}
```

### Two-Step Generation
You can split the generation process into two steps:
```ts
// Step 1: Get image generation parameters
const params = await heurist.smartgen.generateImage({
  description: "A cyberpunk cityscape",
  image_model: "FLUX.1-dev",
  stylization_level: 4,
  must_include: "neon lights, flying cars",
  param_only: true  // Don't generate image yet
})

// Review and modify parameters if needed
console.log(params.parameters.prompt)

// Step 2: Call `images.generate` API to generate with the same or modified parameters
const imageResult = await heurist.images.generate({
  ...params.parameters
  // You may change some fields
})
```

### Response Type in Parameter-only Mode (`param_only` set to true)
```ts
{
  parameters: {
    prompt: string,     // Enhanced prompt
    model: string,
    width: number,
    height: number,
    num_iterations: number,
    guidance_scale: number,
    neg_prompt?: string,
  }
}
```

### One-Step Generation
You can create an image with a simple description in one step:
```ts
const result = await heurist.smartgen.generateImage({
  description: "A cyberpunk cityscape",
  image_model: "FLUX.1-dev",
  stylization_level: 4,
  must_include: "neon lights, flying cars"
})

// Result image URL
console.log(result.url)

// You can inspect the image generation parameters
console.log(result.parameters)
```
### Demonstration
Here are two examples showcasing the progression from monochromatic to vibrant colors (`color_level` from 1 to 5):

#### Example 1: "A futuristic cyberpunk portrait of a young woman"
![image](https://imagedelivery.net/0LwqpAMWL2C8o12h9UoZew/e6ec7ba5-9d89-4e3e-5878-b09509088500/public)

#### Example 2: "Hot air balloons in the sky"
![image](https://imagedelivery.net/0LwqpAMWL2C8o12h9UoZew/def7efa4-6d38-48ac-c919-d242de544900/public)
