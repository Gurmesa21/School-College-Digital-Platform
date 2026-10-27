import {
  IEmailService,
  FormSubmissionEmailNotification,
  FormSubmissionConfirmationNotification,
} from '@school/shared';

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
  category?: string;
  referenceNumber?: string;
  payload?: Record<string, unknown>;
  dispatchedAt: Date;
}

/**
 * In-Memory Email Adapter for automated tests, development, and offline verification
 */
export class InMemoryEmailService implements IEmailService {
  private dispatchedEmails: DispatchedEmail[] = [];
  public failNextNotification?: Error | boolean;
  public failNextConfirmation?: Error | boolean;
  public readonly isSimulated: boolean = true;

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
    tenantName?: string,
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
    if (this.failNextNotification) {
      const err =
        this.failNextNotification === true
          ? new Error('Simulated external SMTP provider timeout error')
          : this.failNextNotification;
      this.failNextNotification = undefined;
      throw err;
    }

    for (const toEmail of recipientEmails) {
      this.dispatchedEmails.push({
        toEmail,
        type: 'FORM_SUBMISSION_NOTIFICATION',
        tenantName: notification.tenantName,
        formTitle: notification.formTitle,
        category: notification.category,
        referenceNumber: notification.submissionId,
        payload: notification.data,
        dispatchedAt: new Date(),
      });
    }
    console.log(
      `[EmailService:Dev] Dispatched form submission notification to [${recipientEmails.join(', ')}] for form "${notification.formTitle}" (Category: ${notification.category || 'General'})`
    );
  }

  public async sendSubmissionConfirmation(
    toEmail: string,
    notification: FormSubmissionConfirmationNotification
  ): Promise<void> {
    if (this.failNextConfirmation) {
      const err =
        this.failNextConfirmation === true
          ? new Error('Simulated external confirmation dispatch error')
          : this.failNextConfirmation;
      this.failNextConfirmation = undefined;
      throw err;
    }

    this.dispatchedEmails.push({
      toEmail,
      type: 'SUBMISSION_CONFIRMATION',
      tenantName: notification.tenantName,
      formTitle: notification.formTitle,
      category: notification.category,
      referenceNumber: notification.referenceNumber,
      payload: { submitterName: notification.submitterName },
      dispatchedAt: new Date(),
    });
    console.log(
      `[EmailService:Dev] Dispatched submission confirmation to ${toEmail} for form "${notification.formTitle}" (Ref: ${notification.referenceNumber || 'N/A'})`
    );
  }

  public getDispatchedEmails(): DispatchedEmail[] {
    return [...this.dispatchedEmails];
  }

  public getSentSubmissions(): Array<{ recipients: string[]; category?: string; referenceNumber?: string; submitterEmail?: string; data?: any }> {
    return this.dispatchedEmails
      .filter((e) => e.type === 'FORM_SUBMISSION_NOTIFICATION')
      .map((e) => ({
        recipients: [e.toEmail],
        category: e.category,
        referenceNumber: e.referenceNumber,
        submitterEmail: e.payload?.email || (e.payload as any)?.submitterEmail,
        data: e.payload,
      }));
  }

  public getSentConfirmations(): Array<{ submitterEmail: string; submitterName?: string; referenceNumber?: string }> {
    return this.dispatchedEmails
      .filter((e) => e.type === 'SUBMISSION_CONFIRMATION')
      .map((e) => ({
        submitterEmail: e.toEmail,
        submitterName: (e.payload as any)?.submitterName,
        referenceNumber: e.referenceNumber,
      }));
  }

  public getLastDispatchedEmail(): DispatchedEmail | undefined {
    return this.dispatchedEmails[this.dispatchedEmails.length - 1];
  }

  public clear(): void {
    this.dispatchedEmails = [];
    this.failNextNotification = undefined;
    this.failNextConfirmation = undefined;
  }
}
