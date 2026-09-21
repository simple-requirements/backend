import type { Project } from '@/projects/projects.entity';

type DemoProject = Pick<Project, 'id' | 'name'>;

export const demoProjects: readonly DemoProject[] = [
    { id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001', name: 'Orion Workspace' },
    { id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1002', name: 'Nimbus Portal' },
    { id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003', name: 'Atlas Requirements' },
    { id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1004', name: 'Helios Dashboard' },
    { id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1005', name: 'Aquila Planning' },
    { id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1006', name: 'Nova Documentation' },
    { id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1007', name: 'Vega Traceability' },
    { id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1008', name: 'Polaris Backlog' },
];
