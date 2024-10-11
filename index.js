const secrets = require('./load_env');

(async () => {
	try {
		// Load secrets before requiring other modules
		await secrets.loadSecrets();
		require('./app');

		// app.start();
	} catch (err) {
		console.error(
			'Failed to start the application due to secret loading error.'
		);
		console.error(err);
		process.exit(1); // Exit the application
	}
})();