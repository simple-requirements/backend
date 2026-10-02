import type { Metric } from '@/projects/metrics.entity';

const METRIC_REFERENCE_PATTERN = /\[~(MET-\d{4})\]/g;

export interface RequirementMetricSnapshot {
    metricId: string;
    key: string;
    value: string;
}

export function parseMetricReferenceKeys(description: string | null): string[] {
    if (description === null || description.length === 0) return [];

    const keys = new Set<string>();
    for (const match of description.matchAll(METRIC_REFERENCE_PATTERN)) {
        keys.add(match[1]);
    }
    return [...keys];
}

/** Captures the metric values used by one requirement revision without altering its raw description. */
export function createRequirementMetricSnapshot(
    description: string | null,
    metrics: readonly Pick<Metric, 'id' | 'key' | 'value'>[],
): RequirementMetricSnapshot[] {
    const metricsByKey = new Map(metrics.map((metric) => [metric.key, metric]));

    return parseMetricReferenceKeys(description).flatMap((key) => {
        const metric = metricsByKey.get(key);
        return metric === undefined ? [] : [{ metricId: metric.id, key: metric.key, value: metric.value }];
    });
}

/** Renders only values captured in the supplied revision snapshot; unresolved placeholders stay unchanged. */
export function renderRequirementMetricSnapshot(
    description: string | null,
    snapshots: readonly RequirementMetricSnapshot[],
): string | null {
    if (description === null) return null;

    const valuesByKey = new Map(snapshots.map((snapshot) => [snapshot.key, snapshot.value]));
    return description.replace(METRIC_REFERENCE_PATTERN, (placeholder, key: string) => valuesByKey.get(key) ?? placeholder);
}
