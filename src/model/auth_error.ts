export class AuthError extends Error {
  status: number
  constructor(status = 401, ...params: any[]) {
    // Passer les arguments restants (incluant ceux spécifiques au vendeur) au constructeur parent
    super(...params);
    // Informations de déboguage personnalisées
    this.status = status;
  }

  static reject(message: string, status = 404): Promise<any> {
    return Promise.reject(new AuthError(status, message));
  }

  static send(error: any, status = 422) {
    return (res: any) => {
      return res.status(status).send(error.message);
    };
  }

}
