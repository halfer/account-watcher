/* 
 * Script to obtain useful information from an Orange Your Account login in the UK.
 */

var system = require('system');

// Get the parameters from the launch script
var jsonString = system.args[1];
var params = JSON.parse(jsonString);

// Check we have the necessary parameters
if (!params.username)
{
	system.stderr.writeLine('This script requires a username');
	phantom.exit();
}
if (!params.password)
{
	system.stderr.writeLine('This script requires a password');
	phantom.exit();
}

function containsWarning(haystack, needle)
{
	if (haystack.indexOf(needle) === -1)
	{
		console.log('[warn] Search string `' + needle + '` not found');
	}
}

function login(params)
{
	/**
	 * This function is a class to hold the load handler methods
	 */
	function LoadHandler()
	{
		this.constants = new Object();
		this.constants.PAGE_LOGIN = 'login';
		this.constants.PAGE_EMAIL_REQUEST = 'email';

		/**
		 * Handles the loading of the login screen
		 * 
		 * @param page
		 */
		this.onLoadLogin = function(page)
		{
			var pageId = page.evaluate(
				function(context)
				{
					var
						elementLoggedOut = document.querySelector('h1.PageTitleSignInEE'),
						titleLoggedOut = elementLoggedOut ? elementLoggedOut.innerText : '',

						elementEmail = document.querySelector('.login-flow h2'),
						titleEmail = elementEmail ? elementEmail.innerText : '',

						pageId = null
					;

					// Determine whether we are logged out...
					if (titleLoggedOut.indexOf('SERVICES ON ORANGE.CO.UK') > -1)
					{
						console.log('[ok] Found login screen');
						pageId = context.constants.PAGE_LOGIN;
					}
					// ... or logged in from a previous run
					else if (titleEmail.indexOf("We'd like to get to know you better") > -1)
					{
						console.log('[ok] Found email request screen, already logged in');
						pageId = context.constants.PAGE_EMAIL_REQUEST;
					}
					else
					{
						console.log('[debug] We received something unexpected');
						pageId = document.querySelector('body').textContent;
					}

					return pageId;
				},
				{
					constants: this.constants
				}
			);

			// Only make an attempt to log on if this is the login page
			if (pageId === this.constants.PAGE_LOGIN)
			{
				page.watcherId = 'LoginSubmitted';
				page.evaluate(
					function(params)
					{
						// Set up the credentials and submit the form
						document.querySelector('input[name=LOGIN]').value = params.username;
						document.querySelector('input[name=PASSWORD]').value = params.password;
						document.querySelector('div.inner_left_ee form').submit();
					},
					page.watcherParams
				);
			}
		};

		/**
		 * Handles the screen after the creds have been submitted
		 * 
		 * If the credentials are wrong this is sometimes called twice
		 * 
		 * @param page
		 */
		this.onLoadLoginSubmitted = function(page)
		{
			page.evaluate(
				function()
				{
					// Test for wrong credentials
					var error = document.querySelector('div.inner_left_ee p.error');
					if (error)
					{
						if (error.indexOf('Please enter a valid username and password') !== -1)
						{
							console.log(
								'[error] The username and password settings are incorrect'
							);
							phantom.exit();
						}
					}
				}
			);

			// Test for preferred email address screen, skip if found
			console.log(
				page.contents
			);

		};
	}

	// Logon to the system
	var
		page = require('webpage').create(),
		loadHandler = new LoadHandler()
	;

	page.onLoadStarted = function() {
		console.log('[ok] Page load started: ' + page.watcherId);
	};

	/**
	 * This is called, I think, when a redirect happens
	 * 
	 * @param targetUrl
	 */
	page.onUrlChanged = function(targetUrl) {
		console.log('[debug] New URL: ' + targetUrl + ' on page: ' + page.watcherId);
	};

	page.onLoadFinished = function() {
		console.log('[ok] Page load finished:' + page.watcherId);

		// Call the custom handler, passing the page object in
		loadHandler['onLoad' + page.watcherId](page);
	};

	// Thanks to https://www.princeton.edu/~crmarsh/phantomjs/
	page.onConsoleMessage = function(msg)
	{
		console.log('Console log: ' + msg);
	};

	var url = 'https://web.orange.co.uk/r/login/';
	page.watcherId = 'Login';
	page.watcherParams = params;
	page.open(
		url,
		function(status)
		{
			if (status === 'fail')
			{
				system.stderr.writeLine("[error] Can't access home page to log on");
			}

			//phantom.exit();
		}
	);
}

login(params);

// @todo If it says "Preferred email address" then go to "https://web.orange.co.uk/id/profilemanagement.php?rm=SkipThisStep"
// @todo Check it says "hello customer"
// @todo Inject username into "emailormsisdn"
// @todo Inject password into "password"
// @todo Submit via "#SignInForm_EE form button"
