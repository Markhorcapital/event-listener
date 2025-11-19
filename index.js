/** @format */

const { Secrets } = require('./server/utils/secrets');
const loadSecrets = require('./load_env');
const express = require('express');
const Sentry = require('@sentry/node');
const { closeRedis } = require('./config/redisInstance');
const { connectDB, mongoose } = require('./config/mongooseInstance');

(async () => {
	await loadSecrets();

	// Initialize database connection (optional - will warn if not available)
	await connectDB();

	const { startProcessing } = require('./server/manager.js');
	const app = express();
	const { PORT, SENTRY_DSN } = Secrets;

	app.use(express.json());

	// Sentry.init({
	// 	dsn: SENTRY_DSN,
	// 	integrations: [
	// 		// enable HTTP calls tracing
	// 		new Sentry.Integrations.Http({
	// 			tracing: true
	// 		}),
	// 		// enable Express.js middleware tracing
	// 		new Sentry.Integrations.Express({
	// 			app
	// 		})
	// 	],
	// 	// Performance Monitoring
	// 	tracesSampleRate: 1.0 // Capture 100% of the transactions, reduce in production!,
	// });


	// Custom middleware to log API caller data in case of errors
	app.use((err, req, res, next) => {
		// Log the API caller data only if there's an error
		if (err) {
			Sentry.withScope((scope) => {
				scope.setExtra('Endpoint', req.originalUrl);
				scope.setExtra('Method', req.method);
				scope.setExtra('Request Body', req.body);
				scope.setExtra('Headers', req.headers); // Add headers to the Sentry scope
				scope.setExtra('Query Parameters', req.query); // Add query parameters to the Sentry scope

				Sentry.captureException(err); // Capture the error with the additional data
			});
		}

		next(err); // Pass the error to the default error handler
	});

	async function startManager() {
		try {
			await startProcessing();
		} catch (error) {
			console.error(`FATAL ERROR in manager.js: ${error}`);
			Sentry.captureException(error);
			// Exit process to prevent zombie state - PM2 will restart
			process.exit(1);
		}
	}

	// Enhanced health check endpoint
	app.get(`/health`, (_req, res) => {
		res.json({
			status: 'healthy',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		});
	});

	// Start the application with proper error handling
	startManager().catch((error) => {
		console.error(`FATAL: Failed to start the application: ${error}`);
		Sentry.captureException(error);
		// Exit process to prevent zombie state - PM2 will restart
		process.exit(1);
	});

	// The error handler must be registered after the custom error logging middleware and after all controllers
	app.use(Sentry.Handlers.errorHandler());

	// Optional fallthrough error handler
	app.use(function onError(err, req, res, next) {
		// The error id is attached to `res.sentry` to be returned
		// and optionally displayed to the user for support.
		res.statusCode = 500;
		res.end(res.sentry + '\n');
	});

	app.listen(PORT, () => {
		console.log(`Express server listening on PORT ${PORT}`);
	});

	// Graceful shutdown for Redis and MongoDB
	process.on('SIGINT', async () => {
		console.log('Shutting down gracefully...');
		await closeRedis();
		await mongoose.connection.close();
		process.exit(0);
	});

	process.on('SIGTERM', async () => {
		console.log('Shutting down gracefully...');
		await closeRedis();
		await mongoose.connection.close();
		process.exit(0);
	});
})();
