<?php

class Scanner
{
	protected $root;

	public function __construct($root)
	{
		$this->root = $root;
	}

	public function execute()
	{
		// @todo Put more conditionals in this (if run ok, if scan ok, etc)
		$this->runChecks();
		$this->scan();
		$this->extractData();
	}

	/**
	 * Put in various pre-run checks here
	 */
	protected function runChecks()
	{
		// @todo Add in some data/log folder writeability checks

		// Does the database exist? Init it if not
		$databaseFile = $this->getRoot() . '/data/data.sqlite';
		if (!file_exists($databaseFile) || filesize($databaseFile) === 0)
		{
			$this->createDatabase($databaseFile);
		}
	}

	protected function createDatabase($databaseFile)
	{
		$dbh = new PDO('sqlite:' . $databaseFile);
		$queryFile = $this->getRoot() . '/data/init.sql';
		$sql = file_get_contents($queryFile);

		$affected = $dbh->exec($sql);
		if ($affected !== 0)
		{
			die("Error: could not initialise SQLite database\n");
		}
	}

	/**
	 * Run the initialisation routines
	 */
	protected function scan()
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
	 * Extracts data from the log file
	 * 
	 * @todo Make this protected
	 */
	public function extractData()
	{
		// For testing
		//$logFile = $this->getLogPath() . '/1386935124.log';
		$logFile = $this->getLogFile();

		$logData = file_get_contents($logFile);
		$matches = array();
		preg_match_all('/^\[data\]\s*(.+)\s*$/m', $logData, $matches);

		// Retrieve the data from the parenthesis group
		if (isset($matches[1]))
		{
			$this->storeExtractedData($matches[1]);
		}
		else
		{
			echo "No data found";
		}
	}

	protected function storeExtractedData(array $jsonStrings)
	{
		$allData = array();
		foreach ($jsonStrings as $jsonString)
		{
			$thisData = json_decode($jsonString, true);

			// Remove any debug keys (they're there just for logging purposes)
			foreach(array_keys($thisData) as $key)
			{
				$isDebug = (boolean) preg_match('/^debug_/', $key);
				if ($isDebug)
				{
					unset($thisData[$key]);
				}
			}

			if (is_array($thisData))
			{
				$allData = array_merge($allData, $thisData);
			}
		}

		// @todo Store this data
		print_r($allData);
	}

	/**
	 * Writes log file
	 */
	protected function writeLogFile(array $lines)
	{
		// Ensure the log file exists
		@mkdir($this->getLogPath(), 0711, $_recursive = true);

		$logFile = $this->getLogFile();
		file_put_contents($logFile, implode("\n", $lines));
		echo sprintf("Wrote output to log file: %s\n", $logFile);
	}

	protected function getLogPath()
	{
		return
			$this->getRoot() .
			'/logs/new/' . $this->getAccountIniValue('country') .
			'/' . $this->getAccountIniValue('provider')
		;
	}

	protected function getLogFile()
	{
		static $filename = null;

		// This is static, so will only be set once
		if (!$filename)
		{
			$filename = time() . '.log';
		}

		return $this->getLogPath() . '/' . $filename;
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
$scanner->execute();
//$scanner->extractData();
