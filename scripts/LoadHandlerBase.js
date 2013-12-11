function LoadHandlerBase()
{
	// We'll load this in a bit
	this.params = {};
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

/**
 * Loads the parameters and does some basic checks
 * 
 * @todo Split this into loading params and checking them
 */
LoadHandlerBase.prototype.standardParamChecks = function()
{
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

	this.params = params;
};

LoadHandlerBase.prototype.setExecutionTimeLimit = function(page)
{
	if (this.params.executionTimeLimit)
	{
		// This is how to prevent a script accidentally crashing
		setTimeout(
			function()
			{
				page.watcherHandler.outputError('Page time limit exceeded');
				phantom.exit();
			},
			this.params.executionTimeLimit * 1000
		);
	}
	else
	{
		this.outputDebug('No execution time limit set, this is okay');
	}
};

/**
 * Sets up the standard LoadStarted page event handler
 * 
 * This can be overridden in the child if required
 * 
 * @param page
 */
LoadHandlerBase.prototype.configureOnLoadStarted = function(page)
{
	/**
	 * This is called when a load has started
	 */
	page.onLoadStarted = function() {
		page.watcherHandler.outputInfo('Page load started: ' + page.watcherId);
	};
};

/**
 * Sets up the standard UrlChanged page event handler
 * 
 * This can be overridden in the child if required
 * 
 * @param page
 */
LoadHandlerBase.prototype.configureOnUrlChanged = function(page)
{
	/**
	 * This is called, I think, when a redirect happens
	 * 
	 * @param targetUrl
	 */
	page.onUrlChanged = function(targetUrl) {
		page.watcherHandler.outputDebug('URL changed: ' + targetUrl + ' on page: ' + page.watcherId);

		// Call the custom handler, passing in interesting params
		var method = page.watcherHandler['onUrlChanged' + page.watcherId];
		if (typeof method === 'function')
		{
			method.call(page.watcherHandler, page, targetUrl);
		}
	};
};

/**
 * Sets up the standard ConsoleMessage page handler
 * 
 * This can be overridden in the child if required
 * 
 * @param page
 */
LoadHandlerBase.prototype.configureOnConsoleMessage = function(page)
{
	/**
	 * Called when we/remote site writes to console in remote context
	 * 
	 * Thanks to https://www.princeton.edu/~crmarsh/phantomjs/
	 * 
	 * @param msg
	 */
	page.onConsoleMessage = function(msg)
	{
		if (page.watcherHandler.params.echoRemote)
		{
			page.watcherHandler.outputRemote('Console log: ' + msg);
		}
	};
};

/**
 * Sets up the standard LoadFinished page handler
 * 
 * This can be overridden in the child if required
 * 
 * @param page
 */
LoadHandlerBase.prototype.configureOnLoadFinished = function(page)
{
	/**
	 * Handles all load finished events
	 * 
	 * @param status
	 */
	page.onLoadFinished = function(status) {
		page.watcherHandler.outputInfo('Page load finished, page: ' + page.watcherId + ', status: ' + status);

		// Call the custom handler, passing in interesting params
		var method = page.watcherHandler['onLoad' + page.watcherId];
		if (typeof method === 'function')
		{
			// Put in a small delay, so the server can breathe!
			setTimeout(
				function()
				{
					method.call(page.watcherHandler, page, status);
				},
				1500 // @todo Maybe make a bit slower? Time it too to ensure it works :)
			);
		}
		else
		{
			page.watcherHandler.outputError('Handler missing for load event: ' + page.watcherId);
		}
	};
};

/**
 * Sets up all standard event handlers
 * 
 * @param page
 */
LoadHandlerBase.prototype.configureAllStandardHandlers = function(page)
{
	this.configureOnLoadStarted(page);
	this.configureOnUrlChanged(page);
	this.configureOnConsoleMessage(page);
	this.configureOnLoadFinished(page);
};