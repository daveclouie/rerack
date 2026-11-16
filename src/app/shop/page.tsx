import Link from "next/link";
import { redirect } from "next/navigation";
import { AppPage } from "@/components/app-page";

export default function ShopPage() {
  const shopUrl = process.env.NEXT_PUBLIC_SHOP_URL?.trim();
  if (shopUrl) {
    let destination: URL;
    try {
      destination = new URL(shopUrl);
    } catch {
      throw new Error("NEXT_PUBLIC_SHOP_URL must be a valid absolute URL.");
    }
    if (destination.protocol !== "https:" && destination.protocol !== "http:") {
      throw new Error("NEXT_PUBLIC_SHOP_URL must use HTTP or HTTPS.");
    }
    redirect(destination.toString());
  }

  return (
    <AppPage>
      <section className="page-intro"><div><p className="eyebrow">SECOND LIFE, GOOD FINDS</p><h1>Our shop is on its way.</h1><p className="intro-copy">The separate ReRack shop website is being prepared. Your closet stays right here.</p></div></section>
      <section className="empty-shop"><h2>Keep your wardrobe in circulation.</h2><p>Until the shop opens, you can still organize your closet and build outfits.</p><div className="page-actions"><Link className="button button-dark" href="/closet">Open closet</Link><Link className="button button-quiet" href="/dashboard">Back to dashboard</Link></div></section>
    </AppPage>
  );
}
