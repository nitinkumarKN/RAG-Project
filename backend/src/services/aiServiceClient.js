import axios from 'axios';
import { env } from '../config/env.js';

export async function askAiService(question, documents) {
  const { data } = await axios.post(`${env.aiServiceUrl}/api/chat`, {
    question,
    documents,
  }, {
    timeout: 30000,
  });

  return data;
}
