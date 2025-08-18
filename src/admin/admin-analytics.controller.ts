import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminOnly } from '../auth/guards/admin-auth.guard';
import { Tenant } from '../database/entities';

@ApiTags('Admin - Analytics')
@ApiBearerAuth('admin-auth')
@ApiSecurity('admin-api-key')
@AdminOnly()
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'Verifications per provider' })
  @ApiResponse({ status: 200, description: 'Provider analytics returned' })
  async getVerificationsPerProvider(): Promise<
    Array<{
      providerName: string;
      total: number;
      completed: number;
      failed: number;
      pending: number;
      in_progress: number;
      expired: number;
      cancelled: number;
    }>
  > {
    const rows = await this.tenantRepository.query(
      `SELECT 
 				p.name AS provider_name,
 				COUNT(v.id)::int AS total,
 				COUNT(v.id) FILTER (WHERE v.status = 'completed')::int AS completed,
 				COUNT(v.id) FILTER (WHERE v.status = 'failed')::int AS failed,
 				COUNT(v.id) FILTER (WHERE v.status = 'pending')::int AS pending,
 				COUNT(v.id) FILTER (WHERE v.status = 'in_progress')::int AS in_progress,
 				COUNT(v.id) FILTER (WHERE v.status = 'expired')::int AS expired,
 				COUNT(v.id) FILTER (WHERE v.status = 'cancelled')::int AS cancelled
 			FROM providers p
 			LEFT JOIN verifications v ON v.provider_id = p.id
 			GROUP BY p.name
 			ORDER BY p.name ASC`,
    );
    return rows.map((r: any) => ({
      providerName: r.provider_name,
      total: Number(r.total || 0),
      completed: Number(r.completed || 0),
      failed: Number(r.failed || 0),
      pending: Number(r.pending || 0),
      in_progress: Number(r.in_progress || 0),
      expired: Number(r.expired || 0),
      cancelled: Number(r.cancelled || 0),
    }));
  }
}

@ApiTags('Admin - Analytics')
@ApiBearerAuth('admin-auth')
@ApiSecurity('admin-api-key')
@AdminOnly()
@Controller('admin/tenants')
export class AdminTenantsAnalyticsController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  @Get('active/summary')
  @ApiOperation({ summary: 'Active tenants summary (users and verification outcomes)' })
  @ApiResponse({ status: 200, description: 'Active tenants summary returned' })
  async getActiveTenantsSummary(): Promise<
    Array<{
      tenantId: string;
      name: string;
      userCount: number;
      completedVerifications: number;
      failedVerifications: number;
      totalVerifications: number;
      lastVerifiedAt: string | null;
    }>
  > {
    const rows = await this.tenantRepository.query(
      `SELECT 
 				t.id AS tenant_id,
 				t.name AS tenant_name,
 				COALESCE(a.user_count, 0)::int AS user_count,
 				COALESCE(v.completed, 0)::int AS completed,
 				COALESCE(v.failed, 0)::int AS failed,
 				COALESCE(v.total, 0)::int AS total,
 				v.last_verified AS last_verified
 			FROM tenants t
 			LEFT JOIN (
 				SELECT tenant_id, COUNT(*) AS user_count
 				FROM accounts
 				GROUP BY tenant_id
 			) a ON a.tenant_id = t.id
 			LEFT JOIN (
 				SELECT tenant_id,
 				       COUNT(*) AS total,
 				       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
 				       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
 				       MAX(created_at) AS last_verified
 				FROM verifications
 				GROUP BY tenant_id
 			) v ON v.tenant_id = t.id
 			WHERE t.status = 'active'
 			ORDER BY t.created_at DESC`,
    );
    return rows.map((r: any) => ({
      tenantId: r.tenant_id,
      name: r.tenant_name,
      userCount: Number(r.user_count || 0),
      completedVerifications: Number(r.completed || 0),
      failedVerifications: Number(r.failed || 0),
      totalVerifications: Number(r.total || 0),
      lastVerifiedAt: r.last_verified ? new Date(r.last_verified).toISOString() : null,
    }));
  }
}
