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

## Smart Generation (Experimental)
> ⚠️ **Experimental Feature**: Smart Generation is currently in beta. APIs and behaviors may change.

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
    description: string,    // Main image description
    image_model: string,   // Default: FLUX.1-dev
    
    // Dimension controls (all optional, scale 1-5)
    stylization_level: number,  // Realism vs artistic style
    detail_level: number,       // Amount of detail
    color_level: number,        // Color intensity
    lighting_level: number,     // Lighting drama
    
    // Optional parameters
    must_include?: string,     // Elements to always include
    examples?: string,         // Example prompts for reference
    quality?: 'normal' | 'high', // Controls iteration count
    param_only?: boolean       // Get params without generating
}
```

### Two-Step Generation
You can split the generation process into two steps:
```ts
// Step 1: Get generation parameters
const params = await heurist.smartgen.generateImage({
  description: "A cyberpunk cityscape",
  image_model: "FLUX.1-dev",
  stylization_level: 4,
  must_include: "neon lights, flying cars",
  param_only: true  // Don't generate image yet
})

// Review and modify parameters if needed
console.log(params.parameters.prompt)

// Step 2: Generate with the same or modified parameters
const imageResult = await heurist.smartgen.generateImage({
  ...params,
  param_only: false
})
```

### Response Types
Parameters Only Response
```ts
{
  parameters: {
    prompt: string,          // Enhanced prompt
    num_iterations: number,
    guidance_scale: number,
    model: string,
  }
}
```
Full Generation Response
```
{
  url: string,              // Generated image URL
  model: string,            // Model used
  enhancedPrompt: string,   // Final prompt used
  parameters: {             // Generation parameters
    num_iterations: number,
    guidance_scale: number
  }
}
```
### Demonstration
Here are two examples showcasing the progression from monochromatic to vibrant colors (`color_level` from 1 to 5):

#### Example 1: "A futuristic cyberpunk portrait of a young woman"
![image](https://imagedelivery.net/0LwqpAMWL2C8o12h9UoZew/e6ec7ba5-9d89-4e3e-5878-b09509088500/public)

#### Example 2: "Hot air balloons in the sky"
![image](https://imagedelivery.net/0LwqpAMWL2C8o12h9UoZew/def7efa4-6d38-48ac-c919-d242de544900/public)



