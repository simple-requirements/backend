import { ApiProperty } from '@nestjs/swagger';

import { AccountRole } from '@/auth/accounts/account-role.enum';

const PROJECT_ROLES = [AccountRole.RequirementsEngineer, AccountRole.Developer, AccountRole.Viewer] as const;

export class ProjectMembershipResponseDto {
    @ApiProperty({ format: 'uuid' })
    userId!: string;

    @ApiProperty()
    username!: string;

    @ApiProperty()
    displayName!: string;

    @ApiProperty({ enum: PROJECT_ROLES })
    role!: AccountRole.RequirementsEngineer | AccountRole.Developer | AccountRole.Viewer;
}
