import { useCompanionStore } from '../../store/useCompanionStore';
import { ContextBuilder } from './ContextBuilder';
import { MemoryRecallService } from '../../companion/recall/MemoryRecallService';

export class GeminiService {
  private static API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  private static lastRequestTimes: Record<string, number> = {};
  private static COOLDOWNS = {
    chat: 0, // No cooldown for manual chat
    spontaneous: 5 * 60 * 1000, // 5 minutes
    journal: 20 * 60 * 60 * 1000, // 20 hours
  };

  private static logRequest(source: string, prompt: string) {
    const timestamp = new Date().toISOString();
    const estTokens = Math.ceil(prompt.length / 4); // Very rough estimate
    console.log(`[Gemini] ${timestamp} | Source: ${source} | Est. Tokens: ${estTokens}`);
  }

  private static checkCooldown(source: string): boolean {
    const now = Date.now();
    const lastTime = this.lastRequestTimes[source] || 0;
    const cooldown = (this.COOLDOWNS as any)[source] || 0;

    if (now - lastTime < cooldown) {
      console.warn(`[Gemini] Request blocked for ${source} due to cooldown.`);
      return false;
    }

    this.lastRequestTimes[source] = now;
    return true;
  }

  static async chat(message: string): Promise<string> {
    const recallResults = MemoryRecallService.isRecallQuestion(message)
      ? MemoryRecallService.search({ text: message, limit: 3 })
      : [];

    if (MemoryRecallService.isRecallQuestion(message) && recallResults.length === 0) {
      return "I don't think I have a memory about that yet.";
    }

    const config = useCompanionStore.getState().config;
    if (!config.apiKey) {
      if (recallResults.length > 0) {
        const result = recallResults[0];
        return `I remember this from ${result.date || 'our history'}: ${result.content}`;
      }

      return "I need a Gemini API key to talk! Please add one in Settings > Companion.";
    }

    if (!this.checkCooldown('chat')) return '';

    const systemPrompt = ContextBuilder.buildSystemPrompt();
    const context = ContextBuilder.buildContext(message);
    const chatHistory = useCompanionStore.getState().chatHistory;

    this.logRequest('Chat', message);

    const recentHistory = chatHistory.slice(-6).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    try {
      const response = await fetch(`${this.API_URL}?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `System Instructions: ${systemPrompt}\n\nCurrent Context: ${context}` }]
            },
            ...recentHistory.map(h => ({
              role: h.role,
              parts: h.parts
            })),
            {
              role: 'user',
              parts: [{ text: message }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('Gemini API Error:', data.error);
        return `Sorry, I encountered an error: ${data.error.message}`;
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Failed to call Gemini API:', error);
      return "I'm having trouble connecting to my brain right now. Please check your internet connection.";
    }
  }

  static async generateSpontaneousMessage(trigger: string): Promise<string> {
    const config = useCompanionStore.getState().config;
    if (!config.apiKey) return '';

    if (!this.checkCooldown('spontaneous')) return '';

    const systemPrompt = ContextBuilder.buildSystemPrompt();
    const context = ContextBuilder.buildContext();

    this.logRequest('Spontaneous', trigger);

    try {
      const response = await fetch(`${this.API_URL}?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `System Instructions: ${systemPrompt}\n\nCurrent Context: ${context}\n\nTrigger Event: ${trigger}\n\nGenerate a short, spontaneous comment (max 15 words) about this event. Be natural.` }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 60,
          }
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch {
      return '';
    }
  }

  static async generateDailyReflection(): Promise<string> {
    const config = useCompanionStore.getState().config;
    if (!config.apiKey) return '';

    if (!this.checkCooldown('journal')) return '';

    const systemPrompt = ContextBuilder.buildSystemPrompt();
    const context = ContextBuilder.buildContext();

    this.logRequest('Journal', 'Daily Reflection');

    try {
      const response = await fetch(`${this.API_URL}?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `System Instructions: ${systemPrompt}\n\nCurrent Context: ${context}\n\nIt is the end of the day. Write a brief reflection on the user's progress today. Mention specific tasks if possible. Keep it encouraging and under 100 words.` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          }
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch {
      return '';
    }
  }

  static async generateJournalReflection(prompt: string): Promise<string> {
    const config = useCompanionStore.getState().config;
    if (!config.apiKey) return '';

    this.logRequest('Journal Reflection', prompt);

    try {
      const response = await fetch(`${this.API_URL}?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 180,
          }
        })
      });

      const data = await response.json();
      if (data.error) {
        console.error('Gemini API Error:', data.error);
        return '';
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (error) {
      console.error('Failed to generate journal reflection:', error);
      return '';
    }
  }

  static async generateJournalSummary(prompt: string): Promise<string> {
    const config = useCompanionStore.getState().config;
    if (!config.apiKey) return '';

    this.logRequest('Journal Summary', prompt);

    try {
      const response = await fetch(`${this.API_URL}?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 240,
          }
        })
      });

      const data = await response.json();
      if (data.error) {
        console.error('Gemini API Error:', data.error);
        return '';
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (error) {
      console.error('Failed to generate journal summary:', error);
      return '';
    }
  }

  static async extractLongTermMemories(prompt: string): Promise<unknown[]> {
    const config = useCompanionStore.getState().config;
    if (!config.apiKey) return [];

    this.logRequest('Memory Extraction', prompt);

    try {
      const response = await fetch(`${this.API_URL}?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
          }
        })
      });

      const data = await response.json();
      if (data.error) {
        console.error('Gemini API Error:', data.error);
        return [];
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to extract long-term memories:', error);
      return [];
    }
  }
}
