import { describe, expect, it } from 'vitest';
import { parseInlineMetrics } from '@/metrics/inline/metric-inline-parser';

describe('parseInlineMetrics', () => {
    it.each(['[~MET-0001]', '[ ~MET-0001 ]'])('parses valid reference %s', (text) => {
        const result = parseInlineMetrics(text);
        expect(result.references).toEqual([{ key: 'MET-0001' }]);
        expect(result.normalizedText).toBe('[~MET-0001]');
        expect(result.parseErrors).toEqual([]);
    });

    it.each(['[~MET-0001 := 2000 ms]', '[~MET-0001 := 2000 ms | Max. latency]'])(
        'rejects unsupported inline definition syntax %s',
        (text) => {
            const result = parseInlineMetrics(text);
            expect(result.definitions).toEqual([]);
            expect(result.invalidTokens).toHaveLength(1);
            expect(result.parseErrors[0]).toContain('Inline metric definitions are not supported');
            expect(result.normalizedText).toBe(text);
        },
    );

    it.each([
        '[~]',
        '[~MET0001]',
        '[~MET-1]',
        '[~MET-00001]',
        '[~MET-0001 := ]',
        '[~MET-0001 | Max. latency]',
        '[~MET-0001 := 2000 ms | ]',
    ])('rejects invalid syntax %s', (text) => {
        const result = parseInlineMetrics(text);
        expect(result.invalidTokens).toHaveLength(1);
        expect(result.parseErrors).toHaveLength(1);
        expect(result.normalizedText).toBe(text);
    });

    it('parses multiple and duplicate plain references', () => {
        const result = parseInlineMetrics('A [~MET-0001] B [ ~MET-0001 ] C [ ~MET-0002 ]');
        expect(result.references).toEqual([{ key: 'MET-0001' }, { key: 'MET-0001' }, { key: 'MET-0002' }]);
        expect(result.definitions).toEqual([]);
        expect(result.normalizedText).toBe('A [~MET-0001] B [~MET-0001] C [~MET-0002]');
    });
});
