'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/auth/use-auth';
import { WalletAuthButton } from '@/components/auth/WalletAuthButton';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import NotificationBell from '@/components/shared/NotificationBell';
import { House, Menu, X, LogOut, User } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search' },
    { href: '/list', label: 'List Property' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white">
            <House className="text-blue-600" size={24} />
            <span>Rentars</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            {user ? (
              <div className="hidden md:flex items-center gap-3">
                <NotificationBell userId={user.id} />
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <User size={18} className="text-gray-600 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut size={18} className="text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            ) : (
              <div className="hidden md:block">
                <WalletAuthButton network="testnet" />
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              {isOpen ? (
                <X size={24} className="text-gray-900 dark:text-white" />
              ) : (
                <Menu size={24} className="text-gray-900 dark:text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <div className="px-4 py-2">
                <WalletAuthButton network="testnet" />
              </div>
            )}
            {user && (
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition flex items-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
