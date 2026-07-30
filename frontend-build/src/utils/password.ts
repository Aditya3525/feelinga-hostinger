export const STRONG_PASSWORD_ERROR = 'Password must be 8-100 characters and include uppercase, lowercase, number, and special character.';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,100}$/;

export function isStrongPassword(password: string): boolean {
    return STRONG_PASSWORD_REGEX.test(password);
}

export function getStrongPasswordError(password: string): string | null {
    return isStrongPassword(password) ? null : STRONG_PASSWORD_ERROR;
}
