import { NextResponse } from 'next/server';
import { createSessionForUser, hashPassword } from '@/lib/serverAuth';
import { sendEmail } from '@/lib/email';
import { pool } from '@/lib/db';

const SESSION_COOKIE = 'wf_session';

type SignupPayload = {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
  address?: string;
  city?: string;
};

const isValidPhone = (value: string) => /^0\d{9}$/.test(value);

export async function POST(request: Request) {
  return Response.json(
    { error: 'Public registration is disabled. Only admin login is permitted.' },
    { status: 403 }
  );
}
