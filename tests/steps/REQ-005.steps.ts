import { Given, When, Then } from '@cucumber/cucumber';

Given('the user has created a programmatic check', function () {
    console.log('User has created a programmatic check.');
});

When('the user says {string}', function (message) {
    console.log(`User says: "${message}"`);
});

Then('Arela should create a check called {string}', function (checkName) {
    console.log(`Arela should create a check called: "${checkName}"`);
});

Given('the system has detected natural language failures', function () {
    console.log('System has detected natural language failures.');
});

When('the system generates ESLint rules or Git Hooks', function () {
    console.log('System generates ESLint rules or Git Hooks.');
});

Then('the codebase should become stricter over time', function () {
    console.log('The codebase should become stricter over time.');
});