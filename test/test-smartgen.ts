// test/generate-samples.ts

import { Heurist } from '../packages';
import { SmartGen } from '../packages/smartgen';
import * as fs from 'fs/promises';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const TEST_CASES = [
    {
        description: "mountain",
        must_include: "reflection, mountains",
        stylization_level: 4
    },
    {
        description: "city",
        must_include: "neon lights, flying cars",
        lighting_level: 5,
        detail_level: 5
    },
    {
        description: "A coffe shop",
        examples: "Rustic wooden tables bathed in golden afternoon light, steam rising from artisanal coffee cups, vintage posters adorning exposed brick walls",
        detail_level: 1,
        stylization_level: 4
    }
];

async function ensureOutputDir(dirPath: string) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

async function downloadImage(url: string, filepath: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));
}

async function generateAndSave(heurist: Heurist, testCase: any, model: string, outputDir: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `${testCase.description.slice(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}`;
    
    try {
        // Generate with just the prompt first
        const paramResult = await heurist.smartgen.generateImage({
            ...testCase,
            image_model: model,
            is_sd: model.includes('SDXL'),
            prompt_only: true
        });

        // Save prompt to text file
        const promptPath = path.join(outputDir, `${baseFilename}_prompt.txt`);
        await fs.writeFile(
            promptPath,
            JSON.stringify(paramResult.parameters, null, 2)
        );

        // Generate the actual image
        const imageResult = await heurist.images.generate(paramResult.parameters as any);

        // Download and save the image
        const imagePath = path.join(outputDir, `${baseFilename}.png`);
        await downloadImage(imageResult.url, imagePath);

        console.log(`✓ Generated ${model} image for: ${testCase.description.slice(0, 50)}...`);
        console.log(`  - Prompt saved to: ${promptPath}`);
        console.log(`  - Image saved to: ${imagePath}`);
        console.log();

    } catch (error) {
        console.error(`✗ Failed to generate ${model} image for: ${testCase.description.slice(0, 50)}...`);
        console.error(error);
        console.log();
    }
}

async function main() {
    const heurist = new Heurist({
        apiKey: process.env.HEURIST_API_KEY
    });

    // Create output directory
    const outputDir = path.join(__dirname, 'generated_images');
    await ensureOutputDir(outputDir);

    // Models to test
    const models = ['SDXLUnstableDiffusersV11', 'FLUX.1-dev'];

    // Process each test case
    for (const testCase of TEST_CASES) {
        console.log(`\nProcessing test case: ${testCase.description.slice(0, 50)}...`);
        
        // Generate for each model
        for (const model of models) {
            await generateAndSave(heurist, testCase, model, outputDir);
        }
    }
}

// Run the script
main().catch(console.error);