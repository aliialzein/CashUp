export interface SessionIdentity {
  readonly userId: string;
  readonly businessId: string;
}

export interface SessionProvider {
  getSession(request: Request): Promise<SessionIdentity>;
}
