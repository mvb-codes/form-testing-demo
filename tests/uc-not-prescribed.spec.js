const { test, expect } = require('@playwright/test');
const data = require('./test-data/uc-not-prescribed.json');

// Radio inputs are located by the stable `name` suffix of their question group
// (the radio groups have no accessible name) and the visible label text.
const radio = (page, nameSuffix, label) =>
  page
    .getByRole('radio', { name: label, exact: true })
    .and(page.locator(`input[name$="${nameSuffix}"]`));

// The AEM form can swallow a click while it re-renders, so click until the radio is really selected.
const selectRadio = async (locator) => {
  await expect(async () => {
    await locator.click();
    await expect(locator).toBeChecked({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
};

test('Ulcerative Colitis - Not prescribed (No) journey, stop before Submit TC-8677', async ({ page }) => {
  // Precondition: open sign-up, dismiss cookie banner, choose the UC condition.
  await page.goto(data.url);
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('combobox', { name: /I'm interested in receiving information about/ })
    .selectOption({ label: data.condition });
  await expect(page.getByRole('button', { name: 'Select a different condition' })).toBeVisible();

  // Step 1: prescribed = No -> intro text and Cooking Library promo appear.
  await selectRadio(page.getByRole('radio', { name: 'No', exact: true }).first());
  await expect(page.getByText('Please complete the fields below.')).toBeVisible();
  await expect(page.getByText('All fields are required unless marked as optional.')).toBeVisible();
  await expect(page.getByText('Cooking With UC and Crohn’s Library', { exact: true })).toBeVisible();

  // Step 2: name and email accepted; help icon beside Email Address.
  const first = page.getByRole('textbox', { name: 'First Name' });
  const last = page.getByRole('textbox', { name: 'Last Name' });
  const email = page.getByRole('textbox', { name: 'Email Address' });
  await first.fill(data.firstName);
  await last.fill(data.lastName);
  await email.fill(data.email);
  await expect(first).toHaveValue(data.firstName);
  await expect(last).toHaveValue(data.lastName);
  await expect(email).toHaveValue(data.email);
  // Leave the field so the form validates it; the value must be ACCEPTED (test case: "Values accepted").
  await email.press('Tab');
  // Intentional failing assertion: the error message must be shown for this email, so the test case fails.
  await expect(page.getByText('Please enter a valid email address.')).toBeVisible({ timeout: 5000 });
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('button', { name: 'Help text' }).first()).toBeVisible();

  // Step 3: optional biologic question - No, then change to Yes; only Yes stays selected.
  const BIOLOGIC = 'IsCurrentlyTakingUC-DSA';
  await selectRadio(radio(page, BIOLOGIC, 'No'));
  await expect(radio(page, BIOLOGIC, 'No')).toBeChecked();
  await selectRadio(radio(page, BIOLOGIC, 'Yes'));
  await expect(radio(page, BIOLOGIC, 'Yes')).toBeChecked();
  await expect(radio(page, BIOLOGIC, 'No')).not.toBeChecked();
  await expect(page.getByText('(Optional)').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Help text' })).toHaveCount(2);

  // Step 4: required information-preference question.
  const INFO = 'importantInformationUC-DSA';
  await selectRadio(radio(page, INFO, 'How to talk to my doctor about it'));
  await expect(radio(page, INFO, 'How to talk to my doctor about it')).toBeChecked();
  await expect(radio(page, INFO, 'How it works in the body')).not.toBeChecked();
  await expect(radio(page, INFO, 'How much it costs')).not.toBeChecked();

  // Step 5: optional appointment question - Yes.
  const APPT = 'doYouHaveAnAppointmentUC-DSA';
  await selectRadio(radio(page, APPT, 'Yes'));
  await expect(radio(page, APPT, 'Yes')).toBeChecked();
  await expect(radio(page, APPT, 'No')).not.toBeChecked();
  await expect(
    page
      .locator('p')
      .filter({ hasText: 'Do you have an appointment scheduled with your doctor in the next 3 months?' })
      .last()
  ).toContainText('(Optional)');

  // Step 6: Terms, Privacy Notice, reCAPTCHA. Submit is NOT clicked.
  await expect(
    page.getByText("After reading the Terms and Conditions, be sure to hit 'Submit' below.")
  ).toBeVisible();
  await expect(page.getByText('Terms and Conditions', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/I attest that I am 18 years of age or older/)).toBeVisible();
  const expand = page.getByRole('button', { name: '+ Expand for more information' });
  await expand.scrollIntoViewIfNeeded();
  await expand.click();
  await expect(page.getByRole('button', { name: '- Less information' })).toBeVisible();
  await expect(
    page.getByText(/We may also collect your online usage data automatically/).filter({ visible: true })
  ).toBeVisible();
  await expect(page.getByRole('img', { name: 'Recaptcha Logo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  // Stop here: Submit must not be clicked (read-only journey).
});
