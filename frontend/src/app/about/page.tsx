import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Our Story</h1>
      <p className="mt-2 text-muted-foreground">Crafting beauty for modern Indian homes</p>

      <div className="prose prose-stone mt-10 max-w-none space-y-6 text-muted-foreground">
        <p>
          Velora Enterprise was founded with a simple belief: every home deserves pieces that
          reflect warmth, craftsmanship, and timeless elegance. From our workshop to your doorstep,
          we bring you thoughtfully designed home decor that transforms ordinary spaces into
          sanctuaries of style.
        </p>
        <p>
          Our collection spans flower pots, lotus aasan, decorative keychains, and handcrafted
          accents — each piece selected or created with meticulous attention to quality and
          aesthetics. We work with skilled artisans across India to preserve traditional techniques
          while embracing contemporary design.
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">Our Values</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Quality materials and honest craftsmanship</li>
          <li>Sustainable sourcing where possible</li>
          <li>Fair pricing with no compromise on excellence</li>
          <li>Customer-first service across India</li>
        </ul>
        <p>
          Whether you&apos;re refreshing a corner of your living room or gifting something special,
          Velora Enterprise is here to help you create spaces you love.
        </p>
      </div>

      <Button render={<Link href="/shop" />} className="mt-10" size="lg">
        Explore Our Collection
      </Button>
    </div>
  );
}
