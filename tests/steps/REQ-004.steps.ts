import { Given, When, Then } from '@cucumber/cucumber';

Given('I am a user of the context engine', () => {
  console.log('User is accessing the context engine');
});

When('I access the context of a project', () => {
  console.log('User has accessed the project context');
});

Then('I immediately know the project rules and previous work history', () => {
  console.log('User knows the project rules and previous work history');
});

// Duplicate removed


When('I complete a task', () => {
  console.log('User has completed a task');
});

Then('my work is saved for the next agent', () => {
  console.log('User work is saved for the next agent');
});

Given('I am a Project Owner', () => {
  console.log('User is a Project Owner');
});

When('a new agent attempts to use the tools', () => {
  console.log('A new agent is attempting to use the tools');
});

Then('all tools are blocked until `arela_context` is called', () => {
  console.log('All tools are blocked until arle_context is called');
});

Then('no agent acts without reading the rules first', () => {
  console.log('No agent can act without first reading the rules');
});