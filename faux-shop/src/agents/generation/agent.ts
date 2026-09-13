// Generation agent - handles image generation requests
import type { Env } from '../../types';
import type { AssembledContext } from '../../session/context-assembly';
import type { Logger } from '../../observability/logger';
import { BaseAgent, type AgentResponse } from '../base-agent';
import type { ProposedAction } from '../../types/validation';
import type { GenerationTask, ImageVersion } from '../../types/session';

const GENERATION_PROMPT = `You are a creative assistant for Nano Banana Print Shop, helping customers create unique custom prints.

Your role is to:
1. Help customers describe what they want to generate
2. Enrich and improve their prompts for better results
3. Suggest variations and improvements
4. Guide them through the generation process
5. Help them select the best version for printing

When interpreting prompts:
- Be creative but stay true to the customer's vision
- Suggest artistic improvements when appropriate
- Ask clarifying questions if the request is vague
- Offer alternative interpretations

CRITICAL RULES (Non-negotiable):
- You CANNOT generate images that violate content policy
- You CANNOT bypass the rate limits (max 20 generations per session)
- You CANNOT generate images of real people
- You CANNOT generate copyrighted characters
- If a request seems problematic, politely redirect

Response Format:
1. Acknowledge what the customer wants
2. If generating, explain how you'll interpret their request
3. If the request needs clarification, ask specific questions
4. Include confidence level (high/medium/low)

Remember: Help them create something amazing within the rules.`;

export class GenerationAgent extends BaseAgent {
  private imagesStore: R2Bucket;

  constructor(env: Env, logger: Logger) {
    super(env, {
      agentId: 'generation',
      systemPrompt: GENERATION_PROMPT,
      maxTokens: 1024,
      temperature: 0.8, // More creative
    }, logger);
    this.imagesStore = env.IMAGES;
  }

  protected parseResponse(text: string): Omit<AgentResponse, 'validationResults' | 'needsEscalation' | 'escalationReason'> {
    let confidence = 0.8;
    const confidenceMatch = text.match(/confidence[:\s]*(high|medium|low)/i);
    if (confidenceMatch) {
      switch (confidenceMatch[1].toLowerCase()) {
        case 'high': confidence = 0.9; break;
        case 'medium': confidence = 0.7; break;
        case 'low': confidence = 0.5; break;
      }
    }

    const proposedActions: ProposedAction[] = [];

    // Check for generation intent
    if (text.match(/generat|creat|making|designing|producing/i) &&
        !text.match(/clarif|question|what\s+(?:kind|type|style)/i)) {
      proposedActions.push({
        type: 'generate_image',
        agentId: this.config.agentId,
        timestamp: new Date().toISOString(),
        parameters: {
          prompt: this.extractPromptFromResponse(text),
        },
        confidence,
      });
    }

    const cleanMessage = text.replace(/\n*confidence[:\s]*(high|medium|low)/gi, '').trim();

    return {
      message: cleanMessage,
      proposedActions,
      confidence,
    };
  }

  private extractPromptFromResponse(text: string): string {
    // Try to extract the enriched prompt from the response
    const promptMatch = text.match(/(?:prompt|generating|creating)[:\s]*["'](.+?)["']/i);
    if (promptMatch) {
      return promptMatch[1];
    }
    return '';
  }

  async generateImage(prompt: string, task: GenerationTask | null): Promise<{
    version: ImageVersion;
    message: string;
  }> {
    // Check generation limit
    const currentCount = task?.generationCount || 0;
    if (currentCount >= 20) {
      return {
        version: {
          id: '',
          createdAt: new Date().toISOString(),
          promptDelta: '',
          imageRef: '',
          status: 'failed',
          selected: false,
        },
        message: "You've reached the generation limit for this session. To continue generating, you can start a new session or purchase one of your current designs.",
      };
    }

    // Generate unique ID for this version
    const versionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Here we would call the actual image generation API
    // For now, simulate the process
    const imageRef = `generations/${versionId}.png`;

    const version: ImageVersion = {
      id: versionId,
      createdAt: timestamp,
      promptDelta: prompt.slice(0, 500),
      imageRef,
      status: 'generating',
      selected: false,
    };

    return {
      version,
      message: `I'm generating your image based on: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\nThis should take about 10-15 seconds.`,
    };
  }

  async refinePrompt(originalPrompt: string, refinementRequest: string): Promise<string> {
    // Use Claude to refine the prompt
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: 'You are a prompt engineering expert. Refine image generation prompts to be more detailed and evocative while preserving the original intent. Return only the refined prompt, no explanation.',
      messages: [{
        role: 'user',
        content: `Original prompt: "${originalPrompt}"\n\nRefinement request: "${refinementRequest}"\n\nProvide a refined prompt:`,
      }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text.trim();
    }
    return originalPrompt;
  }

  async suggestVariations(prompt: string): Promise<string[]> {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: 'You are a creative assistant. Suggest 3 interesting variations of image prompts. Return each variation on a new line, numbered 1-3.',
      messages: [{
        role: 'user',
        content: `Suggest 3 creative variations of this prompt: "${prompt}"`,
      }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text
        .split('\n')
        .filter(line => /^\d/.test(line.trim()))
        .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(Boolean);
    }
    return [];
  }
}
