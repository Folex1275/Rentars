'use client';

import { Github } from 'lucide-react';
import { Mail } from 'lucide-react';

interface SocialLoginButtonProps {
  provider: 'google' | 'github';
  onClick: () => void;
  isLoading?: boolean;
}

export function SocialLoginButton({ provider, onClick, isLoading = false }: SocialLoginButtonProps) {
  const config = {
    google: {
      label: 'Google',
      icon: Mail,
      bgColor: 'bg-white border border-gray-300 hover:bg-gray-50',
      textColor: 'text-gray-700',
    },
    github: {
      label: 'GitHub',
      icon: Github,
      bgColor: 'bg-gray-900 hover:bg-gray-800',
      textColor: 'text-white',
    },
  };

  const { label, icon: Icon, bgColor, textColor } = config[provider];

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-full py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 ${bgColor} ${textColor} disabled:opacity-50`}
    >
      <Icon size={18} />
      {isLoading ? 'Connecting...' : `Continue with ${label}`}
    </button>
  );
}
