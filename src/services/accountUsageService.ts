import { invoke } from "@tauri-apps/api/core";
import type { 
  UsageEvent, 
  AggregatedUsageData
} from "../types/usage";
import type { AccountInfo } from "../types/account";
import { AnalyticsService } from "./analyticsService";
import { createLogger } from "../utils/logger";

const logger = createLogger("AccountUsageService");

export interface AccountUsageEventsResult {
  success: boolean;
  message: string;
  data?: {
    events: UsageEvent[];
    aggregatedData: AggregatedUsageData;
    totalEvents: number;
  };
}

// 与后端匹配的缓存结构
export interface AccountUsageCache {
  email: string;
  token: string;
  start_date: string;  // 后端使用 snake_case
  end_date: string;    // 后端使用 snake_case
  data: {
    events: UsageEvent[];
    aggregatedData: AggregatedUsageData;
    totalEvents: number;
  };
  saved_at: number;
}

export class AccountUsageService {
  /**
   * 获取账号的用量事件数据（包含事件明细和聚合数据）
   */
  static async getAccountUsageEvents(
    account: AccountInfo,
    startDate: number,
    endDate: number,
    teamId: number = 0
  ): Promise<AccountUsageEventsResult> {
    try {
      logger.info("📊 获取账号用量事件数据...", {
        email: account.email,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        teamId,
      });

      // 转换时间戳为字符串格式（使用毫秒时间戳字符串，与其他地方保持一致）
      const startDateStr = startDate.toString();
      const endDateStr = endDate.toString();

      // 分页获取所有事件数据
      const allEvents: UsageEvent[] = [];
      let page = 1;
      const pageSize = 100;
      let hasMoreData = true;
      let totalEventsCount = 0;

      while (hasMoreData) {
        logger.debug(`正在获取第 ${page} 页事件数据...`);
        
        const eventsResult = await AnalyticsService.getUsageEvents(
          account.token,
          teamId,
          startDateStr,
          endDateStr,
          page,
          pageSize
        );

        logger.debug(`第 ${page} 页结果:`, { 
          success: eventsResult.success, 
          hasData: !!eventsResult.data,
          message: eventsResult.message 
        });

        if (!eventsResult.success || !eventsResult.data) {
          if (page === 1) {
            // 第一页就失败，返回错误
            return {
              success: false,
              message: eventsResult.message || "获取事件数据失败",
            };
          } else {
            // 后续页面失败，使用已获取的数据
            logger.warn(`获取第 ${page} 页数据失败，使用已获取的数据`);
            break;
          }
        }

        const { usageEventsDisplay, totalUsageEventsCount } = eventsResult.data;
        totalEventsCount = totalUsageEventsCount || 0;

        // 检查是否有事件数据
        if (!usageEventsDisplay || usageEventsDisplay.length === 0) {
          logger.info(`第 ${page} 页没有事件数据，结束获取`);
          hasMoreData = false;
          break;
        }

        // 转换事件数据格式
        const convertedEvents = this.convertEventsData(usageEventsDisplay);
        allEvents.push(...convertedEvents);

        // 检查是否还有更多数据
        if (convertedEvents.length < pageSize || allEvents.length >= totalEventsCount) {
          hasMoreData = false;
        } else {
          page++;
        }

        logger.debug(`已获取 ${allEvents.length}/${totalEventsCount} 个事件`);
      }

      logger.info(`✅ 成功获取 ${allEvents.length} 个事件数据`);

      // 基于事件计算聚合数据
      const aggregatedData = this.calculateAggregatedData(allEvents);

      return {
        success: true,
        message: "获取账号用量事件数据成功",
        data: {
          events: allEvents,
          aggregatedData,
          totalEvents: totalEventsCount,
        },
      };

    } catch (error) {
      logger.error("❌ 获取账号用量事件数据失败:", error);
      return {
        success: false,
        message: `获取账号用量事件数据失败: ${error}`,
      };
    }
  }

