# Keep-alive gratuito para Render

Render Free duerme el backend tras ~15 minutos sin tráfico. Para reducir cold starts, usa dos monitores externos gratuitos contra el endpoint más liviano:

```text
https://notitas-api.onrender.com/api/public/ping
```

## UptimeRobot

- Monitor Type: `HTTP(s)`
- Friendly Name: `Notitas API`
- URL: `https://notitas-api.onrender.com/api/public/ping`
- Monitoring Interval: `Every 5 minutes`
- HTTP Method: `GET`

## cron-job.org

- Title: `Notitas API keep-alive backup`
- URL: `https://notitas-api.onrender.com/api/public/ping`
- Schedule: cada `10 minutes`
- Method: `GET`
- Timeout: `60 seconds`
- Retry on failure: activado si está disponible

## Endpoint correcto

Usa `/api/public/ping`, no `/api/public/health`.

`/ping` solo comprueba que Spring Boot responde. `/health` también toca la base de datos y puede ser más pesado.
