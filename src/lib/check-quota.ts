import {
  ServiceType,
  FUNCTION_TYPE_TO_SERVICE,
  getAvailableQuota,
  deductQuota,
} from "@/models/service-quota";

/**
 * 根据 Dify function_type 检查并扣除1次服务配额
 * 优先扣对应类型，不足则扣通用配额
 */
export async function checkAndDeductQuota(
  userUuid: string,
  functionType: string
): Promise<{ ok: boolean; message?: string; deductedServiceType?: ServiceType }> {
  const serviceType = FUNCTION_TYPE_TO_SERVICE[functionType];
  if (!serviceType) {
    return { ok: false, message: "未知的服务类型" };
  }

  // 1. 先尝试扣对应类型配额
  const specificAvailable = await getAvailableQuota(userUuid, serviceType);
  if (specificAvailable > 0) {
    const ok = await deductQuota(userUuid, serviceType);
    if (ok) return { ok: true, deductedServiceType: serviceType };
  }

  // 2. 尝试扣通用配额
  if (serviceType !== "universal") {
    const universalAvailable = await getAvailableQuota(userUuid, "universal");
    if (universalAvailable > 0) {
      const ok = await deductQuota(userUuid, "universal");
      if (ok) return { ok: true, deductedServiceType: "universal" };
    }
  }

  // 3. 都不足
  const serviceNames: Record<ServiceType, string> = {
    ps_sop: "PS/SOP",
    recommendation: "推荐信",
    cover_letter: "Cover Letter",
    resume: "简历",
    universal: "通用",
  };

  return {
    ok: false,
    message: `${serviceNames[serviceType]}次数不足，请先购买套餐`,
  };
}
