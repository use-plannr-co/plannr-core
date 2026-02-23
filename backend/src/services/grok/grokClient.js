import OpenAI from 'openai';
import { ENV } from '../../config/env.js';

class GrokClient {
    constructor() {
        this.client = new OpenAI({
            apiKey: ENV.XAI_API_KEY,
            baseURL: 'https://api.x.ai/v1',
        });
        this.model = 'grok-4-fast-reasoning';
    }

    // Returns a raw async iterable stream (ChatCompletionChunk[])
    async createStreamingMessage(messages, tools, systemPrompt) {
        return this.client.chat.completions.create({
            model: this.model,
            max_tokens: 2048,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            tools,
            stream: true,
            stream_options: { include_usage: true },
        });
    }
}

export default new GrokClient();
