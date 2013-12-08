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
		this.constants.PAGE_LOGIN = 'Login';
		this.constants.PAGE_LOGIN_FAILED = 'LoginFailed';
		// This is either the email request or the account home, don't care
		this.constants.PAGE_LOGIN_SUBMITTED = 'LoginSubmitted';
		this.constants.PAGE_EMAIL_REQUEST = 'Email';
		this.constants.PAGE_ACCOUNT_HOME = 'AccountHome';
		this.constants.PAGE_ALLOWANCE_PREP = 'AllowancePrep';
		this.constants.PAGE_ALLOWANCE_MAIN = 'AllowanceMain';

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

						elementAccount = document.querySelector('#header h1'),
						titleAccount = elementAccount ? elementAccount.innerText : '',

						pageId = null
					;

					// Determine whether we are logged out...
					if (titleLoggedOut.indexOf('SERVICES ON ORANGE.CO.UK') > -1)
					{
						pageId = context.constants.PAGE_LOGIN;
					}
					// ...or logged in from a previous run and found account home page
					else if (titleAccount.indexOf('YOUR ACCOUNT') > -1)
					{
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
				console.log('[ok] Found login screen');
				page.watcherId = this.constants.PAGE_LOGIN_SUBMITTED;
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
				console.log('[ok] Found account page, already logged in');

				// Emulates a finished event for the account page
				page.watcherId = this.constants.PAGE_ACCOUNT_HOME;
				page.onLoadFinished(status);
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
						pageId = context.constants.PAGE_LOGIN_FAILED;
					}
					else if (titleEmail.indexOf("WE'D LIKE TO GET TO KNOW YOU BETTER") > -1)
					{
						pageId = context.constants.PAGE_EMAIL_REQUEST;
					}
					else
					{
						console.log('[warning] We received something unexpected in onLoadLoginSubmitted');
					}

					return pageId;
				},
				{
					constants: this.constants
				}
			);

			if (pageId === this.constants.PAGE_LOGIN_FAILED)
			{
				console.log('[error] The username and password settings are incorrect');
				phantom.exit();				
			}
			else if (pageId === this.constants.PAGE_EMAIL_REQUEST)
			{
				// Handle skip to next page here
				console.log('[ok] Found email request screen');

				// Point to the page we want to load
				page.watcherId = this.constants.PAGE_ACCOUNT_HOME;
				page.open('https://www.youraccount.orange.co.uk/sss/jfn?entry=true');
			}
		};

		this.onLoadAccountHome = function(page, status)
		{
			console.log('[ok] Now in account home screen');

			// This will cause a redirect, and we're interested in the second one (the first one says "processing")
			page.watcherId = this.constants.PAGE_ALLOWANCE_PREP;
			page.open('https://www.youraccount.orange.co.uk/sss/jfn?mfunc=877&cem=RMN0002_ViewRemMinAndText&jfnRC=1');
		};

		/**
		 * This renders a "processing" screen on the remote side, and redirects after a few seconds
		 * 
		 * @param page
		 * @param status
		 */
		this.onLoadAllowancePrep = function(page, status)
		{
			console.log('[ok] Now in allowance preparation screen');
			page.watcherId = this.constants.PAGE_ALLOWANCE_MAIN;
		};

		this.onLoadAllowanceMain = function(page, status)
		{
			console.log('[ok] Now in allowance main screen');

			page.evaluate(
				function()
				{
					var
						elementBalance = document.querySelector('#paymBalanceIncVAT'),
						textBalance = elementBalance ? elementBalance.innerText : '',

						elementUsage = document.querySelector('.bundleSummary .status'),
						textUsage = elementUsage ? elementUsage.innerText : ''
				
						// @todo Grab .bundleUpdated time as well
					;
					
					console.log('Balance: ' + textBalance);
					console.log('Usage: ' + textUsage);
				}
			);

		};

		this.onLoadDataUsage = function(page, status)
		{
			// https://www.youraccount.orange.co.uk/sss/jfn?mfunc=1559
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
		console.log('[debug] URL changed: ' + targetUrl + ' on page: ' + page.watcherId);
	};

	/**
	 * Handles all load finished events
	 * 
	 * @todo Add in a delay here, so as to reduce load on the remote server
	 * 
	 * @param status
	 */
	page.onLoadFinished = function(status) {
		console.log('[ok] Page load finished, page: ' + page.watcherId + ', status: ' + status);

		// Call the custom handler, passing in interesting params
		var method = loadHandler['onLoad' + page.watcherId];
		if (typeof method === 'function')
		{
			method.call(page.watcherHandler, page, status);
		}
		else
		{
			console.log('[error] Handler missing for load event: ' + page.watcherId);
		}
	};

	// Thanks to https://www.princeton.edu/~crmarsh/phantomjs/
	page.onConsoleMessage = function(msg)
	{
		console.log('Console log: ' + msg);
	};

	page.watcherId = 'Login';
	page.watcherParams = params;
	page.watcherHandler = loadHandler;
	page.open('https://web.orange.co.uk/r/login/');
}

login(params);
