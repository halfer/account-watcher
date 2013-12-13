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
		// Work out script location
		$script =
			$this->getRoot() .
			'/accounts/' . $this->getAccountIniValue('country') .
			'/' . $this->getAccountIniValue('provider') .
			'/main.js'
		;

		// Set up the parameters string in JSON
		$args = array(
			'username'             => $this->getAccountIniValue('username'),
			'password'             => $this->getAccountIniValue('password'),
			'echoRemote'           => (boolean) $this->getSystemIniValue('echo_remote_console'),
			'executionTimeLimit'   => (float) $this->getAccountIniValue('execution_time_limit'),
		);
		$line =  escapeshellarg(json_encode($args));

		// Set up command options
		$options = array(
			'--load-images=false',
			'--cookies-file=cookies.txt',
		);

		// Add in SSL config
		if ($this->getAccountIniValue('ignore_ssl_errors'))
		{
			$options[] = '--ignore-ssl-errors=true';
		}

		$optionsLine = implode(' ', $options);

		// Start timer
		$timeStart = microtime(true);

		// Run command
		$executable = $this->getSystemIniValue('phantom_executable');
		$cmd = $executable . ' ' . $optionsLine . ' ' . $script . ' ' . $line;
		$output = array();
		exec($cmd, $output);

		// Write output to log
		$logDir =
			$this->getRoot() .
			'/logs/new/' . $this->getAccountIniValue('country') .
			'/' . $this->getAccountIniValue('provider')
		;
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
	 * Returns a value looked up from the system config file
	 * 
	 * @param string $key
	 * @return string
	 */
	protected function getSystemIniValue($key)
	{
		return $this->getIniValue('system.ini', $key);
	}

	/**
	 * Returns a value looked up from the account config file
	 * 
	 * @param string $key
	 * @return string
	 */
	protected function getAccountIniValue($key)
	{
		return $this->getIniValue('account.ini', $key);
	}

	protected function getIniValue($file, $key)
	{
		static $configData = false;

		if (!isset($configData[$file]))
		{
			$configFile = $this->getRoot() . '/configs/' . $file;
			$configData[$file] = parse_ini_file($configFile);			
		}

		return
			isset($configData[$file][$key]) ?
			$configData[$file][$key] :
			null
		;
	}
}

$root = realpath(dirname(__FILE__));
$Scanner = new Scanner($root);
$Scanner->init();
