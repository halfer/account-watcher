/* 
 * Script to obtain useful information from an Orange Your Account login in the UK.
 * 
 * @todo Does from-scratch script now have problems?
 * @todo Move non-OO code into separate method
 * @todo Use regexps to seperate data out into parsable numbers
 * @todo Can we reduce reliance on full URLs?
 * @todo Can we get Orange working without SSL security disabled?
 */

var system = require('system');

// Get the parameters from the launch script
var jsonString = system.args[1];
var params = JSON.parse(jsonString);

// Check we have the necessary parameters
if (!params.username)
{
	console.log('[error] This script requires a username');
	phantom.exit();
}
if (!params.password)
{
	console.log('[error] This script requires a password');
	phantom.exit();
}

function LoadHandlerBase()
{
}

LoadHandlerBase.prototype.outputInfo = function(msg)
{
	console.log('[info] ' + msg);
};

LoadHandlerBase.prototype.outputDebug = function(msg)
{
	console.log('[debug] ' + msg);
};

LoadHandlerBase.prototype.outputData = function(msg)
{
	console.log('[data] ' + msg);		
};

LoadHandlerBase.prototype.outputError = function(msg)
{
	console.log('[error] ' + msg);		
};

LoadHandlerBase.prototype.outputWarning = function(msg)
{
	console.log('[warning] ' + msg);		
};

LoadHandlerBase.prototype.outputRemote = function(msg)
{
	console.log('[remote] ' + msg);		
};

LoadHandler.prototype = new LoadHandlerBase();

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
	this.constants.PAGE_USAGE = 'Usage';
}

/**
 * Handles the loading of the login screen
 * 
 * @param page
 * @param status
 */
LoadHandler.prototype.onLoadLogin = function(page, status)
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

			return pageId;
		},
		{
			constants: this.constants
		}
	);

	// Only make an attempt to log on if this is the login page
	if (pageId === this.constants.PAGE_LOGIN)
	{
		this.outputInfo('Found login screen');
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
		this.outputInfo('Found account page, already logged in');

		// Emulates a finished event for the account page
		page.watcherId = this.constants.PAGE_ACCOUNT_HOME;
		page.onLoadFinished(status);
	}
	else
	{
		this.outputWarning('We received something unexpected in onLoadLogin');
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
LoadHandler.prototype.onLoadLoginSubmitted = function(page, status)
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

			return pageId;
		},
		{
			constants: this.constants
		}
	);

	if (pageId === this.constants.PAGE_LOGIN_FAILED)
	{
		this.outputError('The username and password settings are incorrect');
		phantom.exit();				
	}
	else if (pageId === this.constants.PAGE_EMAIL_REQUEST)
	{
		// Handle skip to next page here
		this.outputInfo('Found email request screen');

		// Point to the page we want to load
		page.watcherId = this.constants.PAGE_ACCOUNT_HOME;
		page.open('https://www.youraccount.orange.co.uk/sss/jfn?entry=true');
	}
	else
	{
		this.outputWarning('We received something unexpected in onLoadLoginSubmitted');
	}
};

LoadHandler.prototype.onLoadAccountHome = function(page, status)
{
	this.outputInfo('Now in account home screen');

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
LoadHandler.prototype.onLoadAllowancePrep = function(page, status)
{
	this.outputInfo('Now in allowance preparation screen');
	page.watcherId = this.constants.PAGE_ALLOWANCE_MAIN;
};

LoadHandler.prototype.onLoadAllowanceMain = function(page, status)
{
	this.outputInfo('Now in allowance main screen');

	var data = page.evaluate(
		function()
		{
			var
				elementBalance = document.querySelector('#paymBalanceIncVAT'),
				textBalance = elementBalance ? elementBalance.innerText : '',

				elementAllowance = document.querySelector('.bundleSummary .status'),
				textAllowance = elementAllowance ? elementAllowance.innerText : '',

				elementLastUpdated = document.querySelector('#viewRemMinsTextsSummaryForm .bundleUpdated'),
				textLastUpdated = elementLastUpdated ? elementLastUpdated.innerText : ''
			;

			return {
				balance: textBalance,
				allowance: textAllowance,
				lastUpdated: textLastUpdated
			};
		}
	);

	// Output the data
	this.outputData(JSON.stringify(data));

	// Finally pop over to the usage screen
	page.watcherId = this.constants.PAGE_USAGE;
	page.open('https://www.youraccount.orange.co.uk/sss/jfn?mfunc=1559&jfnRC=6');
};

LoadHandler.prototype.onLoadUsage = function(page, status)
{
	this.outputInfo('Now in data usage screen');

	var data = page.evaluate(
		function()
		{
			var
				elementUsage = document.querySelector('#viewUkDataAllowanceForm .dataUsageFont'),
				textUsage = elementUsage ? elementUsage.innerText : ''
			;

			return {
				usage: textUsage
			};
		}
	);

	// Output the data
	this.outputData(JSON.stringify(data));

	// Exit before the log-out thingy reloads the page
	phantom.exit();
};

function login(params)
{
	// Logon to the system
	var
		page = require('webpage').create(),
		loadHandler = new LoadHandler()
	;

	page.onLoadStarted = function() {
		page.watcherHandler.outputInfo('Page load started: ' + page.watcherId);
	};

	/**
	 * This is called, I think, when a redirect happens
	 * 
	 * @param targetUrl
	 */
	page.onUrlChanged = function(targetUrl) {
		page.watcherHandler.outputDebug('URL changed: ' + targetUrl + ' on page: ' + page.watcherId);
	};

	// Thanks to https://www.princeton.edu/~crmarsh/phantomjs/
	page.onConsoleMessage = function(msg)
	{
		page.watcherHandler.outputRemote('Console log: ' + msg);
	};

	/**
	 * Handles all load finished events
	 * 
	 * @param status
	 */
	page.onLoadFinished = function(status) {
		page.watcherHandler.outputInfo('Page load finished, page: ' + page.watcherId + ', status: ' + status);

		// Call the custom handler, passing in interesting params
		var method = loadHandler['onLoad' + page.watcherId];
		if (typeof method === 'function')
		{
			// Put in a small delay, so the server can breathe!
			setTimeout(
				function()
				{
					method.call(page.watcherHandler, page, status);
				},
				1500
			);
		}
		else
		{
			page.watcherHandler.outputError('Handler missing for load event: ' + page.watcherId);
		}
	};

	page.watcherId = loadHandler.constants.PAGE_LOGIN;
	page.watcherParams = params;
	page.watcherHandler = loadHandler;
	page.open('https://web.orange.co.uk/r/login/');
}

login(params);
