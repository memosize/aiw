import { findOrderByOrderNo } from "@/models/order";
import { handlePaidOrder } from "@/services/order";
import { queryXunhuPayment } from "@/services/xunhu-pay";
import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";

export async function POST(req: Request) {
  try {
    const { order_no } = await req.json();

    if (!order_no) {
      return respErr("missing order_no");
    }

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth", 401);
    }

    let order = await findOrderByOrderNo(order_no);
    if (!order) {
      return respErr("order not found");
    }

    if (order.user_uuid !== user_uuid) {
      return respErr("order not found");
    }

    if (order.status === "paid") {
      // 支付回调可能在配额写入前中断，重复验证时重试幂等的配额发放。
      await handlePaidOrder({
        order_no,
        paid_detail: "already_paid_verification",
      });

      return respData({
        status: "paid",
        product_name: order.product_name,
        credits: order.credits,
        amount: order.amount,
        currency: order.currency,
      });
    }

    const result = await queryXunhuPayment({ out_trade_order: order_no });

    if (result.errcode === 0 && result.data?.status === "OD") {
      await handlePaidOrder({
        order_no,
        paid_detail: JSON.stringify(result),
      });

      order = await findOrderByOrderNo(order_no);

      return respData({
        status: "paid",
        product_name: order?.product_name,
        credits: order?.credits,
        amount: order?.amount,
        currency: order?.currency,
      });
    }

    if (result.data?.status === "WP") {
      return respData({ status: "pending" });
    }

    return respData({
      status: "failed",
      message: result.errmsg || "payment not completed",
    });
  } catch (error: any) {
    console.log("xunhu verify failed:", error);
    return respErr("verify failed: " + error.message);
  }
}
