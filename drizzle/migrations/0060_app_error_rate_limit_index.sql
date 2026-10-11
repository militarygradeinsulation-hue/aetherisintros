-- Keep client error rate limiting cheap as the error table grows.
-- log_app_error filters by source + user_id + recent created_at on every report.
CREATE INDEX IF NOT EXISTS app_errors_rate_limit_idx
  ON public.app_errors (source, user_id, created_at DESC);
