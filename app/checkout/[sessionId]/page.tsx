import { CheckoutStart } from "@/components/Checkout";
import { Brand, SoundToggle } from "@/components/ui";
import { env } from "@/lib/env";

export default async function CheckoutPage(props: PageProps<"/checkout/[sessionId]">) {
  const { sessionId } = await props.params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10">
      <header className="flex h-16 items-center justify-between">
        <Brand />
        <SoundToggle />
      </header>
      <CheckoutStart sessionId={sessionId} pricePaise={env().PRO_PRICE_PAISE} />
    </main>
  );
}
