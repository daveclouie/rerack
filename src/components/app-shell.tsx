"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { logout } from "@/app/actions/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/shop", label: "Built-in Shop" },
  { href: "/profile", label: "Profile Settings" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  function navLinks() {
    return links.map(({ href, label }) => (
      <Link
        key={href}
        className="nav-link"
        href={href}
        aria-current={pathname === href ? "page" : undefined}
        onClick={() => setMenuOpen(false)}
      >
        {label}
      </Link>
    ));
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="wordmark" href="/" aria-label="ReRack dashboard">rerack<span>wardrobe, in circulation</span></Link>
          <nav className="main-nav" aria-label="Main navigation">{navLinks()}</nav>
          <form className="header-account" action={logout}><button className="logout-button" type="submit">Logout</button></form>
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span />
          </button>
          {menuOpen && (
            <nav className="mobile-menu" id="mobile-navigation" aria-label="Mobile navigation">
              {navLinks()}
              <form action={logout}><button className="logout-button" type="submit">Logout</button></form>
            </nav>
          )}
        </div>
      </header>
      {children}
    </>
  );
}
