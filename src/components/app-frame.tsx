"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import { PageUtilities } from "@/components/page-utilities";
import { SubmitButton } from "@/components/submit-button";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/shop", label: "Built-in Shop" },
  { href: "/profile", label: "Profile Settings" },
  { href: "/settings", label: "Settings" },
];

export function AppFrame({ children, isAuthenticated }: Readonly<{ children: ReactNode; isAuthenticated: boolean }>) {
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
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="scroll-progress" aria-hidden="true" />
      <header className="site-header">
        <div className="header-inner">
          <Link className="wordmark" href={isAuthenticated ? "/dashboard" : "/"} aria-label="ReRack home"><Image src="/rerack-mark.png" alt="" width={34} height={34} /><span>ReRack</span><span className="wordmark-tagline">wardrobe, in circulation</span></Link>
          {isAuthenticated ? (
            <>
              <nav className="main-nav" aria-label="Main navigation">{navLinks()}</nav>
              <div className="header-account">
                <Link className="header-search-link" href="#search" onClick={(event) => {
                  event.preventDefault();
                  window.dispatchEvent(new Event("rerack-open-search"));
                }}>Search <kbd>Ctrl / ⌘ K</kbd></Link>
                <form action={logout}><SubmitButton className="logout-button" pendingLabel="Logging out…">Logout</SubmitButton></form>
              </div>
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
                  <button className="header-search-link" type="button" onClick={() => {
                    setMenuOpen(false);
                    window.dispatchEvent(new Event("rerack-open-search"));
                  }}>Search pages</button>
                  {navLinks()}
                  <form action={logout}><SubmitButton className="logout-button" pendingLabel="Logging out…">Logout</SubmitButton></form>
                </nav>
              )}
            </>
          ) : (
            <nav className="public-nav" aria-label="Account navigation">
              <Link className="nav-link" href="/login">Log in</Link>
              <Link className="button button-dark" href="/signup">Create account</Link>
            </nav>
          )}
        </div>
      </header>
      {children}
      {isAuthenticated && <PageUtilities />}
    </>
  );
}
