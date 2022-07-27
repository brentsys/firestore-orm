import { AuthError } from "./auth_error";

export class NoAuthError extends AuthError {
  authRequested: any
  type: string
  constructor(authRequested: any) {
    // Passer les arguments restants (incluant ceux spécifiques au vendeur) au constructeur parent
    super(428, 'No Authorizations set by endUser');
    // Informations de déboguage personnalisées
    this.authRequested = authRequested;
    this.type = 'NoAuthError';
  }
}