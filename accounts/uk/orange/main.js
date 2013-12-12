/* 
 * Script to obtain useful information from an Orange Your Account login in the UK.
 * 
 * @todo Does from-scratch script now have problems?
 * @todo Configure each debug/info/data/etc type in a CSV list
 * @todo Move non-OO code into separate method
 * @todo Can we reduce reliance on full URLs?
 * @todo Can we get Orange working without SSL security disabled? (maybe get a repo of latest certs?)
 * @todo Add in price data from "usage since your last bill" page
 * @todo Add in a start/end timer and output run time in data call
 */

// Load base object using relative path
var ok = 
	phantom.injectJs('../../../scripts/LoadHandlerBase.js') &&
	phantom.injectJs('../../../scripts/WatcherPage.js')
;
if (!ok)
{
	console.log('Failed to load JS assets');
	phantom.exit();
}

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
		page.setWatcherId(this.constants.PAGE_LOGIN_SUBMITTED);
		page.evaluate(
			function(params)
			{
				// Set up the credentials and submit the form
				document.querySelector('input[name=LOGIN]').value = params.username;
				document.querySelector('input[name=PASSWORD]').value = params.password;
				document.querySelector('div.inner_left_ee form').submit();
			},
			page.getLoadHandler().params // @todo Switch to getParams()
		);
	}
	else if (pageId === this.constants.PAGE_ACCOUNT_HOME)
	{
		this.outputInfo('Found account page, already logged in');

		// Emulates a finished event for the account page
		page.setWatcherId(this.constants.PAGE_ACCOUNT_HOME);
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
			else if (
				// Noticed the "help" version on 10 Dec 2013
				(titleEmail.indexOf("WE'D LIKE TO GET TO KNOW YOU BETTER") > -1) ||
				(titleEmail.indexOf("WE'D LIKE TO HELP YOU BETTER") > -1)
			)
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
		page.setWatcherId(this.constants.PAGE_ACCOUNT_HOME);
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
	page.setWatcherId(this.constants.PAGE_ALLOWANCE_PREP);
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
	// @todo Maybe disable this, in favour of onUrlChangedAllowancePrep?
	this.switchToMainAllowanceScreen(page);
};

/**
 * Alternative and possibly better version of onLoadAllowancePrep
 * 
 * Note: occasionally "onLoadAllowancePrep" is called too late, and so doesn't reset the watcherId in time
 * for the second onload event (for the main rather than the prep screen). I'm trying this one
 * +additionally+, but it may be better to use it instead.
 * 
 * @param page
 * @param targetUrl
 */
LoadHandler.prototype.onUrlChangedAllowancePrep = function(page, targetUrl) {
	if (targetUrl.indexOf('jfnRC=2') > -1)
	{
		this.switchToMainAllowanceScreen(page);
	}
};

LoadHandler.prototype.switchToMainAllowanceScreen = function(page)
{
	this.outputInfo('Now in allowance preparation screen');
	page.setWatcherId(this.constants.PAGE_ALLOWANCE_MAIN);
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
				textLastUpdated = elementLastUpdated ? elementLastUpdated.innerText : '',

				// Split up format: "123.45 MB used, 6789.01 MB remaining"
				patternAllowance = /((?:\d+.?\d*) (?:MB|GB)) used, ((?:\d+.?\d*) (?:MB|GB)) remaining/,
				matchesAllowance = textAllowance.match(patternAllowance),
				textAllowanceUsed = matchesAllowance[1],
				textAllowanceRemaining = matchesAllowance[2],

				// Split up format: "Last updated: 12:43 09/12/13"
				patternDate = /Last updated: ([\d\/\s:]+)/,
				matchesDate = textLastUpdated.match(patternDate),
				lastUpdated = matchesDate[1]
			;

			return {
				balance: textBalance,
				allowanceText: textAllowance,
				allowanceUsed: textAllowanceUsed,
				allowanceRemaining: textAllowanceRemaining,
				lastUpdatedText: textLastUpdated,
				lastUpdated: lastUpdated
			};
		}
	);

	// Output the data
	this.outputData(JSON.stringify(data));

	// Finally pop over to the usage screen
	page.setWatcherId(this.constants.PAGE_USAGE);
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
				textUsage = elementUsage ? elementUsage.innerText : '',

				// Split up format "You've used a total of 11.73GB of data"
				patternUsage = /You've used a total of ((?:\d+.?\d*)\s*(?:MB|GB)) of data/,
				matchesUsage = textUsage.match(patternUsage),
				usageTotal = matchesUsage[1]
			;

			return {
				usageText: textUsage,
				usageTotal: usageTotal
			};
		}
	);

	// Output the data
	this.outputData(JSON.stringify(data));

	// Exit before the log-out thingy reloads the page
	phantom.exit();
};

function login()
{
	// Logon to the system
	var
		page = new WatcherPage(),
		loadHandler = new LoadHandler()
	;

	loadHandler.standardParamChecks();
	loadHandler.configureAllStandardHandlers(page);
	loadHandler.setExecutionTimeLimit(page);

	// Use the page child to set these internal values
	page.setWatcherId(loadHandler.constants.PAGE_LOGIN);
	page.setLoadHandler(loadHandler);
	page.open('https://web.orange.co.uk/r/login/');
}

login();
