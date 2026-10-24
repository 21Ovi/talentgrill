import { CheckoutReturn } from "@/components/Checkout";
import { isUuid } from "@/lib/http";

export default async function CheckoutReturnPage(props: PageProps<"/checkout/return">) {
  const pid = (await props.searchParams).pid;
  const paymentId = typeof pid === "string" && isUuid(pid) ? pid : null;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-4 py-10">
      <CheckoutReturn paymentId={paymentId} />
    </main>
  );
}