  /**
   * 转换 API 返回的事件数据为 UsageEvent 格式
   */
  private static convertEventsData(rawEvents: any[]): UsageEvent[] {
    if (!rawEvents || !Array.isArray(rawEvents)) {
      logger.warn("⚠️ 无效的事件数据数组", rawEvents);
      return [];
    }

    return rawEvents.map((event: any) => {
      // API 返回的字段名是驼峰命名
      const tokenUsage = event.tokenUsage || event.token_usage;

      // 提取费用，优先使用 totalCents
      let costCents = 0;
      if (
        tokenUsage?.totalCents !== undefined &&
        tokenUsage.totalCents !== null
      ) {
        costCents = tokenUsage.totalCents;
      } else if (
        tokenUsage?.total_cents !== undefined &&
        tokenUsage.total_cents !== null
      ) {
        costCents = tokenUsage.total_cents;
      } else if (event.usageBasedCosts) {
        // usageBasedCosts 是字符串格式的美元金额，如 "0.48"
        const dollars = parseFloat(event.usageBasedCosts);
        if (!isNaN(dollars)) {
          costCents = dollars * 100;
        }
      } else if (
        event.requestsCosts !== undefined &&
        event.requestsCosts !== null
      ) {
        costCents = event.requestsCosts * 100;
      } else if (
        event.requests_costs !== undefined &&
        event.requests_costs !== null
      ) {
        costCents = event.requests_costs * 100;
      }

      // 解析时间戳（支持多种格式）
      let timestamp = 0;
      if (typeof event.timestamp === "string") {
        // 如果是纯数字字符串，直接转换
        const parsed = parseInt(event.timestamp);
        if (!isNaN(parsed)) {
          timestamp = parsed;
        } else {
          // 否则尝试作为 ISO 日期解析
          const dateTimestamp = new Date(event.timestamp).getTime();
          if (!isNaN(dateTimestamp)) {
            timestamp = dateTimestamp;
          } else {
            logger.warn("⚠️ 时间戳解析失败:", event.timestamp);
          }
        }
      } else if (typeof event.timestamp === "number") {
        timestamp = event.timestamp;
      } else {
        logger.warn("⚠️ 无法解析的时间戳类型:", typeof event.timestamp, event.timestamp);
      }

      return {
        timestamp,
        model_intent: event.model || "unknown",
        cost_cents: costCents,
        input_tokens: tokenUsage?.inputTokens || tokenUsage?.input_tokens || 0,
        output_tokens: tokenUsage?.outputTokens || tokenUsage?.output_tokens || 0,
        cache_write_tokens: tokenUsage?.cacheWriteTokens || tokenUsage?.cache_write_tokens || 0,
        cache_read_tokens: tokenUsage?.cacheReadTokens || tokenUsage?.cache_read_tokens || 0,
      } as UsageEvent;
    }).filter(event => event.timestamp > 0); // 过滤掉无效时间戳的事件
  }

  /**
   * 基于事件数据计算聚合数据
   */
  private static calculateAggregatedData(events: UsageEvent[]): AggregatedUsageData {
    const modelAggregations: Record<string, {
      input_tokens: number;
      output_tokens: number;
      cache_write_tokens: number;
      cache_read_tokens: number;
      total_cents: number;
    }> = {};

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheWriteTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCostCents = 0;

    // 按模型聚合数据
    events.forEach(event => {
      const model = event.model_intent || "unknown";

      if (!modelAggregations[model]) {
        modelAggregations[model] = {
          input_tokens: 0,
          output_tokens: 0,
          cache_write_tokens: 0,
          cache_read_tokens: 0,
          total_cents: 0,
        };
      }

      const inputTokens = event.input_tokens || 0;
      const outputTokens = event.output_tokens || 0;
      const cacheWriteTokens = event.cache_write_tokens || 0;
      const cacheReadTokens = event.cache_read_tokens || 0;
      const costCents = event.cost_cents || 0;

      modelAggregations[model].input_tokens += inputTokens;
      modelAggregations[model].output_tokens += outputTokens;
      modelAggregations[model].cache_write_tokens += cacheWriteTokens;
      modelAggregations[model].cache_read_tokens += cacheReadTokens;
      modelAggregations[model].total_cents += costCents;

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      totalCacheWriteTokens += cacheWriteTokens;
      totalCacheReadTokens += cacheReadTokens;
      totalCostCents += costCents;
    });

    // 转换为 ModelUsage 数组
    const aggregations = Object.entries(modelAggregations).map(([model, data]) => ({
      model_intent: model,
      input_tokens: data.input_tokens.toString(),
      output_tokens: data.output_tokens.toString(),
      cache_write_tokens: data.cache_write_tokens.toString(),
      cache_read_tokens: data.cache_read_tokens.toString(),
      total_cents: data.total_cents,
    }));

    return {
      aggregations,
      total_input_tokens: totalInputTokens.toString(),
      total_output_tokens: totalOutputTokens.toString(),
      total_cache_write_tokens: totalCacheWriteTokens.toString(),
      total_cache_read_tokens: totalCacheReadTokens.toString(),
      total_cost_cents: totalCostCents,
    };
  }

