declare module 'nodemailer' {
  interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: { user: string; pass: string };
  }
  interface SendMailOptions {
    from?: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
  }
  function createTransport(options: TransportOptions): {
    sendMail: (options: SendMailOptions) => Promise<unknown>;
  };
}
