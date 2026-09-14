import { GuestGuard } from "@/components/guest-guard";
import { LoginForm } from "@/components/login-form";

/** Ported (structurally) from `munod/www/src/app/(adm)/auth/login/page.tsx`. */
export default function LoginPage() {
	return (
		<GuestGuard>
			<div className="w-full max-w-sm">
				<LoginForm />
			</div>
		</GuestGuard>
	);
}
