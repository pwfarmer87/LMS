import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key',
});

export default openai;

export const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
