const { test, expect } = require('@playwright/test');
const all = require('./test-data/rinvoq-signup.json');
const data = all.jpsa;

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

test('JPsA - Prescribed (Yes) guardian journey: diagnosis wording and child fields, stop before Submit TC-8675', async ({ page }) => {
  // Precondition: open sign-up, dismiss cookie banner.
  await page.goto(all.url);
  await page.getByRole('button', { name: 'Close' }).click();

  // Step 1: choose JPsA, then prescribed = Yes -> RINVOQ + RINVOQ LQ header, 4-step wizard.
  await page.getByRole('combobox', { name: /I'm interested in receiving information about/ })
    .selectOption({ label: data.condition });
  await expect(page.getByRole('button', { name: 'Select a different condition' })).toBeVisible();
  await selectRadio(page.getByRole('radio', { name: 'Yes', exact: true }).first());
  await expect(page.getByText(/RINVOQ LQ/).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('It’s time to get started with RINVOQ Complete.')).toBeVisible();
  await expect(page.getByText('Tell us about yourself.')).toBeVisible();

  // Step 2: guardian checkbox with JPsA wording.
  await tick(page.getByRole('checkbox', {
    name: 'I am the legal guardian for a child 2-17 years of age diagnosed with Active Juvenile Psoriatic Arthritis',
  }));
  await expect(page.getByText(/All fields are required unless marked as .Optional./)).toBeVisible();

  // Step 3: start date, medication form, child DOB and first name.
  const start = page.getByRole('textbox', { name: /Start Date/ });
  const childDob = page.getByRole('textbox', { name: /Child's Date Of Birth/ });
  const childFirst = page.getByRole('textbox', { name: "Child's First Name" });
  await start.fill(data.startDate);
  await selectRadio(page.getByRole('radio', { name: data.medication, exact: true }));
  await childDob.fill(data.childDob);
  await childFirst.fill(data.childFirstName);
  await expect(start).toHaveValue(data.startDate);
  await expect(childDob).toHaveValue(data.childDob);
  await expect(childFirst).toHaveValue(data.childFirstName);
  await expect(page.getByText('Does your child take the oral solution or the tablet?')).toBeVisible();
  await expect(
    page.getByText('If you don’t recall the date of the first dose, or if your child hasn’t started yet, an approximate date is fine.')
  ).toBeVisible();

  // Step 4: read labels of steps 2-4 (no data entered). Submit is NOT clicked.
  await expect(page.getByRole('textbox', { name: 'Your Email Address' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your First Name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your Last Name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your Primary Phone' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'ZIP Code' })).toBeVisible();
  await expect(page.getByRole('radio', { name: "I don't have insurance" })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Same as primary phone number.' })).toBeVisible();
  await expect(page.locator('input[name="termsandConditionsCheckBoxJPSA"]')).toBeVisible();
  await expect(page.locator('input[name="MarketingOptionCheckJPSA"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Expand for more information' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Recaptcha Logo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});
