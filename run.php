<?php

$root = realpath(dirname(__FILE__));

// Load the system configuration
$sysConfigFile = $root . '/configs/system.ini';
$sysConfigData = parse_ini_file($sysConfigFile);
$executable = $sysConfigData['phantom_executable'];

// Load the account configuration
$configFile = $root . '/configs/account.ini';
$configData = parse_ini_file($configFile);

// Work out script location
$script = $root . '/accounts/' . $configData['country'] . '/' . $configData['provider'] . '/main.js';

// Set up the parameters string in JSON
$args = array(
	'username'             => $configData['username'],
	'password'             => $configData['password'],
	'echoRemote'           => (boolean) $sysConfigData['echo_remote_console'],
	'executionTimeLimit'   => (float) $configData['execution_time_limit'],
);
$line =  escapeshellarg(json_encode($args));

// Set up command options
$options = array(
	'--load-images=false',
	'--cookies-file=cookies.txt',
);

// Add in SSL config
if ($configData['ignore_ssl_errors'])
{
	$options[] = '--ignore-ssl-errors=true';
}

$optionsLine = implode(' ', $options);

// Run command
$cmd = $executable . ' ' . $optionsLine . ' ' . $script . ' ' . $line;
system($cmd);
