import { CheckoutStart } from "@/components/Checkout";
import { env } from "@/lib/env";

export default async function CheckoutPage(props: PageProps<"/checkout/[sessionId]">) {
  const { sessionId } = await props.params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-6">
      <Brand />
      <CheckoutStart sessionId={sessionId} pricePaise={env().PRO_PRICE_PAISE} />
    </main>
  );
}

function Brand() {
  return (
    <header className="flex items-center gap-2 text-sm font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-lg bg-orange-600 text-white">T</span>
      TalentGrill AI
    </header>
  );
}
