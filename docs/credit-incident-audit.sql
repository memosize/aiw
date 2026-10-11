-- Run with a SELECT-only role against an explicitly selected database.
-- Only aggregate results are returned. No repair, migration or user identifiers.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';

WITH q AS (
  SELECT user_uuid,
    coalesce(sum(remaining) FILTER (WHERE remaining>0 AND expired_at>=now()),0) AS available,
    coalesce(sum(remaining) FILTER (WHERE remaining>0 AND expired_at<now()),0) AS expired,
    count(*) FILTER (WHERE expired_at IS NULL) AS null_expiry,
    bool_or(order_no='admin_manual') AS manual
  FROM service_quotas GROUP BY user_uuid
), o AS (
  SELECT user_uuid,count(*) AS purchases FROM orders WHERE status='paid' GROUP BY user_uuid
), c AS (
  SELECT user_uuid,coalesce(sum(credits) FILTER (WHERE expired_at>=now()),0) AS legacy
  FROM credits GROUP BY user_uuid
), owners AS (
  SELECT user_uuid FROM q UNION SELECT user_uuid FROM o UNION SELECT user_uuid FROM c
)
SELECT count(*) AS account_candidates,
  count(*) FILTER (WHERE o.purchases>0 AND coalesce(q.available,0)=0) AS paid_but_zero_service_quota,
  count(*) FILTER (WHERE o.purchases>1) AS multiple_purchases,
  count(*) FILTER (WHERE q.manual) AS manual_grants,
  count(*) FILTER (WHERE q.available>0) AS positive_available,
  count(*) FILTER (WHERE c.legacy>0 AND coalesce(q.available,0)=0) AS legacy_positive_service_zero,
  coalesce(sum(q.available),0) AS available_service_uses,
  coalesce(sum(q.expired),0) AS expired_unused_service_uses,
  coalesce(sum(q.null_expiry),0) AS quota_rows_without_expiry
FROM owners u LEFT JOIN q USING(user_uuid) LEFT JOIN o USING(user_uuid) LEFT JOIN c USING(user_uuid);

SELECT service_type,count(*) AS batches,
  coalesce(sum(remaining) FILTER (WHERE remaining>0 AND expired_at>=now()),0) AS available,
  coalesce(sum(remaining) FILTER (WHERE remaining>0 AND expired_at<now()),0) AS expired,
  count(*) FILTER (WHERE expired_at IS NULL) AS null_expiry,
  count(*) FILTER (WHERE remaining<0) AS negative_rows
FROM service_quotas GROUP BY service_type ORDER BY service_type;

-- Candidates only: old products may legitimately have no service quota mapping.
SELECT product_id,count(*) AS paid_orders,
  count(*) FILTER (WHERE NOT EXISTS(SELECT 1 FROM credits c WHERE c.order_no=o.order_no AND c.user_uuid=o.user_uuid AND c.trans_type='order_pay')) AS missing_purchase_credit,
  count(*) FILTER (WHERE NOT EXISTS(SELECT 1 FROM service_quotas q WHERE q.order_no=o.order_no AND q.user_uuid=o.user_uuid)) AS missing_service_batches,
  count(*) FILTER (WHERE expired_at IS NULL) AS null_expiry,
  count(*) FILTER (WHERE expired_at<=paid_at) AS expired_before_payment,
  min(created_at) AS first_order_at
FROM orders o WHERE status='paid' GROUP BY product_id ORDER BY product_id;

SELECT count(*) AS duplicate_order_service_groups FROM (
  SELECT user_uuid,order_no,service_type FROM service_quotas
  WHERE order_no IS NOT NULL AND order_no<>'' AND order_no<>'admin_manual'
  GROUP BY user_uuid,order_no,service_type HAVING count(*)>1
) duplicates;
COMMIT;
