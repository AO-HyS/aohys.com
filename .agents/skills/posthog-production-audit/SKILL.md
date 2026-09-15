---
name: posthog-production-audit
description: Audita bajo demanda la observabilidad real de producción en PostHog para Casa-Roca, ETERIA, AO HyS, Nutri Plan y Barber Central. Usa este skill cuando el usuario pida revisar analítica, tráfico, Core Web Vitals p75/p90/p95, errores, fricción, cobertura de eventos, fugas de preview o salud de instrumentación en esos productos.
---

# Auditar PostHog de producción

Producir una auditoría comparable entre ejecuciones. Leer [references/contract.md](references/contract.md) antes de consultar datos.

## Flujo

1. Consultar únicamente los proyectos solicitados; usar los cinco del contrato cuando no se especifique un subconjunto.
2. Cambiar explícitamente al proyecto correcto con PostHog MCP antes de cada consulta.
3. Verificar el esquema vivo con `read-data-schema`: eventos, propiedades necesarias y existencia reciente. Tratar “no visto en 30 días” como ausencia de datos, no como cobertura.
4. Consultar ventanas de 24 horas, 7 días y 30 días. Aplicar siempre el filtro de hosts productivos del contrato.
5. Medir como mínimo:
   - pageviews, usuarios y fecha del último evento;
   - rutas principales y eventos de producto;
   - excepciones, eventos con `error` o `failed`, rage clicks y dead clicks;
   - LCP, INP y CLS por host o superficie con p75, p90, p95 y tamaño de muestra;
   - eventos cuyo host o URL pertenezca a preview, desarrollo o localhost, con conteo y última aparición por ventana.
6. Presentar percentiles como `sin muestra` cuando el conteo sea cero. Conservar CLS igual a cero cuando sea una medición real.
7. Comparar 24 horas contra 7 días y usar 30 días como línea base. Marcar muestras menores de 20 como insuficientes para una conclusión estable.
8. Clasificar hallazgos por impacto y terminar con acciones verificables. Permanecer en modo lectura salvo que el usuario autorice cambios externos explícitos.
9. Si hay pageviews productivos pero no hay muestras recientes de Web Vitals, separar baja muestra de hueco de instrumentación: revisar fecha de release y el contrato de captura del repositorio antes de concluir que está roto.

Tratar contaminación encontrada sólo en la ventana de 30 días como deuda histórica; llamarla incidente vigente únicamente cuando también aparezca en 24 horas.

## Umbrales

Evaluar p75 como experiencia típica y p90/p95 como cola degradada:

- LCP: bueno <= 2500 ms; requiere mejora > 2500 ms; malo > 4000 ms.
- INP: bueno <= 200 ms; requiere mejora > 200 ms; malo > 500 ms.
- CLS: bueno <= 0.1; requiere mejora > 0.1; malo > 0.25.

Elevar una cola p95 mala aunque p75 sea buena. Distinguir regresión, bajo volumen e instrumentación ausente.

## Salida estable

Entregar una tabla por proyecto con:

`estado | muestra | pageviews | usuarios | errores | fricción | LCP p75/p90/p95 | INP p75/p90/p95 | CLS p75/p90/p95 | último evento`

Después incluir:

1. hallazgos P0-P3 con evidencia y ventana;
2. huecos de instrumentación separados de problemas de producto;
3. tres acciones prioritarias con repositorio responsable y señal de cierre;
4. enlaces directos al proyecto, dashboard e insight de Web Vitals;
5. una línea explícita sobre fugas de preview/local.

Redactar PII. No interpretar cero eventos como salud. No ocultar dominios rotos, proxies ausentes ni muestras insuficientes.
