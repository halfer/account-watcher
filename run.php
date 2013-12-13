<?php

class Scanner
{
	protected $root;

	public function __construct($root)
	{
		$this->root = $root;
	}

	/**
	 * @todo Put in various pre-run checks here e.g. log folder writability checks
	 */
	public function runChecks()
	{
		
	}

	/**
	 * Run the initialisation routines
	 */
	public function execute()
	{
		// Start timer
		$timeStart = microtime(true);

		// Run command
		$output = array();
		exec($this->getCommandLine(), $output);
		$this->writeLogFile($output);

		$timeElapsed = microtime(true) - $timeStart;
		echo sprintf("Operation took %f seconds\n", $timeElapsed);		
	}

	/**
	 * Writes log file
	 */
	protected function writeLogFile(array $lines)
	{
		$logDir =
			$this->getRoot() .
			'/logs/new/' . $this->getAccountIniValue('country') .
			'/' . $this->getAccountIniValue('provider')
		;
		@mkdir($logDir, 0711, $_recursive = true);
		$logFile = $logDir . '/' . time() . '.log';
		file_put_contents($logFile, implode("\n", $lines));
		echo sprintf("Wrote output to log file: %s\n", $logFile);
	}

	/**
	 * Derives the fully-qualified script path
	 * 
	 * @return string
	 */
	protected function getScriptPath()
	{
		return
			$this->getRoot() .
			'/accounts/' . $this->getAccountIniValue('country') .
			'/' . $this->getAccountIniValue('provider') .
			'/main.js'
		;
	}

	/**
	 * Builds the parameters string in JSON
	 * 
	 * @return string
	 */
	protected function getCommandLineParameters()
	{
		$args = array(
			'username'             => $this->getAccountIniValue('username'),
			'password'             => $this->getAccountIniValue('password'),
			'echoRemote'           => (boolean) $this->getSystemIniValue('echo_remote_console'),
			'executionTimeLimit'   => (float) $this->getAccountIniValue('execution_time_limit'),
		);

		return escapeshellarg(json_encode($args));
	}

	protected function getCommandLineOptions()
	{
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

		return implode(' ', $options);
	}

	protected function getCommandLine()	
	{
		return
			$this->getSystemIniValue('phantom_executable') . ' ' .
			$this->getCommandLineOptions() . ' ' .
			$this->getScriptPath() . ' ' .
			$this->getCommandLineParameters()
		;
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
$scanner = new Scanner($root);
$scanner->runChecks();
$scanner->execute();
