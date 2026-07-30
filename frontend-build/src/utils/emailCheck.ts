import { apiRequest } from './api';

export type EmailCheckResult = {
    email: string;
    normalizedEmail: string;
    syntaxValid: boolean;
    domainExists: boolean;
    hasMx: boolean;
    hasA: boolean;
    disposable: boolean;
    externalProvider?: 'none' | 'hunter';
    externalStatus?: string | null;
    externalResult?: string | null;
    gibberish?: boolean;
    valid: boolean;
    reason: string | null;
};

export async function checkEmailAddress(email: string): Promise<EmailCheckResult> {
    const response = await apiRequest('/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });

    return response.data as EmailCheckResult;
}
