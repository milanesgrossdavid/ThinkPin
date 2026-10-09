import { getSettings, signInWithGoogle } from "../api.js";

const statusElement = document.getElementById("auth-status");
const startButton = document.getElementById("start-auth");
const retryButton = document.getElementById("retry-auth");
const recovery = document.getElementById("recovery");
let inFlight = null;

function setStatus(message, type = "") {
  statusElement.textContent = message;
  statusElement.className = `auth-status${type ? ` ${type}` : ""}`;
}

async function startSignIn() {
  if (inFlight) return inFlight;
  recovery.classList.add("hidden");
  startButton.classList.remove("hidden");
  startButton.disabled = true;
  startButton.textContent = "Waiting for Google…";
  setStatus(
    "The Google sign-in window should open. Complete sign-in there, then return to this tab.",
  );

  inFlight = signInWithGoogle()
    .then(async () => {
      document.getElementById("auth-title").textContent = "You're connected";
      document.getElementById("auth-copy").textContent =
        "Your ThinkPin account is ready. Return to the extension popup and save a page.";
      startButton.classList.add("hidden");
      setStatus("Sign-in complete. You can close this tab.", "success");
    })
    .catch((error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Google sign-in could not be completed.";
      setStatus(message, "error");
      if (/another sign-in attempt open|already open|only one web auth flow/i.test(message)) {
        recovery.classList.remove("hidden");
        startButton.classList.add("hidden");
      }
    })
    .finally(() => {
      inFlight = null;
      if (!startButton.classList.contains("hidden")) {
        startButton.disabled = false;
        startButton.innerHTML = 'Continue to Google <span aria-hidden="true">→</span>';
      }
    });
  return inFlight;
}

startButton.addEventListener("click", () => void startSignIn());
retryButton.addEventListener("click", () => void startSignIn());

void getSettings()
  .then(({ appUrl }) => {
    document.getElementById("brand-link").href = `${appUrl}/app`;
  })
  .catch((error) => {
    setStatus(error.message, "error");
  });
