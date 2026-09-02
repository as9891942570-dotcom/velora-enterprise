import { use } from "react";

import EditProductContent from "./edit-product-content";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <EditProductContent productId={id} />;
}
