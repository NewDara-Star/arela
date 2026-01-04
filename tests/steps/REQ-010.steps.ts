import { Given, When, Then } from '@cucumber/cucumber';

Given('I have a codebase with existing dependencies', function () {
  console.log('Given I have a codebase with existing dependencies');
});

When('I view the dependency graph', function () {
  console.log('When I view the dependency graph');
});

Then('I should see the upstream imports for the selected module', function () {
  console.log('Then I should see the upstream imports for the selected module');
});

Then('I should see the downstream imports for the selected module', function () {
  console.log('Then I should see the downstream imports for the selected module');
});

Given('I have modified the codebase', function () {
  console.log('Given I have modified the codebase');
});

When('I refresh the dependency graph', function () {
  console.log('When I refresh the dependency graph');
});

Then('the graph should be rebuilt to reflect my changes', function () {
  console.log('Then the graph should be rebuilt to reflect my changes');
});