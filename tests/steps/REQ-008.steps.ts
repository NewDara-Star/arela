import { Given, When, Then } from '@cucumber/cucumber';

Given('the session is in the initial state', async function () {
  console.log('Given: the session is in the initial state');
});

When('a symptom is logged', async function () {
  console.log('When: a symptom is logged');
});

Then('the session enters ANALYSIS mode', async function () {
  console.log('Then: the session enters ANALYSIS mode');
});

Given('the session is in ANALYSIS mode', async function () {
  console.log('Given: the session is in ANALYSIS mode');
});

When('a hypothesis is registered', async function () {
  console.log('When: a hypothesis is registered');
});

Then('the session enters VERIFICATION mode', async function () {
  console.log('Then: the session enters VERIFICATION mode');
});

Given('the session is in VERIFICATION mode', async function () {
  console.log('Given: the session is in VERIFICATION mode');
});

When('a hypothesis is confirmed', async function () {
  console.log('When: a hypothesis is confirmed');
});

Then('the session enters IMPLEMENTATION mode', async function () {
  console.log('Then: the session enters IMPLEMENTATION mode');
});

Given('the session is in any mode', async function () {
  console.log('Given: the session is in any mode');
});

When('a condition for escalation is met', async function () {
  console.log('When: a condition for escalation is met');
});

Then('the session does not loop endlessly', async function () {
  console.log('Then: the session does not loop endlessly');
});