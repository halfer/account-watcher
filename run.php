<?php

$root = realpath(dirname(__FILE__));

// Load the configuration
$configFile = $root . '/config.ini';
$configData = parse_ini_file($configFile);

// Work out script location
$script = $root . '/accounts/' . $configData['country'] . '/' . $configData['provider'] . '.js';

// Set up the parameters string in JSON
$args = array(
	'username' => $configData['username'],
	'password' => $configData['password'],
);
$line =  escapeshellarg(json_encode($args));

// Set up command options
$options = array(
	'--load-images=false',
	'--cookies-file=cookies.txt',
	'--ignore-ssl-errors=true', // @todo This seems to be necessary on main account home
);
$optionsLine = implode(' ', $options);

// Run command
$cmd = $root . '/phantomjs/bin/phantomjs ' . $optionsLine . ' ' . $script . ' ' . $line;
system($cmd);
