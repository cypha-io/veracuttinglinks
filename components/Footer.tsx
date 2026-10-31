'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BUSINESS_LOCATION, BUSINESS_PHONE, BUSINESS_PHONE_LINK } from './socials';

export default function Footer() {
  return (
    <footer className="text-white mt-16 pb-24 md:pb-24 px-4 relative z-20 bg-gray-50">
      <div className="max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-lg bg-black">
        <div className="px-6 py-10">
          <div className="max-w-3xl mx-auto space-y-5 text-center">
            <Link href="/" className="flex items-center justify-center">
              <span className="font-black text-xl md:text-2xl tracking-tighter text-white uppercase">
                Vera<span className="text-gray-400">Cutting</span>Links
              </span>
            </Link>
            <p className="text-white text-sm md:text-base">
              Inspired by elegant style, Vera Cutting Links curates celestial clothing that shines with timeless elegance and elegant designs.
            </p>
            <div className="text-sm text-white/90 space-y-1">
              <p>
                <a href={BUSINESS_PHONE_LINK} className="hover:underline">{BUSINESS_PHONE}</a>
              </p>
              <p>{BUSINESS_LOCATION}</p>
            </div>
            <p className="text-white/90 text-xs md:text-sm pt-2">
              © 2026 Vera Cutting Links. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
