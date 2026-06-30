// Facebook SDK initialization for Vite
// This loads the Facebook SDK with the App ID from environment variables

// Track if SDK is ready
window.fbSdkReady = false;

export function initFacebookSdk() {
  const appId = (import.meta.env.VITE_FACEBOOK_APP_ID || '').trim();

  if (!appId || appId === 'YOUR_FACEBOOK_APP_ID') {
    console.warn('Facebook App ID not configured');
    return;
  }

  // Define fbAsyncInit before loading SDK
  window.fbAsyncInit = function () {
    window.FB.init({
      appId: appId,
      cookie: true,
      xfbml: true,
      version: 'v18.0'
    });
    window.fbSdkReady = true;
  };

  // Load Facebook SDK script
  (function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
      return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = `https://connect.facebook.net/vi_VN/sdk.js?appId=${appId}`;
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
}

export default initFacebookSdk;
