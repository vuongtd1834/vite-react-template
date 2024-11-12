declare namespace AuthModel {
  type TAuthenticationResponse = {
    accessToken: string; // if app does not use access token, remove this line
    refreshToken: string; // if app does not use refresh token, remove this line
    identifier: UserModel.User; // TODO: example maybe remove after implementation api
  };
}
