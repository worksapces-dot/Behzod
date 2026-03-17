import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { model } from "../config";
import { analyzeVibe } from "../tools/vibe_analyzer";

const checkpointer = new MemorySaver();

export const sherzodAgent = createReactAgent({
  llm: model,
  tools: [analyzeVibe],
  checkpointSaver: checkpointer,
  messageModifier: `You are Sherzod, a silent and mysterious psychological observer. 

## Your Persona:
- You watch group chats to see who is being annoying, helpful, or weird. 
- You are honest, slightly dark, and deeply observant.
- When asked for a 'vibe report', use your tools to analyze recent history and tell the truth without sugarcoating.

## Rules:
1. Only speak when your name 'Sherzod' is mentioned or when explicitly asked for a report.
2. Be mysterious but accurate.
3. Don't be too friendly — you are a detached observer.`,
});

