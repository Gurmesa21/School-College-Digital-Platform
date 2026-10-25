import { IEmailService, FormSubmissionEmailNotification } from '@school/shared';

export interface DispatchedEmail {
  toEmail: string;
  type:
    | 'PASSWORD_RESET'
    | 'EMAIL_VERIFICATION'
    | 'INVITATION'
    | 'FORM_SUBMISSION_NOTIFICATION'
    | 'SUBMISSION_CONFIRMATION';
  token?: string;
  tenantName?: string;
  inviterName?: string;
  formTitle?: string;
  payload?: Record<string, unknown>;
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

  public async sendInvitationEmail(
    toEmail: string,
    invitationToken: string,
    tenantName: string,
    inviterName?: string
  ): Promise<void> {
    this.dispatchedEmails.push({
      toEmail,
      type: 'INVITATION',
      token: invitationToken,
      tenantName,
      inviterName,
      dispatchedAt: new Date(),
    });
  }

  public async sendFormSubmissionNotification(
    recipientEmails: string[],
    notification: FormSubmissionEmailNotification
  ): Promise<void> {
    for (const toEmail of recipientEmails) {
      this.dispatchedEmails.push({
        toEmail,
        type: 'FORM_SUBMISSION_NOTIFICATION',
        tenantName: notification.tenantName,
        formTitle: notification.formTitle,
        payload: notification.data,
        dispatchedAt: new Date(),
      });
    }
    console.log(
      `[EmailService:Dev] Dispatched form submission notification to [${recipientEmails.join(', ')}] for form "${notification.formTitle}"`
    );
  }

  public async sendSubmissionConfirmation(
    toEmail: string,
    notification: {
      submitterName?: string;
      formTitle: string;
      tenantName: string;
      confirmationMessage?: string;
    }
  ): Promise<void> {
    this.dispatchedEmails.push({
      toEmail,
      type: 'SUBMISSION_CONFIRMATION',
      tenantName: notification.tenantName,
      formTitle: notification.formTitle,
      dispatchedAt: new Date(),
    });
    console.log(
      `[EmailService:Dev] Dispatched submission confirmation to ${toEmail} for form "${notification.formTitle}"`
    );
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

