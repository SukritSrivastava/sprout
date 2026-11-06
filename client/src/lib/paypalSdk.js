// Loads PayPal's JavaScript SDK (the official PayPal button) once, on the pages that need it.
// The client id is public: it only identifies our sandbox app. The secret stays on the server.
let loading = null;

export function loadPayPalSdk(clientId, currency) {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const fail = (message) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.onload = script.onerror = null;
        script.remove();
        loading = null;
        reject(new Error(message));
      };
      const timer = setTimeout(() => fail('PayPal’s button took too long to load. Please try again.'), 20_000);
      const params = new URLSearchParams({ 'client-id': clientId, currency, intent: 'capture', components: 'buttons' });
      script.src = `https://www.paypal.com/sdk/js?${params}`;
      script.async = true;
      script.onload = () => {
        if (!window.paypal) return fail('PayPal’s button didn’t start. Please try again.');
        settled = true;
        clearTimeout(timer);
        resolve(window.paypal);
      };
      script.onerror = () => fail('PayPal’s button couldn’t load. Check your internet connection.');
      document.head.appendChild(script);
    });
  }
  return loading;
}
