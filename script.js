(function () {
  // -----------------------------------------------------------------------
  // Klaviyo configuration
  //
  // 1. Create a free Klaviyo account at https://www.klaviyo.com/
  // 2. Settings → API Keys → copy your "Public API Key" (looks like "AbCdEf")
  //    and paste it into KLAVIYO_COMPANY_ID below. This is meant to be public.
  // 3. Lists & Segments → Create List → name it "PrimePreps Waitlist".
  //    Open the list, click Settings, copy the List ID into KLAVIYO_LIST_ID.
  // 4. Enable SMS in Klaviyo (Account → Settings → SMS) and register your
  //    A2P 10DLC campaign. Klaviyo walks you through this.
  // -----------------------------------------------------------------------
  const KLAVIYO_COMPANY_ID = ""; // e.g. "AbCdEf"
  const KLAVIYO_LIST_ID = "";    // e.g. "X1y2Z3"
  const KLAVIYO_API_REVISION = "2024-10-15";

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

  const submitToKlaviyo = async ({ first_name, phoneE164, zip }) => {
    if (!KLAVIYO_COMPANY_ID || !KLAVIYO_LIST_ID) {
      throw new Error("Klaviyo is not configured yet.");
    }

    const url = `https://a.klaviyo.com/client/subscriptions/?company_id=${encodeURIComponent(
      KLAVIYO_COMPANY_ID
    )}`;

    const body = {
      data: {
        type: "subscription",
        attributes: {
          custom_source: "PrimePreps Landing Page",
          profile: {
            data: {
              type: "profile",
              attributes: {
                phone_number: phoneE164,
                properties: {
                  first_name,
                  zip,
                  source: "primepreps_landing",
                },
                subscriptions: {
                  sms: {
                    marketing: { consent: "SUBSCRIBED" },
                    transactional: { consent: "SUBSCRIBED" },
                  },
                },
              },
            },
          },
        },
        relationships: {
          list: {
            data: { type: "list", id: KLAVIYO_LIST_ID },
          },
        },
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        revision: KLAVIYO_API_REVISION,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok && res.status !== 202) {
      let detail = "";
      try {
        const json = await res.json();
        detail = json?.errors?.[0]?.detail || "";
      } catch (_) {}
      const err = new Error(detail || `Klaviyo error ${res.status}`);
      err.status = res.status;
      throw err;
    }
  };

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
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
      await submitToKlaviyo({
        first_name: data.first_name.trim(),
        phoneE164: `+1${phoneDigits}`,
        zip: data.zip,
      });

      form.reset();
      setStatus(
        "You're on the list. We'll text you the second we launch in your area.",
        "success"
      );
    } catch (err) {
      const friendly =
        err.status === 429
          ? "Whoa, slow down — please try again in a minute."
          : err.message && err.message.toLowerCase().includes("not configured")
          ? "SMS signup isn't live yet. Check back soon!"
          : "Something went wrong. Please try again in a moment.";
      setStatus(friendly, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
