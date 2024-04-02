# Heurist TypeScript API Library

[![NPM version](https://img.shields.io/npm/v/heurist.svg)](https://npmjs.org/package/heurist)

This library provides convenient access to the Heurist REST API from TypeScript or JavaScript.

The full API documentation can be found in [docs](https://sdk.heurist.ai/).

## Installation

```sh
pnpm add heurist
```

## Usage

```ts
import Heurist from 'heurist'

const heurist = new Heurist({
  apiKey: process.env['HEURIST_API_KEY'], // This is the default and can be omitted
})

async function main() {
  const response = await heurist.images.generate({
    model: 'BrainDance',
  })

  // response
  // {
  //   url: 'https://heurist-images.s3.us-east-1.amazonaws.com/**********.png',
  //   model: 'BrainDance',
  //   prompt: 'xxxxxx',
  //   ...
  // }
}

main()
```

## Requirements

TypeScript >= 4.5 is supported.

The following runtimes are supported:

- Node.js 18 LTS or later ([non-EOL](https://endoflife.date/nodejs)) versions.
- Vercel Edge Runtime.
