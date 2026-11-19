const { test, expect } = require('@playwright/test');
const all = require('./test-data/rinvoq-signup.json');
const data = all.pjia;

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

test('pJIA - Prescribed (Yes) guardian journey: full 4-step wizard incl. child fields, stop before Submit TC-8673', async ({ page }) => {
  // Precondition: open sign-up, dismiss cookie banner.
  await page.goto(all.url);
  await page.getByRole('button', { name: 'Close' }).click();

  // Step 1: choose pJIA -> RINVOQ LQ branding, heading + footnote, reduced nav.
  await page.getByRole('combobox', { name: /I'm interested in receiving information about/ })
    .selectOption({ label: data.condition });
  await expect(page.getByRole('button', { name: 'Select a different condition' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'RINVOQ LQ upadacitinib 1 mg/ml oral solution' })).toBeVisible();
  // The heading/footnote are in the DOM but the page animates and later hides them, so assert their text is attached.
  await expect(page.getByText(`${data.condition}*`, { exact: true })).toBeAttached();
  await expect(page.getByText('*When TNF blockers did not work well or could not be tolerated.', { exact: true }).first()).toBeAttached();
  // These nav items are <a href="#"> (no link role), so locate them by text inside the nav.
  await expect(page.locator('nav').getByText('About RINVOQ', { exact: true })).toBeVisible();
  await expect(page.locator('nav').getByText('RINVOQ Resources', { exact: true })).toBeVisible();

  // Step 2: prescribed = Yes -> 4-step wizard.
  await selectRadio(page.getByRole('radio', { name: 'Yes', exact: true }).first());
  // The page uses a non-breaking space after "with", so match whitespace with \s.
  await expect(page.getByText(/It.s time to get started with\sRINVOQ Complete\. Sign-up takes only 4-5 minutes\./)).toBeVisible();

  // Step 3: condition guardian checkbox.
  await tick(page.getByRole('checkbox', {
    name: `I am the legal guardian for a child 2-17 years of age diagnosed with ${data.condition}`,
  }));
  await expect(page.getByText(/All fields are required unless marked as .Optional./)).toBeVisible();

  // Step 4: child data (Oral Solution / Female).
  const start = page.getByRole('textbox', { name: /Start Date/ });
  const childDob = page.getByRole('textbox', { name: /Child's Date Of Birth/ });
  const childFirst = page.getByRole('textbox', { name: "Child's First Name" });
  const childLast = page.getByRole('textbox', { name: "Child's Last Name" });
  const oral = page.getByRole('radio', { name: 'Oral Solution', exact: true });
  const tablet = page.getByRole('radio', { name: 'Tablet', exact: true });
  // The first Male/Female pair is the child's sex, the second pair is the guardian's sex.
  const childMale = page.getByRole('radio', { name: 'Male', exact: true }).first();
  const childFemale = page.getByRole('radio', { name: 'Female', exact: true }).first();
  await start.fill(data.startDate);
  await selectRadio(oral);
  await childDob.fill(data.childDob);
  await childFirst.fill(data.childFirstName);
  await childLast.fill(data.childLastName);
  await selectRadio(childFemale);
  await expect(start).toHaveValue(data.startDate);
  await expect(childDob).toHaveValue(data.childDob);
  await expect(childFirst).toHaveValue(data.childFirstName);
  await expect(childLast).toHaveValue(data.childLastName);
  await expect(oral).toBeChecked();
  await expect(childFemale).toBeChecked();

  // Step 5: input-combination variant -> only Tablet and Male remain selected; guardian checkbox.
  await selectRadio(tablet);
  await selectRadio(childMale);
  await expect(tablet).toBeChecked();
  await expect(oral).not.toBeChecked();
  await expect(childMale).toBeChecked();
  await expect(childFemale).not.toBeChecked();
  await tick(page.getByRole('checkbox', { name: "I am the child's legal guardian and am 18 years of age or older." }));

  // Step 6: Profile Information.
  const email = page.getByRole('textbox', { name: 'Your Email Address' });
  const first = page.getByRole('textbox', { name: 'Your First Name' });
  const last = page.getByRole('textbox', { name: 'Your Last Name' });
  const phone = page.getByRole('textbox', { name: 'Your Primary Phone' });
  const zip = page.getByRole('textbox', { name: 'ZIP Code' });
  const dob = page.getByRole('textbox', { name: /Your Date of Birth/ });
  const guardianFemale = page.getByRole('radio', { name: 'Female', exact: true }).nth(1);
  await email.fill(data.email);
  await first.fill(all.firstName);
  await last.fill(all.lastName);
  await phone.fill(data.phone);
  await zip.fill(all.zip);
  await dob.fill(data.dob);
  await selectRadio(guardianFemale);
  await expect(email).toHaveValue(data.email);
  await expect(first).toHaveValue(all.firstName);
  await expect(last).toHaveValue(all.lastName);
  await expect(zip).toHaveValue(all.zip);
  await expect(dob).toHaveValue(data.dob);
  await expect(guardianFemale).toBeChecked();
  // Gender Identity (Optional) is left at 'Select' (empty value).
  await expect(page.getByRole('combobox', { name: /Gender Identity/ })).toHaveValue('');

  // Step 7: Insurance -> Medicare; four options and T&C link.
  await expect(page.getByText(/The RINVOQ Complete Savings Card may help you pay as little as \$0 a month\./)).toBeVisible();
  const medicare = page.getByRole('radio', { name: /I'm on Medicare/ });
  await selectRadio(medicare);
  await expect(medicare).toBeChecked();
  await expect(page.getByRole('radio', { name: /I have private or commercial insurance/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /I have a government-funded, Medicaid, or VA insurance plan/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: "I don't have insurance" })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Click here for full Terms and Conditions' })).toBeVisible();

  // Step 8: reminders and updates. Submit is NOT clicked.
  await expect(page.getByText('Sign up for reminders and updates')).toBeVisible();
  await expect(page.getByText(/The information and consent below relate to the processing of your child.s personal health data\./)).toBeVisible();
  const samePhone = page.getByRole('checkbox', { name: 'Same as primary phone number.' });
  await tick(samePhone);
  await expect(page.getByRole('textbox', { name: 'Mobile Phone Number' })).toHaveValue('555-555-0101');
  const sms = page.locator('input[name="termsandConditionsCheckBox"]');
  const news = page.locator('input[name="MarketingOptionCheck"]');
  await tick(sms);
  await expect(news).not.toBeChecked();
  await expect(page.getByRole('link', { name: 'Privacy Notice' }).first()).toBeVisible();
  await expect(page.getByRole('img', { name: 'Recaptcha Logo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});
