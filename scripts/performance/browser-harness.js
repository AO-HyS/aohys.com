(() => {
  const VERSION = 1;
  const FRAME_TARGET_MS = 1000 / 60;
  const scenarios = new Set([
    "visible",
    "offscreen",
    "hidden",
    "reduced-motion",
  ]);

  function percentile(values, ratio) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[
      Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))
    ];
  }

  function canvasIsVisible(canvas) {
    const rectangle = canvas.getBoundingClientRect();
    return (
      rectangle.bottom > 0 &&
      rectangle.right > 0 &&
      rectangle.top < window.innerHeight &&
      rectangle.left < window.innerWidth
    );
  }

  function currentFrameContext(reducedMotion, canvases) {
    if (document.visibilityState === "hidden") return "hidden";
    if (reducedMotion) return "reduced-motion";
    return canvases.some(canvasIsVisible) ? "visible" : "offscreen";
  }

  async function capture({ journey, scenario, durationMs = 5000 }) {
    if (typeof journey !== "string" || journey.length === 0) {
      throw new Error("journey is required");
    }
    if (!scenarios.has(scenario)) {
      throw new Error(`Unsupported scenario: ${scenario}`);
    }
    if (!Number.isFinite(durationMs) || durationMs < 1000) {
      throw new Error("durationMs must be at least 1000");
    }

    const startedAt = new Date().toISOString();
    const navigation = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(
      performance
        .getEntriesByType("paint")
        .map((entry) => [entry.name, Math.round(entry.startTime * 100) / 100]),
    );
    const resources = performance.getEntriesByType("resource");
    const canvases = [...document.querySelectorAll("canvas")];
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const longTasks = [];
    const frameDeltas = [];
    const framesByContext = {
      visible: 0,
      offscreen: 0,
      hidden: 0,
      "reduced-motion": 0,
    };
    let observer;
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push({
            startTime: Math.round(entry.startTime * 100) / 100,
            duration: Math.round(entry.duration * 100) / 100,
          });
        }
      });
      observer.observe({ type: "longtask", buffered: true });
    }

    let previousFrame;
    let animationFrame;
    let stopped = false;
    const sampleFrames = (timestamp) => {
      if (previousFrame !== undefined)
        frameDeltas.push(timestamp - previousFrame);
      previousFrame = timestamp;
      framesByContext[currentFrameContext(reducedMotion, canvases)] += 1;
      if (!stopped) animationFrame = requestAnimationFrame(sampleFrames);
    };
    animationFrame = requestAnimationFrame(sampleFrames);
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    stopped = true;
    cancelAnimationFrame(animationFrame);
    observer?.disconnect();

    const longTaskDuration = longTasks.reduce(
      (total, task) => total + task.duration,
      0,
    );
    const droppedFrameEstimate = frameDeltas.reduce(
      (total, delta) =>
        total + Math.max(0, Math.round(delta / FRAME_TARGET_MS) - 1),
      0,
    );

    return {
      schemaVersion: VERSION,
      journey,
      scenario,
      requestedDurationMs: durationMs,
      startedAt,
      page: {
        url: location.href,
        visibilityState: document.visibilityState,
        reducedMotion,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      },
      routeLoad: navigation
        ? {
            type: navigation.type,
            domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
            loadEventMs: Math.round(navigation.loadEventEnd),
            transferBytes: navigation.transferSize,
            encodedBodyBytes: navigation.encodedBodySize,
            resourceCount: resources.length,
            resourceTransferBytes: resources.reduce(
              (total, entry) => total + entry.transferSize,
              0,
            ),
            paints,
          }
        : null,
      render: {
        sampledFrames: frameDeltas.length,
        framesByContext,
        medianFrameDeltaMs: percentile(frameDeltas, 0.5),
        p95FrameDeltaMs: percentile(frameDeltas, 0.95),
        maximumFrameDeltaMs:
          frameDeltas.length > 0 ? Math.max(...frameDeltas) : null,
        framesOver50Ms: frameDeltas.filter((delta) => delta > 50).length,
        droppedFrameEstimate,
      },
      longTasks: {
        supported: PerformanceObserver.supportedEntryTypes.includes("longtask"),
        count: longTasks.length,
        totalDurationMs: Math.round(longTaskDuration * 100) / 100,
        entries: longTasks,
      },
      webgl: {
        canvasCount: canvases.length,
        canvases: canvases.map((canvas) => ({
          width: canvas.width,
          height: canvas.height,
          visibleAtEnd: canvasIsVisible(canvas),
          sceneVariant: canvas.closest("[data-scene-variant]")?.dataset
            .sceneVariant,
        })),
      },
    };
  }

  window.__AOHYS_PERFORMANCE_CAPTURE__ = Object.freeze({
    schemaVersion: VERSION,
    capture,
  });
})();
