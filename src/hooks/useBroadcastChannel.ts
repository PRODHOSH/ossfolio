import { useEffect, useCallback, useRef } from 'react';

type MessageHandler<T> = (data: T) => void;

/**
 * Syncs state across browser tabs via the BroadcastChannel API.
 * Falls back silently when the API is unavailable (SSR, older browsers).
 *
 * Usage:
 *   const { postMessage } = useBroadcastChannel("ossfolio:refresh", (data) => {
 *     if (data.username === currentUser) refreshPage();
 *   });
 */
export function useBroadcastChannel<T = unknown>(
  channelName: string,
  onMessage: MessageHandler<T>,
) {
  const handlerRef = useRef<MessageHandler<T>>(onMessage);
  useEffect(() => {
    handlerRef.current = onMessage;
  });

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (event: MessageEvent<T>) => {
      handlerRef.current(event.data);
    };

    return () => {
      channel.close();
    };
  }, [channelName]);

  const postMessage = useCallback(
    (data: T) => {
      if (typeof BroadcastChannel === 'undefined') return;
      try {
        const channel = new BroadcastChannel(channelName);
        channel.postMessage(data);
        channel.close();
      } catch {
        // BroadcastChannel can throw in some restricted contexts.
      }
    },
    [channelName],
  );

  return { postMessage };
}
