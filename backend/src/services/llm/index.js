import GeminiClient from './geminiClient.js';

/**
 * LLM provider wrapper - allows swapping providers easily
 */
class LLMProvider {
    constructor() {
        this.client = new GeminiClient(); // Default to Gemini
    }

    /**
     * Parse tasks from text using configured LLM provider
     * @param {Object} params
     * @param {string} params.text - Text to parse
     * @param {Object} params.prefs - User preferences (optional)
     * @returns {Promise<{tasks: Array, usage: Object, provider: string, model: string}>}
     */
    async parseTasksFromText({ text, prefs = {} }) {
        if (!text || typeof text !== 'string') {
            throw new Error('Text input is required and must be a string');
        }

        if (text.length > 5000) {
            throw new Error('Input text too long (max 5000 characters)');
        }

        try {
            const result = await this.client.parseTasksFromText(text, prefs);

            return {
                ...result,
                provider: 'gemini',
                model: 'gemini-2.0-flash-lite',
            };
        } catch (error) {
            console.error('LLM parsing error:', error);
            throw error;
        }
    }

    /**
     * Attempt to repair invalid parse result
     * @param {string} originalText
     * @param {string} invalidResponse
     * @param {string} errorMessage
     * @returns {Promise<{tasks: Array, usage: Object, provider: string, model: string}>}
     */
    async repairTasksParse(originalText, invalidResponse, errorMessage) {
        try {
            const result = await this.client.repairTasksParse(
                originalText,
                invalidResponse,
                errorMessage
            );

            return {
                ...result,
                provider: 'gemini',
                model: 'gemini-2.0-flash-lite',
            };
        } catch (error) {
            console.error('LLM repair error:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new LLMProvider();
