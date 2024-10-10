// app.js

// Import the secrets instance from load_env.js
const secrets = require('./load_env'); // Adjust the path as per your project structure

async function useSecrets() {
	// Wait for secrets to load
	await secrets.loadSecrets();

	// Access all secrets
	const allSecrets = secrets.getAllSecrets();
	console.log('All Secrets:', allSecrets);
}

useSecrets();