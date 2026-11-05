// Loads PayPal's JavaScript SDK (the official PayPal button) once, on the pages that need it.
// The client id is public: it only identifies our sandbox app. The secret stays on the server.
let loading = null;

export function loadPayPalSdk(clientId, currency) {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const params = new URLSearchParams({ 'client-id': clientId, currency, intent: 'capture', components: 'buttons' });
      script.src = `https://www.paypal.com/sdk/js?${params}`;
      script.async = true;
      script.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error('PayPal’s button didn’t start.')));
      script.onerror = () => {
        loading = null; // allow another try later
        reject(new Error('PayPal’s button couldn’t load. Check your internet connection.'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}
