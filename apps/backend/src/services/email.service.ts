/**
 * Email service — sends transactional emails via nodemailer (SMTP).
 * Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM in .env.
 * Falls back to a no-op when SMTP_HOST is not configured.
 */
import nodemailer from 'nodemailer';

type BookingEmailData = {
  to: string;
  userName: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
};

function createTransport() {
  if (!process.env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.EMAIL_FROM ?? 'Rentars <no-reply@rentars.app>';

async function send(to: string, subject: string, html: string): Promise<void> {
  const transport = createTransport();
  if (!transport) {
    console.log(`[EmailService] SMTP not configured — skipping email to ${to}: ${subject}`);
    return;
  }
  await transport.sendMail({ from: FROM, to, subject, html });
}

export const emailService = {
  async sendBookingCreated(data: BookingEmailData): Promise<void> {
    await send(
      data.to,
      'Booking Confirmed — Rentars',
      `<p>Hi ${data.userName},</p>
       <p>Your booking for <strong>${data.propertyTitle}</strong> has been created.</p>
       <p>Check-in: ${data.checkIn} · Check-out: ${data.checkOut}</p>
       <p>Total: ${data.totalPrice} USDC</p>`,
    );
  },

  async sendBookingConfirmed(data: BookingEmailData): Promise<void> {
    await send(
      data.to,
      'Booking Confirmed by Host — Rentars',
      `<p>Hi ${data.userName},</p>
       <p>Your booking for <strong>${data.propertyTitle}</strong> has been confirmed by the host.</p>`,
    );
  },

  async sendBookingCancelled(data: BookingEmailData): Promise<void> {
    await send(
      data.to,
      'Booking Cancelled — Rentars',
      `<p>Hi ${data.userName},</p>
       <p>Your booking for <strong>${data.propertyTitle}</strong> has been cancelled.</p>`,
    );
  },
};
