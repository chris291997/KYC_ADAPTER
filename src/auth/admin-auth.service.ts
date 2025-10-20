import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../database/entities';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  // Admin API keys are no longer supported; admins authenticate via JWT
  async validateApiKey(_apiKey: string): Promise<null> {
    this.logger.warn('Admin API key validation called but API keys are no longer supported');
    return null;
  }

  async generateApiKey(_adminId: string, _name: string, _expiresAt?: Date): Promise<any> {
    throw new NotFoundException('Admin API keys are no longer supported');
  }

  /**
   * Get all API keys for an admin
   */
  async getAdminApiKeys(_adminId: string): Promise<[]> {
    return [];
  }

  /**
   * Revoke admin API key
   */
  async revokeApiKey(_apiKeyId: string): Promise<void> {
    this.logger.warn('revokeApiKey called but admin API keys are not supported');
  }

  /**
   * Find admin by email
   */
  async findAdminByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { email },
    });
  }

  /**
   * Create admin user
   */
  async createAdmin(
    name: string,
    email: string,
    role: 'super_admin' | 'admin' | 'viewer' = 'admin',
  ): Promise<Admin> {
    const admin = this.adminRepository.create({
      name,
      email,
      role,
      status: 'active',
    });

    const savedAdmin = await this.adminRepository.save(admin);

    this.logger.log(`Created admin: ${savedAdmin.name} (${savedAdmin.email}) with role ${role}`);

    return savedAdmin;
  }

  /**
   * Get admin by ID
   */
  async getAdminById(adminId: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { id: adminId },
    });
  }

  /**
   * Save admin entity
   */
  async saveAdmin(admin: Admin): Promise<Admin> {
    return this.adminRepository.save(admin);
  }
}
