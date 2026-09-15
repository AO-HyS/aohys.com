# Contrato canónico

| Producto       | Project ID | Dashboard ID | Insight Web Vitals | Hosts de producción                                                                                                                                                                   | Repositorio                                        |
| -------------- | ---------: | -----------: | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Casa-Roca      |     149384 |      1994984 | `IyfOehnD`         | `casa-roca.mx`, `www.casa-roca.mx`, `casa-roca-dashboard.vercel.app`                                                                                                                  | `/Users/corrortiz/Documents/AO/casa-roca`          |
| Nutri Plan     |     300217 |      1994989 | `lWhVCA79`         | `nutriplan-dashboard.a-ortizcrr.workers.dev`, `nutriplan-admin-dashboard.a-ortizcrr.workers.dev`, `nutriplan-landing.a-ortizcrr.workers.dev`                                          | `/Users/corrortiz/Documents/AO/nutri-plan`         |
| Barber Central |     408054 |      1994990 | `myY43lPD`         | `thebarbercentral.com`, `the-barber-central-landing.a-ortizcrr.workers.dev`, `the-barber-central-dashboard.a-ortizcrr.workers.dev`, `the-barber-central-admin.a-ortizcrr.workers.dev` | `/Users/corrortiz/Documents/AO/the-barber-central` |
| AO HyS         |     489978 |      1994991 | `2VGMGnj4`         | `aohys.com`, `www.aohys.com`                                                                                                                                                          | `/Users/corrortiz/Documents/AO/aohys`              |
| ETERIA         |     497229 |      1994992 | `AGBBUxMh`         | `momentos-eteria.com`                                                                                                                                                                 | `/Users/corrortiz/Documents/AO/eteria`             |

## Enlaces

- Casa-Roca: `https://us.posthog.com/project/149384/dashboard/1994984`
- Nutri Plan: `https://us.posthog.com/project/300217/dashboard/1994989`
- Barber Central: `https://us.posthog.com/project/408054/dashboard/1994990`
- AO HyS: `https://us.posthog.com/project/489978/dashboard/1994991`
- ETERIA: `https://us.posthog.com/project/497229/dashboard/1994992`

## Consultas

Usar `events` con límite temporal en cada consulta. Para Web Vitals, consultar `$web_vitals` y las propiedades verificadas `$web_vitals_LCP_value`, `$web_vitals_INP_value` y `$web_vitals_CLS_value`. Agrupar por `$host` cuando un proyecto tenga varias superficies. Calcular `quantileIf(0.75)`, `quantileIf(0.90)` y `quantileIf(0.95)` sólo sobre propiedades presentes; devolver `NULL` cuando el conteo sea cero.

Detectar fuga si `$host` o `$current_url` contiene `pages.dev`, `vercel.app` fuera del host productivo permitido, `localhost` o `127.0.0.1`.
