import { IEmailService } from '@school/shared';

export interface DispatchedEmail {
  toEmail: string;
  type: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';
  token: string;
  tenantName?: string;
  dispatchedAt: Date;
}

/**
 * In-Memory Email Adapter for automated tests, development, and offline verification
 */
export class InMemoryEmailService implements IEmailService {
  private dispatchedEmails: DispatchedEmail[] = [];

  public async sendPasswordResetEmail(toEmail: string, resetToken: string, tenantName?: string): Promise<void> {
    this.dispatchedEmails.push({
      toEmail,
      type: 'PASSWORD_RESET',
      token: resetToken,
      tenantName,
      dispatchedAt: new Date(),
    });
  }

  public async sendEmailVerificationEmail(toEmail: string, verificationToken: string, tenantName?: string): Promise<void> {
    this.dispatchedEmails.push({
      toEmail,
      type: 'EMAIL_VERIFICATION',
      token: verificationToken,
      tenantName,
      dispatchedAt: new Date(),
    });
  }

  public getDispatchedEmails(): DispatchedEmail[] {
    return [...this.dispatchedEmails];
  }

  public getLastDispatchedEmail(): DispatchedEmail | undefined {
    return this.dispatchedEmails[this.dispatchedEmails.length - 1];
  }

  public clear(): void {
    this.dispatchedEmails = [];
  }
}
