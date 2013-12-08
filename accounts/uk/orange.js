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
		this.PAGE_LOGIN = 'login';
		this.PAGE_EMAIL_REQUEST = 'email';
		//this.PAGE_ACCOUNT = 'account';

//		function webTestForEmailRequestPage()
//		{
//			var title = document.querySelector('.login-flow h2');
//			console('Check title: ' + title.innerText);
//		}

		/**
		 * Handles the loading of the login screen
		 * 
		 * @param page
		 */
		this.onLoadLogin = function(page)
		{
			var title = page.evaluate(
				function(params)
				{
					var element = document.querySelector('h1.PageTitleSignInEE');
					var title = element ? element.innerText : '';

					// WIP
					/*
					if (title.indexOf('SERVICES ON ORANGE.CO.UK') > -1)
					{
						// Return login status
					}
					*/

					return title;
				},
				page.watcherParams
			);

			// @todo If our cookie means we are already logged in, skip this bit
			console.log('Contents: ' + page.contents);
			phantom.exit();

			containsWarning(title, 'SERVICES ON ORANGE.CO.UK');

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
			else
			{
				// We need to run this on the +next+ page load
//				page.evaluate(
//					function()
//					{
//						var title = document.querySelector('.login-flow h2');
//						console('Check title: ' + title.innerText);
//					}
//				);

//				page.close();
			}

//			phantom.exit();
		}
	);
}

login(params);

// @todo If it says "Preferred email address" then go to "https://web.orange.co.uk/id/profilemanagement.php?rm=SkipThisStep"
// @todo Check it says "hello customer"
// @todo Inject username into "emailormsisdn"
// @todo Inject password into "password"
// @todo Submit via "#SignInForm_EE form button"
