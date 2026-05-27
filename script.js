(function () {
  // Formspree endpoint for the PrimePreps waitlist.
  // Manage submissions at https://formspree.io/forms/xykvlpqv/submissions
  const WAITLIST_ENDPOINT = "https://formspree.io/f/xykvlpqv";

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const form = document.getElementById("waitlist-form");
  const status = document.getElementById("form-status");
  if (!form || !status) return;

  const setStatus = (message, kind) => {
    status.textContent = message;
    status.classList.remove("success", "error");
    if (kind) status.classList.add(kind);
  };

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const phoneInput = form.querySelector('input[name="phone"]');
  phoneInput.addEventListener("input", (e) => {
    e.target.value = formatPhone(e.target.value);
  });

  const submitWaitlist = async (payload) => {
    const res = await fetch(WAITLIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    let json = null;
    try {
      json = await res.json();
    } catch (_) {}

    if (!res.ok || (json && json.ok === false)) {
      const detail =
        (json && json.errors && json.errors[0] && json.errors[0].message) ||
        `Server returned ${res.status}`;
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", null);

    const data = Object.fromEntries(new FormData(form).entries());
    const phoneDigits = (data.phone || "").replace(/\D/g, "");
    const name = (data.name || "").trim();
    const email = (data.email || "").trim();

    if (!name) {
      setStatus("Please enter your full name.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("Please enter a valid email address.", "error");
      return;
    }
    if (phoneDigits.length !== 10) {
      setStatus("Please enter a valid 10-digit US mobile number.", "error");
      return;
    }
    if (!/^\d{5}$/.test(data.zip || "")) {
      setStatus("Please enter a valid 5-digit ZIP code.", "error");
      return;
    }
    if (!data.consent) {
      setStatus("Please agree to receive email and SMS updates.", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
      await submitWaitlist({
        name,
        email,
        phone: `+1${phoneDigits}`,
        zip: data.zip,
        marketing_consent: "YES",
        marketing_consent_text:
          "By checking this box, I agree to receive recurring marketing emails and SMS messages from PrimePreps at the email address and phone number provided. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel SMS, HELP for help. Consent isn't a condition of any purchase.",
        source: "primepreps_landing",
        submitted_at: new Date().toISOString(),
        _subject: `New PrimePreps waitlist signup: ${name}`,
      });

      form.reset();
      setStatus(
        "You're on the list. We'll be in touch the moment we launch in your area.",
        "success"
      );
    } catch (err) {
      console.error("Waitlist submission failed:", err);
      setStatus(
        err.message
          ? `Couldn't save your spot: ${err.message}`
          : "Something went wrong. Please try again in a moment.",
        "error"
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
