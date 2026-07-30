const EMAIL_REGEX = /^(?=.{1,254}$)(?=.{1,64}@)(?!.*\.\.)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const EMAIL_ERROR_MESSAGE = 'Please enter a valid email address.';

export function isValidEmail(email: string): boolean {
    const value = String(email || '').trim();
    if (!value || value.length > 254) return false;
    if (!EMAIL_REGEX.test(value)) return false;

    const [localPart, domainPart] = value.split('@');
    if (!localPart || !domainPart) return false;
    if (localPart.length > 64) return false;
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (localPart.includes('..')) return false;
    if (domainPart.startsWith('-') || domainPart.endsWith('-')) return false;
    if (domainPart.includes('..')) return false;
    if (domainPart.split('.').some(label => !label || label.length > 63)) return false;

    return true;
}

export function getEmailError(email: string): string | null {
    return isValidEmail(email) ? null : EMAIL_ERROR_MESSAGE;
}
