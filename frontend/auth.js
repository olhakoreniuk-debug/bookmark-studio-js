/** Google Sign-In and access-controlled visibility of editing tools. */
export function createAuthentication({ onChange, verifyOwner }) {
  let token = null;
  const signin = document.querySelector("#google-signin");
  const signout = document.querySelector("#signout-button");
  const privateAreas = [
    document.querySelector('section[aria-labelledby="chrome-title"]'),
    document.querySelector('section[aria-labelledby="composer-title"]'),
  ];

  function updateUi() {
    const signedIn = Boolean(token);
    privateAreas.forEach((area) => { if (area) area.hidden = !signedIn; });
    document.querySelectorAll("[data-focus-form]").forEach((button) => {
      button.hidden = !signedIn;
    });
    signin.hidden = signedIn;
    signout.hidden = !signedIn;
    onChange(signedIn);
  }

  async function handleCredential({ credential }) {
    token = credential;
    try {
      await verifyOwner();
    } catch (error) {
      token = null;
      window.alert("Google account not authorized: " + error.message);
    }
    updateUi();
  }

  function initialize() {
    signout.addEventListener("click", () => {
      token = null;
      window.google?.accounts?.id?.disableAutoSelect();
      updateUi();
    });
    updateUi();

    if (!window.BOOKMARK_GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
      signin.textContent = "Google sign-in unavailable. Refresh the page.";
      return;
    }
    window.google.accounts.id.initialize({
      client_id: window.BOOKMARK_GOOGLE_CLIENT_ID,
      callback: handleCredential,
      auto_select: false,
    });
    window.google.accounts.id.renderButton(signin, {
      theme: "outline", size: "medium", text: "signin_with",
    });
  }

  return { initialize, getToken: () => token, isSignedIn: () => Boolean(token) };
}
