<?php

class Scanner
{
	protected $root;

	public function __construct($root)
	{
		$this->root = $root;
	}

	/**
	 * Run the initialisation routines
	 */
	public function init()
	{
		// Load the system configuration
		$sysConfigFile = $this->getRoot() . '/configs/system.ini';
		$sysConfigData = parse_ini_file($sysConfigFile);
		$executable = $sysConfigData['phantom_executable'];

		// Load the account configuration
		$configFile = $this->getRoot() . '/configs/account.ini';
		$configData = parse_ini_file($configFile);

		// Work out script location
		$script = $this->getRoot() . '/accounts/' . $configData['country'] . '/' . $configData['provider'] . '/main.js';

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

		// Start timer
		$timeStart = microtime(true);

		// Run command
		$cmd = $executable . ' ' . $optionsLine . ' ' . $script . ' ' . $line;
		$output = array();
		exec($cmd, $output);

		// Write output to log
		$logDir = $this->getRoot() . '/logs/new/' . $configData['country'] . '/' . $configData['provider'];
		@mkdir($logDir, 0711, $_recursive = true);
		$logFile = $logDir . '/' . time() . '.log';
		file_put_contents($logFile, implode("\n", $output));
		echo sprintf("Wrote output to log file: %s\n", $logFile);

		$timeElapsed = microtime(true) - $timeStart;
		echo sprintf("Operation took %f seconds\n", $timeElapsed);		
	}

	/**
	 * @todo The init() method needs more splitting up
	 */
	protected function moreStuff()
	{
		
	}

	protected function getRoot()
	{
		return $this->root;
	}

	/**
	 * Returns a value looked up from the config file
	 * 
	 * @param string $key
	 * @return string
	 */
	protected function getIniValue($key)
	{
		
	}
}

$root = realpath(dirname(__FILE__));
$Scanner = new Scanner($root);
$Scanner->init();
