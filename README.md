Account Watcher
=

This PHP program uses PhantomJS to retrieve usage data from mobile/ISP accounts. Orange UK is currently
supported, and anyone familiar with JavaScript and HTML can add support for their own provider. The idea
is to run it on a daily cron on your machine, and the program will add your usage data to a SQLite
database. From there, you can do what you like with it - for example, plot it on a graph on a local
web server, or output a Growl notification.

Since the PhantomJS script just logs on to the provider site for you, there is no security risk. Of course,
you are welcome to review any PhantomJS scripts here to see they don't send your password to anyone other
than your provider :)

Currently the purpose is to monitor data usage, but call minutes and text usage could be monitored without
much extra effort.

If you get your own provider working, send me a pull request, and I'll see if your work can be merged. Do
please extend LoadHandlerBase.js, that should save you a bit of work.
