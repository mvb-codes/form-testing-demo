const { test, expect } = require('@playwright/test');
const all = require('./test-data/rinvoq-signup.json');
const data = all.nrAxSpA;

// The AEM form can swallow a click while it re-renders, so click until the radio is really selected.
const selectRadio = async (locator) => {
  await expect(async () => {
    await locator.click();
    await expect(locator).toBeChecked({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
};

test('Non-radiographic Axial Spondyloarthritis - Not prescribed (No) journey, stop before Submit TC-8679', async ({ page }) => {
  // Precondition: open sign-up, dismiss cookie banner, choose the nr-axSpA condition.
  await page.goto(all.url);
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('combobox', { name: /I'm interested in receiving information about/ })
    .selectOption({ label: data.condition });
  await expect(page.getByRole('button', { name: 'Select a different condition' })).toBeVisible();
  
  // Step 1: prescribed = No -> short form with required-fields note.
  await selectRadio(page.getByRole('radio', { name: 'No', exact: true }).first());
  await expect(page.getByText('All fields are required.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'First Name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Last Name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email Address' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'ZIP Code' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Date of Birth' })).toBeVisible();
  await expect(page.getByText('(MM/DD/YYYY)').filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText('RINVOQ is available to individuals 18 and older.')).toBeVisible();

  // Step 2: contact details, DOB, gender (Non-binary then Female).
  await page.getByRole('textbox', { name: 'First Name' }).fill(all.firstName);
  await page.getByRole('textbox', { name: 'Last Name' }).fill(all.lastName);
  await page.getByRole('textbox', { name: 'Email Address' }).fill(data.noEmail);
  await page.getByRole('textbox', { name: 'ZIP Code' }).fill(all.zip);
  await page.getByRole('textbox', { name: 'Date of Birth' }).fill(data.dob);
  await expect(page.getByRole('textbox', { name: 'Date of Birth' })).toHaveValue(data.dob);

  // Gender radios expose their name via aria-label ("Gender:  Male"), not an accessible role name.
  const male = page.getByLabel(/Gender:\s+Male/);
  const female = page.getByLabel(/Gender:\s+Female/);
  const nonBinary = page.getByLabel(/Gender:\s+Non-binary/);
  await expect(male).toHaveCount(1);
  await expect(female).toHaveCount(1);
  await expect(nonBinary).toHaveCount(1);
  await selectRadio(nonBinary);
  await selectRadio(female);
  await expect(female).toBeChecked();
  await expect(nonBinary).not.toBeChecked();
  await expect(male).not.toBeChecked();

  // Step 3: diagnosis question -> Yes.
  await expect(page.getByText('Have you been diagnosed with Non-radiographic Axial Spondyloarthritis (nr-axSpA)?')).toBeVisible();
  const diagYes = page.getByRole('radio', { name: 'Yes', exact: true }).and(page.locator('input[name$="IsCurrentlyTakingPSA"]'));
  const diagNo = page.getByRole('radio', { name: 'No', exact: true }).and(page.locator('input[name$="IsCurrentlyTakingPSA"]'));
  await selectRadio(diagYes);
  await expect(diagYes).toBeChecked();
  await expect(diagNo).not.toBeChecked();

  // Step 4: Terms, Privacy Notice, reCAPTCHA above Submit. Submit is NOT clicked.
  await expect(page.getByText('Terms and conditions', { exact: true })).toBeVisible();
  await expect(page.getByText('Privacy Notice', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('img', { name: 'Recaptcha Logo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});
