import Anthropic from '@anthropic-ai/sdk';
import { ENV } from '../../config/env.js';

class ClaudeClient {
    constructor() {
        this.client = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });
        this.model = 'claude-opus-4-6';
    }

    // Returns an Anthropic MessageStream (async iterable)
    createStreamingMessage(messages, tools, systemPrompt) {
        return this.client.messages.stream({
            model: this.model,
            max_tokens: 2048,
            system: systemPrompt,
            tools,
            messages,
        });
    }
}

export default new ClaudeClient();
