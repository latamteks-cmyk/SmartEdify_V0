Gateway Service Monitoring

Overview
- Exposes Prometheus metrics at `GET /metrics` (configurable via `METRICS_ROUTE`).
- This folder contains a ready-to-import Grafana dashboard for the gateway.

Prometheus Scrape Example
```yaml
scrape_configs:
  - job_name: gateway-service
    metrics_path: /metrics
    static_configs:
      - targets: ['localhost:3000']
```

Grafana Dashboard
- File: `gateway-dashboard.json`
- Import in Grafana: Dashboards > Import > Upload JSON file > select a Prometheus datasource.

Included Panels (PromQL)
- Request rate by route/method: `sum by (route,method)(rate(gateway_http_requests_total[5m]))`
- Error rate (4xx/5xx): `sum by (status_code)(rate(gateway_http_requests_total{status_code=~"4..|5.."}[5m]))`
- HTTP latency p50/p95/p99: quantiles over `gateway_http_request_duration_seconds_bucket`
- Backend latency p95 by service: quantiles over `gateway_backend_request_duration_seconds_bucket`
- Rate limit hits by route: `sum by (route)(rate(gateway_rate_limit_hits_total[5m]))`
- Auth failures by reason: `sum by (reason)(rate(gateway_auth_failures_total[5m]))`

Notes
- Metric prefix defaults to `gateway_`. If changed (`METRICS_PREFIX`), update panel queries accordingly.

