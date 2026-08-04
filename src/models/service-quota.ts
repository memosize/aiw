import { getSupabaseClient } from "@/models/db";

export type ServiceType = "ps_sop" | "recommendation" | "cover_letter" | "resume" | "universal";

export interface ServiceQuota {
  id?: number;
  user_uuid: string;
  service_type: ServiceType;
  remaining: number;
  order_no?: string;
  expired_at?: string;
  created_at?: string;
}

// 套餐 → 配额映射
export const PRODUCT_QUOTA_MAP: Record<string, Partial<Record<ServiceType, number>>> = {
  "ps-single": { ps_sop: 1 },
  "sop-single": { ps_sop: 1 },
  "recommendation-single": { recommendation: 1 },
  "coverletter-single": { cover_letter: 1 },
  "resume-single": { resume: 1 },
  "newcomer-package": { ps_sop: 2, resume: 1 },
  "single-school-package": { ps_sop: 3, recommendation: 2, resume: 1 },
  "multi-school-package": { ps_sop: 7, recommendation: 2, resume: 1 },
  "flexible-package-10": { universal: 10 },
  "all-in-one-package-20": { universal: 20 },
};

// Dify function_type → ServiceType 映射
export const FUNCTION_TYPE_TO_SERVICE: Record<string, ServiceType> = {
  "personal-statement": "ps_sop",
  "sop": "ps_sop",
  "recommendation-letter": "recommendation",
  "cover-letter": "cover_letter",
  "resume-generator": "resume",
  "revise-personal-statement": "ps_sop",
  "revise-sop": "ps_sop",
  "revise-recommendation-letter": "recommendation",
  "revise-cover-letter": "cover_letter",
};

/**
 * 为订单写入配额
 */
export async function addQuotasForOrder(
  userUuid: string,
  productId: string,
  orderNo: string,
  expiredAt: string
): Promise<void> {
  const quotaMap = PRODUCT_QUOTA_MAP[productId];
  if (!quotaMap) return;

  const supabase = getSupabaseClient();

  const { data: existingRows, error: existingError } = await supabase
    .from("service_quotas")
    .select("id")
    .eq("user_uuid", userUuid)
    .eq("order_no", orderNo)
    .limit(1);

  if (existingError) {
    console.error("查询订单服务配额失败:", JSON.stringify(existingError));
    throw existingError;
  }

  if (existingRows && existingRows.length > 0) {
    return;
  }

  const rows = Object.entries(quotaMap)
    .filter(([_, count]) => count && count > 0)
    .map(([serviceType, count]) => ({
      user_uuid: userUuid,
      service_type: serviceType,
      remaining: count,
      order_no: orderNo,
      expired_at: expiredAt,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("service_quotas").insert(rows);
  if (error) {
    console.error("写入服务配额失败:", JSON.stringify(error));
    throw error;
  }
}

/**
 * 获取用户某服务类型的可用配额总数
 */
export async function getAvailableQuota(
  userUuid: string,
  serviceType: ServiceType
): Promise<number> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("service_quotas")
    .select("remaining")
    .eq("user_uuid", userUuid)
    .eq("service_type", serviceType)
    .gt("remaining", 0)
    .gte("expired_at", now);

  if (error || !data) return 0;

  return data.reduce((sum: number, row: any) => sum + (row.remaining || 0), 0);
}

/**
 * 扣除1次配额，优先使用最早过期的
 */
export async function deductQuota(
  userUuid: string,
  serviceType: ServiceType
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // 查找最早过期且有余额的配额记录
  const { data, error } = await supabase
    .from("service_quotas")
    .select("id, remaining")
    .eq("user_uuid", userUuid)
    .eq("service_type", serviceType)
    .gt("remaining", 0)
    .gte("expired_at", now)
    .order("expired_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return false;

  const { error: updateError } = await supabase
    .from("service_quotas")
    .update({ remaining: data.remaining - 1 })
    .eq("id", data.id)
    .gt("remaining", 0); // 防止并发扣到负数

  return !updateError;
}

/**
 * 返还一次服务配额。refundKey 用于避免同一生成任务重复返还。
 */
export async function refundQuota(
  userUuid: string,
  serviceType: ServiceType,
  refundKey: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data: existingRefund, error: existingRefundError } = await supabase
    .from("service_quotas")
    .select("id")
    .eq("user_uuid", userUuid)
    .eq("service_type", serviceType)
    .eq("order_no", refundKey)
    .limit(1);

  if (existingRefundError) throw existingRefundError;
  if (existingRefund && existingRefund.length > 0) return true;

  const { data: activeQuota, error: activeQuotaError } = await supabase
    .from("service_quotas")
    .select("expired_at")
    .eq("user_uuid", userUuid)
    .eq("service_type", serviceType)
    .gte("expired_at", now)
    .order("expired_at", { ascending: false })
    .limit(1);

  if (activeQuotaError) throw activeQuotaError;

  const fallbackExpiration = new Date();
  fallbackExpiration.setMonth(fallbackExpiration.getMonth() + 3);
  const expiredAt = activeQuota?.[0]?.expired_at || fallbackExpiration.toISOString();

  const { error } = await supabase.from("service_quotas").insert({
    user_uuid: userUuid,
    service_type: serviceType,
    remaining: 1,
    order_no: refundKey,
    expired_at: expiredAt,
  });

  if (error) throw error;
  return true;
}

/**
 * 管理员手动增加指定服务类型的配额
 */
export async function addAdminQuota(
  userUuid: string,
  serviceType: ServiceType,
  amount: number,
  expiredAt: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("service_quotas").insert({
    user_uuid: userUuid,
    service_type: serviceType,
    remaining: amount,
    order_no: "admin_manual",
    expired_at: expiredAt,
  });
  if (error) {
    console.error("管理员添加配额失败:", JSON.stringify(error));
    throw error;
  }
}

/**
 * 获取用户所有配额记录（含已用完和未过期的）
 */
export async function getQuotaRecordsByUserUuid(
  userUuid: string,
  page: number = 1,
  limit: number = 100
): Promise<ServiceQuota[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("service_quotas")
    .select("*")
    .eq("user_uuid", userUuid)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error || !data) return [];
  return data;
}

/**
 * 获取用户所有服务类型的剩余次数汇总
 */
export async function getUserQuotaSummary(
  userUuid: string
): Promise<Record<ServiceType, number>> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("service_quotas")
    .select("service_type, remaining")
    .eq("user_uuid", userUuid)
    .gt("remaining", 0)
    .gte("expired_at", now);

  const summary: Record<ServiceType, number> = {
    ps_sop: 0,
    recommendation: 0,
    cover_letter: 0,
    resume: 0,
    universal: 0,
  };

  if (error || !data) return summary;

  data.forEach((row: any) => {
    if (row.service_type in summary) {
      summary[row.service_type as ServiceType] += row.remaining || 0;
    }
  });

  return summary;
}
