import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
}

export async function sendEmail(options: EmailOptions) {
    if (!RESEND_API_KEY || !resend) {
        console.warn('RESEND_API_KEY is not configured. Skipping email send.');
        return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    try {
        let defaultFrom = process.env.SENDER_EMAIL || 'noreply@sends.kapoorabeer.me';
        if (!defaultFrom.includes('<')) {
            defaultFrom = `AuraSutra <${defaultFrom}>`;
        }
        const { to, subject, html, from = defaultFrom } = options;

        const { data, error } = await resend.emails.send({
            from,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        });

        if (error) {
            console.error('Email sending error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Email sending exception:', error);
        return { success: false, error: error.message || 'Failed to send email' };
    }
}

export async function sendBulkEmails(emails: EmailOptions[]) {
    const results = await Promise.allSettled(
        emails.map(email => sendEmail(email))
    );

    return results.map((result, index) => ({
        email: emails[index].to,
        ...(result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' })
    }));
}
