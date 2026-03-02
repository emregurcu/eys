'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Store, ArrowRight } from 'lucide-react';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#etsy-integration', label: 'Etsy Integration' },
  { href: '#data-usage', label: 'Data & Privacy' },
];

export function LandingMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button - only visible on mobile */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
      </button>

      {/* Mobile menu overlay */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 z-50 bg-white border-b shadow-lg md:hidden animate-in slide-in-from-top-2 duration-200">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-[#F1641E] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2 border-t mt-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-[#F1641E] text-white px-5 py-3 rounded-lg font-medium text-sm hover:bg-[#d9561a] transition-colors"
                >
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
