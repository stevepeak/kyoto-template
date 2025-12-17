import { Experimental_Agent as Agent, Output } from 'ai'
import { z } from 'zod'

/**
 * Example Agent with Zod Schema
 *
 * This is a simple example showing how to create an AI agent that:
 * 1. Uses Zod for structured output validation
 * 2. Accepts input parameters
 * 3. Can be extended with custom tools
 *
 * ## How to Add Tools
 *
 * Tools allow the agent to interact with external systems. To add a tool:
 *
 * 1. Define your tool function:
 * ```typescript
 * const myTool = {
 *   description: 'Description of what the tool does',
 *   parameters: z.object({
 *     // Define input parameters using Zod
 *     query: z.string().describe('What to search for'),
 *   }),
 *   execute: async ({ query }: { query: string }) => {
 *     // Implement the tool logic
 *     return { result: `Searched for: ${query}` }
 *   },
 * }
 * ```
 *
 * 2. Add it to the agent's tools object:
 * ```typescript
 * const agent = new Agent({
 *   // ... other config
 *   tools: {
 *     myTool, // Add your tool here
 *     // You can add multiple tools
 *   },
 * })
 * ```
 *
 * 3. The agent will automatically be able to use your tool based on the task
 *
 * ## Example Tools You Might Want to Add
 *
 * - **readFile**: Read files from the filesystem
 * - **writeFile**: Write files to the filesystem
 * - **executeCommand**: Run terminal commands
 * - **fetchUrl**: Make HTTP requests
 * - **queryDatabase**: Query a database
 * - **callAPI**: Call external APIs
 */

// Define the output schema using Zod
export const exampleAgentOutputSchema = z.object({
  message: z.string().describe('A greeting message'),
  timestamp: z
    .string()
    .describe('ISO timestamp of when the message was generated'),
  data: z
    .object({
      count: z.number().describe('A sample number'),
      items: z.array(z.string()).describe('A sample array of strings'),
    })
    .optional()
    .describe('Optional structured data'),
})

export type ExampleAgentOutput = z.infer<typeof exampleAgentOutputSchema>

// Define the input type
export type ExampleAgentInput = {
  model: Parameters<typeof Agent>[0]['model']
  name?: string
}

/**
 * Example agent that demonstrates:
 * - Using Zod for output validation
 * - Structured output with the AI SDK
 * - Basic agent configuration
 *
 * @param input - Agent configuration including the model and optional name
 * @returns Promise resolving to the structured output
 */
export async function exampleAgent({
  model,
  name = 'World',
}: ExampleAgentInput): Promise<ExampleAgentOutput> {
  // Create the agent with structured output
  const agent = new Agent({
    model,
    system: `You are a helpful assistant that generates greeting messages.
Your responses must follow the exact schema provided.`,
    // Add tools here - see instructions above
    tools: {
      // Example: Add a simple tool
      // getCurrentTime: {
      //   description: 'Get the current time',
      //   parameters: z.object({}),
      //   execute: async () => {
      //     return { time: new Date().toISOString() }
      //   },
      // },
    },
    // Use structured output with Zod schema
    experimental_output: Output.object({
      schema: exampleAgentOutputSchema,
    }),
  })

  // Generate the response
  const result = await agent.generate({
    prompt: `Generate a greeting message for ${name}. Include a timestamp and some sample data.`,
  })

  // Return the structured output (automatically validated by Zod)
  return result.experimental_output
}
