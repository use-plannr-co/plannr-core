import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../../config/env.js';

class GeminiClient {
    constructor() {
        if (!ENV.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-lite',
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent structured output
                topK: 1,
                topP: 0.8,
                maxOutputTokens: 8192,
            },
        });
    }

    /**
     * Parse tasks from text using Gemini
     * @param {string} text - Raw text to parse
     * @param {Object} prefs - User preferences (optional)
     * @returns {Promise<{tasks: Array, usage: Object}>}
     */
    async parseTasksFromText(text, prefs = {}) {
        const prompt = this.buildParsingPrompt(text, prefs);

        try {
            const startTime = Date.now();
            const result = await this.model.generateContent(prompt);
            const endTime = Date.now();

            const response = await result.response;
            const responseText = response.text();

            // Extract usage info if available
            const usage = {
                promptTokens: response.usageMetadata?.promptTokenCount || 0,
                completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata?.totalTokenCount || 0,
                latencyMs: endTime - startTime,
            };

            // Parse JSON response
            let parsedTasks;
            try {
                // Clean up response text by removing markdown code blocks if present
                let cleanResponseText = responseText.trim();

                // Remove markdown code blocks (```json ... ``` or ``` ... ```)
                if (cleanResponseText.startsWith('```')) {
                    const lines = cleanResponseText.split('\n');
                    // Remove first line (```json or ```)
                    lines.shift();
                    // Remove last line (```)
                    if (lines[lines.length - 1].trim() === '```') {
                        lines.pop();
                    }
                    cleanResponseText = lines.join('\n').trim();
                }

                parsedTasks = JSON.parse(cleanResponseText);
            } catch (parseError) {
                throw new Error(`Invalid JSON response from LLM: ${parseError.message}`);
            }

            return {
                tasks: parsedTasks.tasks || [],
                usage,
            };
        } catch (error) {
            console.error('Gemini API error:', error);
            throw new Error(`LLM parsing failed: ${error.message}`);
        }
    }

    /**
     * Attempt to repair invalid LLM output
     * @param {string} originalText - Original input text
     * @param {string} invalidResponse - The invalid response from LLM
     * @param {string} errorMessage - Validation error message
     * @returns {Promise<{tasks: Array, usage: Object}>}
     */
    async repairTasksParse(originalText, invalidResponse, errorMessage) {
        const repairPrompt = this.buildRepairPrompt(originalText, invalidResponse, errorMessage);

        try {
            const startTime = Date.now();
            const result = await this.model.generateContent(repairPrompt);
            const endTime = Date.now();

            const response = await result.response;
            const responseText = response.text();

            const usage = {
                promptTokens: response.usageMetadata?.promptTokenCount || 0,
                completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata?.totalTokenCount || 0,
                latencyMs: endTime - startTime,
            };

            let parsedTasks;
            try {
                // Clean up response text by removing markdown code blocks if present
                let cleanResponseText = responseText.trim();

                // Remove markdown code blocks (```json ... ``` or ``` ... ```)
                if (cleanResponseText.startsWith('```')) {
                    const lines = cleanResponseText.split('\n');
                    // Remove first line (```json or ```)
                    lines.shift();
                    // Remove last line (```)
                    if (lines[lines.length - 1].trim() === '```') {
                        lines.pop();
                    }
                    cleanResponseText = lines.join('\n').trim();
                }

                parsedTasks = JSON.parse(cleanResponseText);
            } catch (parseError) {
                throw new Error(
                    `Repair attempt failed - still invalid JSON: ${parseError.message}`
                );
            }

            return {
                tasks: parsedTasks.tasks || [],
                usage,
            };
        } catch (error) {
            console.error('Gemini repair attempt failed:', error);
            throw error;
        }
    }

    buildParsingPrompt(text, prefs = {}) {
        return `You are a task parsing assistant. Convert the following text into a JSON array of FlexibleEvent objects.

IMPORTANT: Output ONLY valid JSON matching this exact schema. Do not include any markdown, explanations, or other text.

Schema:
{
  "tasks": [
    {
      "name": "string (required, 1-200 chars, the task name)",
      "type": "PERSONAL|MEETING|WORK|EVENT|EDUCATION|TRAVEL|RECREATIONAL|ERRAND|OTHER|BREAK (required, activity type)",
      "duration": "number (required, duration in minutes)",
      "priority": "LOW|MEDIUM|HIGH (required, task priority)",
      "deadline": "object {date: number, month: number, year: number} (optional, null if no deadline)",
      "id": "string (optional, will be auto-generated if not provided)"
    }
  ]
}

Rules:
1. Extract each distinct task/item from the text
2. Infer duration from hints like "2hrs", "30min", "quick call" (convert to minutes)
3. Choose appropriate activity type based on task context:
   - WORK: business tasks, coding, reports, meetings with colleagues
   - PERSONAL: personal errands, appointments, family time
   - MEETING: scheduled meetings, calls, conferences
   - EDUCATION: learning, courses, reading, research
   - TRAVEL: commuting, trips, transportation
   - RECREATIONAL: hobbies, entertainment, exercise, social activities
   - ERRAND: shopping, banking, admin tasks
   - EVENT: special occasions, parties, ceremonies
   - BREAK: rest, lunch, breaks
   - OTHER: if unclear or doesn't fit other categories
4. Set priority based on urgency indicators:
   - HIGH: "urgent", "asap", "critical", "important", due today
   - MEDIUM: normal tasks, this week deadlines
   - LOW: "when possible", "someday", "low priority"
5. Parse deadline dates:
   - "tomorrow": {date: ${new Date(Date.now() + 24 * 60 * 60 * 1000).getDate()}, month: ${new Date(Date.now() + 24 * 60 * 60 * 1000).getMonth() + 1}, year: ${new Date(Date.now() + 24 * 60 * 60 * 1000).getFullYear()}}
   - "next Friday", "Monday", etc.: calculate appropriate date
   - "by [date]", "due [date]": parse to ScheduleDate format
   - If no clear deadline: null
6. If no clear tasks found, return empty array
7. Ensure all required fields (name, type, duration, priority) are present

Current date: ${new Date().toISOString().split('T')[0]}

Input text:
${text}`;
    }

    buildRepairPrompt(originalText, invalidResponse, errorMessage) {
        return `The previous JSON output was invalid. Please fix it and output ONLY valid JSON.

Original text:
${originalText}

Previous invalid response:
${invalidResponse}

Error:
${errorMessage}

Output ONLY valid JSON matching the FlexibleEvent schema:
{
  "tasks": [
    {
      "name": "string (required, 1-200 chars, the task name)",
      "type": "PERSONAL|MEETING|WORK|EVENT|EDUCATION|TRAVEL|RECREATIONAL|ERRAND|OTHER|BREAK (required)",
      "duration": "number (required, duration in minutes)",
      "priority": "LOW|MEDIUM|HIGH (required)",
      "deadline": "object {date: number, month: number, year: number} (optional, null if no deadline)",
      "id": "string (optional)"
    }
  ]
}

Ensure all required fields (name, type, duration, priority) are present and valid.`;
    }
}

export default GeminiClient;
