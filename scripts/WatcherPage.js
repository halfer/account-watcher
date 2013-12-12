// Create an instance of the parent PhantomJS class
WatcherPage.prototype = require('webpage').create();

function WatcherPage()
{
	this.loadHandler = null;
	this.watcherId = null;
}

WatcherPage.prototype.setLoadHandler = function(loadHandler)
{
	this.loadHandler = loadHandler;
};

WatcherPage.prototype.getLoadHandler = function()
{
	return this.loadHandler;
};

WatcherPage.prototype.setWatcherId = function(watcherId)
{
	this.watcherId = watcherId;
};

WatcherPage.prototype.getWatcherId = function()
{
	return this.watcherId;
};
