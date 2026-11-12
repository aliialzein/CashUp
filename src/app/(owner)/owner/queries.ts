import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { getOwnerCashUpDetail } from '../../../modules/cash-ups/cash-ups.service';
import { EntityNotFoundError, ForbiddenError, UnauthenticatedError } from '../../../shared/errors/service-errors';

export async function ownerCashUpPage(id: string) {
  try { return await getOwnerCashUpDetail(id); }
  catch (error) {
    if (error instanceof UnauthenticatedError) redirect('/login');
    if (error instanceof EntityNotFoundError || error instanceof ForbiddenError || error instanceof ZodError) notFound();
    throw error;
  }
}
