import { Given, When, Then } from '@cucumber/cucumber';

Given('the Safety System is active', function () {
    console.log('Safety System is active.');
});

When('an attempt is made to write to the filesystem', function () {
    console.log('Attempting to write to the filesystem.');
});

Then('the write operation should be blocked', function () {
    console.log('Write operation is blocked.');
});

Given('I am diagnosing a bug', function () {
    console.log('Diagnosing a bug.');
});

When('I attempt to change code within the filesystem', function () {
    console.log('Attempting to change code within the filesystem.');
});

Then('a warning should be issued to indicate write changes are not allowed', function () {
    console.log('Warning: write changes are not allowed.');
});

Given('the filesystem is accessible', function () {
    console.log('Filesystem is accessible.');
});

When('I attempt to read from the filesystem', function () {
    console.log('Attempting to read from the filesystem.');
});

Then('I should be able to gather information without impediment', function () {
    console.log('Gathering information without impediment.');
});