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

// @todo Split this into loading params and checking them
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