'use server';
import { unstable_rethrow } from 'next/navigation';
import { getCurrentUser, authDestination } from '../../../modules/auth/auth.service';
import { createBusiness, redeemJoinCode } from '../../../modules/business/business.service';
import { createBusinessSchema, redeemJoinCodeSchema } from '../../../modules/business/business.validation';

export async function createBusinessAction(form: FormData) {
  try {
    await createBusiness(createBusinessSchema.parse({ name: form.get('name'), isSolo: form.get('isSolo') === 'on' }));
    return { destination: '/owner' };
  } catch (error) {
    unstable_rethrow(error);
    return { message: 'Unable to create the business. Check the name and your account membership.' };
  }
}
export async function joinBusinessAction(form: FormData) {
  try {
    await redeemJoinCode(redeemJoinCodeSchema.parse({ code: form.get('code') }).code);
    const user = await getCurrentUser();
    return { destination: user ? authDestination(user) : '/login' };
  } catch (error) {
    unstable_rethrow(error);
    return { message: 'Unable to join. Check the code with the business owner.' };
  }
}
