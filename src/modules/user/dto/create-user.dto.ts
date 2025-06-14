import { IUser } from '../interfaces/user.interface';

export class CreateUserDto implements IUser {
  email: string;
  password: string;
  id: number;
}
