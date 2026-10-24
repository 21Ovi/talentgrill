import { LoginForm } from "@/components/LoginForm";
import { Brand, SoundToggle } from "@/components/ui";

export const metadata = { title: "Log in · TalentGrill AI" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <Brand />
        <SoundToggle />
      </header>
      <div className="arrive flex flex-1 flex-col justify-center gap-6 pb-16">
        <LoginForm />
      </div>
    </main>
  );
}
