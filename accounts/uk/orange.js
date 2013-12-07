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
	// Logon to the system
	var page = require('webpage').create();

	page.onLoadStarted = function() {
		console.log('[ok] Page load started: ' + page.watcherId);
	};

	page.onLoadFinished = function() {
		console.log('[ok] Page load finished:' + page.watcherId);
	};

	// Thanks to https://www.princeton.edu/~crmarsh/phantomjs/
	page.onConsoleMessage = function(msg)
	{
		console.log('Console log: ' + msg);
	};

	var url = 'https://web.orange.co.uk/r/login/';
	page.watcherId = 'login';
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
				console.log('[debug] Prior to checking initial title');
				var title = page.evaluate(
					function()
					{
						console.log('[debug] Check initial title running');
						var element = document.querySelector('h1.PageTitleSignInEE');

						return element ? element.innerText : '';
					}
				);
				containsWarning(title, 'SERVICES ON ORANGE.CO.UK');

				console.log('[debug] Submitting login details');
				page.watcherId = 'logged-in';
				page.evaluate(
					function(params)
					{
						console.log('[debug] Submitting login details running');

						// Set up the credentials and submit the form
//						document.querySelector('input[name=LOGIN]').value = params.username;
//						document.querySelector('input[name=PASSWORD]').value = params.password;
						document.querySelector('div.inner_left_ee form').submit();
					},
					page.watcherParams
				);

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
