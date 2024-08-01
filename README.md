# Heurist TypeScript API Library

[![NPM version](https://img.shields.io/npm/v/heurist.svg)](https://npmjs.org/package/heurist)

This library provides convenient access to the Heurist REST API from TypeScript or JavaScript.

The full API documentation can be found in [docs](https://sdk.heurist.ai/).

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

async function chat() {
  const response = await heurist.chat.completions.create({
    model: 'dolphin-2.9-llama3-8b',
    messages: [{
      role: 'system',
      content: 'You are a helpful AI assistant'
    },
    {
      role: 'user',
      content: 'Explain Ethereum in 2 sentences'
    }],
    // below are optional
    temperature: 0.7,
    max_tokens: 2048
  })
}

  // response
  // {
  //   "content": "Ethereum is a decentralized blockchain platform that enables developers to build and deploy smart contracts. It allows users to exchange value and perform transactions without the need for intermediaries like banks or financial institutions."
  //   ...
  // }

  async function workflow() {
    const upscalerTask = new UpscalerTask({
        consumer_id: 'example-id',
        image_url: 'https://example.com/sample.jpg'
    });

    const response = await heurist.workflow.executeWorkflowAndWaitForResult(upscalerTask);
  }

  // response
  // {
  //    "result": "xxxxxxx.png"
  //    ...
  // }

```

## Requirements

TypeScript >= 4.5 is supported.

The following runtimes are supported:

- Node.js 18 LTS or later ([non-EOL](https://endoflife.date/nodejs)) versions.
- Vercel Edge Runtime.
