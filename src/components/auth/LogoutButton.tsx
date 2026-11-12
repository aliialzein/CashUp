'use client';
import { useFormStatus } from 'react-dom';
import { logoutAction } from '@/app/(auth)/actions';

function Submit() {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending}
			className="min-h-11 px-3 text-sm font-semibold text-ink underline underline-offset-2 disabled:opacity-50"
		>
			{pending ? 'Logging out…' : 'Log out'}
		</button>
	);
}

export default function LogoutButton() {
	return <form action={logoutAction}><Submit /></form>;
}
