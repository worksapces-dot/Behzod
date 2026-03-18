import { Redis } from "@upstash/redis";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Upstash Redis Checkpointer for LangGraph
 * Super fast, serverless, persistent conversation memory
 */
export class UpstashRedisSaver extends BaseCheckpointSaver {
  private redis: Redis;

  constructor(redisUrl: string, redisToken: string) {
    super();
    this.redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return undefined;

    const key = `checkpoint:${threadId}`;
    const data = await this.redis.get(key);
    
    if (!data) return undefined;

    return data as CheckpointTuple;
  }

  async *list(config: RunnableConfig): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;

    const key = `checkpoint:${threadId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      yield data as CheckpointTuple;
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) throw new Error("thread_id required");

    const key = `checkpoint:${threadId}`;
    const tuple: CheckpointTuple = {
      config,
      checkpoint,
      metadata,
      parentConfig: config.configurable?.checkpoint_id
        ? { configurable: { thread_id: threadId, checkpoint_id: config.configurable.checkpoint_id } }
        : undefined,
    };

    // Store with 7 day expiration (604800 seconds)
    await this.redis.set(key, tuple, { ex: 604800 });

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_id: checkpoint.id,
      },
    };
  }
}
