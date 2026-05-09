'use client';

import { useState, useEffect } from 'react';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '@/lib/push/subscribe';

/**
 * Push notification toggle component for the Settings > Notifications tab.
 * Allows users to enable/disable browser push notifications.
 */
export function PushToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    const subscribed = await isPushSubscribed();
    setIsSubscribed(subscribed);
    setIsLoading(false);
  }

  async function handleToggle() {
    setIsToggling(true);
    setError(null);

    try {
      if (isSubscribed) {
        const success = await unsubscribeFromPush();
        if (success) {
          setIsSubscribed(false);
        } else {
          setError('Failed to unsubscribe');
        }
      } else {
        const success = await subscribeToPush();
        if (success) {
          setIsSubscribed(true);
        } else {
          setError('Failed to enable notifications. Please allow notifications in your browser settings.');
        }
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setIsToggling(false);
    }
  }

  // Check if push is supported
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Browser Push Notifications</p>
          <p className="text-xs text-gray-500">Not supported in this browser</p>
        </div>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
          Unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Browser Push Notifications</p>
          <p className="text-xs text-gray-500">
            {isSubscribed
              ? 'You will receive push notifications for new leads and upcoming viewings'
              : 'Enable to get notified about new leads and viewing reminders'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isSubscribed}
          onClick={handleToggle}
          disabled={isLoading || isToggling}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isSubscribed ? 'bg-brand-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
              isSubscribed ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {isSubscribed && (
        <p className="text-xs text-green-600">✓ Push notifications enabled</p>
      )}
    </div>
  );
}
