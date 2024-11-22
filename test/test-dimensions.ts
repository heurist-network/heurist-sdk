import { Heurist } from '../packages'
import fs from 'fs'
import path from 'path'
import https from 'https'

async function downloadImage(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`))
                return
            }

            const writeStream = fs.createWriteStream(filepath)
            response.pipe(writeStream)

            writeStream.on('finish', () => {
                writeStream.close()
                resolve()
            })

            writeStream.on('error', (err) => {
                fs.unlink(filepath, () => reject(err))
            })
        }).on('error', reject)
    })
}

async function main() {
    try {
        const heurist = new Heurist({
            apiKey: process.env.HEURIST_API_KEY
        })

        // Create test directory
        const testDir = path.join(process.cwd(), 'test_results', 'extreme_dimensions_test')
        fs.mkdirSync(testDir, { recursive: true })

        const results = []

        // Test cases for minimum and maximum dimensions
        const TEST_CASES = [
            {
                name: 'all_minimum',
                description: "A futuristic cyberpunk portrait of a young woman",
                stylization_level: 1,
                detail_level: 1,
                color_level: 1,
                lighting_level: 1
            },
            {
                name: 'all_maximum',
                description: "A futuristic cyberpunk portrait of a young woman",
                stylization_level: 5,
                detail_level: 5,
                color_level: 5,
                lighting_level: 5
            }
        ]

        for (const testCase of TEST_CASES) {
            console.log(`\nTesting ${testCase.name}`)
            console.log('Dimensions:', {
                stylization: testCase.stylization_level,
                detail: testCase.detail_level,
                color: testCase.color_level,
                lighting: testCase.lighting_level
            })

            // First get parameters
            const paramResult = await heurist.smartgen.generateImage({
                ...testCase,
                image_model: "FLUX.1-dev",
                param_only: true
            })

            if (!('parameters' in paramResult)) {
                throw new Error('Failed to get parameters')
            }

            // Save parameters
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const baseFilename = testCase.name

            const paramsPath = path.join(testDir, `${baseFilename}_${timestamp}_params.json`)
            fs.writeFileSync(paramsPath, JSON.stringify(paramResult.parameters, null, 2))

            // Generate image
            const imageResult = await heurist.smartgen.generateImage({
                ...testCase,
                image_model: "FLUX.1-dev",
                param_only: false
            })

            if (!('url' in imageResult)) {
                throw new Error('Failed to generate image')
            }

            // Download image
            const imagePath = path.join(testDir, `${baseFilename}_${timestamp}.png`)
            await downloadImage(imageResult.url, imagePath)

            results.push({
                testCase: testCase.name,
                dimensions: {
                    stylization: testCase.stylization_level,
                    detail: testCase.detail_level,
                    color: testCase.color_level,
                    lighting: testCase.lighting_level
                },
                parameters: paramResult.parameters,
                imageUrl: imageResult.url,
                savedFiles: {
                    parameters: paramsPath,
                    image: imagePath
                }
            })

            console.log(`✓ Generated for ${testCase.name}`)
            console.log(`  - Parameters saved to: ${paramsPath}`)
            console.log(`  - Image saved to: ${imagePath}`)
            console.log(`  - Enhanced prompt: ${paramResult.parameters.prompt}`)
            console.log('-'.repeat(80))
        }
    } catch (error) {
        console.error('Error:', error)
    }
}

main()