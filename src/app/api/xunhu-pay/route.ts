import { getUserEmail, getUserUuid } from "@/services/user";
import { insertOrder, updateOrderSession } from "@/models/order";
import { respData, respErr } from "@/lib/resp";
import { Order } from "@/types/order";
import { findUserByUuid } from "@/models/user";
import { getSnowId } from "@/lib/hash";
import { getPricingPage } from "@/services/page";
import { PricingItem } from "@/types/blocks/pricing";
import { validateDiscountCode } from "@/models/discount";
import { handlePaidOrder } from "@/services/order";

const xunhuSdk = require("@/models/xunhu-sdk.js");

const CUSTOM_POLISHING_PRODUCTS: Record<
  string,
  {
    amount: number;
    interval: "one-time";
    currency: "cny";
    valid_months: number;
  }
> = {
  "polishing-resume": {
    amount: 39900,
    interval: "one-time",
    currency: "cny",
    valid_months: 6,
  },
  "polishing-ps-sop": {
    amount: 69900,
    interval: "one-time",
    currency: "cny",
    valid_months: 6,
  },
};

export async function POST(req: Request) {
  try {
    let {
      credits,
      currency,
      amount,
      interval,
      product_id,
      product_name,
      valid_months,
      cancel_url,
      discount_code,
      document_uuid,
      payment_method,
    } = await req.json();

    if (!cancel_url) {
      cancel_url =
        process.env.NEXT_PUBLIC_PAY_CANCEL_URL || process.env.NEXT_PUBLIC_WEB_URL;
    }

    if (!amount || !interval || !product_id) {
      return respErr("invalid params");
    }

    const page = await getPricingPage("zh");
    if (!page?.pricing?.items) {
      return respErr("invalid pricing table");
    }

    const item = page.pricing.items.find(
      (pricingItem: PricingItem) => pricingItem.product_id === product_id
    );
    const customPolishingProduct = CUSTOM_POLISHING_PRODUCTS[product_id];

    if (
      (!customPolishingProduct && !item) ||
      (customPolishingProduct &&
        (customPolishingProduct.interval !== interval ||
          customPolishingProduct.amount !== amount)) ||
      (!customPolishingProduct &&
        (!item?.amount ||
          !item?.interval ||
          item.interval !== interval ||
          item.amount !== amount))
    ) {
      return respErr("invalid xunhu checkout params");
    }

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth, please sign-in", 401);
    }

    // 新人专享包限购检查
    if (product_id === "newcomer-package") {
      const supabase = (await import("@/models/db")).getSupabaseClient();
      const { data: existingOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("user_uuid", user_uuid)
        .eq("product_id", "newcomer-package")
        .eq("status", "paid")
        .limit(1);
      if (existingOrders && existingOrders.length > 0) {
        return respErr("您已购买过新人专享包，每个账号限购1次");
      }
    }

    let user_email = await getUserEmail();
    if (!user_email) {
      const user = await findUserByUuid(user_uuid);
      if (user) {
        user_email = user.email;
      }
    }

    if (!user_email) {
      return respErr("invalid user");
    }

    let discountAmount = 0;
    let bonusCredits = 0;
    let finalAmount = amount;

    if (discount_code) {
      const validation = await validateDiscountCode(
        discount_code,
        user_uuid,
        product_id,
        amount
      );

      if (!validation.valid) {
        return respErr(validation.message);
      }

      discountAmount = validation.discountAmount || 0;
      bonusCredits = validation.bonusCredits || 0;
      finalAmount = Math.max(amount - discountAmount, 0);
    }

    const order_no = getSnowId();
    const created_at = new Date().toISOString();
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() + valid_months);

    const order: Order = {
      order_no,
      created_at,
      user_uuid,
      user_email,
      amount: finalAmount,
      interval,
      expired_at: expiredDate.toISOString(),
      status: "created",
      credits: (credits || 0) + bonusCredits,
      currency: currency || "cny",
      product_id,
      product_name,
      valid_months,
      discount_code,
      discount_amount: discountAmount,
      bonus_credits: bonusCredits,
      original_amount: amount,
      order_detail: document_uuid ? JSON.stringify({ document_uuid }) : undefined,
    };
    await insertOrder(order);

    if (finalAmount <= 0) {
      await handlePaidOrder({
        order_no,
        paid_detail: JSON.stringify({ free_order: true, discount_code }),
      });
      return respData({
        provider: "free",
        order_no,
        free_order: true,
      });
    }

    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "";
    const defaultPaymentUrl = process.env.XUNHU_PAYMENT_URL || "https://api.xunhupay.com/payment/do.html";
    const wechatPaymentUrl = process.env.XUNHU_WECHAT_PAYMENT_URL || "https://api2.xunhupay.com/payment/do.html";
    const paymentUrl = payment_method === "wechat" ? wechatPaymentUrl : defaultPaymentUrl;
    const polishingReturnUrl =
      document_uuid &&
      ["polishing-resume", "polishing-ps-sop"].includes(product_id)
        ? `${webUrl}/zh/study-abroad-consultation/result/${document_uuid}?provider=xunhupay&order_no=${order_no}`
        : null;

    const payment = await xunhuSdk.createPayment({
      appid: process.env.XUNHU_APP_ID,
      appSecret: process.env.XUNHU_APP_SECRET,
      paymentUrl,
      plugins: process.env.XUNHU_PLUGINS,
      order_id: order_no,
      money: (finalAmount / 100).toFixed(2),
      title: product_name,
      notify_url:         `${webUrl}/api/xunhu-notify`,
      return_url: polishingReturnUrl || `${webUrl}/zh/pay-success?provider=xunhupay&order_no=${order_no}`,
      callback_url: cancel_url,
      attach: JSON.stringify({
        user_uuid,
        user_email,
        product_id,
        document_uuid: document_uuid || undefined,
      }),
    });

    if (payment.errcode !== 0 || (!payment.url && !payment.url_qrcode)) {
      return respErr(payment.errmsg || "create xunhu payment failed");
    }

    await updateOrderSession(
      order_no,
      String(payment.openid || order_no),
      JSON.stringify({ ...payment, document_uuid: document_uuid || undefined })
    );

    return respData({
      provider: "xunhupay",
      order_no,
      payment_url: String(payment.url || payment.url_qrcode || ""),
      source: "xunhu-sdk",
    });
  } catch (e: any) {
    console.log("xunhu checkout failed: ", e);
    return respErr("xunhu checkout failed: " + e.message);
  }
}
