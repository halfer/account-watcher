/* 
 * Script to obtain useful information from an Orange Your Account login in the UK.
 * 
 * @todo Output warning if remote updated date is too old
 * @todo Add bill start date to uk/orange
 * @todo Allow data allowances to be configured in accounts.ini
 * @todo Can we get uk/orange working without SSL security disabled? (maybe get a repo of latest certs?)
 * @todo Add in price data from "usage since your last bill" page
 * @todo Move MB/GB suffix parsing from JavaScript to PHP
 * @todo Offer recalc sizes console option
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

	// Lots of luvely initialisation
	loadHandler.doStart();
	loadHandler.loadParameters();
	loadHandler.standardParamChecks();
	loadHandler.configureAllStandardHandlers(page);
	loadHandler.setExecutionTimeLimit(page);

	// Use the page child to set these internal values
	page.setWatcherId(loadHandler.constants.PAGE_LOGIN);
	page.setLoadHandler(loadHandler);
	page.open('https://web.orange.co.uk/r/login/');
}

login();
