'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }

    fetch(`${API_URL}/api/wishlists`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: { property_id: string }[]) => {
        setWishlistIds(new Set(data.map((item) => item.property_id)));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const toggle = useCallback(async (propertyId: string) => {
    const token = getToken();
    if (!token) return;

    const isInWishlist = wishlistIds.has(propertyId);

    // Optimistic update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (isInWishlist) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });

    try {
      await fetch(`${API_URL}/api/wishlists/${propertyId}`, {
        method: isInWishlist ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Revert on failure
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (isInWishlist) next.add(propertyId);
        else next.delete(propertyId);
        return next;
      });
    }
  }, [wishlistIds]);

  return { wishlistIds, isLoading, toggle, isInWishlist: (id: string) => wishlistIds.has(id) };
}
