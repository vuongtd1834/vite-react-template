declare namespace UserModel {
  type UserType = 'MASTER_USER' | 'SUPER_ADMIN' | 'USER';

  type User = {
    userId: number;
    name: string;
    email: string;
    userType: UserType;
  };
}
