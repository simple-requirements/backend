import { Metric } from '@/metrics/metric.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity({ name: 'requirement_metric_links' })
@Index('IDX_requirement_metric_links_metric_id', ['metricId'])
@Index('IDX_requirement_metric_links_requirement_id', ['requirementId'])
export class RequirementMetricLink {
    @PrimaryColumn({ type: 'uuid', name: 'requirement_id' })
    requirementId!: string;

    @PrimaryColumn({ type: 'uuid', name: 'metric_id' })
    metricId!: string;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @ManyToOne(() => Requirement, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requirement_id' })
    requirement!: Requirement;

    @ManyToOne(() => Metric, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'metric_id' })
    metric!: Metric;
}
