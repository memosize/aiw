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
    cn_amount: number;
    interval: "one-time";
    currency: "cny";
    valid_months: number;
  }
> = {
  "polishing-resume": {
    amount: 39900,
    cn_amount: 39900,
    interval: "one-time",
    currency: "cny",
    valid_months: 6,
  },
  "polishing-ps-sop": {
    amount: 69900,
    cn_amount: 69900,
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
    } = await req.json();

    if (!cancel_url) {
      cancel_url =
        process.env.NEXT_PUBLIC_PAY_CANCEL_URL || process.env.NEXT_PUBLIC_WEB_URL;
    }

    if (!amount || !interval || !currency || !product_id) {
      return respErr("invalid params");
    }

    const page = await getPricingPage("en");
    if (!page?.pricing?.items) {
      return respErr("invalid pricing table");
    }

    const item = page.pricing.items.find(
      (pricingItem: PricingItem) => pricingItem.product_id === product_id
    );
    const customPolishingProduct = CUSTOM_POLISHING_PRODUCTS[product_id];

    const isPriceValid = customPolishingProduct
      ? customPolishingProduct.cn_amount === amount &&
        customPolishingProduct.interval === interval &&
        customPolishingProduct.currency === currency
      : currency === "cny"
        ? item?.cn_amount === amount
        : item?.amount === amount && item?.currency === currency;

    if (
      (!customPolishingProduct && !item) ||
      (!customPolishingProduct &&
        (!item?.amount ||
          !item?.interval ||
          !item?.currency ||
          item.interval !== interval)) ||
      !isPriceValid
    ) {
      return respErr("invalid checkout params");
    }

    if (!["year", "month", "one-time"].includes(interval)) {
      return respErr("invalid interval");
    }

    const isSubscription = interval === "month" || interval === "year";

    if (interval === "year" && valid_months !== 12) {
      return respErr("invalid valid_months");
    }

    if (interval === "month" && valid_months !== 1) {
      return respErr("invalid valid_months");
    }

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth, please sign-in");
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
      finalAmount = amount - discountAmount;

      if (finalAmount < 0) {
        finalAmount = 0;
      }
    }

    const order_no = getSnowId();
    const created_at = new Date().toISOString();
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() + valid_months);

    if (isSubscription) {
      expiredDate.setTime(expiredDate.getTime() + 24 * 60 * 60 * 1000);
    }

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
      currency,
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
    const localePrefix = currency === "cny" ? "/zh" : "/en";

    const notifyUrl = `${webUrl}/api/xunhu-notify`;
    const returnUrl = `${webUrl}${localePrefix}/pay-success?provider=xunhupay&order_no=${order_no}`;
    const callbackUrl = cancel_url || `${webUrl}${localePrefix}/pricing`;

    const payment = await xunhuSdk.createPayment({
      appid: process.env.XUNHU_APP_ID,
      appSecret: process.env.XUNHU_APP_SECRET,
      paymentUrl: process.env.XUNHU_PAYMENT_URL,
      plugins: process.env.XUNHU_PLUGINS,
      order_id: order_no,
      money: (finalAmount / 100).toFixed(2),
      title: product_name,
      notify_url: notifyUrl,
      return_url: returnUrl,
      callback_url: callbackUrl,
      attach: JSON.stringify({
        user_uuid,
        product_id,
        locale: localePrefix.replace("/", ""),
      }),
    });

    if (payment.errcode !== 0 || (!payment.url && !payment.url_qrcode)) {
      return respErr(payment.errmsg || "create xunhu payment failed");
    }

    await updateOrderSession(
      order_no,
      String(payment.openid || order_no),
      JSON.stringify(payment)
    );

    return respData({
      provider: "xunhupay",
      order_no,
      payment_url: String(payment.url || payment.url_qrcode || ""),
    });
  } catch (e: any) {
    console.log("checkout failed: ", e);
    return respErr("checkout failed: " + e.message);
  }
}
