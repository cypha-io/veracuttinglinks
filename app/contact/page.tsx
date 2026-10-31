'use client';

import { FiMapPin, FiPhone } from 'react-icons/fi';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BUSINESS_LOCATION, BUSINESS_PHONE, BUSINESS_PHONE_LINK } from '@/components/socials';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-12 mb-20 md:mb-0">
        <h1 className="text-3xl md:text-5xl font-black text-gray-800 mb-4 md:mb-8 text-center">Contact Us</h1>
        <p className="text-base md:text-xl text-gray-600 text-center mb-6 md:mb-12">
          Reach out for product support and order help
        </p>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-start gap-3">
            <FiPhone className="text-xl text-black mt-1 flex-shrink-0" />
            <a href={BUSINESS_PHONE_LINK} className="text-gray-700 hover:underline">{BUSINESS_PHONE}</a>
          </div>
          <div className="flex items-start gap-3">
            <FiMapPin className="text-xl text-black mt-1 flex-shrink-0" />
            <p className="text-gray-700">{BUSINESS_LOCATION}</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
