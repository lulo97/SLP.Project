export class UserDto {
  id: number;
  username: string;
  email?: string;
  emailConfirmed: boolean;
  role: string;
  status: string;
  createdAt: Date;
}