  /**
   * 保存账号用量数据到本地
   */
  static async saveAccountUsageCache(
    account: AccountInfo,
    startDate: number,
    endDate: number,
    events: UsageEvent[],
    aggregatedData: AggregatedUsageData,
    totalEvents: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 构造与后端匹配的数据结构
      const cache: AccountUsageCache = {
        email: account.email,
        token: account.token,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        data: {
          events,
          aggregatedData,
          totalEvents,
        },
        saved_at: Date.now(),
      };

      logger.debug("准备保存的缓存数据:", cache);

      const result = await invoke<any>("save_usage_data_cache", {
        cacheData: JSON.stringify(cache),
      });

      logger.info("💾 账号用量数据保存成功:", result);
      return result;
    } catch (error) {
      logger.error("❌ 保存账号用量数据失败:", error);
      return {
        success: false,
        message: `保存失败: ${error}`,
      };
    }
  }

  /**
   * 从本地加载账号用量数据
   */
  static async loadAccountUsageCache(
    email: string
  ): Promise<{
    success: boolean;
    data?: {
      events: UsageEvent[];
      aggregatedData: AggregatedUsageData;
      totalEvents: number;
      startDate: string;
      endDate: string;
      savedAt: number;
    };
    message?: string;
  }> {
    try {
      console.log("📂 调用 load_usage_data_cache...", { email });
      const result = await invoke<any>("load_usage_data_cache", { email });

      console.log("📦 后端返回结果:", {
        success: result.success,
        hasData: !!result.data,
        message: result.message,
      });

      if (result.success && result.data) {
        // 尝试解析返回的数据
        let cache: AccountUsageCache;
        
        if (typeof result.data === 'string') {
          // 如果是字符串，尝试解析 JSON
          console.log("🔄 后端返回字符串，尝试解析 JSON");
          try {
            cache = JSON.parse(result.data);
          } catch (parseError) {
            console.error("❌ JSON 解析失败:", parseError);
            return {
              success: false,
              message: "数据格式错误，无法解析",
            };
          }
        } else {
          // 直接使用对象
          cache = result.data as AccountUsageCache;
        }

        console.log("📋 解析后的缓存数据结构:", {
          email: cache.email,
          hasStartDate: !!cache.start_date,
          hasEndDate: !!cache.end_date,
          hasData: !!cache.data,
          dataKeys: cache.data ? Object.keys(cache.data) : [],
        });

        // 验证必要的字段
        if (!cache.data || !cache.data.aggregatedData) {
          console.warn("⚠️ 缓存数据不完整，缺少 aggregatedData");
          return {
            success: false,
            message: "缓存数据不完整",
          };
        }

        logger.info("✅ 成功加载账号用量数据", {
          email: cache.email,
          startDate: cache.start_date,
          endDate: cache.end_date,
          eventsCount: cache.data.events?.length || 0,
          totalEvents: cache.data.totalEvents,
        });

        return {
          success: true,
          data: {
            events: cache.data.events || [],
            aggregatedData: cache.data.aggregatedData,
            totalEvents: cache.data.totalEvents || 0,
            startDate: cache.start_date,
            endDate: cache.end_date,
            savedAt: cache.saved_at || Date.now(),
          },
        };
      } else {
        console.log("💡 未找到缓存数据");
        return {
          success: false,
          message: result.message || "未找到缓存数据",
        };
      }
    } catch (error) {
      logger.error("❌ 加载账号用量数据失败:", error);
      console.error("错误详情:", error);
      return {
        success: false,
        message: `加载失败: ${error}`,
      };
    }
  }

  /**
   * 检查缓存是否需要刷新（不检查时间范围，只用于判断是否需要重新获取相同时间范围的数据）
   */
  static shouldRefreshCache(
    savedAt: number,
    maxAge: number = 5 * 60 * 1000 // 5分钟
  ): boolean {
    // 检查缓存是否过期
    const age = Date.now() - savedAt;
    return age > maxAge;
  }

  /**
   * 获取账号用量数据并保存到本地
   */
  static async getAccountUsageAndSave(
    account: AccountInfo,
    startDate: number,
    endDate: number,
    teamId: number = 0
  ): Promise<AccountUsageEventsResult> {
    // 从 API 获取新数据
    logger.info("🔄 从 API 获取账号用量数据");
    const result = await this.getAccountUsageEvents(account, startDate, endDate, teamId);

    // 如果成功获取数据，保存到本地
    if (result.success && result.data) {
      await this.saveAccountUsageCache(
        account,
        startDate,
        endDate,
        result.data.events,
        result.data.aggregatedData,
        result.data.totalEvents
      );
      logger.info("💾 用量数据已保存到本地");
    }

    return result;
  }
}
