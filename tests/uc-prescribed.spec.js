const { test, expect } = require('@playwright/test');
const { percyScreenshot } = require('@percy/playwright');
const all = require('./test-data/rinvoq-signup.json');
const data = all.uc;

// The AEM form can swallow a click while it re-renders, so click until the control is really in the target state.
const selectRadio = async (locator) => {
  await expect(async () => {
    await locator.click();
    await expect(locator).toBeChecked({ timeout: 8000 });
  }).toPass({ timeout: 60000 });
};
const tick = async (locator) => {
  await expect(async () => {
    await locator.check();
    await expect(locator).toBeChecked({ timeout: 8000 });
  }).toPass({ timeout: 60000 });
};

test('Ulcerative Colitis - Prescribed (Yes) journey, complete 4-step wizard, stop before Submit TC-8676', async ({ page }) => {
  test.setTimeout(420000);
  // Precondition: open sign-up, dismiss cookie banner.
  await page.goto(all.url);
  await page.getByRole('button', { name: 'Close' }).click();

  // Step 1: choose condition (page reloads with the UC content).
  await page.getByRole('combobox', { name: /I'm interested in receiving information about/ })
    .selectOption({ label: data.condition });
  await expect(page.getByRole('button', { name: 'Select a different condition' })).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('Moderate to Severe Ulcerative Colitis (UC)*', { exact: true })).toBeVisible();
  await expect(page.getByText(/About UC/).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText('Are you currently prescribed RINVOQ?')).toBeVisible();
  await percyScreenshot(page, 'UC - Condition selected');

  // Step 2: prescribed = Yes -> wizard appears.
  await selectRadio(page.getByRole('radio', { name: 'Yes', exact: true }).first());
  await expect(page.getByText('It’s time to get started with RINVOQ Complete.')).toBeVisible();
  await percyScreenshot(page, 'UC - Wizard started');

  // Wizard step 1: diagnosis, start date, date of birth.
  await tick(page.getByRole('checkbox', { name: /I am diagnosed with Moderate to Severe Ulcerative Colitis/ }));
  await expect(page.getByText(/All fields are required unless marked as .Optional./)).toBeVisible();
  const start = page.getByRole('textbox', { name: /Start Date/ });
  const dob = page.getByLabel(/Date Of Birth/);
  await start.fill(data.startDate);
  await dob.fill(data.dob);
  await expect(start).toHaveValue(data.startDate);
  await expect(dob).toHaveValue(data.dob);


  // Wizard step 2: profile information.
  const email = page.getByRole('textbox', { name: 'Email Address' });
  await email.fill(data.email);
  await page.getByRole('textbox', { name: 'First Name' }).fill(all.firstName);
  await page.getByRole('textbox', { name: 'Last Name' }).fill(all.lastName);
  await page.getByRole('textbox', { name: 'Primary Phone' }).fill(data.phone);
  await page.getByRole('textbox', { name: 'ZIP Code' }).fill(all.zip);
  await selectRadio(page.getByRole('radio', { name: 'Male', exact: true }));
  await expect(email).toHaveValue(data.email);
  await expect(page.getByRole('textbox', { name: 'First Name' })).toHaveValue(all.firstName);
  await expect(page.getByRole('textbox', { name: 'Last Name' })).toHaveValue(all.lastName);
  await expect(page.getByRole('textbox', { name: 'ZIP Code' })).toHaveValue(all.zip);
  await expect(page.getByRole('combobox', { name: /Gender Identity/ })).toHaveValue('');

  // Wizard step 3: insurance - Medicare, then change to government-funded; only the last stays selected.
  const medicare = page.getByRole('radio', { name: /Medicare/ });
  const gov = page.getByRole('radio', { name: /government-funded/ });
  // Four insurance options exist (private/commercial, Medicare, government-funded, no insurance).
  await expect(page.locator('input[name$="InsuranceCoverageTypeUC"]')).toHaveCount(4);
  await selectRadio(medicare);
  await selectRadio(gov);
  await expect(gov).toBeChecked();
  await expect(medicare).not.toBeChecked();
  await expect(page.getByRole('radio', { name: /private or commercial/ })).not.toBeChecked();
  await expect(page.getByRole('radio', { name: "I don't have insurance" })).not.toBeChecked();
  await expect(page.getByRole('link', { name: 'Click here for full Terms and Conditions' })).toBeVisible();

  // Wizard step 4: type a different mobile number, SMS + health-data consent.
  const mobile = page.getByRole('textbox', { name: 'Mobile Phone Number' });
  await mobile.fill(data.mobile);
  await expect(mobile).toHaveValue(data.mobile);
  const sms = page.locator('input[name="termsandConditionsCheckBoxUC"]');
  const marketing = page.locator('input[name="MarketingOptionCheckUC"]');
  await tick(sms);
  await tick(marketing);
  await expect(page.getByRole('checkbox', { name: 'Same as primary phone number.' })).not.toBeChecked();

  // Privacy Notice, reCAPTCHA, Submit visible. Submit is NOT clicked.
  await expect(page.getByRole('button', { name: '+ Expand for more information' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Recaptcha Logo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  await percyScreenshot(page, 'UC - Ready to submit');
});
