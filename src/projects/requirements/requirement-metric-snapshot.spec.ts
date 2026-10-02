import { describe, expect, it } from 'vitest';

import type { Metric } from '@/projects/metrics.entity';
import {
    createRequirementMetricSnapshot,
    renderRequirementMetricSnapshot,
} from '@/projects/requirements/requirement-metric-snapshot';

function metric(id: string, key: string, value: string): Pick<Metric, 'id' | 'key' | 'value'> {
    return { id, key, value };
}

describe('requirement metric snapshots', () => {
    it('captures referenced values once, in placeholder order, and ignores unrelated metrics.', () => {
        const snapshots = createRequirementMetricSnapshot('First [~MET-0002], then [~MET-0001] and [~MET-0002].', [
            metric('one', 'MET-0001', '1000 ms'),
            metric('two', 'MET-0002', '2000 ms'),
            metric('three', 'MET-0003', '3000 ms'),
        ]);

        expect(snapshots).toEqual([
            { metricId: 'two', key: 'MET-0002', value: '2000 ms' },
            { metricId: 'one', key: 'MET-0001', value: '1000 ms' },
        ]);
    });

    it('renders only frozen values and leaves unresolved placeholders unchanged.', () => {
        expect(
            renderRequirementMetricSnapshot('Below [~MET-0001], unknown [~MET-9999], again [~MET-0001].', [
                { metricId: 'one', key: 'MET-0001', value: '2000 ms' },
            ]),
        ).toBe('Below 2000 ms, unknown [~MET-9999], again 2000 ms.');
    });
});
