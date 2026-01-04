import { Given, When, Then } from '@cucumber/cucumber';

Given('the codebase is scanned', () => {
    console.log('Codebase scanning initiated...');
});

When('embeddings are created', () => {
    console.log('Creating embeddings...');
});

Then('the system stores the embeddings for future searches', () => {
    console.log('Embeddings stored in the system for future searches.');
});

Given('relevant files exist in the system', () => {
    console.log('Relevant files are present in the system.');
});

When('a user searches for terms related to the content', () => {
    console.log('User initiated a search for relevant terms...');
});

Then('the system returns relevant files even if they don\'t contain those exact words', () => {
    console.log('System returned appropriate relevant files based on the search.');
});