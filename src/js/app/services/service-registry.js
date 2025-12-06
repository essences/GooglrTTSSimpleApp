import { GeminiService } from './gemini-service.js';
import { StorageService } from './storage-service.js';
import { HistoryService } from './history-service.js';
import * as CostUtils from './cost-utils.js';
import * as ScriptUtils from './script-utils.js';
import * as AsyncUtils from './async-utils.js';
import * as AudioUtils from './audio-utils.js';

export function createServiceRegistry() {
  const storageService = new StorageService();
  const historyService = new HistoryService();
  const geminiService = new GeminiService();
  const ttsClient = geminiService.getClient();

  return {
    storageService,
    historyService,
    geminiService,
    ttsClient,
    costUtils: CostUtils,
    scriptUtils: ScriptUtils,
    asyncUtils: AsyncUtils,
    audioUtils: AudioUtils
  };
}

export const defaultServiceRegistry = createServiceRegistry();
