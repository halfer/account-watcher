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
	system.stderr.writeLine('[error] This script requires a username');
	phantom.exit();
}
if (!params.password)
{
	system.stderr.writeLine('[error] This script requires a password');
	phantom.exit();
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
		this.constants.PAGE_LOGIN_FAILED = 'login_failed';
		this.constants.PAGE_EMAIL_REQUEST = 'email';
		this.constants.PAGE_ACCOUNT_HOME = 'account';

		/**
		 * Handles the loading of the login screen
		 * 
		 * @param page
		 * @param status
		 */
		this.onLoadLogin = function(page, status)
		{
			var pageId = page.evaluate(
				function(context)
				{
					var
						elementLoggedOut = document.querySelector('h1.PageTitleSignInEE'),
						titleLoggedOut = elementLoggedOut ? elementLoggedOut.innerText : '',

						elementEmail = document.querySelector('.login-flow h2'),
						titleEmail = elementEmail ? elementEmail.innerText : '',

						elementAccount = document.querySelector('#header h1'),
						titleAccount = elementAccount ? elementAccount.innerText : '',

						pageId = null
					;

					// Determine whether we are logged out...
					if (titleLoggedOut.indexOf('SERVICES ON ORANGE.CO.UK') > -1)
					{
						console.log('[ok] Found login screen');
						pageId = context.constants.PAGE_LOGIN;
					}
					// ... or logged in from a previous run, found email request screen...
					// (note: if we are already in, in fact I think this is not offered again anyway, so
					// we may be able to delete this bit)
					else if (titleEmail.indexOf("We'd like to get to know you better") > -1)
					{
						console.log('[ok] Found email request screen, already logged in');
						pageId = context.constants.PAGE_EMAIL_REQUEST;
					}
					// ...or logged in from a previous run and found account home page
					else if (titleAccount.indexOf('YOUR ACCOUNT') > -1)
					{
						console.log('[ok] Found account page, already logged in');
						pageId = context.constants.PAGE_ACCOUNT_HOME;
					}
					else
					{
						console.log('[warning] We received something unexpected in onLoadLogin');
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
			else if (pageId === this.constants.PAGE_ACCOUNT_HOME)
			{
				console.log('[debug] Found account home page, yippee');
			}
		};

		/**
		 * Handles the screen after the creds have been submitted
		 * 
		 * If the credentials are wrong this is sometimes called twice
		 * 
		 * @param page
		 * @param status
		 */
		this.onLoadLoginSubmitted = function(page, status)
		{
			var pageId = page.evaluate(
				function(context)
				{
					var
						// Test for wrong credentials
						elementError = document.querySelector('div.inner_left_ee p.error'),
						textError = elementError ? elementError.innerText : '',

						elementEmail = document.querySelector('.login-flow h2'),
						titleEmail = elementEmail ? elementEmail.innerText : '',

						pageId = null
					;

					if (textError.indexOf('Please enter a valid username and password') > -1)
					{
						console.log('[error] The username and password settings are incorrect');
						pageId = context.constants.PAGE_LOGIN_FAILED;
					}
					else if (titleEmail.indexOf("WE'D LIKE TO GET TO KNOW YOU BETTER") > -1)
					{
						console.log('[ok] Found email request screen, already logged in');
						pageId = context.constants.PAGE_EMAIL_REQUEST;
					}
					else
					{
						console.log('[warning] We received something unexpected in onLoadLoginSubmitted');
					}
				},
				{
					constants: this.constants
				}
			);

			if (pageId === this.constants.PAGE_LOGIN_FAILED)
			{
				phantom.exit();				
			}
			else if (pageId === this.constants.PAGE_EMAIL_REQUEST)
			{
				// Handle skip to next page here
			}
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

	page.onLoadFinished = function(status) {
		console.log('[ok] Page load finished, page: ' + page.watcherId + ', status: ' + status);

		// Call the custom handler, passing in interesting params
		loadHandler['onLoad' + page.watcherId](page, status);
	};

	// Thanks to https://www.princeton.edu/~crmarsh/phantomjs/
	page.onConsoleMessage = function(msg)
	{
		console.log('Console log: ' + msg);
	};

	page.watcherId = 'Login';
	page.watcherParams = params;
	page.open('https://web.orange.co.uk/r/login/');
}

login(params);

// @todo If it says "Preferred email address" then go to "https://web.orange.co.uk/id/profilemanagement.php?rm=SkipThisStep"
