import { findOrderByOrderNo, updateOrderStatus } from "@/models/order";
import { getIsoTimestr } from "@/lib/time";
import Stripe from "stripe";
import { updateAffiliateForOrder } from "./affiliate";
import {
  findDiscountCodeByCode,
  findDiscountUsageByOrderNo,
  insertDiscountCodeUsage,
  updateDiscountCodeUsageCount,
} from "@/models/discount";
import { updateCreditForOrder } from "./credit";

export async function handlePaidOrder({
  order_no,
  paid_email = "",
  paid_detail,
}: {
  order_no: string;
  paid_email?: string;
  paid_detail: string;
}) {
  const order = await findOrderByOrderNo(order_no);
  if (!order) {
    throw new Error("invalid order");
  }

  if (order.status === "paid") {
    if (order.user_uuid) {
      await updateCreditForOrder(order);
    }
    return order;
  }

  if (order.status !== "created") {
    throw new Error("invalid order status");
  }

  const paid_at = getIsoTimestr();
  await updateOrderStatus(order_no, "paid", paid_at, paid_email, paid_detail);

  if (order.user_uuid) {
    // 套餐配额由 product_id 决定，不能依赖客户端传入的 credits 值。
    await updateCreditForOrder(order);

    if (order.discount_code) {
      const alreadyRecorded = await findDiscountUsageByOrderNo(order.order_no);
      if (!alreadyRecorded) {
        const discountCode = await findDiscountCodeByCode(order.discount_code);
        if (discountCode) {
          try {
            await insertDiscountCodeUsage({
              discount_code_id: discountCode.id,
              user_uuid: order.user_uuid,
              order_no: order.order_no,
              discount_amount: order.discount_amount || 0,
              bonus_credits: order.bonus_credits || 0,
            });
            await updateDiscountCodeUsageCount(discountCode.id);
          } catch (discountError: any) {
            console.error("[handlePaidOrder] discount usage error:", discountError?.message);
          }
        }
      }
    }

    await updateAffiliateForOrder(order);
  }

  console.log("handle paid order succeeded: ", order_no, paid_at, paid_email);

  return order;
}

export async function handleOrderSession(session: Stripe.Checkout.Session) {
  try {
    if (
      !session ||
      !session.metadata ||
      !session.metadata.order_no ||
      session.payment_status !== "paid"
    ) {
      throw new Error("invalid session");
    }

    const order_no = session.metadata.order_no;
    const paid_email =
      session.customer_details?.email || session.customer_email || "";
    const paid_detail = JSON.stringify(session);

    await handlePaidOrder({ order_no, paid_email, paid_detail });
  } catch (e) {
    console.log("handle order session failed: ", e);
    throw e;
  }
}
