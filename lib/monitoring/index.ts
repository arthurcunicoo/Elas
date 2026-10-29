import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { nativeApplicationVersion, nativeBuildVersion, applicationId } from "expo-application";
import { Platform } from "react-native";
import { measuredFetch, requestOperation, type RequestMeasurement } from "./network";
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const monitoringEnabled = Boolean(
  dsn &&
  process.env.EXPO_PUBLIC_DEMO !== "1" &&
  (typeof __DEV__ === "undefined" || !__DEV__),
);
export const navigationIntegration = Sentry.reactNavigationIntegration();
Sentry.init({
  dsn,
  enabled: monitoringEnabled,
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  release: `${applicationId ?? Constants.expoConfig?.android?.package ?? "br.com.elasnacidade.app"}@${nativeApplicationVersion ?? Constants.expoConfig?.version ?? "unknown"}`,
  dist: nativeBuildVersion ?? "local",
  sendDefaultPii: false,
  enableAutoSessionTracking: true,
  enableNative: monitoringEnabled && Platform.OS !== "web",
  tracesSampleRate: 0.1,
  integrations: [navigationIntegration],
  beforeBreadcrumb(breadcrumb) {
    if (
      breadcrumb.category === "console" ||
      breadcrumb.category === "fetch" ||
      breadcrumb.category === "xhr"
    )
      return null;
    return breadcrumb;
  },
  beforeSend(event) {
    // Requests may contain auth codes or form payloads. Keep operational context only.
    delete event.user;
    delete event.extra;
    if (event.request)
      event.request = {
        method: event.request.method,
        url: event.request.url?.split(/[?#]/)[0],
      };
    return event;
  },
});
function record(measurement: RequestMeasurement) {
  const span = Sentry.getActiveSpan();
  span?.setAttribute("elas.operation", measurement.operation);
  span?.setAttribute("http.response.status_code", measurement.status);
  span?.setAttribute("elas.duration_ms", measurement.durationMs);
  span?.setAttribute("elas.outcome", measurement.outcome);
  // Expected cancellation and ordinary validation/authorization responses are not incidents.
  if (
    monitoringEnabled &&
    (measurement.status >= 500 ||
      ["network_error", "timeout"].includes(measurement.outcome))
  ) {
    Sentry.withScope((scope) => {
      scope.setFingerprint([
        "api.failure",
        measurement.operation,
        String(measurement.status),
        measurement.outcome,
      ]);
      scope.setContext("operation", measurement);
      Sentry.captureMessage(
        `API ${measurement.outcome}: ${measurement.operation}`,
        "error",
      );
    });
  }
}
export function monitoredFetch(fetcher: typeof fetch): typeof fetch {
  const observed = measuredFetch(fetcher, record);
  return (input, init) =>
    Sentry.startSpan({ name: requestOperation(input), op: "http.client" }, () =>
      observed(input, init),
    );
}
export function setMonitoringRoute(segments: readonly string[]) {
  Sentry.setTag("screen", segments.join("/") || "home");
}
export const withMonitoring = Sentry.wrap;
