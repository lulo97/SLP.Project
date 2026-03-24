export class CurrentUserDto {
  id: number;
  username: string;
  email: string;
  emailConfirmed: boolean;
  role: string;
  status: string;
  avatarFilename?: string;
  createdAt: Date;
}