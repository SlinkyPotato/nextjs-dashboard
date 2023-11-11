'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, 'Amount must be greater than $0.'),
  status: z.enum(['paid', 'pending'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({id: true, date: true});

export type State = {
  errors?: {
    customerId?: string[],
    amount?: string[],
    status?: string[],
  };
  message?: string | null;
}

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields  = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    }
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  
  } catch (e) {
    console.error(e);
    return {
      message: 'Database Error: Failed to create Invoice'
    }
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const UpdateInvoice = InvoiceSchema.omit({ date: true, id: true });
 
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  const amountInCents = amount * 100;

  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (e) {
    console.error(e);
    return {
      message: 'Database Error: Failed to update Invoice'
    }
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
 
export async function deleteInvoice(id: string) {
  throw new Error('test');
  
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (e) {
    console.error(e);
    return {
      message: 'Database Error: Failed to delete Invoice'
    }
  }
  revalidatePath('/dashboard/invoices');
}