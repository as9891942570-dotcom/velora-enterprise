import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { serverFetch } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import { pageMetadata } from "@/lib/seo";
import type { Product } from "@/lib/types";

import { ProductDetailClient } from "./product-detail";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await serverFetch<Product>(`/products/${slug}`);
    const description =
      product.short_description ||
      product.description?.slice(0, 160) ||
      `${product.name} — shop at Velora Enterprise`;
    const image = product.images[0]?.url;
    return {
      ...pageMetadata(product.name, description, `/product/${slug}`),
      openGraph: {
        title: product.name,
        description,
        url: `${SITE_URL}/product/${slug}`,
        images: image ? [{ url: image, alt: product.name }] : undefined,
      },
    };
  } catch {
    return pageMetadata("Product", "Product details");
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  let product: Product;
  try {
    product = await serverFetch<Product>(`/products/${slug}`);
  } catch {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
