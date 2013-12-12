/* 
 * Script to obtain useful information from an Orange Your Account login in the UK.
 * 
 * @todo Does from-scratch script now have problems?
 * @todo Configure each debug/info/data/etc type in a CSV list
 * @todo Can we get Orange working without SSL security disabled? (maybe get a repo of latest certs?)
 * @todo Add in price data from "usage since your last bill" page
 * @todo Add in a start/end timer and output run time in data call
 */

// Load base objects using relative path
var ok = 
	phantom.injectJs('../../../scripts/LoadHandlerBase.js') &&
	phantom.injectJs('../../../scripts/WatcherPage.js') &&
	phantom.injectJs('LoadHandler.js')
;
if (!ok)
{
	console.log('Failed to load JS assets');
	phantom.exit();
}

/**
 * Main execute method
 */
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
