export interface AuthorizationCodePayload {
    client_id: string;
    redirect_uri: string;
    user_id: string;
    scope: string[];
    code_challenge: string;
    code_challenge_method: 'S256';
    nonce?: string;
    sid?: string;
}

export interface PasswordResetTokenPayload {
    userId: string;
    email: string;
}
