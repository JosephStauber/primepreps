(function () {
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", null);

    const data = Object.fromEntries(new FormData(form).entries());
    const phoneDigits = (data.phone || "").replace(/\D/g, "");

    if (!data.first_name || !data.first_name.trim()) {
      setStatus("Please enter your first name.", "error");
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
      setStatus("Please agree to receive SMS updates.", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
      // TODO: Replace this block with a POST to your SMS provider.
      // Recommended: Klaviyo (free tier), SlickText, or a Twilio-backed function.
      // Example:
      // await fetch("/api/waitlist", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ ...data, phone: phoneDigits }),
      // });
      await new Promise((r) => setTimeout(r, 600));

      form.reset();
      setStatus("You're on the list. We'll text you the second we launch in your area.", "success");
    } catch (err) {
      setStatus("Something went wrong. Please try again in a moment.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save my spot";
    }
  });
})();
