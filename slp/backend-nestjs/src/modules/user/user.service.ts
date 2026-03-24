import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User } from './user.entity';
import { RegisterUserRequest } from './dto/register-user.dto';
import { UpdateUserRequest } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getById(id: number): Promise<User | null> {
    return this.userRepo.getById(id);
  }

  async getByIdOrFail(id: number): Promise<User> {
    const user = await this.userRepo.getById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: number, dto: UpdateUserRequest): Promise<User> {
    const user = await this.getByIdOrFail(id);
    if (dto.name) user.username = dto.name;
    // Avatar handling omitted – implement as needed
    await this.userRepo.update(user);
    return user;
  }

  async register(dto: RegisterUserRequest): Promise<User> {
    const existing = await this.userRepo.getByEmail(dto.email);
    if (existing) throw new ConflictException('Email already exists');

    const user = new User();
    user.username = dto.username;
    user.email = dto.email;
    user.passwordHash = await bcrypt.hash(dto.password, 10);
    user.createdAt = new Date();
    user.updatedAt = new Date();
    user.role = 'user';
    user.status = 'active';

    await this.userRepo.create(user);
    return user;
  }

  async delete(id: number): Promise<void> {
    const user = await this.getByIdOrFail(id);
    await this.userRepo.delete(user);
  }
}