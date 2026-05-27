(function () {
  // -----------------------------------------------------------------------
  // Waitlist endpoint
  //
  // Submissions are POSTed to a Google Apps Script web app that appends
  // them as rows in your Google Sheet. Setup steps are in README-ish
  // form at the bottom of this file. Paste your deployed web-app URL
  // (the one that ends in "/exec") below.
  // -----------------------------------------------------------------------
  const WAITLIST_ENDPOINT = "";

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

  const submitWaitlist = async ({ first_name, phoneE164, zip }) => {
    if (!WAITLIST_ENDPOINT) {
      throw new Error("Waitlist endpoint is not configured yet.");
    }

    const params = new URLSearchParams();
    params.append("first_name", first_name);
    params.append("phone", phoneE164);
    params.append("zip", zip);
    params.append("sms_consent", "1");
    params.append("source", "primepreps_landing");
    params.append("user_agent", navigator.userAgent);

    const res = await fetch(WAITLIST_ENDPOINT, {
      method: "POST",
      body: params,
    });

    if (!res.ok) {
      const err = new Error(`Server returned ${res.status}`);
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
      await submitWaitlist({
        first_name: data.first_name.trim(),
        phoneE164: `+1${phoneDigits}`,
        zip: data.zip,
      });

      form.reset();
      setStatus(
        "You're on the list. We'll be in touch the moment we launch in your area.",
        "success"
      );
    } catch (err) {
      console.error("Waitlist submission failed:", err);
      const friendly =
        err.message && err.message.toLowerCase().includes("not configured")
          ? "Signups aren't live yet. Check back soon!"
          : "Something went wrong. Please try again in a moment.";
      setStatus(friendly, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();

/* ----------------------------------------------------------------------
   Google Sheets setup (one-time)

   1. Open https://sheets.new to create a new blank Google Sheet.
      Name it "PrimePreps Waitlist".

   2. In the menu bar: Extensions -> Apps Script.
      (On mobile you'll need "Request Desktop Site" in Safari/Chrome,
       OR just do this step from a laptop.)

   3. Delete the default code in the editor and paste this:

      function doPost(e) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(['Timestamp','First Name','Phone','ZIP','SMS Consent','Source','User Agent']);
        }
        const p = e.parameter || {};
        sheet.appendRow([
          new Date(),
          p.first_name || '',
          p.phone || '',
          p.zip || '',
          p.sms_consent === '1' ? 'YES' : 'NO',
          p.source || '',
          p.user_agent || ''
        ]);
        return ContentService.createTextOutput(JSON.stringify({ ok: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }

   4. Click the blue "Deploy" button (top right) -> New deployment.
      - Click the gear icon -> select "Web app".
      - Description: "PrimePreps waitlist webhook"
      - Execute as: Me
      - Who has access: Anyone
      - Click Deploy. Approve the permissions when prompted.

   5. Copy the "Web app URL" it shows you (ends in "/exec") and send
      it back so it can be pasted into WAITLIST_ENDPOINT above.
---------------------------------------------------------------------- */
