import { METRIC_KEY_PATTERN } from '@/metrics/metric-key';

export interface ParsedMetricReference {
    key: string;
}
export interface InvalidMetricToken {
    token: string;
    reason: string;
}
export interface MetricParseResult {
    normalizedText: string;
    references: ParsedMetricReference[];
    definitions: never[];
    invalidTokens: InvalidMetricToken[];
    parseErrors: string[];
}

const TOKEN_PATTERN = /\[\s*~([^\]]*)\]/g;

export function parseInlineMetrics(text: string): MetricParseResult {
    const references: ParsedMetricReference[] = [];
    const definitions: never[] = [];
    const invalidTokens: InvalidMetricToken[] = [];
    const parseErrors: string[] = [];
    const normalizedText = text.replace(TOKEN_PATTERN, (token, raw: string) => {
        const content = raw.trim();
        if (content === '') return invalid(token, 'Metric token is empty');
        if (content.includes(':=') || content.includes('|')) {
            return invalid(token, 'Inline metric definitions are not supported; use [~MET-0001]');
        }
        const key = content.trim();
        if (!METRIC_KEY_PATTERN.test(key)) return invalid(token, 'Metric key must match MET-0001');
        references.push({ key });
        return `[~${key}]`;
    });
    return { normalizedText, references, definitions, invalidTokens, parseErrors };

    function invalid(token: string, reason: string): string {
        invalidTokens.push({ token, reason });
        parseErrors.push(`${token}: ${reason}`);
        return token;
    }
}
