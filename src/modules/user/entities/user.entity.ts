import { IUser } from "../interfaces/user.interface";

export class User implements IUser {
    email: string;
    password: string;
}
