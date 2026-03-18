import { Redis } from "@upstash/redis";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { Checkpoint, CheckpointMetadata, CheckpointTuple, PendingWrite } from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Upstash Redis Checkpointer for LangGraph
 * Uses REST API with best practices from Upstash documentation
 * - Automatic JSON serialization
 * - Sliding expiration for active conversations
 * - Efficient batch operations
 */
export class UpstashRedisSaver extends BaseCheckpointSaver {
  private redis: Redis;
  private readonly TTL_SECONDS = 604800; // 7 days
  private readonly ACTIVE_TTL_SECONDS = 86400; // 24 hours for active conversations

  constructor(restUrl: string, restToken: string) {
    super();
    // @upstash/redis uses REST API by default with automatic serialization
    this.redis = new Redis({
      url: restUrl,
      token: restToken,
    });
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return undefined;

    const key = `checkpoint:${threadId}`;
    
    try {
      // Upstash automatically deserializes JSON
      const data = await this.redis.get<CheckpointTuple>(key);
      
      if (!data) return undefined;
      
      // Sliding expiration: extend TTL on access (active conversations stay alive)
      await this.redis.expire(key, this.ACTIVE_TTL_SECONDS);
      
      return data;
    } catch (e: any) {
      console.error("Redis getTuple error:", e.message);
      return undefined;
    }
  }

  async *list(config: RunnableConfig): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;

    const key = `checkpoint:${threadId}`;
    
    try {
      const data = await this.redis.get<CheckpointTuple>(key);
      if (data) {
        yield data;
      }
    } catch (e: any) {
      console.error("Redis list error:", e.message);
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

    try {
      // Upstash automatically serializes objects to JSON
      // Use shorter TTL for active conversations (will be extended on access)
      await this.redis.set(key, tuple, { ex: this.ACTIVE_TTL_SECONDS });
    } catch (e: any) {
      console.error("Redis put error:", e.message);
      // Don't throw - allow conversation to continue even if Redis fails
    }

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string
  ): Promise<void> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;

    const key = `writes:${threadId}:${taskId}`;
    
    try {
      // Store pending writes with automatic JSON serialization
      await this.redis.set(key, writes, { ex: this.ACTIVE_TTL_SECONDS });
    } catch (e: any) {
      console.error("Redis putWrites error:", e.message);
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      // Delete checkpoint
      const checkpointKey = `checkpoint:${threadId}`;
      await this.redis.del(checkpointKey);
      
      // Note: writes:* keys will auto-expire after TTL
      // For immediate cleanup, you'd need to scan and delete (expensive operation)
    } catch (e: any) {
      console.error("Redis deleteThread error:", e.message);
    }
  }

  /**
   * Get session statistics for monitoring
   */
  async getSessionStats(threadId: string): Promise<{ exists: boolean; ttl: number }> {
    try {
      const key = `checkpoint:${threadId}`;
      const exists = await this.redis.exists(key);
      const ttl = exists ? await this.redis.ttl(key) : -2;
      
      return { exists: exists === 1, ttl };
    } catch (e: any) {
      console.error("Redis getSessionStats error:", e.message);
      return { exists: false, ttl: -2 };
    }
  }
}
