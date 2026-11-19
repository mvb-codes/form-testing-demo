const { test, expect } = require('@playwright/test');
const all = require('./test-data/rinvoq-signup.json');
const data = all.nrAxSpA;

// The AEM form can swallow a click while it re-renders, so click until the control is really in the target state.
const selectRadio = async (locator) => {
  await expect(async () => {
    await locator.click();
    await expect(locator).toBeChecked({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
};
const tick = async (locator) => {
  await expect(async () => {
    await locator.check();
    await expect(locator).toBeChecked({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
};

test('Non-radiographic Axial Spondyloarthritis - Prescribed (Yes) journey, stop before Submit TC-8678', async ({ page }) => {
  // Precondition: open sign-up, dismiss cookie banner.
  await page.goto(all.url);
  await page.getByRole('button', { name: 'Close' }).click();

  // Step 1: choose condition, then prescribed = Yes.
  await page.getByRole('combobox', { name: /I'm interested in receiving information about/ })
    .selectOption({ label: data.condition });
  await expect(page.getByRole('button', { name: 'Select a different condition' })).toBeVisible();
  await expect(page.getByText('Active Non-radiographic Axial Spondyloarthritis*', { exact: true })).toBeVisible();
  await expect(
    page.getByText('*When TNF blockers did not work well or could not be tolerated.').filter({ visible: true })
  ).toHaveCount(1);
  await selectRadio(page.getByRole('radio', { name: 'Yes', exact: true }).first());
  await expect(page.getByText('It’s time to get started with RINVOQ Complete.')).toBeVisible();

  // Step 2 (wizard step 1): diagnosis, start date, date of birth.
  const diagnosed = page.getByRole('checkbox', { name: /I am diagnosed with Active Non-radiographic Axial Spondyloarthritis/ });
  await tick(diagnosed);
  const start = page.getByRole('textbox', { name: /Start Date/ });
  const dob = page.getByRole('textbox', { name: /Date of Birth/ });
  await start.fill(data.startDate);
  await dob.fill(data.dob);
  await expect(start).toHaveValue(data.startDate);
  await expect(dob).toHaveValue(data.dob);

  // Profile information.
  const email = page.getByRole('textbox', { name: 'Email Address' });
  await email.fill(data.yesEmail);
  await page.getByRole('textbox', { name: 'First Name' }).fill(all.firstName);
  await page.getByRole('textbox', { name: 'Last Name' }).fill(all.lastName);
  await page.getByRole('textbox', { name: 'Primary Phone' }).fill(data.phone);
  await page.getByRole('textbox', { name: 'ZIP Code' }).fill(all.zip);
  await selectRadio(page.getByRole('radio', { name: 'Female', exact: true }));
  const genderIdentity = page.getByRole('combobox', { name: /Gender Identity/ });
  await expect(genderIdentity).toHaveValue('');
  await expect(email).toHaveValue(data.yesEmail);
  await expect(page.getByRole('textbox', { name: 'First Name' })).toHaveValue(all.firstName);
  await expect(page.getByRole('textbox', { name: 'Last Name' })).toHaveValue(all.lastName);
  await expect(page.getByRole('textbox', { name: 'ZIP Code' })).toHaveValue(all.zip);
  await expect(page.getByRole('radio', { name: 'Female', exact: true })).toBeChecked();

  // Insurance: I don't have insurance.
  const noInsurance = page.getByRole('radio', { name: "I don't have insurance" });
  await selectRadio(noInsurance);
  await expect(page.getByRole('radio', { name: /Medicare/ })).not.toBeChecked();

  // Reminders: same as primary phone + SMS consent; marketing consent left unticked.
  const same = page.getByRole('checkbox', { name: 'Same as primary phone number.' });
  await tick(same);
  await expect(page.getByRole('textbox', { name: 'Mobile Phone Number' })).toHaveValue(/5555550101|\(?555\)?[\s-]?555-?0101/);
  const sms = page.locator('input[name="termsandConditionsCheckBox"]');
  await tick(sms);
  await expect(page.locator('input[name="MarketingOptionCheck"]')).not.toBeChecked();

  // Privacy Notice, reCAPTCHA, Submit visible. Submit is NOT clicked.
  await expect(page.getByRole('button', { name: '+ Expand for more information' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Recaptcha Logo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});
