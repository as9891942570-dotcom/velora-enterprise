import OrderConfirmationContent from "./confirmation-content";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <OrderConfirmationContent orderNumber={orderNumber} />;
}
