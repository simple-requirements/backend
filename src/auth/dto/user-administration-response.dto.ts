import { ApiProperty } from '@nestjs/swagger';

import { AccountRole } from '@/auth/accounts/account-role.enum';
import { UserStatus } from '@/auth/accounts/user-status.enum';

export class UserAdministrationResponseDto {
    @ApiProperty({ format: 'uuid' })
    id!: string;

    @ApiProperty()
    username!: string;

    @ApiProperty({ format: 'email' })
    email!: string;

    @ApiProperty()
    displayName!: string;

    @ApiProperty({ enum: UserStatus })
    status!: UserStatus;

    @ApiProperty({ enum: AccountRole, nullable: true })
    role!: AccountRole | null;

    @ApiProperty({ format: 'date-time', nullable: true })
    emailVerifiedAt!: Date | null;

    @ApiProperty({ format: 'date-time' })
    createdAt!: Date;

    @ApiProperty({ format: 'date-time' })
    updatedAt!: Date;
}
