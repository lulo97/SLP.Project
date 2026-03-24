import { Controller, Get, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserRequest } from './dto/update-user.dto';
import { SessionGuard } from '../../common/guards/session.guard';
import { User } from './user.entity';

@Controller('api/users')
@UseGuards(SessionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@Request() req): Promise<User> {
    return this.userService.getByIdOrFail(req.user.id);
  }

  @Put('me')
  async updateMe(@Request() req, @Body() dto: UpdateUserRequest): Promise<User> {
    return this.userService.update(req.user.id, dto);
  }

  @Delete('me')
  async deleteMe(@Request() req): Promise<void> {
    return this.userService.delete(req.user.id);
  }
}