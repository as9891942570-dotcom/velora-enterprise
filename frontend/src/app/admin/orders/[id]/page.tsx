import { use } from "react";

import AdminOrderDetailContent from "./order-detail-content";

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AdminOrderDetailContent orderId={id} />;
}
